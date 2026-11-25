import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { ApiRequestError } from '../../api/client'
import { minhaAssembleia, type Presente, type SessaoAssembleia } from '../../api/minha-assembleia'
import { Button } from '../../components/ui/button'
import { Campo, Area, Check, Escolha } from './formulario'
import { EditorPagina } from './editor/EditorPagina'
import { Compositor, LeituraEstrutura } from './Compositor'
import { EntradaCampo } from './ValoresCampos'
import { EditarResolucoes } from './ResolucoesDocumento'
import { dadosLeitura } from './editor/dadosLeitura'
import { preencherPagina } from '../../api/pagina'
import { deliberacoesNaPagina, textosDeliberacoes } from './deliberacoes'

export default function MinhaAssembleia() {
  const [params, setParams] = useSearchParams()
  const id = params.get('acesso') ?? ''
  const [token, guardar] = useState(() => window.location.hash.slice(1))
  useEffect(() => {
    if (window.location.hash)
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  }, [])
  const ativar = useMutation({
    mutationFn: () => minhaAssembleia.ativar(token),
    onSuccess: (r) => {
      guardar('')
      setParams({ acesso: r.id }, { replace: true })
    },
  })
  const ficha = useQuery({
    queryKey: ['minha-assembleia', id],
    queryFn: () => minhaAssembleia.ficha(id),
    enabled: !!id && !token,
    retry: false,
    gcTime: 0,
    refetchInterval: 30000,
  })
  return (
    <main className="min-h-screen bg-background">
      <header className="bg-primary px-5 py-4 text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <span className="font-semibold">ProVisão · Secretaria</span>
          {id && ficha.data && !ficha.isError && (
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await minhaAssembleia.gravar(id, 'sair', {})
                setParams({}, { replace: true })
              }}
            >
              Sair da assembleia
            </Button>
          )}
        </div>
      </header>
      <section className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
        <h1 className="text-2xl font-semibold">Minha assembleia</h1>
        {token ? (
          <div className="surface max-w-xl space-y-3">
            <p>Aceite o convite para atuar como secretário desta sessão.</p>
            <Button disabled={ativar.isPending} onClick={() => ativar.mutate()}>
              Aceitar convite
            </Button>
            {ativar.isError && <p role="alert">{ativar.error.message}</p>}
            {ativar.error instanceof ApiRequestError && ativar.error.statusCode === 401 && (
              <a className="block underline" href="/login" target="_blank" rel="noopener noreferrer">
                Entrar na conta vinculada em outra aba
              </a>
            )}
          </div>
        ) : !id ? (
          <p>Abra o link do convite individual enviado ao seu e-mail.</p>
        ) : ficha.isError ? (
          <div role="alert">
            <p>{ficha.error.message}</p>
            <Button variant="outline" onClick={() => void ficha.refetch()}>
              Consultar novamente
            </Button>
          </div>
        ) : !ficha.data ? (
          <p role="status">Abrindo a ata da assembleia…</p>
        ) : (
          <Trabalho
            key={id}
            inicial={ficha.data}
            consultar={async () => {
              const r = await ficha.refetch()
              if (!r.data || r.isError) throw r.error
              return r.data
            }}
          />
        )}
      </section>
    </main>
  )
}

function Trabalho({
  inicial,
  consultar,
}: {
  inicial: SessaoAssembleia
  consultar: () => Promise<SessaoAssembleia>
}) {
  const [s, atualizar] = useState(inicial)
  const [aba, ir] = useState<'presencas' | 'ata' | 'decisao'>(inicial.encaminhada ? 'decisao' : 'presencas')
  const [pendente, marcar] = useState(false)
  const [mensagem, avisar] = useState('')
  const [salvando, ocupado] = useState(false)
  const [geracao, renovar] = useState(0)
  const navegar = (destino: typeof aba) => {
    if (destino === aba) return
    if (!pendente || window.confirm('Descartar as alterações que ainda não foram salvas?')) {
      ir(destino)
      marcar(false)
      avisar('')
    }
  }
  useEffect(() => {
    if (!pendente) return
    const proteger = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', proteger)
    return () => window.removeEventListener('beforeunload', proteger)
  }, [pendente])
  const salvar = async (acao: string, dados: object) => {
    if (salvando) return
    ocupado(true)
    avisar('')
    try {
      await minhaAssembleia.gravar(s.acesso, acao, {
        ...dados,
        revisao: s.revisao,
        revisao_reuniao: s.revisao_reuniao,
      })
      atualizar(await consultar())
      renovar((n) => n + 1)
      marcar(false)
      avisar('Registro salvo.')
      if (acao === 'leitura') ir('ata')
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Falha ao registrar.')
      await consultar().catch(() => undefined)
    } finally {
      ocupado(false)
    }
  }
  return (
    <>
      <div>
        <h2 className="text-xl font-medium">{s.titulo}</h2>
        <p className="text-sm text-muted-foreground">
          {s.data.split('-').reverse().join('/')} · {s.local} · Presidência de {s.presidente}
        </p>
      </div>
      <nav aria-label="Atividades da assembleia" className="flex flex-wrap gap-2">
        {(
          [
            ['presencas', 'Presenças e arrolados'],
            ['ata', 'Editar ata'],
            ['decisao', 'Aprovação e assinaturas'],
          ] as const
        ).map(([id, nome]) => (
          <Button
            key={id}
            disabled={salvando}
            aria-current={aba === id ? 'page' : undefined}
            variant={aba === id ? 'default' : 'outline'}
            onClick={() => navegar(id)}
          >
            {id === 'ata' && s.encaminhada ? 'Ler ata' : nome}
          </Button>
        ))}
      </nav>
      {mensagem && <p role="status">{mensagem}</p>}
      {inicial.revisao !== s.revisao || inicial.revisao_reuniao !== s.revisao_reuniao ? (
        <p role="alert">
          Há uma revisão mais recente.{' '}
          <Button
            variant="outline"
            onClick={() => {
              if (!pendente || confirm('Descartar as alterações locais para consultar a revisão mais recente?')) {
                atualizar(inicial)
                renovar((n) => n + 1)
                marcar(false)
              }
            }}
          >
            Carregar revisão
          </Button>
        </p>
      ) : null}
      <fieldset key={geracao} disabled={salvando} className="min-w-0">
        {aba === 'presencas' ? (
          <Presencas s={s} salvar={salvar} mudou={() => marcar(true)} />
        ) : aba === 'ata' ? (
          <Redator s={s} salvar={salvar} mudou={() => marcar(true)} />
        ) : (
          <Decisao s={s} salvar={salvar} ler={() => navegar('ata')} />
        )}
      </fieldset>
    </>
  )
}

type Props = { s: SessaoAssembleia; salvar: (acao: string, dados: object) => Promise<void>; mudou: () => void }
function Presencas({ s, salvar, mudou }: Props) {
  const [pessoas, definir] = useState(s.pessoas)
  const [busca, buscar] = useState('')
  const [q, quorum] = useState({
    universo: s.universo,
    minimo: s.minimo,
    conferir: s.conferir,
    competencia: s.competencia,
    fundamento: s.fundamento,
  })
  const term = busca.trim()
  const opcoes = useQuery({
    queryKey: ['rol-da-sessao', s.acesso, term],
    queryFn: () => minhaAssembleia.pessoas(s.acesso, term),
    enabled: term.length >= 2,
    gcTime: 0,
    retry: false,
  })
  const alterar = (p: Presente, patch: Partial<Presente>) => {
    mudou()
    definir((t) => t.map((x) => (x.id === p.id ? { ...p, ...patch } : x)))
  }
  return (
    <form
      className="surface space-y-4"
      onChange={mudou}
      onSubmit={(e) => {
        e.preventDefault()
        void salvar('presencas', {
          ...q,
          pessoas: pessoas.map((p) => ({
            id: p.id,
            presente: p.presente,
            arrolado: p.arrolado,
            pode_propor: p.pode_propor,
          })),
        })
      }}
    >
      <fieldset disabled={s.encerrada || s.encaminhada} className="space-y-4">
        <legend className="font-semibold">Participantes da sessão</legend>
        <Campo label="Buscar participante desta sessão" value={busca} onChange={buscar} required={false} />
        {opcoes.isError && <p role="alert">{opcoes.error.message}</p>}
        {term.length >= 2 && opcoes.data && (
          <ul>
            {opcoes.data
              .filter((p) => !pessoas.some((x) => x.id === p.id))
              .map((p) => (
                <li key={p.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      mudou()
                      definir((t) => [...t, { ...p, presente: true, arrolado: true, pode_propor: false }])
                      buscar('')
                    }}
                  >
                    Adicionar {p.nome}
                  </Button>
                </li>
              ))}
          </ul>
        )}
        <p>{pessoas.filter(p => p.presente).length} pessoas presentes
          {s.votacao?.base === 'VOTANTES_CONFIRMADOS' && ` · ${pessoas.filter(p => p.presente && p.direito_voto).length} com direito a voto`}</p>
        <ul className="divide-y">
          {pessoas.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-4 py-2">
              <span className="min-w-48 flex-1">{p.nome}
                {s.votacao?.base === 'VOTANTES_CONFIRMADOS' && <small className="block text-muted-foreground">{p.direito_voto ? 'Voto confirmado' : 'Sem voto confirmado'}</small>}</span>
              <Check
                label="Presente"
                checked={p.presente}
                disabled={s.titulares.includes(p.id)}
                onChange={(v) => alterar(p, { presente: v, ...(!v && { pode_propor: false }) })}
              />
              <Check
                label="Arrolado na ata"
                checked={p.arrolado}
                disabled={s.titulares.includes(p.id)}
                onChange={(v) => alterar(p, { arrolado: v })}
              />
              <Check
                label="Pode propor"
                checked={p.pode_propor}
                disabled={!p.presente}
                onChange={(v) => alterar(p, { pode_propor: v })}
              />
            </li>
          ))}
        </ul>
        <div className="grid gap-3 md:grid-cols-2">
          <Campo
            label="Universo para quórum"
            type="number"
            value={q.universo}
            onChange={(v) => quorum({ ...q, universo: Number(v) })}
          />
          <Campo
            label="Quórum mínimo"
            type="number"
            value={q.minimo}
            onChange={(v) => quorum({ ...q, minimo: Number(v) })}
          />
          <Campo
            label="Competência da assembleia"
            required={q.conferir}
            value={q.competencia}
            onChange={(v) => quorum({ ...q, competencia: v })}
          />
          <Campo
            label="Fundamento do quórum"
            required={q.conferir}
            value={q.fundamento}
            onChange={(v) => quorum({ ...q, fundamento: v })}
          />
        </div>
        <Check label="Conferi o quórum" checked={q.conferir} onChange={(v) => quorum({ ...q, conferir: v })} />
        {!s.encerrada && !s.encaminhada && <Button>Salvar presenças e arrolados</Button>}
      </fieldset>
    </form>
  )
}

function Redator({ s, salvar, mudou }: Props) {
  const [pagina, paginar] = useState(s.composicao),
    [estrutura, estruturar] = useState(s.estrutura),
    [teor, redigir] = useState(s.teor),
    [rs, resolver] = useState(s.resolucoes)
  const [valores, preencher] = useState(s.valores ?? {}),
    [campos, definirCampos] = useState(s.campos)
  const [previa, visualizar] = useState(s.encaminhada)
  const leitura = s.encaminhada || previa
  const imagemUrl = (id: string) => minhaAssembleia.arquivo(s.acesso, id) + '&visualizacao=imagem'
  const nomes = new Map(s.pessoas.map((p) => [p.id, p.nome]))
  const dinamicos = { ...valores }
  for (const [id, d] of Object.entries(s.definicoes ?? {}))
    if (d.origem === 'deliberacoes_reuniao' && valores[id]?.origem.tipo !== 'documento_anterior')
      dinamicos[id] = {
        ...d,
        origem: { tipo: 'sistema', chave: d.origem },
        ajustado_manualmente: false,
        valor: textosDeliberacoes(rs, (id) => nomes.get(id) ?? ''),
      }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {!s.encaminhada && (
          <>
            <Button variant="outline" onClick={() => visualizar(!previa)}>
              {previa ? 'Voltar à edição' : 'Prévia da ata'}
            </Button>
            <Button
              onClick={() =>
                void salvar('salvar', {
                  composicao: pagina,
                  estrutura,
                  teor,
                  resolucoes: rs,
                  campos: Object.fromEntries(
                    s.campos_editaveis.filter((k) => campos[k] !== undefined).map((k) => [k, campos[k]]),
                  ),
                  manuais: Object.fromEntries(
                    Object.entries(valores).filter(([, v]) => v.origem.tipo === 'manual'),
                  ),
                })
              }
            >
              Salvar ata
            </Button>
          </>
        )}
      </div>
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 overflow-auto">
          {pagina ? (
            <EditorPagina
              dadosLeitura={
                leitura
                  ? dadosLeitura(
                      s.signatarios,
                      rs,
                      (id) => nomes.get(id) ?? '',
                      (id) => s.signatarios.find((p) => p.pessoa_id === id)?.cargos ?? [],
                      undefined,
                      campos,
                    )
                  : undefined
              }
              margensConcilio={s.margens_concilio}
              valor={leitura ? preencherPagina(pagina, campos, s.tipos_campos) : pagina}
              alterar={
                leitura
                  ? undefined
                  : (v) => {
                      mudou()
                      paginar(v)
                    }
              }
              valores={dinamicos}
              definicoes={s.definicoes}
              mostrarEstadoLocal={false}
              imagemUrl={imagemUrl}
            />
          ) : (
            <div className="surface space-y-3">
              {leitura ? (
                <p className="whitespace-pre-wrap">{teor}</p>
              ) : (
                <Area
                  label="Texto da ata"
                  value={teor}
                  onChange={(v) => {
                    mudou()
                    redigir(v)
                  }}
                />
              )}
              {estrutura &&
                (leitura ? (
                  <LeituraEstrutura
                    tipos={s.tipos_campos}
                    imagemUrl={imagemUrl}
                    valor={estrutura}
                    campos={campos}
                  />
                ) : (
                  <Compositor
                    valor={estrutura}
                    alterar={(v) => {
                      mudou()
                      estruturar(v)
                    }}
                    anexos={s.anexos}
                  />
                ))}
            </div>
          )}
        </div>
        <aside className="surface space-y-3">
          {leitura &&
            pagina?.versao_formato !== 2 &&
            !deliberacoesNaPagina(pagina, dinamicos) &&
            rs.length > 0 && (
              <section>
                <h3 className="font-semibold">Deliberações</h3>
                <ol className="list-decimal pl-5">
                  {textosDeliberacoes(rs, (id) => nomes.get(id) ?? '').map((texto, i) => (
                    <li key={i}>{texto}</li>
                  ))}
                </ol>
              </section>
            )}
          {!leitura && (
            <>
              <details open>
                <summary>Deliberações da reunião</summary>
                <EditarResolucoes
                  valor={rs}
                  pauta={s.pauta}
                  pessoas={s.pessoas
                    .filter((p) => p.arrolado)
                    .map((p) => ({ ...p, podePropor: p.presente && p.pode_propor }))}
                  permitido={s.politica !== 'NAO_PERMITE'}
                  obrigatorio={s.politica === 'OBRIGATORIO'}
                  alterar={(v) => {
                    mudou()
                    resolver(v)
                  }}
                />
              </details>
              <details>
                <summary>Campos da ata</summary>
                {Object.entries(s.definicoes ?? {})
                  .filter(([id, d]) => d.origem === 'manual' && valores[id]?.origem.tipo !== 'documento_anterior')
                  .map(([id, campo]) => (
                    <EntradaCampo
                      key={id}
                      id={id}
                      campo={campo}
                      valor={valores[id]}
                      obrigatorio={false}
                      alterar={(v) => {
                        mudou()
                        preencher({ ...valores, [id]: v })
                      }}
                    />
                  ))}
                {s.campos_editaveis.map((k) => (
                  <Campo
                    key={k}
                    required={false}
                    label={k}
                    value={campos[k] ?? ''}
                    onChange={(t) => {
                      mudou()
                      definirCampos({ ...campos, [k]: t })
                    }}
                  />
                ))}
              </details>
            </>
          )}
          <p>Redação · {s.secretario}</p>
          {s.anexos.map((a) => (
            <a
              key={a.arquivo_id}
              className="block underline"
              href={minhaAssembleia.arquivo(s.acesso, a.arquivo_id)}
              download
            >
              {a.nome}
            </a>
          ))}
        </aside>
      </div>
    </div>
  )
}

function Decisao({ s, salvar, ler }: Omit<Props, 'mudou'> & { ler: () => void }) {
  const [agora, usarAgora] = useState(true)
  const [fim, definir] = useState(''),
    [resultado, escolher] = useState('APROVADA'),
    [evidencia, registrar] = useState('')
  return (
    <section className="surface max-w-2xl space-y-4">
      <h2 className="font-semibold">Leitura e decisão coletiva</h2>
      {!s.encaminhada ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void salvar('leitura', { fim: s.fim ?? (agora ? new Date() : new Date(fim)).toISOString() })
          }}
        >
          <p>
            Ao preparar a leitura, o sistema registra o encerramento e fixa o texto que a assembleia vai deliberar.
          </p>
          {!s.fim && (
            <>
              <Check label="Usar o horário atual como encerramento" checked={agora} onChange={usarAgora} />
              {!agora && (
                <Campo
                  label="Encerramento da reunião (hora local)"
                  type="datetime-local"
                  value={fim}
                  onChange={definir}
                />
              )}
            </>
          )}
          <Button>Preparar ata para leitura</Button>
        </form>
      ) : s.decisao ? (
        <>
          <p>Decisão registrada · {s.decisao}</p>
          <p>
            {s.decisao === 'APROVADA'
              ? 'A autoridade competente faz a aprovação técnica. Em seguida, cada signatário recebe o convite para assinar a matriz aprovada.'
              : 'A presidência pode autorizar nova revisão da redação.'}
          </p>
        </>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void salvar('decidir', { resultado, evidencia })
          }}
        >
          <Button type="button" variant="outline" onClick={ler}>
            Ler versão encaminhada
          </Button>
          <Escolha label="Decisão da assembleia" value={resultado} onChange={escolher}>
            <option value="APROVADA">Aprovada</option>
            <option value="REJEITADA">Rejeitada</option>
            <option value="ADIADA">Adiada</option>
          </Escolha>
          <Area label="Registro da leitura e da decisão" value={evidencia} onChange={registrar} />
          <Button>Registrar decisão coletiva</Button>
        </form>
      )}
    </section>
  )
}
