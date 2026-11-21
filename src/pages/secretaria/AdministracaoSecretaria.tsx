import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { secretariaApi, type ContextoSecretaria, type CompetenciaSecretaria } from '../../api/secretaria'
import { orgaosApi } from '../../api/orgaos'
import { usuariosApi } from '../../api/usuarios'
import { Area, Campo, Escolha, Check, Salvar, hoje, useComando } from './formulario'
import { Button } from '../../components/ui/button'

export function AdministracaoSecretaria({ identidade, contextos }: { identidade: string; contextos: ContextoSecretaria[] }) {
  const [tipo, setTipo] = useState('ASSEMBLEIA_GERAL'), [nome, setNome] = useState('Assembleia Geral'), [sigla, setSigla] = useState('AG'), [orgao, setOrgao] = useState('')
  const [cursor, setCursor] = useState<string | undefined>()
  const orgaos = useQuery({ queryKey: ['secretaria', identidade, 'orgaos-opcoes', cursor], queryFn: () => orgaosApi.listar(cursor) })
  const criar = useComando((dados: { tipo: string; nome: string; sigla: string; orgao_id?: string }) => secretariaApi.criarContexto(dados))
  const competencias = useQuery({ queryKey: ['secretaria', identidade, 'competencias'], queryFn: secretariaApi.competencias })
  return <details className="space-y-4 rounded border p-4"><summary className="cursor-pointer font-semibold">Configuração de contextos e competências</summary>
    <p className="my-3 text-sm">O registro técnico documenta a autoridade comprovada. O perfil de administrador não confere aprovação institucional automaticamente.</p>
    <form className="space-y-3 rounded border p-4" onSubmit={e => { e.preventDefault(); criar.mutate({ tipo, nome, sigla, ...(tipo === 'ORGAO' ? { orgao_id: orgao } : {}) }) }}>
      <h3 className="font-semibold">Preparar contexto documental</h3><Escolha label="Tipo de contexto" value={tipo} onChange={setTipo}><option value="ASSEMBLEIA_GERAL">Assembleia Geral</option><option value="ORGAO">Órgão existente</option></Escolha>
      {tipo === 'ORGAO' && <><Escolha label="Órgão do contexto" value={orgao} onChange={setOrgao}><option value="">Selecione</option>{orgaos.data?.itens.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}</Escolha>{orgaos.isError && <p role="alert">Não foi possível consultar os órgãos.</p>}<div className="flex gap-2"><Button type="button" variant="outline" disabled={!cursor} onClick={() => setCursor(undefined)}>Primeiros órgãos</Button><Button type="button" variant="outline" disabled={!orgaos.data?.proximo_cursor} onClick={() => setCursor(orgaos.data?.proximo_cursor ?? undefined)}>Mais órgãos</Button></div></>}
      <Campo label="Nome do contexto" value={nome} onChange={setNome} /><Campo label="Sigla do contexto" value={sigla} onChange={v => setSigla(v.toUpperCase())} /><p className="text-sm">Órgãos utilizam o nome e a sigla cadastrados na governança, quando disponíveis.</p><Salvar pending={criar.isPending} error={criar.error} success={criar.isSuccess} label="Preparar contexto" />
    </form>
    <ConcederCompetencia identidade={identidade} contextos={contextos} />
    <section className="mt-4 space-y-3"><h3 className="font-semibold">Competências registradas (até 200 mais recentes)</h3>{competencias.isError && <p role="alert">Não foi possível consultar competências.</p>}{competencias.data?.map(c => <CompetenciaItem key={c.id} c={c} nome={contextos.find(x => x.id === c.contexto_id)?.nome ?? 'Contexto'} />)}</section>
  </details>
}
function ConcederCompetencia({ identidade, contextos }: { identidade: string; contextos: ContextoSecretaria[] }) {
  const usuarios = useQuery({ queryKey: ['secretaria', identidade, 'usuarios-opcoes'], queryFn: usuariosApi.list })
  const [contexto, setContexto] = useState(''), [usuario, setUsuario] = useState(''), [inicio, setInicio] = useState(hoje()), [fim, setFim] = useState(''), [autoridade, setAutoridade] = useState(''), [evidencia, setEvidencia] = useState('')
  const [aprovar, setAprovar] = useState(false), [deliberar, setDeliberar] = useState(false), [restritos, setRestritos] = useState(false)
  const enviar = useComando((dados: { contexto_id: string; usuario_id: string; inicio: string; fim: string | null; pode_aprovar: boolean; pode_deliberar: boolean; pode_consultar_restritos: boolean; autoridade: string; evidencia: string }) => secretariaApi.conceder(dados))
  return <form className="mt-4 space-y-3 rounded border p-4" onSubmit={e => { e.preventDefault(); enviar.mutate({ contexto_id: contexto, usuario_id: usuario, inicio, fim: fim || null, pode_aprovar: aprovar, pode_deliberar: deliberar, pode_consultar_restritos: restritos, autoridade, evidencia }) }}><h3 className="font-semibold">Registrar competência institucional</h3><Escolha label="Contexto da competência" value={contexto} onChange={setContexto}><option value="">Selecione</option>{contextos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</Escolha><div className="grid min-w-0 flex-1 gap-1 text-sm"><span>Titular da competência</span><SeletorPessoa rotulo="Titular da competência" required value={usuario} onChange={setUsuario} opcoes={usuarios.data?.filter(u => u.ativo && u.pessoa_id).map(u => ({ id: u.id, nome: u.nome_usuario }))} /></div>{usuarios.isError && <p role="alert">Não foi possível consultar usuários.</p>}<div className="grid gap-3 md:grid-cols-2"><Campo label="Início da competência" type="date" value={inicio} onChange={setInicio} /><Campo label="Término exclusivo (opcional)" type="date" required={false} value={fim} onChange={setFim} /></div><Check label="Aprovar tecnicamente e autorizar cancelamento/retificação" checked={aprovar} onChange={setAprovar} /><Check label="Registrar deliberação do órgão" checked={deliberar} onChange={setDeliberar} /><Check label="Consultar acervo restrito deste contexto" checked={restritos} onChange={setRestritos} /><Campo label="Autoridade que confere a competência" value={autoridade} onChange={setAutoridade} /><Area label="Evidência institucional da competência" value={evidencia} onChange={setEvidencia} /><Salvar pending={enviar.isPending} error={enviar.error} success={enviar.isSuccess} label="Registrar competência" /></form>
}
function CompetenciaItem({ c, nome }: { c: CompetenciaSecretaria; nome: string }) {
  const [fim, setFim] = useState(hoje()), [autoridade, setAutoridade] = useState(''), [evidencia, setEvidencia] = useState('')
  const encerrar = useComando((dados: { fim: string; autoridade: string; evidencia: string }) => secretariaApi.encerrarCompetencia(c.id, dados))
  return <details className="rounded border p-3"><summary>{c.titular.nome_usuario} · {nome} · {c.inicio.slice(0, 10)} — {c.fim?.slice(0, 10) ?? 'em aberto'}</summary><p>Autoridade: {c.autoridade}. Evidência: {c.evidencia}</p><p>{[c.pode_aprovar && 'Aprovação técnica', c.pode_deliberar && 'Deliberação', c.pode_consultar_restritos && 'Leitura restrita'].filter(Boolean).join(' · ')}</p>{!c.fim && <form className="mt-3 space-y-3" onSubmit={e => { e.preventDefault(); encerrar.mutate({ fim, autoridade, evidencia }) }}><Campo label="Término da competência" type="date" value={fim} onChange={setFim} /><Campo label="Autoridade do encerramento" value={autoridade} onChange={setAutoridade} /><Area label="Evidência do encerramento" value={evidencia} onChange={setEvidencia} /><Salvar pending={encerrar.isPending} error={encerrar.error} success={encerrar.isSuccess} label="Encerrar competência" /></form>}</details>
}
