import { useHojeIgreja } from './RelogioIgreja'
import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '../../api/client'
import { gestaoOrgaosApi } from '../../api/orgaos'
import { pessoasApi } from '../../api/pessoas'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'


export function ParticipacaoUnidade({ orgaoId, identidade }: { orgaoId: string; identidade: string }) {
  const hoje = useHojeIgreja()
  const [aberto, setAberto] = useState(false), [acao, setAcao] = useState<'incluir' | 'sair'>('incluir'), [pessoa, setPessoa] = useState(''), [data, setData] = useState(hoje), [evidencia, setEvidencia] = useState(''), [mensagem, setMensagem] = useState('')
  const tentativa = useRef<{ conteudo: string; id: string } | null>(null)
  const queryClient = useQueryClient()
  const pessoas = useQuery({ queryKey: ['orgaos', identidade, 'pessoas'], queryFn: pessoasApi.list, enabled: aberto, gcTime: 0 })
  const salvar = useMutation({
    mutationFn: async () => {
      const corpo = { pessoa_id: pessoa, data_efeito: data, evidencia: evidencia.trim() }
      const conteudo = JSON.stringify({ orgaoId, acao, corpo })
      if (tentativa.current?.conteudo !== conteudo) tentativa.current = { conteudo, id: crypto.randomUUID() }
      return gestaoOrgaosApi.participacao(orgaoId, acao, { ...corpo, idempotencia: tentativa.current.id })
    },
    onSuccess: async () => { tentativa.current = null; setMensagem('Participação atualizada.'); setAberto(false); setPessoa(''); setEvidencia(''); await queryClient.invalidateQueries({ queryKey: ['orgaos', identidade] }) },
  })
  return <div className="space-y-3">
    <Button type="button" variant="outline" onClick={() => { if (!aberto) setData(hoje); setMensagem(''); salvar.reset(); setAberto(v => !v) }}>{aberto ? 'Cancelar participação' : 'Registrar participação'}</Button>
    {mensagem && <p role="status">{mensagem}</p>}
    {aberto && <form className="max-w-xl space-y-3 rounded border p-4" onSubmit={e => { e.preventDefault(); salvar.mutate() }}>
      <h3 className="font-semibold">Participação na unidade</h3>
      <p className="text-sm text-muted-foreground">O sistema confere o rol na inclusão. A saída não substitui a dispensa de um cargo.</p>
      <div className="space-y-1"><Label htmlFor="participacao-acao">Ação</Label><select id="participacao-acao" className="w-full rounded border bg-background p-2" value={acao} onChange={e => setAcao(e.target.value as typeof acao)}><option value="incluir">Incluir</option><option value="sair">Encerrar participação</option></select></div>
      <div className="space-y-1"><Label htmlFor="participacao-pessoa">Pessoa</Label><select id="participacao-pessoa" className="w-full rounded border bg-background p-2" value={pessoa} onChange={e => setPessoa(e.target.value)} required><option value="">Selecione a pessoa</option>{pessoas.data?.map(p => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}</select>{pessoas.isError && <p role="alert">Não foi possível carregar as pessoas.</p>}</div>
      <div className="space-y-1"><Label htmlFor="participacao-data">Data de efeito</Label><Input id="participacao-data" type="date" value={data} onChange={e => setData(e.target.value)} required /></div>
      <div className="space-y-1"><Label htmlFor="participacao-evidencia">Referência ou evidência</Label><Input id="participacao-evidencia" value={evidencia} onChange={e => setEvidencia(e.target.value)} maxLength={1000} required /></div>
      {salvar.isError && <p role="alert">{salvar.error instanceof ApiRequestError ? salvar.error.messages.join(' ') : 'Não foi possível registrar a participação.'}</p>}
      <Button type="submit" disabled={salvar.isPending || !pessoa}>Salvar participação</Button>
    </form>}
  </div>
}
