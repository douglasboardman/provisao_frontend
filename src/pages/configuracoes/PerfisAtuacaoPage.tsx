import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { autorizacaoApi, type ConcessaoPerfil, type PerfilAtuacao } from '../../api/autorizacao'
import { ApiRequestError } from '../../api/client'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { useAuthStore } from '../../stores/auth'
import { CriarPerfilAtuacao } from './CriarPerfilAtuacao'

function mensagem(erro: unknown, padrao: string) {
  return erro instanceof ApiRequestError ? erro.messages.join(' ') : padrao
}

function dataHora(data: string) {
  return new Date(data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function PerfisAtuacaoPage() {
  const [id, selecionar] = useState('')
  const [criando, criar] = useState(false)
  const ator = useAuthStore(s => s.user)
  const q = useQuery({ queryKey: ['autorizacao', ator?.igreja_id, ator?.sub, 'perfis-atuacao'], queryFn: autorizacaoApi.perfisAtuacao, retry: false })
  if (q.isPending) return <p role="status">Consultando perfis…</p>
  if (q.isError) return <p role="alert">{mensagem(q.error, 'Não foi possível carregar os perfis.')}</p>
  const perfil = q.data.modelos.find(m => m.id === id) ?? q.data.modelos[0]

  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-heading font-bold">Perfis de acesso</h1>
      {q.data.pode_criar && <Button variant={criando ? 'outline' : 'default'} aria-expanded={criando} onClick={() => criar(!criando)}>
        {!criando && <Plus aria-hidden="true"/>}{criando ? 'Fechar formulário' : 'Novo perfil'}
      </Button>}
    </header>
    {criando && <section className="surface">
      <CriarPerfilAtuacao criado={novo => { selecionar(novo); criar(false) }}/>
    </section>}
    {perfil ? <>
      <label className="block max-w-md space-y-1 text-sm font-medium">
        <span>Perfil</span>
        <select className="h-10 w-full rounded-md border border-input bg-card px-3" value={perfil.id} onChange={e => selecionar(e.target.value)}>
          {q.data.modelos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
      </label>
      <DetalhePerfil key={perfil.id} perfil={perfil}/>
    </> : <p className="text-muted-foreground">Nenhum perfil de acesso cadastrado.</p>}
  </div>
}

function DetalhePerfil({ perfil }: { perfil: PerfilAtuacao }) {
  const [usuario, selecionar] = useState('')
  const [fundamento, justificar] = useState('')
  const [revogar, definirRevogacao] = useState<ConcessaoPerfil | null>(null)
  const ator = useAuthStore(s => s.user)
  const cache = useQueryClient()
  const q = useQuery({ queryKey: ['autorizacao', ator?.igreja_id, ator?.sub, 'concessoes-perfil', perfil.id],
    queryFn: () => autorizacaoApi.concessoesPerfil(perfil.id), retry: false })
  const revisar = useMutation({ mutationFn: (id: string) => autorizacaoApi.previaConcessaoPerfil(perfil.id, id) })
  const conceder = useMutation({
    mutationFn: (previa: string) => autorizacaoApi.concederPerfil(perfil.id, usuario, previa, fundamento),
    onSuccess: async () => {
      revisar.reset()
      selecionar('')
      justificar('')
      await cache.invalidateQueries({ queryKey: ['autorizacao'] })
    },
  })
  const pendente = revisar.isPending || conceder.isPending
  const conta = q.data?.contas.find(c => c.id === usuario)
  const previa = conta ? revisar.data : undefined
  const erro = revisar.error ?? conceder.error
  const requisitos = perfil.requisitos ?? [perfil.requisito]

  return <div className="space-y-5">
    <section className="surface space-y-3">
      <h2 className="text-lg font-semibold">{perfil.nome}</h2>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{requisitos.length > 1 ? 'Basta exercer um dos cargos ou mandatos abaixo.' : 'Cargo ou mandato exigido'}</p>
        <ul className="flex flex-wrap gap-2">{requisitos.map(requisito => <li key={requisito}><Badge variant="secondary">{requisito}</Badge></li>)}</ul>
      </div>
      <details className="rounded-lg border p-3 text-sm">
        <summary className="cursor-pointer font-medium">Permissões do perfil ({perfil.acoes.length})</summary>
        <ul className="mt-3 grid list-inside list-disc gap-2 sm:grid-cols-2">
          {perfil.acoes.map(a => <li key={a.acao}>{a.rotulo}</li>)}
        </ul>
      </details>
    </section>
    {q.isPending && <p role="status">Consultando contas e concessões…</p>}
    {q.isError && <p role="alert">{mensagem(q.error, 'Não foi possível consultar as concessões.')}</p>}
    {q.data && <>
      <section className="surface space-y-3">
        <h2 className="font-semibold">Atribuir perfil</h2>
        {conceder.isSuccess && <p role="status" className="text-sm">Perfil atribuído.</p>}
        {erro && <p className="text-sm text-destructive" role="alert">{mensagem(erro, 'Não foi possível registrar a concessão.')}</p>}
        {q.data.contas.length ? <form className="space-y-4" onSubmit={e => {
          e.preventDefault()
          if (previa && previa.itens.some(a => !a.sobreposta) && fundamento.trim() && !pendente) conceder.mutate(previa.previa)
        }}>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block min-w-0 flex-1 basis-64 space-y-1 text-sm font-medium">
              <span>Conta de atuação elegível</span>
              <select className="h-10 w-full rounded-md border border-input bg-card px-3" value={conta ? usuario : ''} disabled={pendente} onChange={e => {
                selecionar(e.target.value)
                justificar('')
                revisar.reset()
                conceder.reset()
              }}>
                <option value="">Selecione uma conta</option>
                {q.data.contas.map(c => <option key={c.id} value={c.id}>{c.nome_usuario} · {c.email_login}</option>)}
              </select>
            </label>
            <Button type="button" variant="outline" disabled={!conta || pendente} onClick={() => {
              conceder.reset()
              revisar.mutate(usuario)
            }}>{revisar.isPending ? 'Consultando…' : 'Gerar prévia'}</Button>
          </div>
          {previa && <div className="space-y-3">
            {previa.requisito && <p className="text-sm font-medium">{previa.requisito}</p>}
            <p className="text-sm text-muted-foreground">
              {previa.fim ? `Em vigor até ${dataHora(previa.fim)}, enquanto houver exercício do mandato ou cargo.` : 'Em vigor enquanto houver exercício do mandato ou cargo.'}
            </p>
            <ul className="divide-y rounded-lg border">
              {previa.itens.map(a => <li key={a.acao} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>{a.rotulo}</span>
                <Badge variant={a.sobreposta ? 'outline' : 'success'}>{a.sobreposta ? 'Há atribuição no período' : 'A conceder'}</Badge>
              </li>)}
            </ul>
            {previa.itens.some(a => !a.sobreposta) && <>
              <label className="block space-y-1 text-sm font-medium">
                <span>Fundamento da concessão</span>
                <Input value={fundamento} maxLength={1000} disabled={pendente} onChange={e => justificar(e.target.value)}/>
              </label>
              <Button disabled={!fundamento.trim() || pendente}>{conceder.isPending ? 'Atribuindo…' : 'Confirmar concessão'}</Button>
            </>}
          </div>}
        </form> : <p className="text-sm text-muted-foreground">Nenhuma conta de atuação atende aos requisitos deste perfil.</p>}
      </section>
      <section className="surface space-y-3">
        <h2 className="font-semibold">Concessões do perfil</h2>
        {q.data.concessoes.length ? <ul className="divide-y rounded-lg border">
          {q.data.concessoes.map(c => <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
            <div className="min-w-0 break-words">
              <p className="font-medium">{c.nome_usuario}</p>
              <p className="text-muted-foreground">{c.email_login} · desde {dataHora(c.inicio)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={c.vigente ? 'success' : 'outline'}>{c.vigente ? 'Vigente' : 'Sem vigência'}</Badge>
              <Button variant="outline" size="sm" aria-label={'Revogar concessão de ' + c.nome_usuario} onClick={() => definirRevogacao(c)}>Revogar</Button>
            </div>
          </li>)}
        </ul> : <p className="text-sm text-muted-foreground">Nenhuma concessão registrada.</p>}
      </section>
    </>}
    {revogar && <RevogarPerfil concessao={revogar} fechar={() => definirRevogacao(null)}/>}
  </div>
}

function RevogarPerfil({ concessao, fechar }: { concessao: ConcessaoPerfil; fechar: () => void }) {
  const [fundamento, justificar] = useState('')
  const cache = useQueryClient()
  const mut = useMutation({
    mutationFn: () => autorizacaoApi.revogarPerfil(concessao.id, fundamento),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['autorizacao'] })
      fechar()
    },
  })
  return <Dialog open onOpenChange={aberto => { if (!aberto && !mut.isPending) fechar() }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Revogar concessão</DialogTitle>
        <DialogDescription>As atribuições concedidas por este perfil serão retiradas da conta {concessao.email_login}.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={e => {
        e.preventDefault()
        if (fundamento.trim() && !mut.isPending) mut.mutate()
      }}>
        <label className="block space-y-1 text-sm font-medium">
          <span>Fundamento da revogação</span>
          <Input value={fundamento} maxLength={1000} disabled={mut.isPending} onChange={e => justificar(e.target.value)}/>
        </label>
        {mut.isError && <p className="text-sm text-destructive" role="alert">{mensagem(mut.error, 'Não foi possível revogar.')}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={mut.isPending} onClick={fechar}>Cancelar</Button>
          <Button variant="destructive" disabled={!fundamento.trim() || mut.isPending}>{mut.isPending ? 'Revogando…' : 'Revogar concessão'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
