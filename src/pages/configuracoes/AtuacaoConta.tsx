import { useCanAccessModule } from '../../hooks/use-permissions'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { autorizacaoApi, servicos, type Servico, type AtuacaoConta, type ComparacaoConversao } from '../../api/autorizacao'
import { ApiRequestError } from '../../api/client'
import { Button } from '../../components/ui/button'
import { Abas, type Aba } from '../../components/ui/abas'
import { Input } from '../../components/ui/input'
import { useAuthStore } from '../../stores/auth'
import type { Usuario } from '../../types/models'
import { Perfil } from '../../types/enums'
import { CriarPerfilAtuacao } from './CriarPerfilAtuacao'

function Cargos({ dados }: { dados: AtuacaoConta }) {
  return <div className="space-y-2"><h3 className="font-semibold">Acessos por cargo</h3>
    {dados.cargos_propostos.length ? <ul className="divide-y rounded-lg border">{dados.cargos_propostos.map(c =>
      <li key={c.contexto_id + c.origem_id} className="flex flex-wrap items-baseline justify-between gap-x-4 px-3 py-2 text-sm">
        <span className="font-medium">{c.cargo}</span><span className="text-muted-foreground">{c.contexto}</span>
      </li>)}</ul> : <p className="text-sm text-muted-foreground">Nenhum cargo vigente habilitado nesta conta.</p>}</div>
}

export function MinhaContaComum() {
  const ator = useAuthStore(s => s.user)
  const secretaria = useCanAccessModule('secretaria')
  const q = useQuery({ queryKey: ['autorizacao', ator?.igreja_id, ator?.sub, 'me'], queryFn: autorizacaoApi.me, gcTime: 0 })
  if (q.isPending) return <p>Consultando sua conta…</p>
  if (q.isError) return <p role="alert">Não foi possível consultar sua atuação.</p>
  const ativos = q.data.servicos_propostos.filter(s => s.permite)
  return <section className="surface space-y-4"><h1 className="text-xl font-semibold">Minha atuação</h1>
    <p>{q.data.conta_atuacao ? 'Conta selecionada para atuação institucional.' : 'Conta comum.'}</p>
    {ator?.recursos?.secretaria !== false && secretaria && <a href="/secretaria" className="inline-block underline">Abrir Secretaria</a>}
    {!q.data.conta_atuacao && <p>Solicite a seleção desta conta para atuação institucional em Configurações → Usuários.</p>}
    <Cargos dados={q.data}/><h3 className="font-semibold">Serviços vigentes</h3>
    {ativos.length ? <ul>{ativos.map(s => <li key={s.acao}>{s.rotulo ?? nomeServico(s.acao)}</li>)}</ul> : <p>Nenhum serviço vigente.</p>}
  </section>
}

export function AcessosDaConta({ usuario }: { usuario: Usuario }) {
  const [aba, selecionar] = useState('atuacao')
  const [fundamento, justificar] = useState(''), [acao, escolher] = useState<Servico>('')
  const [inicio, iniciar] = useState(''), [fim, terminar] = useState('')
  const ator = useAuthStore(s => s.user)
  const cache = useQueryClient()
  const chave = ['autorizacao', ator?.igreja_id, ator?.sub, usuario.id]
  const q = useQuery({ queryKey: chave, queryFn: () => autorizacaoApi.conta(usuario.id), gcTime: 0 })
  const alterar = useMutation({ mutationFn: (executar: () => Promise<unknown>) => executar(),
    onSuccess: async () => { justificar(''); await cache.invalidateQueries({ queryKey: ['autorizacao'] }) },
    onError: () => { void q.refetch() } })
  if (!q.data) return <p className="px-4 py-4 text-sm sm:px-6" role="status">{q.isError ? 'Não foi possível consultar a conta.' : 'Consultando atribuições…'}</p>
  const dados = q.data, pronto = fundamento.trim().length > 0 && !alterar.isPending
  const elegivel = !!dados.pessoa_id && usuario.ativo && ![Perfil.ADMINISTRADOR, Perfil.AUDITOR].includes(usuario.perfil)
  const executar = (fn: () => Promise<unknown>) => alterar.mutate(fn)
  const catalogo = dados.catalogo ?? Object.entries(servicos).filter(([s]) =>
    (usuario.perfil !== Perfil.AUDITOR || s === 'AUDITORIA_CONSULTAR') &&
    (s !== 'PRESIDENCIA_CONFERIR' || usuario.perfil === Perfil.ADMINISTRADOR)).map(([acao, rotulo]) => ({ acao, rotulo }))
  const rotulos = new Map(catalogo.map(s => [s.acao, s.rotulo]))
  for (const s of dados.servicos_propostos) {
    if (s.rotulo) rotulos.set(s.acao, s.rotulo)
  }
  const selecionado = catalogo.find(s => s.acao === acao)?.acao ?? catalogo[0]?.acao
  const podeConceder = usuario.ativo && !!dados.pessoa_id && !!selecionado
  const abas: Aba[] = [
    { id: 'atuacao', nome: 'Atuação', conteudo: <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/50 p-4">
        <div className="space-y-1">
          <h3 className="font-semibold">Conta de atuação institucional</h3>
          <p className="text-sm text-muted-foreground">{dados.conta_atuacao ? 'Conta selecionada para atuação institucional.' :
            dados.selecionada_id ? 'A atuação institucional usa outra conta desta pessoa.' : 'Esta conta não está selecionada para atuação institucional.'}</p>
        </div>
        {elegivel && <Button variant="outline" disabled={!pronto} onClick={() => executar(() =>
          autorizacaoApi.escolher(dados.pessoa_id!, dados.selecionada_id ?? null, dados.conta_atuacao ? null : usuario.id, fundamento))}>
          {dados.conta_atuacao ? 'Retirar conta de atuação' : dados.selecionada_id ? 'Trocar a atuação para esta conta' : 'Selecionar como conta de atuação'}
        </Button>}
      </section>
      <Cargos dados={dados}/>
    </div> },
    { id: 'atribuicoes', nome: 'Atribuições', manter: true, conteudo: <div className="space-y-4">
      {podeConceder && <details className="group rounded-lg border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-sm font-semibold text-purple">
          Nova atribuição <ChevronDown className="size-4 group-open:rotate-180" aria-hidden="true"/>
        </summary>
        <form className="space-y-3 border-t p-3" onSubmit={e => {
          e.preventDefault()
          if (!pronto || !selecionado) return
          executar(() => autorizacaoApi.conceder(usuario.id, selecionado, inicio ? new Date(inicio).toISOString() : new Date().toISOString(),
            fim ? new Date(fim).toISOString() : null, fundamento))
        }}>
          <label className="block space-y-1 text-sm font-medium">
            <span>Serviço</span>
            <select className="h-10 w-full rounded-md border border-input bg-card px-3" value={selecionado} onChange={e => escolher(e.target.value)}>
              {catalogo.map(s => <option key={s.acao} value={s.acao}>{s.rotulo}</option>)}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block min-w-0 space-y-1 text-sm font-medium">
              <span>Início (em branco para começar agora)</span>
              <Input type="datetime-local" value={inicio} onChange={e => iniciar(e.target.value)}/>
            </label>
            <label className="block min-w-0 space-y-1 text-sm font-medium">
              <span>Fim (opcional)</span>
              <Input type="datetime-local" value={fim} onChange={e => terminar(e.target.value)}/>
            </label>
          </div>
          <Button disabled={!pronto}>Registrar atribuição</Button>
        </form>
      </details>}
      <section className="space-y-2">
        <h3 className="font-semibold">Atribuições de serviço na igreja</h3>
        {dados.atribuicoes.length ? <ul className="divide-y rounded-lg border">{dados.atribuicoes.map(r => {
          const rotulo = rotulos.get(r.acao) ?? nomeServico(r.acao)
          return <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-sm">
            <div className="min-w-0 break-words">
              <p className="font-medium">{rotulo}</p>
              <p className="text-xs text-muted-foreground">{dataHora(r.inicio)} até {r.fim ? dataHora(r.fim) : 'revogação'}</p>
            </div>
            {r.concessao_modelo_id ?
              <Link className="text-xs font-medium text-purple hover:underline" to="/perfis-atuacao">Concedida por perfil</Link> :
              <Button variant="outline" size="sm" disabled={!pronto} aria-label={'Revogar ' + rotulo}
                onClick={() => executar(() => autorizacaoApi.revogar(r.id, fundamento))}>Revogar</Button>}
          </li>
        })}</ul> : <p className="text-sm text-muted-foreground">Nenhuma atribuição registrada para esta conta.</p>}
        {!dados.pessoa_id && <p className="text-sm">Vincule a pessoa para atribuir serviços ou converter o perfil.</p>}
      </section>
    </div> },
  ]
  if (dados.pode_salvar_modelo_atuacao) abas.push({ id: 'perfis', nome: 'Perfis',
    conteudo: <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Criar perfil com as permissões desta conta</h3>
        <Link className="text-sm font-medium text-purple hover:underline" to="/perfis-atuacao">Gerenciar perfis</Link>
      </div>
      <CriarPerfilAtuacao iniciais={dados.servicos_propostos.filter(s => s.permite &&
        dados.atribuicoes.some(r => r.acao === s.acao && !r.concessao_modelo_id)).map(s => s.acao)}/>
    </div> })
  if (dados.pode_converter && dados.catalogo) abas.push({ id: 'conversao', nome: 'Conversão', manter: true,
    conteudo: <ConverterConta id={usuario.id} catalogo={dados.catalogo} competencias={dados.competencias ?? []}/> })
  const ativa = abas.some(a => a.id === aba) ? aba : 'atuacao'
  const pedeFundamento = ativa === 'atuacao' ? elegivel : ativa === 'atribuicoes' && (podeConceder || dados.atribuicoes.length > 0)

  return <>
    <Abas titulo="Atuação da conta" abas={abas} ativa={ativa} selecionar={selecionar} rolagemInterna/>
    {(pedeFundamento || alterar.isError || alterar.isSuccess) && <div className="shrink-0 space-y-2 border-t bg-card px-4 py-3 text-sm sm:px-6">
      {pedeFundamento && <label className="block space-y-1 font-medium">
        <span>Fundamento da alteração</span>
        <Input value={fundamento} maxLength={1000} onChange={e => justificar(e.target.value)}/>
      </label>}
      {alterar.isError && <p className="text-destructive" role="alert">{alterar.error instanceof ApiRequestError ? alterar.error.messages[0] : 'Não foi possível registrar a alteração.'}</p>}
      {alterar.isSuccess && <p role="status">Alteração registrada.</p>}
    </div>}
  </>
}

export function ConferenciaPresidencia({ id }: { id: string }) {
  const [fundamento, justificar] = useState('')
  const mut = useMutation({ mutationFn: (etapa: 'conferir' | 'encaminhar') => autorizacaoApi.presidencia(id, etapa, fundamento), onSuccess: () => justificar('') })
  return <details className="my-2"><summary>Conferência para atuação institucional</summary>
    <label className="block">Ato de origem ou evidência conferida<Input value={fundamento} maxLength={1000} onChange={e => justificar(e.target.value)}/></label>
    {(['encaminhar','conferir'] as const).map(etapa => <Button key={etapa} disabled={!fundamento.trim() || mut.isPending} variant="outline" onClick={() => mut.mutate(etapa)}>
      {etapa === 'encaminhar' ? 'Encaminhar comprovação' : 'Registrar revisão independente'}</Button>)}
    {mut.isError && <p role="alert">{mut.error instanceof ApiRequestError ? mut.error.messages[0] : 'Falha ao registrar a conferência.'}</p>}
    {mut.isSuccess && <p role="status">Registro concluído.</p>}</details>
}

export function HistoricoAcessos({ usuarios }: { usuarios: Usuario[] }) {
  const [cursor, paginar] = useState<string>()
  const ator = useAuthStore(s => s.user)
  const q = useQuery({ queryKey: ['autorizacao', ator?.igreja_id, ator?.sub, 'historico', cursor],
    queryFn: () => autorizacaoApi.historico(cursor), gcTime: 0 })
  const nomes = new Map(usuarios.map(u => [u.id, u.nome_usuario]))
  return <section className="surface space-y-3"><h3 className="font-semibold">Histórico de autorização</h3>
    <div className="space-y-2">{q.isPending ? <p role="status">Consultando histórico…</p> : q.isError ? <p role="alert">Histórico indisponível.</p> :
      <>{!q.data.itens.length && <p>Nenhuma decisão registrada.</p>}{q.data.itens.map(e => <article key={e.id} className="rounded border p-2">
        <p className="font-semibold">{e.dados.acao ?? e.acao} · {new Date(e.instante).toLocaleString()}</p>
        <p>Operador {nomes.get(e.operador_id) ?? e.operador_id}{e.destinatario_id && ' · Conta avaliada ' + (nomes.get(e.destinatario_id) ?? e.destinatario_id)}</p>
        {e.acao === 'DIVERGENCIA' && <p>Política atual {e.dados.legado ? 'permite' : 'recusa'} · Proposta {e.dados.proposta ? 'permite' : 'recusa'}</p>}
        <p>{e.fundamento}</p>{e.recurso_id && <small>Recurso {e.recurso_id}</small>}</article>)}
        {cursor && <Button variant="outline" onClick={() => paginar(undefined)}>Mais recentes</Button>}
        {q.data.proximo_cursor && <Button variant="outline" onClick={() => paginar(q.data.proximo_cursor!)}>Mais antigos</Button>}</>}</div>
  </section>
}

function nomeServico(acao: Servico) {
  return servicos[acao as keyof typeof servicos] ?? acao
}

function dataHora(instante: string) {
  return new Date(instante).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function ConverterConta({ id, catalogo, competencias }: {
  id: string; catalogo: NonNullable<AtuacaoConta['catalogo']>; competencias: NonNullable<AtuacaoConta['competencias']>
}) {
  const [acoes, escolher] = useState<Servico[]>([])
  const [contextuais, escolherContextuais] = useState<string[]>([])
  const [fundamento, justificar] = useState('')
  const [previa, definirPrevia] = useState<ComparacaoConversao | null>(null)
  const cache = useQueryClient()
  const revisar = useMutation({ mutationFn: () => autorizacaoApi.previaConversao(id, acoes, contextuais), onSuccess: definirPrevia })
  const converter = useMutation({
    mutationFn: () => autorizacaoApi.converter(id, acoes, contextuais, previa!.previa, fundamento),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['autorizacao'] })
      void cache.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })
  const erro = revisar.error ?? converter.error
  return <section className="space-y-4">
    <h3 className="font-semibold">Converter perfil legado em conta comum</h3>
    <p>Escolha as operações que a conta deve exercer. A prévia compara as rotas. A conversão encerra as sessões ativas e preserva a seleção de atuação já registrada.</p>
    <div className="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2">
      {catalogo.filter(s => s.acao !== 'PRESIDENCIA_CONFERIR').map(s => <label key={s.acao} className="flex items-start gap-2">
        <input type="checkbox" checked={acoes.includes(s.acao)} onChange={e => {
          escolher(e.target.checked ? [...acoes, s.acao] : acoes.filter(acao => acao !== s.acao))
          definirPrevia(null)
        }} />{s.rotulo}
      </label>)}
    </div>
    {competencias.length > 0 && <fieldset className="space-y-2">
      <legend>Competências da Secretaria a conservar</legend>
      {competencias.map(c => <label key={c.id} className="flex items-start gap-2">
        <input type="checkbox" checked={contextuais.includes(c.id)} onChange={e => {
          escolherContextuais(e.target.checked ? [...contextuais, c.id] : contextuais.filter(id => id !== c.id))
          definirPrevia(null)
        }} />
        <span>{c.contexto.nome} · {[
          c.pode_aprovar && 'aprovar', c.pode_deliberar && 'registrar deliberação',
          c.pode_consultar_restritos && 'consultar acervo restrito', c.pode_instalar_mesa && 'instalar mesa',
        ].filter(Boolean).join(', ')}</span>
      </label>)}
    </fieldset>}
    <Button type="button" variant="outline" disabled={revisar.isPending || converter.isPending} onClick={() => revisar.mutate()}>Gerar prévia</Button>
    {previa && <div className="space-y-3">
      {previa.outra_conta && <p>Há outra conta vinculada à mesma pessoa. Confira qual login deve representar a atuação.</p>}
      <p>{previa.rotas.filter(r => r.antes && !r.depois).length} rotas deixam de estar disponíveis · {previa.rotas.filter(r => !r.antes && r.depois).length} rotas passam a estar disponíveis</p>
      <details><summary>Comparação por rota</summary><ul className="max-h-48 space-y-1 overflow-auto text-sm">
        {previa.rotas.map(r => <li key={r.rota}>{r.rota} · {r.antes && r.depois ? 'Mantida' : r.depois ? 'Incluída' : 'Retirada'}</li>)}
      </ul></details>
      {!!previa.rotas_legadas?.length && <details>
        <summary>Rotas do perfil que exigem revisão contextual</summary>
        <ul className="max-h-48 space-y-1 overflow-auto text-sm">{previa.rotas_legadas.map(rota => <li key={rota}>{rota}</li>)}</ul>
      </details>}
      <label className="block">Fundamento da conversão<Input value={fundamento} maxLength={1000} onChange={e => justificar(e.target.value)} /></label>
      <Button type="button" disabled={!fundamento.trim() || converter.isPending} onClick={() => converter.mutate()}>Confirmar conversão</Button>
    </div>}
    {erro && <p role="alert">{erro instanceof ApiRequestError ? erro.messages.join(' ') : 'Não foi possível registrar a conversão.'}</p>}
  </section>
}
