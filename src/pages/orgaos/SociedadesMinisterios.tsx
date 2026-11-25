import { type FormEvent, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DetalheOrgao } from '../../api/orgaos'
import { categoriasParticipacao, sociedadesMinisteriosApi } from '../../api/sociedades-ministerios'
import { ApiRequestError } from '../../api/client'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { useHojeIgreja } from './RelogioIgreja'

const campo = 'w-full rounded-md border bg-background p-2'
const painel = 'space-y-3 rounded-lg border p-4'
const nomeAto = {
  ATIVACAO_SOCIEDADE: 'Ativar sociedade',
  PARTICIPACAO_INCLUSAO: 'Registrar adesão',
  PROVIMENTO: 'Registrar titular',
  MANUTENCAO_MINISTERIO: 'Editar ministério',
  DESATIVACAO: 'Desativar',
  PARTICIPACAO_SAIDA: 'Encerrar participação',
  ENCERRAMENTO_CARGO: 'Encerrar cargo',
} as const
type Ato = { tipo: keyof typeof nomeAto; alvo?: string; nome?: string }

function useRegistro(identidade: string, enviar: (dados: object) => Promise<{ id: string }>, sucesso: (id: string) => void) {
  const tentativas = useRef(new Map<string, string>())
  const client = useQueryClient()
  return useMutation({
    mutationFn: (dados: object) => {
      const hash = JSON.stringify(dados)
      const idempotencia = tentativas.current.get(hash) ?? crypto.randomUUID()
      tentativas.current.set(hash, idempotencia)
      return enviar({ ...dados, idempotencia })
    },
    onSuccess: async ({ id }) => {
      tentativas.current.clear()
      await Promise.all([
        client.invalidateQueries({ queryKey: ['orgaos', identidade] }),
        client.invalidateQueries({ queryKey: ['secretaria'] }),
      ])
      sucesso(id)
    },
  })
}

function MensagemErro({ erro }: { erro: Error | null }) {
  if (!erro) return null
  return <p role="alert">{erro instanceof ApiRequestError ? erro.messages.join(' ') : 'Não foi possível registrar o ato.'}</p>
}

function texto(dados: FormData, chave: string) {
  return String(dados.get(chave) ?? '').trim()
}

export function CriarMinisterio({ identidade, aoCriar }: { identidade: string; aoCriar: (id: string) => void }) {
  const [aberto, abrir] = useState(false)
  const [eleicao, definirEleicao] = useState(false)
  const salvar = useRegistro(identidade, sociedadesMinisteriosApi.criarMinisterio, id => {
    abrir(false)
    definirEleicao(false)
    aoCriar(id)
  })
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    salvar.mutate({
      nome: texto(dados, 'nome'), sigla: texto(dados, 'sigla') || undefined, finalidade: texto(dados, 'finalidade'),
      constituicao: eleicao ? 'ELEICAO' : 'DESIGNACAO', participacao: texto(dados, 'participacao'),
      cargos: texto(dados, 'cargos').split('\n').map(linha => linha.trim()).filter(Boolean),
      prazo_maximo_meses: eleicao ? Number(dados.get('prazo')) : undefined, evidencia: texto(dados, 'evidencia'),
    })
  }
  return <section className="surface space-y-3">
    <Button variant="outline" type="button" onClick={() => { abrir(!aberto); salvar.reset() }}>{aberto ? 'Cancelar criação' : 'Criar ministério'}</Button>
    {aberto && <form className={painel} onSubmit={enviar}>
      <h3 className="font-semibold">Novo ministério</h3>
      <label className="block">Nome<Input name="nome" maxLength={255} required /></label>
      <label className="block">Sigla<Input name="sigla" maxLength={40} /></label>
      <label className="block">Finalidade<textarea className={campo} name="finalidade" maxLength={1000} required /></label>
      <label className="block">Provimento da liderança<select className={campo} value={eleicao ? 'ELEICAO' : 'DESIGNACAO'} onChange={e => definirEleicao(e.target.value === 'ELEICAO')}>
        <option value="DESIGNACAO">Designação</option><option value="ELEICAO">Eleição</option>
      </select></label>
      <label className="block">Participação<select className={campo} name="participacao">
        <option value="MEMBROS">Membros comungantes e não comungantes</option><option value="COMUNGANTES">Apenas membros comungantes</option>
      </select></label>
      <label className="block">Cargos, um por linha<textarea className={campo} name="cargos" defaultValue="Líder" required /></label>
      {eleicao && <label className="block">Prazo máximo do cargo em meses<Input name="prazo" type="number" min={1} max={60} defaultValue={12} required /></label>}
      <label className="block">Referência do ato de instituição<Input name="evidencia" maxLength={1000} required /></label>
      <MensagemErro erro={salvar.error} />
      <Button type="submit" disabled={salvar.isPending}>Salvar ministério</Button>
    </form>}
  </section>
}

export function GestaoSociedadeMinisterio({ ficha, identidade }: { ficha: DetalheOrgao; identidade: string }) {
  const { orgao, data_referencia: data } = ficha
  const hoje = useHojeIgreja()
  const [ato, definirAto] = useState<Ato | null>(null)
  const [mensagem, definirMensagem] = useState('')
  const consulta = useQuery({ queryKey: ['orgaos', identidade, 'gestao-institucional', orgao.id, data],
    queryFn: () => sociedadesMinisteriosApi.consultar(orgao.id, { data }), enabled: import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true', gcTime: 0, retry: false })
  const regra = consulta.data?.regra
  const sigla = orgao.tipo_padrao
  function abrir(tipo: Ato['tipo'], alvo?: string, nome?: string) { definirAto({ tipo, alvo, nome }); definirMensagem('') }
  const pode = consulta.data?.pode_gerir
  return <section className="space-y-3">
    {regra && <p className="text-sm">Faixa de adesão em {data.split('-').reverse().join('/')} · {regra.idade_minima}{regra.idade_maxima === null ? ' anos ou mais' : ` a ${regra.idade_maxima} anos`}{regra.diretoria_reduzida && ' · Diretoria reduzida'}</p>}
    {pode && <div className="flex flex-wrap gap-2">
      {!orgao.ativo && sigla && <Button onClick={() => abrir('ATIVACAO_SOCIEDADE')}>Ativar sociedade</Button>}
      {orgao.ativo && <>
        <Button variant="outline" onClick={() => abrir('PARTICIPACAO_INCLUSAO')}>Registrar adesão</Button>
        <Button variant="outline" onClick={() => abrir('PROVIMENTO')}>Registrar titular</Button>
        {orgao.gestao_presidencial && <Button variant="outline" onClick={() => abrir('MANUTENCAO_MINISTERIO')}>Editar ministério</Button>}
        <Button variant="outline" onClick={() => abrir('DESATIVACAO')}>Desativar {sigla ? 'sociedade' : 'ministério'}</Button>
      </>}
    </div>}
    {mensagem && <p role="status">{mensagem}</p>}
    {ato && consulta.data && pode && <FormularioAto key={ato.tipo + (ato.alvo ?? '')} ato={ato} ficha={ficha} info={consulta.data} identidade={identidade}
      aoFechar={() => definirAto(null)} aoSalvar={() => { definirAto(null); definirMensagem('Ato registrado.') }} />}
    {pode && orgao.ativo && ficha.ocupacoes.some(o => !o.fim && (!o.termino_previsto || o.termino_previsto.slice(0, 10) >= hoje)) &&
      <details><summary className="cursor-pointer">Encerrar uma ocupação em exercício</summary>
        <ul className="mt-2 space-y-2">{ficha.ocupacoes.filter(o => !o.fim && o.inicio.slice(0, 10) <= hoje && (!o.termino_previsto || o.termino_previsto.slice(0, 10) >= hoje)).map(o =>
          <li key={o.id}><Button variant="outline" onClick={() => abrir('ENCERRAMENTO_CARGO', o.id, o.pessoa.nome_completo)}>{o.cargo.nome} · {o.pessoa.nome_completo}</Button></li>)}</ul>
      </details>}
    {ficha.consulta_nominal && <div className="space-y-2">
      <h3 className="font-semibold">Participação</h3>
      {ficha.participacoes.length === 0 && <p>Nenhuma adesão registrada.</p>}
      <ul className="space-y-2">{ficha.participacoes.map(p => <li key={p.id} className="flex flex-wrap items-center gap-2">
        <span>{p.pessoa.nome_completo} · Desde {p.inicio.slice(0, 10).split('-').reverse().join('/')}
          {p.fim ? ` · Saída em ${p.fim.slice(0, 10).split('-').reverse().join('/')}` : sigla ? p.direito_voto ? ' · Com direito a voto' : ' · Sem direito a voto' : ''}
          {p.revisao_faixa && ` · ${p.revisao_faixa.situacao === 'REVISAR' ? 'Revisar faixa etária' : 'Revisão próxima'} em ${p.revisao_faixa.data_limite.split('-').reverse().join('/')}${p.revisao_faixa.destino ? ' · Possível adesão à ' + p.revisao_faixa.destino : ''}`}
        </span>
        {pode && orgao.ativo && !p.fim && <Button variant="outline" onClick={() => abrir('PARTICIPACAO_SAIDA', p.pessoa.id, p.pessoa.nome_completo)}>Registrar saída</Button>}
      </li>)}</ul>
    </div>}
  </section>
}

type Info = Awaited<ReturnType<typeof sociedadesMinisteriosApi.consultar>>
function FormularioAto({ ato, ficha, info, identidade, aoFechar, aoSalvar }: {
  ato: Ato; ficha: DetalheOrgao; info: Info; identidade: string; aoFechar: () => void; aoSalvar: () => void;
}) {
  const { orgao } = ficha
  const { tipo } = ato
  const sigla = orgao.tipo_padrao
  const hoje = useHojeIgreja()
  const [busca, buscar] = useState('')
  const [pessoa, selecionar] = useState('')
  const [cargo, definirCargo] = useState('')
  const [desde, definirDesde] = useState(hoje)
  const provimento = tipo === 'PROVIMENTO'
  const inclusao = tipo === 'PARTICIPACAO_INCLUSAO'
  const supervisao = ['CONSELHEIRO', 'ORIENTADOR'].includes(info.cargos.find(c => c.id === cargo)?.codigo ?? '')
  const eleicao = provimento && !supervisao && orgao.constituicao === 'ELEICAO'
  const params = { data: inclusao && desde ? desde : hoje, busca: busca.trim(), ...(supervisao || (provimento && orgao.gestao_presidencial && !eleicao) ? { supervisao: '1' } : {}) }
  const candidatos = useQuery({ queryKey: ['orgaos', identidade, 'pessoas-institucional', orgao.id, params],
    queryFn: () => sociedadesMinisteriosApi.consultar(orgao.id, params), enabled: (inclusao || (provimento && !!cargo)) && busca.trim().length >= 2, gcTime: 0 })
  const escolhas = candidatos.data?.sugestoes ?? []
  const opcoes = escolhas.find(p => p.id === pessoa)?.categorias ?? []
  const salvar = useRegistro(identidade, dados => sociedadesMinisteriosApi.ato(orgao.id, dados), aoSalvar)
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const f = new FormData(evento.currentTarget)
    const evidencia = texto(f, 'evidencia')
    if (tipo === 'ATIVACAO_SOCIEDADE') {
      salvar.mutate({ tipo, evidencia, fonte: texto(f, 'fonte'), data_organizacao: texto(f, 'data'),
        idade_transicao: f.has('idade') ? Number(f.get('idade')) : undefined,
        escola_dominical: ['UCP', 'UPA'].includes(sigla ?? '') ? f.has('escola') : undefined,
        diretoria_reduzida: ['SAF', 'UMP'].includes(sigla ?? '') ? f.has('reduzida') : undefined,
        segundo_secretario_ucp: sigla === 'UCP' ? f.has('segundo') : undefined })
    } else if (tipo === 'MANUTENCAO_MINISTERIO') {
      salvar.mutate({ tipo, evidencia, nome: texto(f, 'nome'), sigla: texto(f, 'sigla') || null, finalidade: texto(f, 'finalidade') })
    } else if (inclusao) {
      salvar.mutate({ tipo, evidencia, pessoa_id: pessoa, desde, categoria: texto(f, 'categoria') || 'LOCAL' })
    } else if (provimento) {
      salvar.mutate({ tipo, evidencia, cargo_id: cargo, pessoa_id: pessoa, termino_previsto: texto(f, 'termino') || undefined,
        data_eleicao: texto(f, 'eleicao') || undefined, posse: texto(f, 'posse') || undefined, aprovacao_conselho: texto(f, 'aprovacao') || undefined,
        presente_na_eleicao: f.has('presente') || undefined, frequencia_plenarias: f.has('frequencia') ? Number(f.get('frequencia')) : undefined,
        excecao_conselho: texto(f, 'excecao') || undefined })
    } else {
      salvar.mutate({ tipo, evidencia, ...(tipo === 'PARTICIPACAO_SAIDA' ? { pessoa_id: ato.alvo } : { motivo: texto(f, 'motivo') }),
        ...(tipo === 'ENCERRAMENTO_CARGO' && { ocupacao_id: ato.alvo }) })
    }
  }
  return <form className={painel} onSubmit={enviar}>
    <h3 className="font-semibold">{nomeAto[tipo]}{ato.nome && ` · ${ato.nome}`}</h3>
    {tipo === 'ATIVACAO_SOCIEDADE' && <>
      <label className="block">Data da organização ou reativação<Input name="data" type="date" max={hoje} defaultValue={hoje} required /></label>
      <label className="block">Guia ou regra adotada<Input name="fonte" defaultValue={info.fonte ?? `GTSI 2022 · ${sigla}`} required /></label>
      {['UPA', 'UMP'].includes(sigla ?? '') && <label className="block">Idade da transição para a UMP<select name="idade" className={campo} defaultValue={sigla === 'UPA' ? (info.regra?.idade_maxima ?? 18) + 1 : info.regra?.idade_minima ?? 19}><option>19</option><option>18</option></select></label>}
      {['UCP', 'UPA'].includes(sigla ?? '') && <label className="flex gap-2"><input name="escola" type="checkbox" defaultChecked={info.regra?.escola_dominical} />Admitir alunos da Escola Dominical conforme decisão do Conselho</label>}
      {sigla === 'UCP' && <label className="flex gap-2"><input name="segundo" type="checkbox" defaultChecked={info.regra?.segundo_secretario_ucp} />Incluir segundo secretário</label>}
      {['SAF', 'UMP'].includes(sigla ?? '') && <label className="flex gap-2"><input name="reduzida" type="checkbox" defaultChecked={info.regra?.diretoria_reduzida} />Adotar diretoria reduzida</label>}
    </>}
    {tipo === 'MANUTENCAO_MINISTERIO' && <>
      <label className="block">Nome<Input name="nome" defaultValue={orgao.nome} maxLength={255} required /></label>
      <label className="block">Sigla<Input name="sigla" defaultValue={orgao.sigla ?? ''} maxLength={40} /></label>
      <label className="block">Finalidade<textarea className={campo} name="finalidade" defaultValue={orgao.finalidade} maxLength={1000} required /></label>
    </>}
    {inclusao && <label className="block">Data da adesão<Input type="date" value={desde} max={hoje} onChange={e => { definirDesde(e.target.value); selecionar('') }} required /></label>}
    {provimento && <label className="block">Cargo<select className={campo} value={cargo} onChange={e => { definirCargo(e.target.value); selecionar('') }} required>
      <option value="">Escolha um cargo</option>{info.cargos.map(c => <option value={c.id} key={c.id}>{c.nome}</option>)}
    </select></label>}
    {(inclusao || (provimento && !!cargo)) && <>
      <label className="block">Buscar pessoa pelo nome<Input value={busca} onChange={e => { buscar(e.target.value); selecionar('') }} minLength={2} required /></label>
      <label className="block">Pessoa<select className={campo} value={pessoa} onChange={e => selecionar(e.target.value)} required>
        <option value="">Escolha a pessoa</option>{escolhas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
      </select></label>
      {candidatos.isFetching && <p role="status">Buscando pessoas...</p>}
      {candidatos.isSuccess && !escolhas.length && <p>Nenhuma pessoa encontrada para a data e a função.</p>}
      <MensagemErro erro={candidatos.error} />
    </>}
    {inclusao && orgao.tipo === 'SOCIEDADE_INTERNA' && opcoes.length > 0 && <label className="block">Categoria de participação<select name="categoria" className={campo} key={pessoa}>{opcoes.map(c => <option key={c} value={c}>{categoriasParticipacao[c]}</option>)}</select></label>}
    {provimento && <label className="block">Último dia previsto<Input name="termino" type="date" min={hoje} required={eleicao} /></label>}
    {eleicao && <>
      <label className="block">Data da eleição<Input name="eleicao" type="date" max={hoje} defaultValue={hoje} required /></label>
      {sigla && <label className="block">Referência da aprovação pelo Conselho<Input name="aprovacao" maxLength={1000} required /></label>}
      <label className="block">Referência da posse<Input name="posse" maxLength={1000} required /></label>
      {sigla === 'SAF' && <>
        <label className="block">Frequência às plenárias (%)<Input name="frequencia" type="number" min={50} max={100} required /></label>
        <label className="flex gap-2"><input type="checkbox" name="presente" required />Presença confirmada na eleição</label>
      </>}
      {['UPA', 'UMP'].includes(sigla ?? '') && <label className="block">Referência da exceção aprovada pelo Conselho, se aplicável<Input name="excecao" maxLength={1000} /></label>}
    </>}
    {['ENCERRAMENTO_CARGO', 'DESATIVACAO'].includes(tipo) && <label className="block">Motivo<Input name="motivo" required maxLength={1000} /></label>}
    {tipo === 'DESATIVACAO' && <p>Os vínculos em exercício serão encerrados. O acervo continuará disponível para consulta.</p>}
    <label className="block">{tipo === 'ATIVACAO_SOCIEDADE' || supervisao ? 'Referência do ato do Conselho' : 'Referência do ato'}<Input name="evidencia" maxLength={1000} required /></label>
    <MensagemErro erro={salvar.error} />
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={salvar.isPending}>Registrar ato</Button><Button type="button" variant="outline" onClick={aoFechar}>Cancelar</Button></div>
  </form>
}
