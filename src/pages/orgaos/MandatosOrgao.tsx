import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { orgaosApi, type MandatoFicha } from '../../api/orgaos'
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

export function MandatosOrgao({ orgao, identidade, data, conselho }: { orgao: string; identidade: string; data: string; conselho: boolean }) {
  const [paginas, setPaginas] = useState<string[]>([])
  const [paginasPastores, setPaginasPastores] = useState<string[]>([])
  const [form, setForm] = useState<{ titular?: OficialResumo['pessoa'] } | null>(null)
  const [registro, setRegistro] = useState<{ oficial: OficialResumo; periodo?: string; modo: 'encerrar' | 'vinculo' | 'acervo' } | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [mostrarPastores, setMostrarPastores] = useState(false)
  const perfil = useAuthStore(s => s.user?.perfil)
  const client = useQueryClient()
  const cursor = paginas[paginas.length - 1], cursorPastores = paginasPastores[paginasPastores.length - 1]
  const lista = useQuery({ queryKey: ['orgaos', identidade, 'mandatos', orgao, cursor], queryFn: () => orgaosApi.mandatos(orgao, cursor), staleTime: 0 })
  const pastores = useQuery({ queryKey: ['orgaos', identidade, 'vinculos', orgao, cursorPastores], queryFn: () => orgaosApi.docentesConselho(orgao, cursorPastores), enabled: conselho && mostrarPastores })
  const podeRegistrar = lista.data?.pode_registrar && import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true'
  function iniciar(titular?: OficialResumo['pessoa']) { setForm({ titular }); setRegistro(null); setSucesso(false) }
  async function concluir() {
    setForm(null); setPaginas([]); setSucesso(true)
    await Promise.all([client.invalidateQueries({ queryKey: ['orgaos', identidade] }), client.invalidateQueries({ queryKey: ['oficiais', identidade] })])
  }
  return <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2">
    <h3 className="font-semibold">Mandatos de {conselho ? 'presbíteros regentes' : 'diáconos'}</h3>
    {podeRegistrar && !form && <Button onClick={() => iniciar()}>Registrar mandato</Button>}</div>
    {form && podeRegistrar && <><RegistroMandato key={form.titular?.id ?? 'novo'} orgao={orgao} identidade={identidade} titular={form.titular} concluir={concluir} />
      <Button variant="outline" onClick={() => setForm(null)}>Fechar formulário</Button></>}
    {sucesso && <p role="status">Mandato registrado.</p>}
    {lista.isPending ? <p>Carregando mandatos…</p> : lista.isError ? <p role="alert">Não foi possível consultar os mandatos.</p> : !lista.data.itens.length ? <p>Nenhum mandato registrado.</p> :
      lista.data.itens.map(m => {
        const { situacao, percentual } = prazo(m, data)
        return <article className="space-y-2 rounded-xl border p-3" key={m.id}><div className="flex flex-wrap justify-between gap-2"><strong>{m.oficial.pessoa.nome_completo}</strong><span>{situacao}</span></div>
          <p>Eleição em {fmt(m.data_eleicao)} · Posse em {fmt(m.data_posse)} · Término previsto em {fmt(m.termino_previsto)}</p>
          {m.termino_efetivo && <p>Último dia de exercício em {fmt(m.termino_efetivo)}.</p>}
          {m.motivo_encerramento && <p>Motivo do encerramento: {m.motivo_encerramento}</p>}
          {m.registro && <p className="text-sm text-muted-foreground">Registro por {m.registro.operador} em {new Date(m.registro.instante).toLocaleDateString('pt-BR')} · configuração {m.versao_orgao?.numero}.</p>}
          <p className="flex items-center gap-2"><progress aria-label={'Período do mandato de ' + m.oficial.pessoa.nome_completo} value={percentual} max={100} />{percentual}%</p>
          <div className="flex flex-wrap gap-2">{perfil !== Perfil.AUDITOR && <Button variant="outline" onClick={() => { setRegistro({ oficial: m.oficial, modo: 'acervo' }); setForm(null) }}>Abrir prontuário e atos</Button>}
            {podeRegistrar && <Button variant="outline" onClick={() => iniciar(m.oficial.pessoa)}>Registrar reeleição</Button>}
            {m.pode_encerrar && <Button variant="outline" onClick={() => { setRegistro({ oficial: m.oficial, periodo: 'mandatos:' + m.id, modo: 'encerrar' }); setForm(null) }}>Encerrar mandato</Button>}</div></article>
      })}
    <Paginacao cursores={paginas} mudar={setPaginas} proximo={lista.data?.proximo_cursor} nome="mandatos" />
    {conselho && <Button variant="outline" aria-expanded={mostrarPastores} onClick={() => setMostrarPastores(!mostrarPastores)}>Vínculos pastorais do Conselho</Button>}
    {mostrarPastores && conselho && <section className="space-y-2"><h4 className="font-medium">Presbíteros docentes</h4>
      {pastores.isPending ? <p>Consultando vínculos…</p> : pastores.isError ? <p role="alert">Falha ao consultar vínculos pastorais.</p> :
      pastores.data.itens.length ? pastores.data.itens.map(o => <article key={o.id} className="space-y-1 rounded-xl border p-3"><strong>{o.pessoa.nome_completo}</strong>
        {o.vinculos_pastorais.map(v => <p key={v.id}>{v.modalidade} · {fmt(v.data_inicio)} até {v.data_fim ? fmt(v.data_fim) : 'prazo aberto'}</p>)}
        {!o.vinculos_pastorais.length && <p>Sem vínculo institucional registrado.</p>}
        {perfil !== Perfil.AUDITOR && <Button variant="outline" onClick={() => { setRegistro({ oficial: o, modo: 'vinculo' }); setForm(null) }}>Consultar e registrar vínculo</Button>}</article>) : <p>Nenhum ofício docente cadastrado.</p>}
      <Paginacao cursores={paginasPastores} mudar={setPaginasPastores} proximo={pastores.data?.proximo_cursor} nome="docentes" /></section>}
    {registro && <aside className="space-y-2"><Button variant="outline" onClick={() => setRegistro(null)}>Fechar prontuário</Button>
      <GestaoOficial key={registro.oficial.id + registro.modo + (registro.periodo ?? '')} periodoInicial={registro.periodo} oficial={registro.oficial} identidade={identidade} modoInicial={registro.modo} podeConsultarDetalhe={false} /></aside>}
  </section>
}

function Paginacao({ cursores, mudar, proximo, nome }: { cursores: string[]; mudar: (c: string[]) => void; proximo?: string | null; nome: string }) {
  if (!cursores.length && !proximo) return null
  return <div className="flex gap-2"><Button variant="outline" disabled={!cursores.length} onClick={() => mudar(cursores.slice(0,-1))}>Voltar na lista de {nome}</Button>
    <Button variant="outline" disabled={!proximo} onClick={() => proximo && mudar([...cursores, proximo])}>Mais {nome}</Button></div>
}
