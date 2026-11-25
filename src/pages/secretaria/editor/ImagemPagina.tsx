import { useEffect, useRef, useState } from 'react'
import type { ImagemPaginaV2 } from '../../../api/pagina-v2'
import { secretariaApi } from '../../../api/secretaria'
import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '../../../components/ui/dialog'

export interface SelecaoImagem {
  atual?: ImagemPaginaV2
  colada?: File
}
export type EnviarImagem = (file: File, signal: AbortSignal) => Promise<string>
const tipos = ['image/png', 'image/jpeg', 'image/webp']

async function dimensoes(file: File) {
  if (!tipos.includes(file.type) || !file.size || file.size > 2 * 1024 * 1024) throw new Error('Escolha uma imagem PNG, JPEG ou WebP de até 2 MB.')
  const src = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = src
    await img.decode()
    if (img.naturalWidth * img.naturalHeight > 16_000_000) throw new Error('A imagem excede 16 megapixels.')
    const escala = Math.min(2.54 / 96, 6 / Math.max(img.naturalWidth, img.naturalHeight))
    return { largura_cm: img.naturalWidth * escala, altura_cm: img.naturalHeight * escala }
  } finally { URL.revokeObjectURL(src) }
}

export function ImagemPagina({ selecao, enviar, resolver, concluir, fechar, restaurar }: {
  selecao: SelecaoImagem; enviar: EnviarImagem; resolver?: (id: string) => string | undefined
  concluir: (imagem: ImagemPaginaV2 | null) => void; fechar: () => void; restaurar: () => void
}) {
  const atual = selecao.atual
  const [arquivo, escolher] = useState(selecao.colada)
  const [descricao, descrever] = useState(atual?.descricao ?? '')
  const [legenda, legendar] = useState(atual?.legenda ?? '')
  const [erro, avisar] = useState('')
  const [ocupado, ocupar] = useState(false)
  const [previa, mostrar] = useState('')
  const operacao = useRef<AbortController | null>(null)
  useEffect(() => () => operacao.current?.abort(), [])
  useEffect(() => {
    if (!arquivo) { mostrar(''); return }
    const url = URL.createObjectURL(arquivo)
    mostrar(url)
    return () => URL.revokeObjectURL(url)
  }, [arquivo])
  async function logo() {
    ocupar(true); avisar('')
    const controle = new AbortController()
    operacao.current = controle
    try {
      escolher(await secretariaApi.logoParaDocumento(controle.signal))
      if (!descricao) descrever('Logo da igreja')
    } catch (e) { if (!controle.signal.aborted) avisar(e instanceof Error ? e.message : 'Logo indisponível.') }
    finally { if (!controle.signal.aborted) ocupar(false) }
  }
  async function gravar() {
    if (ocupado || (!atual && !arquivo)) return
    ocupar(true); avisar('')
    const controle = new AbortController()
    operacao.current = controle
    try {
      let imagem = atual
      if (arquivo) {
        const medidas = await dimensoes(arquivo)
        controle.signal.throwIfAborted()
        const arquivo_id = await enviar(arquivo, controle.signal)
        imagem = atual ? { ...atual, arquivo_id } : {
          tipo: 'imagem', ocorrencia_id: crypto.randomUUID(), arquivo_id, descricao: '', ...medidas,
          manter_proporcao: true, ajuste: 'ajustar', horizontal: 'esquerda', vertical: 'topo',
          x_cm: 0, y_cm: 0, relacao: 'em_linha', opacidade: 1, distancia_texto_cm: 0,
        }
      }
      if (imagem) concluir({ ...imagem, descricao: descricao.trim(), legenda: legenda.trim() || undefined })
    } catch (e) { if (!controle.signal.aborted) avisar(e instanceof Error ? e.message : 'Falha ao enviar a imagem.') }
    finally { if (!controle.signal.aborted) ocupar(false) }
  }
  const src = previa || (atual && resolver?.(atual.arquivo_id))
  return <Dialog open onOpenChange={open => { if (!open && !ocupado) fechar() }}><DialogContent aria-describedby={undefined}
    onCloseAutoFocus={e => { e.preventDefault(); restaurar() }}>
    <DialogTitle>{atual ? 'Editar imagem' : 'Inserir imagem'}</DialogTitle>
    <fieldset disabled={ocupado} className="grid gap-3">
      <label className="grid gap-1">{atual ? 'Substituir imagem' : 'Arquivo da imagem'}
        <input type="file" accept={tipos.join(',')} onChange={e => { if (e.target.files?.[0]) { escolher(e.target.files[0]); avisar('') } }}/></label>
      <Button type="button" variant="outline" onClick={logo}>Usar logo da igreja</Button>
      {src && <img src={src} alt="Prévia da imagem selecionada" className="max-h-32 max-w-full object-contain"/>}
      <label className="grid gap-1">Descrição acessível<input maxLength={255} value={descricao} onChange={e => descrever(e.target.value)}/></label>
      <label className="grid gap-1">Legenda visível (opcional)<input maxLength={255} value={legenda} onChange={e => legendar(e.target.value)}/></label>
      <div className="flex flex-wrap justify-end gap-2">
        {atual && <Button type="button" variant="outline" onClick={() => concluir(null)}>Remover imagem</Button>}
        <Button type="button" variant="outline" onClick={fechar}>Cancelar</Button>
        <Button type="button" disabled={!arquivo && !atual} onClick={gravar}>{atual ? 'Aplicar' : 'Inserir'}</Button>
      </div>
    </fieldset>
    {ocupado && <p role="status">Carregando imagem…</p>}{erro && <p role="alert">{erro}</p>}
  </DialogContent></Dialog>
}
