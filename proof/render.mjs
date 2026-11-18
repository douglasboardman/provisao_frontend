import { chromium } from '@playwright/test'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { Schema, DOMParser, DOMSerializer } from 'prosemirror-model'
import { schema as basicSchema } from 'prosemirror-schema-basic'
import { tableNodes } from 'prosemirror-tables'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'

// Prova técnica isolada: não cria documentos oficiais nem armazena assinaturas.
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const logo = await readFile(resolve('../logo_app/logo_provisao_128x128px.png')).catch(() => null)
  const image = logo ? `<img width="90" src="data:image/png;base64,${logo.toString('base64')}">` : ''
  const rows = Array.from({ length: 70 }, (_, i) => `<tr><td>${i + 1}</td><td>Registro de deliberação sintética com acentuação</td></tr>`).join('')
  const font = await readFile('node_modules/@fontsource/noto-serif/files/noto-serif-latin-400-normal.woff2')
  const dom = new JSDOM(`<main><h1>Ata de teste — livro 001</h1><p>São Paulo, dezesseis de novembro de dois mil e vinte e seis.</p><table><tbody>${rows}</tbody></table></main>`)
  const schema = new Schema({ nodes: basicSchema.spec.nodes.append(tableNodes({ tableGroup: 'block', cellContent: 'block+' })), marks: basicSchema.spec.marks })
  const parsed = DOMParser.fromSchema(schema).parse(dom.window.document.querySelector('main'))
  globalThis.document = dom.window.document
  globalThis.window = dom.window
  const editor = new EditorView(dom.window.document.body, { state: EditorState.create({ doc: parsed }) })
  editor.dispatch(editor.state.tr.insertText(' (revisada)', 26))
  const state = editor.state
  editor.destroy()
  const container = dom.window.document.createElement('main')
  container.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(state.doc.content, { document: dom.window.document }))
  await page.setContent(`<!doctype html><html lang="pt-br"><style>
    @font-face { font-family: Noto; src: url(data:font/woff2;base64,${font.toString('base64')}) format('woff2'); font-weight: 400; }
    @page { size:A4; margin:25mm 18mm 22mm }
    body { font-family:Noto,serif; font-size:11pt } table { width:100%; border-collapse:collapse }
    th,td { border:1px solid #555; padding:4px } thead { display:table-header-group } tr { break-inside:avoid }
    .assinatura { break-inside:avoid; margin-top:22mm; text-align:center }
    h1 { font-size:16pt } img { max-height:45px; object-fit:contain }
  </style><header>${image}</header>${container.innerHTML}
  <div class="assinatura">________________________________<br>Assinatura de teste</div></html>`)
  await page.evaluate(() => globalThis.document.fonts.ready)
  await mkdir('../output/e00', { recursive: true })
  await page.pdf({ path:'../output/e00/prova.pdf', format:'A4', printBackground:true, displayHeaderFooter:true,
    margin:{top:'25mm',bottom:'22mm',left:'18mm',right:'18mm'},
    headerTemplate:'<div style="font-size:8px; width:100%; text-align:center">ProVisão — documento de prova</div>',
    footerTemplate:'<div style="font-size:8px; width:100%; text-align:center">Livro 001 — página <span class="pageNumber"></span> de <span class="totalPages"></span></div>' })
} finally { await browser.close() }
