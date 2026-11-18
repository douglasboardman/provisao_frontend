import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { etapasAta, gruposAta, referenciasAtaApi, situacoesAta, tiposFinanceiros, type GrupoAta, type ItemDocumental } from '../../api/referencias-ata'
import { PaginacaoAta, ReferenciaAta } from '../../components/shared/ReferenciaAta'
import { formatarDataCivil } from '../../lib/membresia-temporal'
import { TIPO_LABELS } from '../../lib/membresia-labels'
import { tiposAtosOrgao } from '../orgaos/HistoricoAtos'

function nomeAto(item: ItemDocumental) {
  if (item.grupo === 'MEMBRESIA') return TIPO_LABELS[item.tipo as keyof typeof TIPO_LABELS]
  if (item.grupo === 'FINANCEIRO') return tiposFinanceiros[item.tipo as keyof typeof tiposFinanceiros]
  if (item.grupo === 'ORGAO' && item.etapa === 'ATO') return tiposAtosOrgao[item.tipo] ?? item.tipo
  return etapasAta[item.etapa]
}

function Lista({ itens, identidade, pendencias }: { itens?: ItemDocumental[]; identidade: string; pendencias?: boolean }) {
  if (!itens?.length) return <p>{pendencias ? 'Nenhuma pendência nesta página.' : 'Nenhum vínculo registrado nesta página.'}</p>
  return <ul className="space-y-2">{itens.map(item => <li key={`${item.grupo}:${item.alvo_id}:${item.etapa}`} className="rounded border p-3">
    <p className="font-medium">{item.titulo}</p>
    <p>{gruposAta[item.grupo]} · {nomeAto(item)}{item.data && ` · ${formatarDataCivil(item.data)}`}{item.versao && ` · versão ${item.versao}`}</p>
    <p className="text-muted-foreground">{situacoesAta[item.situacao]}</p>
    {pendencias && <ReferenciaAta alvo={{ grupo: item.grupo, alvo_id: item.alvo_id, etapa: item.etapa }} identidade={identidade} />}
  </li>)}</ul>
}

export function RegistrosVinculados({ id, identidade }: { id: string; identidade: string }) {
  const [pagina, setPagina] = useState(0)
  const consulta = useQuery({ queryKey: ['referencias-ata', identidade, 'vinculados', id, pagina], queryFn: () => referenciasAtaApi.vinculados(id, pagina), gcTime: 0 })
  return <section className="space-y-2 rounded border p-3">
    <h4 className="font-semibold">Registros vinculados a esta ata</h4>
    <p className="text-sm">Confira no acervo se os atos constam no texto da ata.</p>
    {consulta.isPending && <p>Consultando registros…</p>}
    {consulta.isError && <p role="alert">Não foi possível consultar os vínculos.</p>}
    {consulta.data && <Lista itens={consulta.data.itens} identidade={identidade} />}
    <PaginacaoAta pagina={pagina} mudar={setPagina} proxima={consulta.data?.tem_proxima} />
  </section>
}

export function PendenciasDocumentais({ identidade }: { identidade: string }) {
  const [pagina, setPagina] = useState(0)
  const [grupo, setGrupo] = useState<GrupoAta | ''>('')
  const consulta = useQuery({ queryKey: ['referencias-ata', identidade, 'pendencias', pagina, grupo], queryFn: () => referenciasAtaApi.pendencias(pagina, grupo || undefined), gcTime: 0 })
  return <section className="space-y-3 rounded border p-4">
    <h2 className="font-semibold">Pendências documentais</h2>
    <label className="block">Tipo de registro <select className="rounded border bg-background p-2" value={grupo} onChange={e => { setGrupo(e.target.value as GrupoAta | ''); setPagina(0) }}>
      <option value="">Todos os tipos</option>{Object.entries(gruposAta).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
    </select></label>
    {consulta.isPending && <p>Consultando pendências…</p>}
    {consulta.isError && <p role="alert">Não foi possível consultar as pendências documentais.</p>}
    {consulta.data && <>
      {consulta.data.itens.length > 0 && <p role="status" className="rounded border bg-muted/40 p-2">Há registros que aguardam referência, expedição ou correção documental.</p>}
      <Lista itens={consulta.data.itens} identidade={identidade} pendencias />
    </>}
    <PaginacaoAta pagina={pagina} mudar={setPagina} proxima={consulta.data?.tem_proxima} />
  </section>
}
