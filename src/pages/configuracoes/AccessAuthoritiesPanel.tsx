import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accessAuthoritiesApi } from '../../api/access-requests'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { toast } from '../../components/ui/use-toast'
import { ApiRequestError } from '../../api/client'
import { Perfil } from '../../types/enums'
import type { Usuario } from '../../types/models'

export function AccessAuthoritiesPanel({ usuarios }: { usuarios: Usuario[] }) {
  const [target, setTarget] = useState('')
  const [reference, setReference] = useState('')
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['competencias-acesso'], queryFn: accessAuthoritiesApi.list })
  const action = useMutation({
    mutationFn: async (args: { revoke?: string }) => { if (args.revoke) await accessAuthoritiesApi.revoke(args.revoke); else await accessAuthoritiesApi.grant(target, reference) },
    onSuccess: () => { void client.invalidateQueries({ queryKey: ['competencias-acesso'] }); setTarget(''); setReference(''); toast({ title: 'Competência atualizada' }) },
    onError: e => toast({ title: 'Não foi possível atualizar', description: e instanceof ApiRequestError ? e.messages[0] : 'Tente novamente.', variant: 'destructive' }),
  })
  const candidates = usuarios.filter(u => u.perfil === Perfil.GESTOR && u.ativo && u.pessoa_id && !query.data?.some(a => a.usuario_id === u.id))
  return <section className="space-y-3 rounded-lg border p-4">
    <h3 className="font-semibold">Competência para aprovar acessos</h3>
    <p className="text-sm text-muted-foreground">Registre apenas gestores cuja identidade e autoridade foram conferidas. O perfil, por si só, não concede essa competência.</p>
    {query.isError && <p role="alert">Não foi possível carregar as competências.</p>}
    {query.data?.map(a => <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"><div><p>{a.usuario.nome_usuario}{(!a.usuario.ativo || a.usuario.perfil !== Perfil.GESTOR || a.usuario.pessoa_id !== a.pessoa_id) && ' — vínculo ou perfil alterado'}</p><p className="text-sm text-muted-foreground">{a.referencia}</p></div><Button variant="outline" size="sm" disabled={action.isPending} onClick={() => action.mutate({ revoke: a.id })}>Revogar</Button></div>)}
    <div className="grid gap-3 border-t pt-3"><Label htmlFor="gestor-competencia">Gestor vinculado a pessoa</Label><Select value={target} onValueChange={setTarget}><SelectTrigger id="gestor-competencia"><SelectValue placeholder="Selecione o gestor" /></SelectTrigger><SelectContent>{candidates.map(u => <SelectItem key={u.id} value={u.id}>{u.nome_usuario}</SelectItem>)}</SelectContent></Select>
      <Label htmlFor="referencia-competencia">Referência da evidência institucional</Label><Input id="referencia-competencia" maxLength={500} value={reference} onChange={e => setReference(e.target.value)} placeholder="Ex.: ata, data e órgão ou referência externa" />
      <Button disabled={action.isPending || !target || reference.trim().length < 10} onClick={() => action.mutate({})}>Registrar competência</Button>
    </div>
  </section>
}
