import { mkdir, mkdtemp } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { URL } from 'node:url'
import { log } from 'node:console'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

// Executar na raiz do frontend. Cada rodada ganha uma pasta própria.
const pasta = resolve('../output/playwright/interface')
await mkdir(pasta, { recursive: true })
const destino = await mkdtemp(join(pasta, 'captura-'))
const igreja = { id: 'e0000000-0000-4000-8000-000000000001', nome: 'Igreja Exemplo' }
const pessoa = { id: 'p1', nome_completo: 'Ana de Exemplo', sexo: 'FEMININO', data_nascimento: '1990-05-04', email: 'ana@example.invalid' }
const lancamento = { id: 'l1', tipo_transacao: 'RECEITA', valor: 120, data_transacao: '2026-11-10T12:00:00Z', observacao: 'Oferta de exemplo' }
const respostas = {
  igrejas: [igreja],
  'auth/profile': { sub: 'u1', username: 'Admin Exemplo', login: 'admin@example.invalid', igreja_id: igreja.id, perfil: 'ADMINISTRADOR' },
  pessoas: [pessoa],
  lancamentos: { data: [lancamento], meta: { total: 1 } },
  acoes: [], contas: [], tratamentos: [], 'grupos-familiares': [], 'eventos-membresia': [],
  'regras-relacao-enum/modulo/membresia': [], 'oficiais/notificacoes': [],
}
const prefixo = '/__api_visual/'
const servidor = await createServer({
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify(prefixo.slice(0, -1)) },
  server: { host: '127.0.0.1', port: 4180, strictPort: true, open: false },
  logLevel: 'error',
})
let navegador
try {
  await servidor.listen()
  navegador = await chromium.launch()
  const origem = servidor.resolvedUrls.local[0]
  const page = await navegador.newPage({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' })
  const erros = new Set()
  page.on('pageerror', erro => erros.add(erro.message))
  await page.route('**' + prefixo + '**', route => {
    const chave = new URL(route.request().url()).pathname.slice(prefixo.length)
    if (route.request().method() !== 'GET') return route.fulfill({ status: 405 })
    if (!Object.hasOwn(respostas, chave)) {
      erros.add('Falta resposta de exemplo para ' + chave)
      return route.fulfill({ status: 404 })
    }
    return route.fulfill({ json: respostas[chave] })
  })
  for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
    await page.setViewportSize({ width, height })
    for (const tela of ['login', 'dashboard', 'pessoas']) {
      await page.goto(new URL(tela, origem).href)
      if (tela === 'login') await page.getByRole('option', { name: igreja.nome }).waitFor({ state: 'attached' })
      if (tela === 'dashboard') await page.getByText(lancamento.observacao).waitFor()
      if (tela === 'pessoas') await page.getByText(pessoa.nome_completo).waitFor()
      await page.evaluate(() => globalThis.document.fonts.ready)
      await page.screenshot({ path: join(destino, tela + '-' + width + '.png'), animations: 'disabled' })
    }
  }
  if (erros.size) throw new Error([...erros].join('\n'))
  log(destino)
} finally {
  await navegador?.close()
  await servidor.close()
}
