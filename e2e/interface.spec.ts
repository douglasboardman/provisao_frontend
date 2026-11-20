import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const usuario = {
  sub: 'u',
  igreja_id: 'i',
  perfil: 'SECRETARIO',
  username: 'Pessoa de exemplo',
  login: 'pessoa@example.invalid',
}
const contexto = {
  id: 'assembleia',
  nome: 'Assembleia de exemplo',
  sigla: 'AG',
  tipo: 'ASSEMBLEIA_GERAL',
  orgao: null,
  pode_preparar: true,
}
const versao = {
  id: 'v',
  numero: 1,
  revisao_conteudo: 1,
  assunto: 'Planejamento anual',
  data_documento: '2026-02-10',
  reuniao_id: 'r',
  modelo: null,
  conteudo: { teor: 'Primeiro parágrafo.\n\nSegundo parágrafo.', campos: {} },
  arrolados: [],
  resolucoes: [],
  deliberacoes: [],
  anexos: [],
}
const documento = {
  id: 'ata',
  contexto_id: contexto.id,
  versao_atual: 1,
  estado: 'APROVADO',
  tipo: 'ATA',
  revisao: 1,
  numero: 3,
  ano: 2026,
  sigla: 'AG',
  versoes: [versao],
}
const livro = {
  contexto_id: contexto.id,
  id: 'livro',
  numero: 1,
  serie: 'ATA_ASSEMBLEIA',
  titular: contexto.nome,
  estado: 'ABERTO',
  modalidade: 'ELETRONICO',
  perfil: 'LOCAL_V1',
  capacidade_folhas: 50,
  capacidade_faces: 100,
  faces_por_folha: 2,
  reserva_exame: 1,
  termos: [],
  registros: [
    {
      id: 'registro',
      ordem: 1,
      natureza: 'ATA_ORIGINAL',
      estado: 'EFETIVADO',
      versao: { documento_id: documento.id, assunto: versao.assunto, numero: 1 },
      inicio: { folha: 1, face: 'FRENTE' },
      fim: { folha: 2, face: 'VERSO' },
      posicao_inicio: 1,
      posicao_fim: 4,
      numero_visivel_inicio: 1,
    },
  ],
  eventos: [],
  complementos: [],
  totais: {
    total_atas: 2,
    paginas_utilizadas: 10,
    folhas_utilizadas: 5,
    saldo_faces: 90,
    saldo_folhas: 45,
    pendencias: 0,
    ultima_posicao: 10,
  },
}

async function capturar(page: Page, tela: string) {
  const destino = process.env.PROVISAO_CAPTURAS
  if (!destino) return
  await mkdir(destino, { recursive: true })
  await page.screenshot({
    path: join(destino, tela + '-' + page.viewportSize()?.width + '.png'),
    animations: 'disabled',
  })
}

async function preparar(page: Page) {
  const erros: string[] = []
  page.on('pageerror', (erro) => erros.push(erro.message))
  await page.route('http://localhost:3000/**', (route) => {
    const url = new URL(route.request().url())
    const respostas: Record<string, unknown> = {
      '/auth/profile': usuario,
      '/oficiais/meu-acesso-sensivel': {},
      '/oficiais': {
        itens: [
          {
            id: 'd',
            ativo: true,
            tipo: 'DIACONO',
            pessoa: { id: 'p', nome_completo: 'Diácono de exemplo' },
          },
        ],
        proximo_cursor: null,
      },
      '/oficiais/mandatos-vigentes': [
        {
          id: 'm',
          data_posse: '2025-01-01',
          termino_previsto: '2027-01-01',
          termino_efetivo: null,
          oficial: { tipo: 'DIACONO', pessoa: { nome_completo: 'Diácono de exemplo' } },
        },
      ],
      '/orgaos': {
        itens: [
          {
            id: 'un',
            tipo: 'UNIDADE_MINISTERIAL',
            constituicao: 'DESIGNACAO',
            ativo: true,
            nome: 'Unidade de exemplo',
            sigla: 'UE',
          },
        ],
        proximo_cursor: null,
      },
      '/orgaos/relogio': { data_operacional: '2026-11-20', fuso_iana: 'America/Sao_Paulo' },
      '/perfil': {
        igreja: 'Igreja de exemplo',
        pessoa: {
          nome_completo: 'Pessoa de exemplo',
          data_nascimento: '1992-01-03',
          email: 'pessoa@example.invalid',
          cidade: 'Cidade de exemplo',
        },
        familia: {
          nome_familia: 'Família de exemplo',
          pessoas: [
            { id: 'p', nome_completo: 'Pessoa de exemplo' },
            { id: 'p2', nome_completo: 'Integrante de exemplo' },
          ],
        },
        contribuicoes: [{ id: 'c', valor: '34.50', data_transacao: '2026-02-10' }],
        eventos: [],
        reunioes: [],
        mandatos: [],
        proposicoes: [],
      },
      '/secretaria/contextos': [
        contexto,
        { ...contexto, id: 'conselho', nome: 'Conselho de exemplo', sigla: 'CO' },
      ],
      '/secretaria/contextos/assembleia/resumo': {
        documentos: 31,
        atas: 30,
        em_edicao: 1,
        reunioes: 12,
      },
      '/secretaria/contextos/conselho/resumo': { documentos: 0, atas: 0, em_edicao: 0, reunioes: 0 },
      '/secretaria/documentos': url.searchParams.get('contexto') === 'assembleia' ? [documento] : [],
      '/secretaria/documentos/ata': documento,
      '/secretaria/reunioes/r': {
        dados: { pauta: 'Revisão do calendário', data: '2026-02-09', local: 'Salão' },
      },
      '/secretaria/livros': [livro],
      '/secretaria/livros/livro': livro,
      '/lancamentos': { data: [], meta: { total: 0 } },
    }
    const headers = {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:4179',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type,x-provisao-request',
    }
    return route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers })
      : route.fulfill({ headers, json: respostas[url.pathname] ?? [] })
  })
  return erros
}

for (const largura of [320, 390, 768, 1440]) {
  test(`Perfil, navegação e segurança em ${largura}px`, async ({ page }) => {
    const erros = await preparar(page)
    await page.setViewportSize({ width: largura, height: 900 })
    await page.goto('/dashboard')
    if (largura < 1024) {
      const menu = page.getByRole('button', { name: 'Abrir menu' })
      await menu.click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    }
    await page.getByRole('button', { name: 'Menu da conta' }).click()
    await page.getByRole('menuitem', { name: 'Meu perfil' }).click()
    await expect(page).toHaveURL(/\/perfil$/)
    await expect(page.getByRole('heading', { name: 'Dados pessoais e contato' })).toBeVisible()
    await capturar(page, 'perfil')
    await page.getByRole('button', { name: 'Vida eclesiástica' }).click()
    await expect(page.getByText('Nenhuma presença registrada.')).toBeVisible()
    await page.getByRole('button', { name: 'Contribuições' }).click()
    await expect(page.getByText(/34,50/)).toBeVisible()
    await page.getByRole('button', { name: 'Segurança' }).click()
    await page.getByLabel('Senha atual', { exact: true }).fill('senha-de-exemplo')
    await page.getByLabel('Nova senha', { exact: true }).fill('nova-de-exemplo')
    await page.getByLabel('Confirmar nova senha').fill('diferente')
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByRole('alert')).toContainText('confirmação')
    expect(erros).toEqual([])
  })

  test(`Mandatos, contextos, leitura de ata e acervo em ${largura}px`, async ({ page }) => {
    test.skip(
      process.env.VITE_FEATURE_SECRETARIA !== 'true' ||
        process.env.VITE_FEATURE_GOVERNANCA !== 'true' ||
        process.env.VITE_FEATURE_ORGAOS !== 'true' ||
        process.env.VITE_FEATURE_SECRETARIA_LIVROS !== 'true',
      'Exige módulos institucionais e livros.',
    )
    const erros = await preparar(page)
    await page.setViewportSize({ width: largura, height: 900 })
    await page.goto('/oficiais')
    await page.getByLabel('Data de referência').fill('2026-01-01')
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '50')
    await capturar(page, 'oficiais')
    await page.goto('/orgaos')
    await page.getByLabel('Filtrar por tipo').selectOption('CONSELHO')
    await expect(page.getByText('Nenhum órgão deste tipo nesta página.')).toBeVisible()
    await page.getByLabel('Filtrar por tipo').selectOption('UNIDADE_MINISTERIAL')
    await expect(page.getByText('Unidade de exemplo (UE)')).toBeVisible()
    await capturar(page, 'orgaos')
    await page.goto('/secretaria')
    await page.getByLabel('Contexto documental').selectOption('conselho')
    await expect(page.getByText('Nenhum documento nesta página.')).toBeVisible()
    await page.getByLabel('Contexto documental').selectOption('assembleia')
    const ficha = page.getByRole('button', { name: 'Visualizar ficha' })
    await capturar(page, 'secretaria')
    await ficha.click()
    await expect(page.getByRole('dialog')).toContainText('Revisão do calendário')
    await expect(page.getByRole('dialog')).not.toContainText('Primeiro parágrafo.')
    await page.keyboard.press('Escape')
    await expect(ficha).toBeFocused()
    await page.getByRole('button', { name: 'Abrir documento' }).click()
    await expect(page).toHaveURL(/secretaria\/assembleia\/documentos\/ata$/)
    await page.reload()
    await expect(page.getByText('Segundo parágrafo.', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Dados do documento' })).toBeVisible()
    await capturar(page, 'documento')
    await page.getByRole('button', { name: 'Voltar ao contexto' }).click()
    await page.getByRole('tab', { name: 'Livros' }).click()
    await page.getByRole('button', { name: 'Consultar livro' }).click()
    await expect(page.getByRole('progressbar')).toHaveAttribute('value', '5')
    await capturar(page, 'livro')
    expect(await page.locator('main#conteudo').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    )
    await page.getByRole('button', { name: 'Abrir documento' }).click()
    await expect(page.getByRole('heading', { name: 'Dados do documento' })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar ao contexto' }).click()
    await expect(page.getByRole('button', { name: 'Voltar ao acervo' })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar ao acervo' }).click()
    await expect(page.getByRole('button', { name: 'Consultar livro' })).toBeVisible()
    expect(erros).toEqual([])
  })
}
