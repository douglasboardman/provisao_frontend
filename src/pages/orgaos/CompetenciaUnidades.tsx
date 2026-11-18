import { useHojeIgreja } from './RelogioIgreja'
import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '../../api/client'
import { gestaoOrgaosApi } from '../../api/orgaos'
import { usuariosApi } from '../../api/usuarios'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Perfil } from '../../types/enums'


export function CompetenciaUnidades({ identidade }: { identidade: string }) {
  const hoje = useHojeIgreja()
  const [aberto, setAberto] = useState(false), [usuario, setUsuario] = useState(''), [inicio, setInicio] = useState(hoje), [fim, setFim] = useState(''), [autoridade, setAutoridade] = useState(''), [evidencia, setEvidencia] = useState(''), [mensagem, setMensagem] = useState('')
  const tentativa = useRef<{ conteudo: string; id: string } | null>(null)
  const queryClient = useQueryClient()
  const usuarios = useQuery({ queryKey: ['orgaos', identidade, 'usuarios'], queryFn: usuariosApi.list, enabled: aberto, gcTime: 0 })
  const salvar = useMutation({
    mutationFn: async () => {
      const corpo = { usuario_id: usuario, inicio, ...(fim ? { fim } : {}), autoridade: autoridade.trim(), evidencia: evidencia.trim() }
      const conteudo = JSON.stringify(corpo)
      if (tentativa.current?.conteudo !== conteudo) tentativa.current = { conteudo, id: crypto.randomUUID() }
      return gestaoOrgaosApi.registrarCompetencia({ ...corpo, idempotencia: tentativa.current.id })
    },
    onSuccess: async () => { tentativa.current = null; setMensagem('Competência registrada.'); setAberto(false); setUsuario(''); setFim(''); setAutoridade(''); setEvidencia(''); await queryClient.invalidateQueries({ queryKey: ['orgaos', identidade, 'autoridades'] }) },
  })
  return <section className="space-y-3">
    <Button type="button" variant="outline" onClick={() => { if (!aberto) setInicio(hoje); setMensagem(''); salvar.reset(); setAberto(v => !v) }}>{aberto ? 'Cancelar registro de competência' : 'Registrar competência de gestor'}</Button>
    {mensagem && <p role="status">{mensagem}</p>}
    {aberto && <form className="max-w-2xl space-y-3 rounded border p-4" onSubmit={e => { e.preventDefault(); salvar.mutate() }}>
      <h2 className="font-semibold">Competência para unidades ministeriais</h2>
      <p className="text-sm text-muted-foreground">Registre a autoridade e a evidência conferidas. O perfil de gestor, sozinho, não estabelece essa competência.</p>
      <div className="space-y-1"><Label htmlFor="competencia-gestor">Gestor vinculado a pessoa</Label><select id="competencia-gestor" className="w-full rounded border bg-background p-2" value={usuario} onChange={e => setUsuario(e.target.value)} required><option value="">Selecione o gestor</option>{usuarios.data?.filter(u => u.ativo && u.perfil === Perfil.GESTOR && u.pessoa_id).map(u => <option key={u.id} value={u.id}>{u.nome_usuario}</option>)}</select>{usuarios.isError && <p role="alert">Não foi possível carregar os usuários.</p>}</div>
      <div className="space-y-1"><Label htmlFor="competencia-inicio">Início da competência</Label><Input id="competencia-inicio" type="date" value={inicio} onChange={e => setInicio(e.target.value)} required /></div>
      <div className="space-y-1"><Label htmlFor="competencia-fim">Primeiro dia sem competência (opcional)</Label><Input id="competencia-fim" type="date" min={inicio} value={fim} onChange={e => setFim(e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="competencia-autoridade">Autoridade declarada</Label><Input id="competencia-autoridade" value={autoridade} onChange={e => setAutoridade(e.target.value)} maxLength={255} required /></div>
      <div className="space-y-1"><Label htmlFor="competencia-evidencia">Referência ou evidência</Label><Input id="competencia-evidencia" value={evidencia} onChange={e => setEvidencia(e.target.value)} maxLength={1000} required /></div>
      {salvar.isError && <p role="alert">{salvar.error instanceof ApiRequestError ? salvar.error.messages.join(' ') : 'Não foi possível registrar a competência.'}</p>}
      <Button type="submit" disabled={salvar.isPending || !usuario}>Salvar competência</Button>
    </form>}
  </section>
}
