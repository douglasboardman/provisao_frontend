import { PainelLocal, SecaoPainel } from '../../components/shared/Painel'
import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { oficiaisApi } from '../../api/oficiais'
import { usuariosApi } from '../../api/usuarios'
import { useAuthStore } from '../../stores/auth'
import { Perfil } from '../../types/enums'
import { ApiRequestError } from '../../api/client'
import { Button } from '../../components/ui/button'
const classe = 'block w-full rounded border bg-background p-2'

export function AcessosSensiveis({ identidade }: { identidade: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [aberto, setAberto] = useState(false), [alvo, setAlvo] = useState(''), [mensagem, setMensagem] = useState('')
  const usuarioAtual = useAuthStore(s => s.user?.sub), client = useQueryClient()
  const usuarios = useQuery({ queryKey: ['oficiais', identidade, 'usuarios-acesso'], queryFn: usuariosApi.list, enabled: aberto })
  const acessos = useQuery({ queryKey: ['oficiais', identidade, 'acessos'], queryFn: oficiaisApi.acessos, enabled: aberto })
  const escolhido = usuarios.data?.find(u => u.id === alvo)
  const conceder = useMutation({ mutationFn: oficiaisApi.concederAcesso, onSuccess: async () => { formRef.current?.reset(); setMensagem('Acesso concedido.'); setAlvo(''); await client.invalidateQueries({ queryKey: ['oficiais', identidade, 'acessos'] }) } })
  const revogar = useMutation({ mutationFn: ({ id, motivo }: { id: string; motivo: string }) => oficiaisApi.revogarAcesso(id, motivo), onSuccess: async () => { setMensagem('Acesso revogado.'); await client.invalidateQueries({ queryKey: ['oficiais', identidade, 'acessos'] }) } })
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMensagem(''); conceder.reset(); const d = new FormData(e.currentTarget)
    conceder.mutate({ usuario_id: alvo, pode_consultar: d.has('consultar'), pode_registrar: d.has('registrar'), fundamento: String(d.get('fundamento') ?? '').trim() })
  }
  function encerrar(e: FormEvent<HTMLFormElement>, id: string) { e.preventDefault(); setMensagem(''); revogar.reset(); revogar.mutate({ id, motivo: String(new FormData(e.currentTarget).get('motivo') ?? '').trim() }) }
  const erro = conceder.error ?? revogar.error
  return <PainelLocal><section className="space-y-3"><Button type="button" variant="outline" onClick={() => setAberto(true)}>Gerir acessos a eventos restritos</Button>
    {aberto && <SecaoPainel titulo="Gerir acessos a eventos restritos" voltar={() => setAberto(false)}><p className="text-sm text-muted-foreground">A concessão é individual e não atribui competência institucional. Não é possível conceder acesso a si próprio.</p>
      {usuarios.isError && <p role="alert">Não foi possível carregar usuários.</p>}{acessos.isError && <p role="alert">Não foi possível carregar concessões.</p>}
      <form ref={formRef} className="max-w-xl space-y-3" onSubmit={enviar}><label className="block">Usuário<SeletorPessoa rotulo="Usuário" value={alvo} required onChange={id => setAlvo(id)} opcoes={usuarios.data?.filter(u => u.ativo && u.id !== usuarioAtual && [Perfil.ADMINISTRADOR, Perfil.GESTOR, Perfil.SECRETARIO, Perfil.AUDITOR, Perfil.COMUM].includes(u.perfil)).map(u => ({ id: u.id, nome: `${u.nome_usuario} — ${u.email_login}` }))} /></label>
        <label className="block"><input type="checkbox" name="consultar" /> Consultar eventos restritos</label><label className="block"><input type="checkbox" name="registrar" disabled={escolhido?.perfil === Perfil.AUDITOR} /> Registrar eventos restritos</label>
        <label className="block">Fundamento da concessão<input className={classe} name="fundamento" required maxLength={1000} /></label><Button type="submit" disabled={!alvo || conceder.isPending}>Conceder acesso</Button>
      </form>
      {erro && <p role="alert">{erro instanceof ApiRequestError ? erro.messages.join(' ') : 'Não foi possível atualizar o acesso.'}</p>}{mensagem && <p role="status">{mensagem}</p>}
      <h3 className="font-medium">Concessões recentes (até 100)</h3>{acessos.data?.map(a => <div key={a.id} className="space-y-2 rounded border p-2"><p>{a.usuario.nome_usuario} — {a.revogado_em ? 'revogada' : 'ativa'} — {a.pode_consultar ? 'consulta ' : ''}{a.pode_registrar ? 'registro' : ''}</p><p>Fundamento: {a.fundamento}</p>{!a.revogado_em && <form className="flex flex-wrap gap-2" onSubmit={e => encerrar(e, a.id)}><label>Motivo da revogação<input className={classe} name="motivo" required maxLength={1000} /></label><Button type="submit" variant="outline" disabled={revogar.isPending}>Revogar acesso</Button></form>}</div>)}
    </SecaoPainel>}
  </section></PainelLocal>
}
