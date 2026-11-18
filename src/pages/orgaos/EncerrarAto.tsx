import { useHojeIgreja } from './RelogioIgreja'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '../../api/client'
import { gestaoOrgaosApi } from '../../api/orgaos'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useIdempotencia } from './useIdempotencia'


export function EncerrarAto({ orgaoId, identidade, ocupacao, tipo, aoFechar }: { orgaoId: string; identidade: string; ocupacao?: { id: string; nome: string }; tipo: 'oficial' | 'unidade' | 'desativar'; aoFechar: () => void }) {
  const hoje = useHojeIgreja()
  const [data, setData] = useState(hoje), [motivo, setMotivo] = useState(''), [autoridade, setAutoridade] = useState(''), [evidencia, setEvidencia] = useState('')
  const chave = useIdempotencia(), queryClient = useQueryClient()
  const salvar = useMutation({ mutationFn: async () => {
    const corpo = { data_efeito: data, motivo: motivo.trim(), autoridade: autoridade.trim(), evidencia: evidencia.trim() }
    const idempotencia = chave.obter({ orgaoId, ocupacao: ocupacao?.id ?? null, tipo, corpo })
    if (tipo === 'desativar') return gestaoOrgaosApi.desativar(orgaoId, { ...corpo, idempotencia })
    if (!ocupacao) throw new Error('Ocupação não selecionada.')
    return gestaoOrgaosApi.encerrarOcupacao(orgaoId, ocupacao.id, tipo, { ...corpo, idempotencia })
  }, onSuccess: async () => { chave.limpar(); await queryClient.invalidateQueries({ queryKey: ['orgaos', identidade] }); aoFechar() } })
  return <form className="max-w-xl space-y-3 rounded border p-4" onSubmit={e => { e.preventDefault(); salvar.mutate() }}>
    <h3 className="font-semibold">{tipo === 'desativar' ? 'Desativar órgão' : `Encerrar ocupação: ${ocupacao?.nome ?? ''}`}</h3>
    <p className="text-sm text-muted-foreground">{tipo === 'desativar' ? 'Ocupações vigentes ou futuras precisam ser resolvidas antes da desativação. O histórico será preservado.' : 'Informe o ato de encerramento. O período anterior será preservado.'}</p>
    <div className="space-y-1"><Label htmlFor="ato-encerramento-data">Data de efeito</Label><Input id="ato-encerramento-data" type="date" value={data} onChange={e => setData(e.target.value)} required /></div>
    <div className="space-y-1"><Label htmlFor="ato-encerramento-motivo">Motivo</Label><Input id="ato-encerramento-motivo" value={motivo} onChange={e => setMotivo(e.target.value)} maxLength={1000} required /></div>
    <div className="space-y-1"><Label htmlFor="ato-encerramento-autoridade">Autoridade do ato</Label><Input id="ato-encerramento-autoridade" value={autoridade} onChange={e => setAutoridade(e.target.value)} maxLength={255} required /></div>
    <div className="space-y-1"><Label htmlFor="ato-encerramento-evidencia">Evidência do ato</Label><Input id="ato-encerramento-evidencia" value={evidencia} onChange={e => setEvidencia(e.target.value)} maxLength={1000} required /></div>
    {salvar.isError && <p role="alert">{salvar.error instanceof ApiRequestError ? salvar.error.messages.join(' ') : 'Não foi possível registrar o encerramento.'}</p>}
    <div className="flex gap-2"><Button type="submit" disabled={salvar.isPending}>Confirmar ato</Button><Button type="button" variant="outline" onClick={aoFechar}>Cancelar</Button></div>
  </form>
}
