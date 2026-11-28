import { expect, test } from '@playwright/test'
import type { ConfiguracaoModelo, VersaoInput } from '../src/api/secretaria'

test('edita a página do modelo, pagina o corpo, reabre e conserva o texto após falha no salvamento', async ({ page, context }) => {
  const ctx = { id: 'assembleia', nome: 'Assembleia', tipo: 'ASSEMBLEIA_GERAL', sigla: 'AG', pode_preparar: true }
  let salvo: ConfiguracaoModelo | undefined
  let publicado = false
  let revisao = 0
  let falhar = false
  let offline = true
  const comandos: string[] = []
  let edicao: VersaoInput | undefined
  const erros: string[] = []
  page.on('pageerror', e => erros.push(e.message))
  const headers = {
    'Access-Control-Allow-Origin': 'http://127.0.0.1:4179',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'content-type,x-provisao-request',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  }
  await page.route('http://localhost:3000/**', route => route.request().method() === 'OPTIONS'
    ? route.fulfill({ headers, status: 204 })
    : route.fulfill({ headers, json: [] }))
  await page.route('http://localhost:3000/secretaria/**', async route => {
    const req = route.request()
    if (req.isNavigationRequest()) return route.continue()
    const path = new URL(req.url()).pathname
    if (req.method() === 'OPTIONS') return route.fulfill({ headers, status: 204 })
    if (['POST', 'PATCH'].includes(req.method()) && path.includes('modelos')) {
      if (falhar) return route.fulfill({ headers, status: 409, json: { message: 'Revisão desatualizada.' } })
      salvo = req.postDataJSON().configuracao
      publicado = path.endsWith('/publicar') || req.postDataJSON().publicar === true
      return route.fulfill({ headers, json: { id: 'modelo', revisao: ++revisao, estado: publicado ? 'PUBLICADO' : 'EM_EDICAO' } })
    }
    if (req.method() === 'POST' && path.endsWith('/documentos')) {
      comandos.push(req.postDataJSON().idempotencia)
      edicao ??= req.postDataJSON().versao
      if (offline) { offline = false; return route.abort('internetdisconnected') }
      return route.fulfill({ headers, json: { id: 'documento', revisao: 1 } })
    }
    if (path.endsWith('/papeis-modelo')) return route.fulfill({ headers, json: [{ id: 'secretario', codigo: 'SECRETARIO', nome: 'Secretário' }] })
    if (path.endsWith('/documentos/consulta')) {
      const filtros = new URL(req.url()).searchParams
      const itens = edicao && filtros.get('tipo') === 'OUTRO' && filtros.get('visao') === 'andamento' ? [{
        id: 'documento', estado: 'EM_EDICAO', tipo: 'OUTRO', versao_atual: 1, numero: null, modelo_nome: 'Ofício', versoes: [{ ...edicao, numero: 1 }],
      }] : []
      return route.fulfill({ headers, json: { itens, tem_proxima: false } })
    }
    if (req.method() === 'PATCH' && path.endsWith('/documentos/documento')) {
      edicao = req.postDataJSON().versao
      return route.fulfill({ headers, json: { id: 'documento', revisao: 2 } })
    }
    if (path.endsWith('/documentos/documento') && edicao) return route.fulfill({ headers, json: {
      id: 'documento', contexto_id: ctx.id, versao_atual: 1, revisao: 1, estado: 'EM_EDICAO', tipo: 'OUTRO',
      versoes: [{ ...edicao, id: 'vd1', numero: 1, deliberacoes: [], arrolados: [], anexos: [], resolucoes: [] }],
    } })
    return route.fulfill({ headers, json: path.endsWith('/contextos') ? [ctx] : path.endsWith('/modelos') && salvo
      ? [{ id: 'modelo', nome: 'Ofício', revisao, estado: publicado ? 'PUBLICADO' : 'EM_EDICAO',
        rascunho: publicado ? null : { nome: 'Ofício', tipo: 'OUTRO', finalidade: 'OFICIO', configuracao: salvo },
        versoes: publicado ? [{ id: 'v1', numero: 1, tipo: 'OUTRO', finalidade: 'OFICIO', configuracao: salvo }] : [] }] : [] })
  })
  await page.route('**/auth/profile', route => route.fulfill({ headers, json: { sub: 's', igreja_id: 'i', perfil: 'SECRETARIO', username: 'Secretário' } }))
  await page.route('**/autorizacao/navegacao', route => route.fulfill({ headers, json: { permissoes: {} } }))
  await page.route('**/pessoas', route => route.fulfill({ headers, json: [] }))
  await page.goto('/secretaria?contexto=assembleia&aba=modelos')
  await page.getByRole('button', { name: 'Novo modelo' }).click()
  await page.getByLabel('Nome do modelo').fill('Ofício')
  const body = page.getByRole('textbox', { name: 'Corpo', exact: true })
  await body.fill('Conteúdo do ofício')
  await page.getByRole('button', { name: 'Prévia', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Negrito', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Editar', exact: true }).click()
  await expect(body).toHaveText('Conteúdo do ofício')
  await body.focus()
  await body.press('Control+a')
  await page.getByRole('button', { name: 'Negrito', exact: true }).click()
  await page.getByLabel('Fonte', { exact: true }).selectOption('Liberation Serif')
  await page.getByRole('button', { name: 'Justificar', exact: true }).click()
  await expect(body.locator('strong')).toHaveText('Conteúdo do ofício')
  await page.getByRole('textbox', { name: 'Cabeçalho' }).fill('Secretaria')
  const alturaInicial = (await body.boundingBox())!.height
  const header = page.getByRole('textbox', { name: 'Cabeçalho' })
  await header.press('End')
  await header.press('Enter')
  await expect.poll(async () => (await body.boundingBox())!.height).toBeLessThan(alturaInicial)
  await header.press('Control+z')
  await expect.poll(async () => (await body.boundingBox())!.height).toBeCloseTo(alturaInicial, 0)
  await header.fill('Secretaria')
  await page.getByRole('textbox', { name: 'Rodapé' }).fill('Arquivo da igreja')
  await page.getByRole('button', { name: 'Configuração da página' }).click()
  await page.getByRole('group', { name: 'Margens da página' }).getByLabel('esquerda').fill('2.5')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await context.grantPermissions(['clipboard-read','clipboard-write'])
  await page.evaluate(() => navigator.clipboard.writeText(Array.from({length: 60}, (_, i) => 'Linha '+(i+1)).join('\n')))
  await body.press('Control+End')
  await body.press('Enter')
  await body.press('Control+v')
  await expect(body).toContainText('Linha 60')
  await expect(page.getByText(/Página \d+ de [2-9]/)).toBeVisible()
  await body.press('Control+s')
  await expect(page).toHaveURL(/editor\/modelos\/modelo$/)
  expect(salvo?.composicao_padrao?.pagina.margens_cm.esquerda).toBe(2.5)
  await page.getByRole('button', { name: 'Voltar à Secretaria' }).click()
  await page.getByRole('button', { name: 'Continuar edição' }).click()
  await expect(body.locator('strong').first()).toContainText('Conteúdo do ofício')
  await expect(body).toContainText('Linha 60')
  await expect(page.getByRole('textbox', { name: 'Cabeçalho' })).toHaveText('Secretaria')
  await expect(page.getByRole('textbox', { name: 'Rodapé' })).toHaveText('Arquivo da igreja')
  falhar = true
  await page.getByRole('button', { name: 'Salvar rascunho' }).click()
  await expect(page.getByRole('alert')).toContainText('Revisão desatualizada')
  await expect(body).toContainText('Linha 60')
  falhar = false
  await page.locator('summary').filter({ hasText: /^Regras$/ }).click()
  await page.getByRole('group', { name: 'Quem pode criar este documento?' }).getByRole('checkbox', { name: 'Secretário' }).check()
  await page.getByRole('group', { name: 'Vínculo com reunião' }).getByRole('radio', { name: 'Não se aplica' }).check()
  await page.getByRole('button', { name: 'Publicar modelo' }).click()
  await page.getByRole('tab', { name: 'Documentos', exact: true }).click()
  await page.getByRole('button', { name: 'Outros documentos', exact: true }).click()
  await page.getByRole('button', { name: 'Novo documento' }).click()
  await page.getByLabel('Modelo e versão').selectOption('v1')
  await expect(body).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Corpo', exact: true })).toContainText('Conteúdo do ofício')
  await page.getByLabel('Assunto', { exact: true }).fill('Comunicação')
  await page.getByRole('button', { name: 'Criar documento' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByLabel('Assunto', { exact: true })).toHaveValue('Comunicação')
  await page.getByRole('button', { name: 'Criar documento' }).click()
  await expect(page).toHaveURL(/documentos\/documento/)
  expect(comandos).toHaveLength(2)
  expect(comandos[0]).toBeTruthy()
  expect(comandos[1]).toBe(comandos[0])
  await expect(body).toContainText('Conteúdo do ofício')
  await body.fill('Texto preservado')
  await page.getByRole('button', { name: 'Salvar documento' }).click()
  await expect(page.getByText('Minuta salva')).toBeVisible()
  await page.getByRole('button', { name: 'Prévia', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Corpo', exact: true })).toHaveText('Texto preservado')
  await page.getByRole('button', { name: 'Voltar à Secretaria' }).click()
  await page.getByLabel('Situação').selectOption('andamento')
  await page.getByRole('button', { name: 'Pesquisar' }).click()
  await page.getByRole('button', { name: 'Retomar edição' }).click()
  await expect(body).toHaveText('Texto preservado')
  await body.fill('Primeira segunda terceira')
  await page.getByRole('button', { name: 'Notas de rodapé' }).click()
  const inserir = page.getByRole('button', { name: 'Inserir nota', exact: true })
  const notas = page.getByRole('complementary', { name: 'Notas desta página' })
  async function posicionar(palavra: string) {
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const paragrafo = body.locator('p').filter({ hasText: palavra }).first()
    await paragrafo.evaluate(el => el.scrollIntoView({ block: 'center' }))
    const ponto = await body.evaluate((el, busca) => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const p = n.textContent!.indexOf(busca)
        if (p >= 0) {
          const range = document.createRange()
          range.setStart(n, p + 1)
          range.setEnd(n, p + 2)
          const caixa = range.getBoundingClientRect()
          return { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 }
        }
      }
      throw new Error('Palavra ausente no corpo: ' + busca)
    }, palavra)
    await page.mouse.click(ponto.x, ponto.y)
  }
  async function anotar(teor: string, palavra: string) {
    await posicionar(palavra)
    await inserir.click()
    const modal = page.getByRole('dialog')
    await modal.getByLabel('Texto da nota').fill(teor)
    await modal.getByRole('button', { name: 'Gravar nota' }).click()
  }
  await anotar('Fonte inicial.', 'Primeira')
  await anotar('Fonte final.', 'terceira')
  await anotar('Fonte intermediária.', 'segunda')
  await expect(notas.locator('p')).toHaveText(['1. Fonte inicial.', '2. Fonte intermediária.', '3. Fonte final.'])
  await posicionar('segunda')
  await inserir.click()
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(body.locator('sup[data-nota]')).toHaveCount(3)
  await body.locator('sup[data-numero="2"]').click()
  await page.getByLabel('Texto da nota').fill('Fonte revisada.')
  await page.getByRole('button', { name: 'Gravar nota' }).click()
  await expect(notas).toContainText('2. Fonte revisada.')
  await body.locator('sup[data-numero="1"]').click()
  await page.getByRole('button', { name: 'Excluir nota' }).click()
  await expect(notas.locator('p')).toHaveText(['1. Fonte revisada.', '2. Fonte final.'])
  await body.press('Control+z')
  await expect(notas.locator('p')).toHaveText(['1. Fonte inicial.', '2. Fonte revisada.', '3. Fonte final.'])
  await body.press('Control+Home')
  await page.evaluate(() => navigator.clipboard.writeText(Array.from({length:60}, (_,i) => 'Pauta ' + i).join('\n') + '\n'))
  await body.press('Control+v')
  await expect(page.locator('.pagina-navegacao:visible').getByText('Página 2 de 2')).toBeVisible()
  await expect(notas).toContainText('3. Fonte final.')
  await page.getByRole('button', { name: 'Salvar documento' }).click()
  await expect(page.getByText('Minuta salva')).toBeVisible()
  await page.getByRole('button', { name: 'Prévia', exact: true }).click()
  const leitura = page.getByRole('region', { name: 'Corpo', exact: true })
  await expect(leitura).toBeVisible()
  await expect(notas).toHaveCount(0)
  await page.locator('.pagina-navegacao:visible').getByRole('button', { name: 'Próxima' }).click()
  await expect(notas).toContainText('2. Fonte revisada.')
  await page.setViewportSize({ width: 390, height: 850 })
  await expect(page.locator('.pagina-navegacao:visible').getByText('Página 2 de 2')).toBeVisible()
  await expect(notas).toContainText('3. Fonte final.')
  await page.getByRole('button', { name: 'Tamanho real' }).click()
  await expect(page.locator('.pagina-navegacao:visible').getByText('Página 2 de 2')).toBeVisible()
  await expect(notas).toContainText('3. Fonte final.')
  expect(Object.keys(edicao!.conteudo.composicao!.notas)).toHaveLength(3)
  expect(erros).toEqual([])
})
