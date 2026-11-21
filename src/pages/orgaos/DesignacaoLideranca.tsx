import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { useHojeIgreja } from './RelogioIgreja'
import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '../../api/client'
import { gestaoOrgaosApi, orgaosApi } from '../../api/orgaos'
import { pessoasApi } from '../../api/pessoas'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'


export function DesignacaoLideranca({ orgaoId, identidade, cargos }: { orgaoId: string; identidade: string; cargos: { id: string; nome: string; codigo: string }[] }) {
  const hoje = useHojeIgreja()
  const [aberto, setAberto] = useState(false), [acao, setAcao] = useState<'designar' | 'dispensar'>('designar'), [cargo, setCargo] = useState(''), [pessoa, setPessoa] = useState(''), [data, setData] = useState(hoje), [ordem, setOrdem] = useState(''), [evidencia, setEvidencia] = useState(''), [mensagem, setMensagem] = useState('')
  const tentativa = useRef<{ conteudo: string; id: string } | null>(null)
  const queryClient = useQueryClient()
  const pessoas = useQuery({ queryKey: ['orgaos', identidade, 'pessoas'], queryFn: pessoasApi.list, enabled: aberto && acao === 'designar', gcTime: 0 })
  const historico = useQuery({ queryKey: ['orgaos', identidade, 'ordem-designacao', orgaoId, data], queryFn: () => orgaosApi.detalhe(orgaoId, data), enabled: aberto && !!data, staleTime: 0, gcTime: 0 })
  const salvar = useMutation({
    mutationFn: async () => {
      const corpo = { pessoa_id: acao === 'designar' ? pessoa : null, data_efeito: data, ordem_efeito: Number(ordem), evidencia: evidencia.trim() }
      const conteudo = JSON.stringify({ orgaoId, cargo, corpo })
      if (tentativa.current?.conteudo !== conteudo) tentativa.current = { conteudo, id: crypto.randomUUID() }
      return gestaoOrgaosApi.designar(orgaoId, cargo, { ...corpo, idempotencia: tentativa.current.id })
    },
    onSuccess: async () => { tentativa.current = null; setMensagem('Ato registrado.'); setAberto(false); setPessoa(''); setEvidencia(''); setOrdem(''); await queryClient.invalidateQueries({ queryKey: ['orgaos', identidade] }) },
  })
  const ultima = historico.data?.ultima_ordem_designacao
  const ordemInvalida = !ordem || !Number.isInteger(Number(ordem)) || Number(ordem) < 1 || Number(ordem) > 9999 || (ultima != null && Number(ordem) <= ultima)
  return <div className="space-y-3">
    <Button type="button" variant="outline" onClick={() => { if (!aberto) setData(hoje); setMensagem(''); salvar.reset(); setAberto(v => !v) }}>{aberto ? 'Cancelar designação ou dispensa' : 'Designar ou dispensar líder'}</Button>
    {mensagem && <p role="status">{mensagem}</p>}
    {aberto && <form className="max-w-xl space-y-3 rounded border p-4" onSubmit={e => { e.preventDefault(); if (!ordemInvalida) salvar.mutate() }}>
      <h3 className="font-semibold">Designação ou dispensa</h3>
      <p className="text-sm text-muted-foreground">O ato exige o pastor presidente em exercício. A liderança designada exige pessoa comungante; a dispensa pode deixar o cargo vago.</p>
      <div className="space-y-1"><Label htmlFor="lider-acao">Ação de liderança</Label><select id="lider-acao" className="w-full rounded border bg-background p-2" value={acao} onChange={e => setAcao(e.target.value as typeof acao)}><option value="designar">Designar ou substituir</option><option value="dispensar">Dispensar sem sucessor</option></select></div>
      <div className="space-y-1"><Label htmlFor="lider-cargo">Cargo de liderança</Label><select id="lider-cargo" className="w-full rounded border bg-background p-2" value={cargo} onChange={e => setCargo(e.target.value)} required><option value="">Selecione o cargo</option>{cargos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
      {acao === 'designar' && <div className="space-y-1"><Label htmlFor="lider-pessoa">Pessoa designada</Label><SeletorPessoa id="lider-pessoa" value={pessoa} onChange={id => setPessoa(id)} required opcoes={pessoas.data?.map(p => ({ id: p.id, nome: p.nome_completo }))} />{pessoas.isError && <p role="alert">Não foi possível carregar as pessoas.</p>}</div>}
      <div className="space-y-1"><Label htmlFor="lider-data">Data de efeito da liderança</Label><Input id="lider-data" type="date" value={data} onChange={e => setData(e.target.value)} required /></div>
      <div className="space-y-1"><Label htmlFor="lider-ordem">Sequência do ato no dia</Label><Input id="lider-ordem" type="number" min={1} max={9999} step={1} value={ordem} onChange={e => setOrdem(e.target.value)} required />
        {historico.isPending && <p>Consultando sequência...</p>}{historico.isError && <p role="alert">Não foi possível conferir a sequência.</p>}{historico.data?.ordem_designacao_indeterminada && <p role="alert">Há atos sem sequência conferida nesta data.</p>}{historico.data && !historico.data.ordem_designacao_indeterminada && <p className="text-sm text-muted-foreground">Última sequência registrada para a unidade: {ultima ?? 0}. Informe um número posterior.</p>}</div>
      <div className="space-y-1"><Label htmlFor="lider-evidencia">Referência do ato de liderança</Label><Input id="lider-evidencia" value={evidencia} onChange={e => setEvidencia(e.target.value)} maxLength={1000} required /></div>
      {salvar.isError && <p role="alert">{salvar.error instanceof ApiRequestError ? salvar.error.messages.join(' ') : 'Não foi possível registrar o ato.'}</p>}
      <Button type="submit" disabled={salvar.isPending || !cargo || (acao === 'designar' && !pessoa) || ordemInvalida || historico.isPending || historico.isError || !!historico.data?.ordem_designacao_indeterminada}>Salvar ato</Button>
    </form>}
  </div>
}
