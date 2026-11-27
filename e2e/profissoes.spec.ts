import { expect, test } from '@playwright/test'

test('secretário edita o catálogo em Configurações e seleciona ou remove a profissão de uma pessoa', async ({ page }) => {
  const headers = {
    'Access-Control-Allow-Origin': 'http://127.0.0.1:4179',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'content-type,x-provisao-request',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  }
  const doLar = 'e1000000-0000-4000-8000-000000000001'
  const outra = 'e1000000-0000-4000-8000-000000000002'
  const catalogo = [{ id: doLar, nome: 'Do lar' }]
  let pessoa: Record<string, unknown> | undefined
  let edicao: Record<string, unknown> | undefined
  await page.route('http://localhost:3000/**', route => {
    const metodo = route.request().method()
    if (metodo === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const path = new URL(route.request().url()).pathname
    if (path === '/autorizacao/navegacao') return route.fulfill({ headers, json: { permissoes: {} } })
    if (path === '/auth/profile') return route.fulfill({
      headers, json: { sub: 'u', igreja_id: 'i', perfil: 'SECRETARIO', username: 'Pessoa Teste', login: 'teste@example.invalid' },
    })
    if (path === '/igrejas/me') return route.fulfill({ headers, json: { id: 'i', nome: 'Igreja Teste' } })
    if (path === '/profissoes' && metodo === 'POST') {
      const registro = { id: outra, nome: route.request().postDataJSON().nome }
      catalogo.push(registro)
      return route.fulfill({ headers, status: 201, json: registro })
    }
    if (path === `/profissoes/${outra}` && metodo === 'PATCH') {
      catalogo[1].nome = route.request().postDataJSON().nome
      return route.fulfill({ headers, json: catalogo[1] })
    }
    if (path === '/profissoes') return route.fulfill({ headers, json: catalogo })
    if (path === '/pessoas' && metodo === 'POST') {
      pessoa = { ...route.request().postDataJSON(), id: 'pessoa' }
      return route.fulfill({ headers, status: 201, json: pessoa })
    }
    if (path === '/pessoas/pessoa' && metodo === 'PATCH') {
      edicao = route.request().postDataJSON()
      pessoa = { ...pessoa, ...edicao }
      return route.fulfill({ headers, json: pessoa })
    }
    if (path === '/pessoas') return route.fulfill({ headers, json: pessoa ? [pessoa] : [] })
    return route.fulfill({ headers, json: [] })
  })

  await page.goto('/configuracoes')
  await page.getByRole('tab', { name: 'Profissões', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'Do lar', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Nova profissão' }).click()
  await page.getByLabel('Nome da profissão').fill('Técnica de som')
  await page.getByRole('button', { name: 'Salvar profissão' }).click()
  await page.getByRole('button', { name: 'Editar Técnica de som' }).click()
  await page.getByLabel('Nome da profissão').fill('Técnica de áudio')
  await page.getByRole('button', { name: 'Salvar profissão' }).click()
  await expect(page.getByRole('cell', { name: 'Técnica de áudio', exact: true })).toBeVisible()

  await page.goto('/pessoas')
  await page.getByRole('button', { name: 'Nova Pessoa' }).click()
  await page.getByLabel('Nome Completo *').fill('Pessoa Sintética')
  await page.getByLabel('Data de Nascimento *').fill('1990-01-01')
  await page.getByLabel('Profissão', { exact: true }).click()
  await page.getByRole('option', { name: 'Do lar' }).click()
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect.poll(() => pessoa?.profissao_id).toBe(doLar)
  await page.getByRole('row', { name: /Pessoa Sintética/ }).getByRole('button').first().click()
  await expect(page.getByLabel('Profissão', { exact: true })).toHaveText('Do lar')
  await page.getByLabel('Profissão', { exact: true }).click()
  await page.getByRole('option', { name: 'Não informada' }).click()
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect.poll(() => edicao?.profissao_id).toBeNull()
})
