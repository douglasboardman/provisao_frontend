import { FormularioSenha } from './FormularioSenha'
import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ContactRound,
  UsersRound,
  KeyRound,
  Mail,
  History,
  Landmark,
  Wallet,
  CalendarDays,
  Vote,
  type LucideIcon,
} from 'lucide-react'
import { apiClient } from '../../api/client'
import { authApi } from '../../api/auth'
import { resultadosResolucao, rotulosModalidadeReuniao } from '../../api/secretaria'
import { ROL_LABELS, TIPO_LABELS } from '../../lib/membresia-labels'
import { useAuthStore } from '../../stores/auth'
import { Button } from '../../components/ui/button'
import { WorkspaceHeader, dataCivil } from '../../components/shared/Workspace'
import { ErrorState } from '../../components/shared/ErrorState'

interface PerfilPessoal {
  igreja: string
  pessoa: null | {
    nome_completo: string
    email: string | null
    telefone_celular: string | null
    cidade: string | null
    estado: string | null
    data_nascimento: string
  }
  familia?: { nome_familia: string; pessoas: { id: string; nome_completo: string }[] } | null
  eventos?: {
    id: string
    tipo_evento: keyof typeof TIPO_LABELS
    data_evento: string
    rol: keyof typeof ROL_LABELS
  }[]
  contribuicoes?: { id: string; data_transacao: string; valor: string }[]
  mandatos?:
    | {
        id: string
        oficial: { tipo: string }
        data_posse: string
        termino_previsto: string
        termino_efetivo: string | null
      }[]
    | null
  reunioes?:
    | {
        id: string
        reuniao: {
          modalidade: keyof typeof rotulosModalidadeReuniao
          data: string
          contexto: { nome: string }
        }
      }[]
    | null
  proposicoes?:
    | {
        id: string
        assunto: string
        resultado: keyof typeof resultadosResolucao
        versao: { numero: number; data_documento: string }
      }[]
    | null
}
function Secao({
  titulo,
  icon: Icon,
  children,
}: {
  titulo: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <section className="surface space-y-4">
      <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
        <Icon size={19} className="text-purple" />
        {titulo}
      </h2>
      {children}
    </section>
  )
}
function Historico({
  itens,
  vazio,
}: {
  itens: { id: string; titulo: string; detalhe: string }[] | null | undefined
  vazio: string
}) {
  const [limite, setLimite] = useState(6)
  if (!itens)
    return <p className="text-sm text-muted-foreground">Consulta indisponível para esta conta.</p>
  if (!itens.length) return <p className="text-sm text-muted-foreground">{vazio}</p>
  return (
    <>
      <ul className="divide-y">
        {itens.slice(0, limite).map((i) => (
          <li className="py-2.5 first:pt-0" key={i.id}>
            <p className="font-medium">{i.titulo}</p>
            <p className="text-sm text-muted-foreground">{i.detalhe}</p>
          </li>
        ))}
      </ul>
      {itens.length > limite && (
        <Button variant="outline" onClick={() => setLimite((n) => n + 12)}>
          Mostrar mais
        </Button>
      )}
    </>
  )
}
export function PerfilPage() {
  const user = useAuthStore((s) => s.user)!
  const q = useQuery({
    queryKey: ['perfil-pessoal', user.igreja_id, user.sub],
    queryFn: () => apiClient.get<PerfilPessoal>('perfil'),
    gcTime: 0,
  })
  const senha = useMutation({
    mutationFn: () => authApi.forgotPassword({ igreja_id: user.igreja_id, email_login: user.login }),
  })
  const [aba, mudar] = useState('Visão geral')
  const d = q.data
  const pessoa = d?.pessoa
  return (
    <div className="workspace">
      <WorkspaceHeader
        icon={ContactRound}
        title="Meu perfil"
        description={d?.igreja ?? 'Conta e histórico pessoal'}
      />
      <div className="surface flex flex-wrap items-center gap-4">
        <div className="grid size-16 place-items-center rounded-2xl bg-purple-muted text-2xl font-bold text-purple">
          {(pessoa?.nome_completo || user.username).slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold">{pessoa?.nome_completo ?? user.username}</h2>
          <p className="break-all text-sm text-muted-foreground">{user.login}</p>
        </div>
        <span className="pill sm:ml-auto">{user.perfil.toLocaleLowerCase('pt-BR')}</span>
      </div>
      <nav aria-label="Seções do perfil" className="flex flex-wrap gap-2">
        {['Visão geral', 'Vida eclesiástica', 'Contribuições', 'Segurança'].map((a) => (
          <Button
            key={a}
            variant={aba === a ? 'default' : 'outline'}
            aria-pressed={aba === a}
            onClick={() => mudar(a)}
          >
            {a}
          </Button>
        ))}
      </nav>
      {aba === 'Segurança' ? (
        <Secao titulo="Alteração de senha" icon={KeyRound}>
          <FormularioSenha />
          <details className="border-t pt-3">
            <summary>Esqueci minha senha atual</summary>
            <p className="my-2 text-sm">
              Receba um link no e-mail de acesso para definir uma nova senha.
            </p>
            <Button disabled={senha.isPending || senha.isSuccess} onClick={() => senha.mutate()}>
              <Mail />
              Enviar link de alteração
            </Button>
            {senha.isSuccess && <p role="status">Solicitação recebida. Confira o e-mail de acesso.</p>}
            {senha.isError && <p role="alert">Falha ao solicitar o link. Tente novamente.</p>}
          </details>
        </Secao>
      ) : q.isPending ? (
        <p role="status">Consultando perfil…</p>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !pessoa ? (
        <div className="surface">
          <h2 className="font-semibold">Conta sem pessoa vinculada</h2>
          <p className="text-sm text-muted-foreground">
            O vínculo com o cadastro de pessoas permite consultar os dados pessoais e o histórico. A
            administração pode vinculá-lo em Usuários.
          </p>
        </div>
      ) : aba === 'Visão geral' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Secao titulo="Dados pessoais e contato" icon={ContactRound}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
              {Object.entries({
                Nascimento: dataCivil(pessoa.data_nascimento),
                'E-mail': pessoa.email,
                Celular: pessoa.telefone_celular,
                Localidade: [pessoa.cidade, pessoa.estado].filter(Boolean).join(' · '),
              }).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="break-words">{v || 'Não informado'}</dd>
                </div>
              ))}
            </dl>
          </Secao>
          <Secao titulo="Grupo familiar" icon={UsersRound}>
            {d?.familia ? (
              <>
                <span className="pill">{d.familia.nome_familia}</span>
                <ul className="divide-y">
                  {d.familia.pessoas.map((p) => (
                    <li className="py-2 text-sm" key={p.id}>
                      {p.nome_completo}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Nenhum grupo familiar vinculado.</p>
            )}
          </Secao>
        </div>
      ) : aba === 'Contribuições' ? (
        <Secao titulo="Histórico de contribuições" icon={Wallet}>
          <Historico
            vazio="Nenhuma receita vinculada ao seu cadastro."
            itens={d?.contribuicoes?.map((i) => ({
              id: i.id,
              titulo: Number(i.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
              detalhe: dataCivil(i.data_transacao),
            }))}
          />
        </Secao>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Secao titulo="Histórico de membresia" icon={History}>
            <Historico
              vazio="Nenhum evento de membresia registrado."
              itens={d?.eventos?.map((i) => ({
                id: i.id,
                titulo: TIPO_LABELS[i.tipo_evento],
                detalhe: dataCivil(i.data_evento) + ' · ' + ROL_LABELS[i.rol],
              }))}
            />
          </Secao>
          <Secao titulo="Mandatos" icon={Landmark}>
            <Historico
              vazio="Nenhum mandato registrado."
              itens={d?.mandatos?.map((i) => ({
                id: i.id,
                titulo:
                  {
                    DIACONO: 'Diácono',
                    PRESBITERO_REGENTE: 'Presbítero regente',
                    PRESBITERO_DOCENTE: 'Presbítero docente',
                  }[i.oficial.tipo] ?? i.oficial.tipo,
                detalhe:
                  dataCivil(i.data_posse) +
                  ' · ' +
                  (i.termino_efetivo ? 'Encerrado em ' : 'Previsão de término em ') +
                  dataCivil(i.termino_efetivo ?? i.termino_previsto),
              }))}
            />
          </Secao>
          <Secao titulo="Participações em reuniões" icon={CalendarDays}>
            <Historico
              vazio="Nenhuma presença registrada."
              itens={d?.reunioes?.map((i) => ({
                id: i.id,
                titulo: i.reuniao.contexto.nome,
                detalhe:
                  dataCivil(i.reuniao.data) + ' · ' + rotulosModalidadeReuniao[i.reuniao.modalidade],
              }))}
            />
          </Secao>
          <Secao titulo="Proposições registradas" icon={Vote}>
            <Historico
              vazio="Nenhuma proposição registrada em versão conferida."
              itens={d?.proposicoes?.map((i) => ({
                id: i.id,
                titulo: i.assunto,
                detalhe:
                  dataCivil(i.versao.data_documento) +
                  ' · v' +
                  i.versao.numero +
                  ' · ' +
                  resultadosResolucao[i.resultado],
              }))}
            />
          </Secao>
        </div>
      )}
    </div>
  )
}
