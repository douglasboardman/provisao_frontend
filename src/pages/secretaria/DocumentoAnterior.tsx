import { useBiblioteca } from './BibliotecaCampos'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apresentar, type ValorCampo, type Valores } from '../../api/campos'
import { secretariaApi, type ModeloVersao, type PreviaOrigem, type VersaoInput } from '../../api/secretaria'
import type { BuscaAtaOpcao } from '../../api/referencias-ata'
import { descreverAta, SeletorAta } from '../../components/shared/SeletorAta'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog'

interface Props {
  v: VersaoInput; modelo: ModeloVersao; contexto: string; identidade?: string; documento?: string; restrito: boolean
  aplicar: (previa: PreviaOrigem | null) => void
}
function exibir(valor?: ValorCampo) {
  return valor && apresentar({ tipo: 'campo', campo_id: '', apresentacao: valor.multiplo ? 'lista_marcadores' : 'individual' }, valor) || 'A preencher'
}
export function valoresSemOrigem(valores: Valores = {}) {
  return Object.fromEntries(Object.entries(valores).filter(([,c]) => c.origem.tipo !== 'documento_anterior'))
}
export function DocumentoAnterior({ v, modelo, contexto, identidade, documento, restrito, aplicar }: Props) {
  const [selecao, escolher] = useState<BuscaAtaOpcao | 'limpar' | null>(null)
  const id = selecao && selecao !== 'limpar' ? selecao.versao_id : ''
  const ata = modelo.tipo === 'ATA'
  const reuniao = ata ? v.reuniao_id ?? undefined : undefined
  const sugestoes = useQuery({
    queryKey: ['secretaria', identidade, 'convocatorias', contexto, modelo.id, reuniao, restrito],
    queryFn: () => secretariaApi.selecaoMotivadores({ modelo_destino: modelo.id, reuniao_id: reuniao!, restrito: String(restrito) }),
    enabled: !!reuniao && !v.motivador_id, gcTime: 0,
  })
  const unica = !sugestoes.data?.tem_proxima && sugestoes.data?.itens.length === 1 ? sugestoes.data.itens[0] : undefined
  const previa = useQuery({
    queryKey: ['secretaria',identidade,'previa-antecedente',modelo.id,restrito,documento,id,reuniao],
    queryFn: () => secretariaApi.previaOrigem({ modelo_versao_id: modelo.id, origem_id: id, restrito, reuniao_id: reuniao, excluir: documento }),
    enabled: !!id, retry: false, gcTime: 0,
  })
  const salvos = v.conteudo.valores ?? {}
  const novos = previa.data?.valores ?? {}
  const afetados = [...new Set([...Object.keys(novos), ...Object.keys(salvos).filter(k => salvos[k].origem.tipo === 'documento_anterior')])]
  const temAjuste = afetados.some(k => salvos[k]?.ajustado_manualmente)
  const pronto = selecao === 'limpar' || (!!previa.data && !previa.isFetching && !previa.error)
  if (ata && !reuniao) return <p>Selecione a reunião para consultar suas convocações expedidas.</p>
  return <section className="space-y-2">
    {unica && !v.motivador_id && <Button type="button" variant="outline" onClick={() => escolher(unica)}>Usar convocação sugerida · {descreverAta(unica)}</Button>}
    {sugestoes.data?.itens.length === 0 && <p>Nenhuma convocação expedida compatível com esta reunião.</p>}
    {sugestoes.isError && <p role="alert">{sugestoes.error.message}</p>}
    <SeletorAta documento label="Documento anterior" contextoInicial={contexto} valor={v.conteudo.antecedente?.identificacao ?? (v.motivador_id ? 'Versão vinculada' : '')}
      chave={[identidade, 'antecedentes', contexto, modelo.id, documento, restrito, reuniao]}
      buscar={f => secretariaApi.selecaoMotivadores({ ...f, ...(reuniao && { reuniao_id: reuniao }), modelo_destino: modelo.id, restrito: String(restrito), ...(documento ? { excluir: documento } : {}) })}
      selecionar={a => { if (a.versao_id !== v.motivador_id) escolher(a) }} limpar={() => escolher('limpar')}/>
    {modelo.configuracao.motivador === 'OBRIGATORIO' && !v.motivador_id && <p>Selecione um documento expedido para criar o vínculo obrigatório.</p>}
    {selecao && <Dialog open onOpenChange={aberto => { if (!aberto) escolher(null) }}><DialogContent className="max-w-2xl">
      <DialogTitle>{selecao === 'limpar' ? 'Remover documento anterior' : 'Conferir documento anterior'}</DialogTitle>
      <DialogDescription>{selecao === 'limpar' ? v.conteudo.antecedente?.identificacao : descreverAta(selecao)}</DialogDescription>
      {id && previa.isFetching && <p role="status">Consultando os campos da versão expedida…</p>}
      {id && previa.error && <p role="alert">{previa.error.message}</p>}
      {pronto && afetados.length > 0 && <table className="record-table"><thead><tr><th>Campo</th><th>Valor atual</th><th>Após a alteração</th></tr></thead>
        <tbody>{afetados.map(k => <tr key={k}><th>{modelo.configuracao.definicoes?.[k]?.nome}</th>
          <td className="whitespace-pre-line">{exibir(salvos[k])}{salvos[k]?.ajustado_manualmente && <small className="block">Editado manualmente</small>}</td>
          <td className="whitespace-pre-line">{exibir(novos[k])}</td></tr>)}</tbody></table>}
      {temAjuste && pronto && <p>Ao confirmar, os valores editados acima serão substituídos.</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => escolher(null)}>Cancelar</Button>
        <Button type="button" disabled={!pronto} onClick={() => { aplicar(selecao === 'limpar' ? null : previa.data!); escolher(null) }}>
          {temAjuste ? 'Confirmar substituição' : selecao === 'limpar' ? 'Remover vínculo' : 'Usar documento anterior'}</Button></div>
    </DialogContent></Dialog>}
  </section>
}

export function ConferirDataConvocada({ valores, dataReuniao }: { valores: Valores; dataReuniao: string }) {
  const biblioteca = useBiblioteca()
  const campos = biblioteca.data?.filter(c => c.codigo === 'DATA_REUNIAO' || c.origem === 'data_prevista_reuniao').map(c => c.id) ?? []
  const datas = Object.values(valores).filter(v => v.origem.tipo === 'documento_anterior' && campos.includes(v.origem.campo_id) && v.tipo === 'data' && !v.multiplo)
  const prevista = datas.find(v => typeof v.valor === 'string' && v.valor !== dataReuniao.slice(0,10))
  if (!prevista) return null
  return <p role="status">Data convocada em {exibir(prevista)}. A reunião vinculada ocorreu em {dataReuniao.slice(0,10).split('-').reverse().join('/')}.</p>
}
