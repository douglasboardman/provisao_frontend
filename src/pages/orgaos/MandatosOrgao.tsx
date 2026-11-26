import { PainelLocal, SecaoPainel } from '../../components/shared/Painel'
import { ProvimentoCargo } from './ProvimentoCargo'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { orgaosApi, type DetalheOrgao, type VagaCargo, type MandatoFicha } from '../../api/orgaos'
import type { OficialResumo } from '../../api/oficiais'
import { Perfil } from '../../types/enums'
import { useAuthStore } from '../../stores/auth'
import { Button } from '../../components/ui/button'
import { GestaoOficial } from '../oficiais/GestaoOficial'
import { RegistroMandato } from './RegistroMandato'
import { formatarDataCivil as fmt } from '../../lib/membresia-temporal'

function prazo(m: MandatoFicha, dia: string) {
  const inicio = m.data_posse.slice(0,10), fim = (m.termino_efetivo ?? m.termino_previsto).slice(0,10)
  const percentual = dia < inicio ? 0 : dia >= fim ? 100 : Math.round(100 * (Date.parse(dia) - Date.parse(inicio)) / (Date.parse(fim) - Date.parse(inicio)))
  return { situacao: dia < inicio ? 'Posse futura' : dia > fim ? 'Encerrado' : 'No período do mandato', percentual }
}

type PreparoRegistro = DetalheOrgao['preparo_registro_cargos']

export function OrientacaoVinculoParaRegistro() {
  return <div className="space-y-2">
    <p>Para registrar atos, a conta de administrador precisa estar vinculada ao seu cadastro de pessoa. Peça a outro administrador da igreja para usar <strong>Vincular pessoa</strong> na sua conta em Usuários.</p>
    <Button asChild variant="outline"><a href="/usuarios">Abrir usuários</a></Button>
  </div>
}

export function MandatosOrgao({ orgao, identidade, data, conselho, cargos, podeAtribuir = false, preparoRegistro, orgaoOficialAtivo }: {
  orgao: string; identidade: string; data: string; conselho: boolean; cargos?: VagaCargo[]
  podeAtribuir?: boolean; preparoRegistro?: PreparoRegistro; orgaoOficialAtivo?: boolean
}) {
  const [paginas, setPaginas] = useState<string[]>([])
  const [paginasPastores, setPaginasPastores] = useState<string[]>([])
  const [mandatario, escolherMandatario] = useState<OficialResumo['pessoa'] | null>(null)
  const [cargoId, escolherCargo] = useState('')
  const cargo = cargos?.find(c => c.id === cargoId)
  const [form, setForm] = useState<{ titular?: OficialResumo['pessoa'] } | null>(null)
  const [registro, setRegistro] = useState<{ oficial: OficialResumo; periodo?: string; modo: 'encerrar' | 'vinculo' | 'acervo' } | null>(null)
  const [mensagem, setMensagem] = useState('')
  const [mostrarPastores, setMostrarPastores] = useState(false)
  const perfil = useAuthStore(s => s.user?.perfil)
  const client = useQueryClient()
  const cursor = paginas[paginas.length - 1], cursorPastores = paginasPastores[paginasPastores.length - 1]
  const lista = useQuery({ queryKey: ['orgaos', identidade, 'mandatos', orgao, cursor], queryFn: () => orgaosApi.mandatos(orgao, cursor), staleTime: 0 })
  const pastores = useQuery({ queryKey: ['orgaos', identidade, 'vinculos', orgao, cursorPastores], queryFn: () => orgaosApi.docentesConselho(orgao, cursorPastores), enabled: conselho && mostrarPastores })
  const mostrarAtribuicao = !!cargos?.length && (podeAtribuir || preparoRegistro)
  const gestaoHabilitada = import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true'
  const podeRegistrar = gestaoHabilitada && lista.data?.pode_registrar
  const orientarRegistro = gestaoHabilitada && orgaoOficialAtivo && preparoRegistro === 'VINCULAR_PESSOA' &&
    lista.isSuccess && !podeRegistrar
  function iniciar(titular?: OficialResumo['pessoa']) { setForm({ titular }); setRegistro(null); setMensagem('') }
  async function concluir() {
    setForm(null); setPaginas([]); setMensagem('Mandato registrado.')
    await Promise.all([client.invalidateQueries({ queryKey: ['orgaos', identidade] }), client.invalidateQueries({ queryKey: ['oficiais', identidade] })])
  }
  const prontuario = registro && <GestaoOficial voltar={() => setRegistro(null)} key={registro.oficial.id + registro.modo + (registro.periodo ?? '')} periodoInicial={registro.periodo} oficial={registro.oficial} identidade={identidade} modoInicial={registro.modo} podeConsultarDetalhe={false} />
  return <PainelLocal><section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2">
    <h3 className="font-semibold">Mandatos de {conselho ? 'presbíteros regentes' : 'diáconos'}</h3>
    {(podeRegistrar || orientarRegistro) && <Button onClick={() => iniciar()}>Registrar mandato</Button>}</div>
    {form && (podeRegistrar || orientarRegistro) && <SecaoPainel titulo={form.titular ? 'Registrar reeleição' : 'Registrar mandato'} voltar={() => setForm(null)}>
      {podeRegistrar ? <RegistroMandato key={form.titular?.id ?? 'novo'} orgao={orgao} identidade={identidade} titular={form.titular} concluir={concluir} />
        : <OrientacaoVinculoParaRegistro />}
    </SecaoPainel>}
    {mensagem && <p role="status">{mensagem}</p>}
    {lista.isPending ? <p>Carregando mandatos…</p> : lista.isError ? <p role="alert">Não foi possível consultar os mandatos.</p> : !lista.data.itens.length ? <p>Nenhum mandato registrado.</p> :
      lista.data.itens.map(m => {
        const { situacao, percentual } = prazo(m, data)
        const funcoes = cargos?.filter(c => c.titulares.some(t => t.id === m.oficial.pessoa.id)).map(c => c.nome)
        return <article className="space-y-2 rounded-xl border p-3" key={m.id}><div className="flex flex-wrap justify-between gap-2"><strong>{m.oficial.pessoa.nome_completo}</strong><span>{situacao}</span></div>
          <p>Eleição em {fmt(m.data_eleicao)} · Posse em {fmt(m.data_posse)} · Término previsto em {fmt(m.termino_previsto)}</p>
          {!!funcoes?.length && <p>Cargos de {m.oficial.pessoa.nome_completo} em {fmt(data)}: {funcoes.join(', ')}.</p>}
          {m.termino_efetivo && <p>Último dia de exercício em {fmt(m.termino_efetivo)}.</p>}
          {m.motivo_encerramento && <p>Motivo do encerramento: {m.motivo_encerramento}</p>}
          {m.registro && <p className="text-sm text-muted-foreground">Registro por {m.registro.operador} em {new Date(m.registro.instante).toLocaleDateString('pt-BR')} · configuração {m.versao_orgao?.numero}.</p>}
          <p className="flex items-center gap-2"><progress aria-label={'Período do mandato de ' + m.oficial.pessoa.nome_completo} value={percentual} max={100} />{percentual}%</p>
          <div className="flex flex-wrap gap-2">{perfil !== Perfil.AUDITOR && <Button variant="outline" onClick={() => { setRegistro({ oficial: m.oficial, modo: 'acervo' }); setForm(null) }}>Abrir prontuário e atos</Button>}
            {mostrarAtribuicao && <Button variant="outline" onClick={() => { setMensagem(''); escolherCargo(''); escolherMandatario(m.oficial.pessoa) }}>Atribuir cargo</Button>}
            {podeRegistrar && <Button variant="outline" onClick={() => iniciar(m.oficial.pessoa)}>Registrar reeleição</Button>}
            {m.pode_encerrar && <Button variant="outline" onClick={() => { setRegistro({ oficial: m.oficial, periodo: 'mandatos:' + m.id, modo: 'encerrar' }); setForm(null) }}>Encerrar mandato</Button>}</div></article>
      })}
    <Paginacao cursores={paginas} mudar={setPaginas} proximo={lista.data?.proximo_cursor} nome="mandatos" />
    {mostrarAtribuicao && mandatario && <SecaoPainel titulo={`Atribuir cargo a ${mandatario.nome_completo}`} voltar={() => escolherMandatario(null)}>
      {!podeAtribuir && preparoRegistro && <OrientacaoVinculoParaRegistro />}
      <ul className="divide-y">{cargos?.map(c => <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div><strong>{c.nome}</strong><p className="text-sm text-muted-foreground">{c.titulares.map(t => t.nome_completo).join(', ') || 'Vago'}</p></div>
        {podeAtribuir && <Button variant="outline" onClick={() => escolherCargo(c.id)}>{c.titulares.length ? 'Programar sucessão' : 'Selecionar cargo'}</Button>}
      </li>)}</ul>
      {podeAtribuir && cargo && <ProvimentoCargo orgao={orgao} identidade={identidade} cargo={cargo} titular={cargo.ocupacoes?.[0]} encerrar={false}
        mandatario={mandatario} aoFechar={() => escolherCargo('')} aoSalvar={() => { setMensagem(`Atribuição registrada: ${cargo.nome} · ${mandatario.nome_completo}.`); escolherMandatario(null); escolherCargo('') }} />}
    </SecaoPainel>}
    {conselho && <Button variant="outline" aria-expanded={mostrarPastores} onClick={() => setMostrarPastores(!mostrarPastores)}>Vínculos pastorais do Conselho</Button>}
    {mostrarPastores && conselho && <SecaoPainel titulo="Vínculos pastorais do Conselho" voltar={() => setMostrarPastores(false)}>
      {pastores.isPending ? <p>Consultando vínculos…</p> : pastores.isError ? <p role="alert">Falha ao consultar vínculos pastorais.</p> :
      pastores.data.itens.length ? pastores.data.itens.map(o => <article key={o.id} className="space-y-1 rounded-xl border p-3"><strong>{o.pessoa.nome_completo}</strong>
        {o.vinculos_pastorais.map(v => <p key={v.id}>{v.modalidade} · {fmt(v.data_inicio)} até {v.data_fim ? fmt(v.data_fim) : 'prazo aberto'}</p>)}
        {!o.vinculos_pastorais.length && <p>Sem vínculo institucional registrado.</p>}
        {perfil !== Perfil.AUDITOR && <Button variant="outline" onClick={() => { setRegistro({ oficial: o, modo: 'vinculo' }); setForm(null) }}>Consultar e registrar vínculo</Button>}</article>) : <p>Nenhum ofício docente cadastrado.</p>}
      <Paginacao cursores={paginasPastores} mudar={setPaginasPastores} proximo={pastores.data?.proximo_cursor} nome="docentes" />
      {registro?.modo === 'vinculo' && prontuario}
    </SecaoPainel>}
    {registro && registro.modo !== 'vinculo' && prontuario}
  </section></PainelLocal>
}

function Paginacao({ cursores, mudar, proximo, nome }: { cursores: string[]; mudar: (c: string[]) => void; proximo?: string | null; nome: string }) {
  if (!cursores.length && !proximo) return null
  return <div className="flex gap-2"><Button variant="outline" disabled={!cursores.length} onClick={() => mudar(cursores.slice(0,-1))}>Voltar na lista de {nome}</Button>
    <Button variant="outline" disabled={!proximo} onClick={() => proximo && mudar([...cursores, proximo])}>Mais {nome}</Button></div>
}
