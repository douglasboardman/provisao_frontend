import { expect, test } from '@playwright/test'

test('secretário acrescenta e salva um valor nos parâmetros de membresia', async ({ page }) => {
  const headers = {
    'Access-Control-Allow-Origin': 'http://127.0.0.1:4179',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'content-type,x-provisao-request',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  }
  const regra = {
    id: 'regra', nome: 'Rols de Admissão', tipo_regra: 'FILTRO',
    enum_classificador: 'membresia_tipo_evento', enum_classificado: 'membresia_rol',
    valores: [{ valor_classificador: 'ADMISSAO', valor_classificado: 'COMUNGANTES' }],
  }
  let dadosSalvos: unknown
  await page.route('http://localhost:3000/**', route => {
    const metodo = route.request().method()
    if (metodo === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const path = new URL(route.request().url()).pathname
    if (path === '/autorizacao/navegacao') return route.fulfill({ headers, json: { permissoes: {} } })
    if (path === '/auth/profile') return route.fulfill({
      headers, json: { sub: 'u', igreja_id: 'i', perfil: 'SECRETARIO', username: 'Secretário Teste', login: 'teste@example.invalid' },
    })
    if (path === '/igrejas/me') return route.fulfill({ headers, json: { id: 'i', nome: 'Igreja Teste' } })
    if (path === '/regras-relacao-enum/enums') return route.fulfill({
      headers, json: { membresia_tipo_evento: ['ADMISSAO'], membresia_rol: ['COMUNGANTES', 'NAO_COMUNGANTES'] },
    })
    if (path === '/regras-relacao-enum/modulo/membresia') return route.fulfill({ headers, json: [regra] })
    if (path === '/regras-relacao-enum/modulo/membresia/regra/valores' && metodo === 'PUT') {
      const payload = route.request().postDataJSON()
      dadosSalvos = payload
      regra.valores = payload.valores
      return route.fulfill({ headers, json: regra })
    }
    return route.fulfill({ headers, json: [] })
  })
  await page.goto('/configuracoes')
  await page.getByRole('tab', { name: 'Parâmetros Membresia' }).click()
  await page.getByRole('combobox', { name: 'Classificador', exact: true }).click()
  await page.getByRole('option', { name: 'Admissao' }).click()
  await page.getByRole('combobox', { name: 'Classificado', exact: true }).click()
  await page.getByRole('option', { name: 'Nao Comungantes' }).click()
  await page.getByRole('button', { name: 'Adicionar' }).click()
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect.poll(() => dadosSalvos).toEqual({ valores: [
    { valor_classificador: 'ADMISSAO', valor_classificado: 'COMUNGANTES' },
    { valor_classificador: 'ADMISSAO', valor_classificado: 'NAO_COMUNGANTES' },
  ] })
  await expect(page.getByRole('cell', { name: 'Nao Comungantes', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toHaveCount(0)
})
