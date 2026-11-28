import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, BookOpen, FileText, Printer } from 'lucide-react'
import { eventosMembresiaApi } from '../../api/eventos-membresia'
import { igrejaApi } from '../../api/igreja'
import { pessoasApi } from '../../api/pessoas'
import logo from '../../assets/logo-48.png'
import { ErrorState } from '../../components/shared/ErrorState'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { MOTIVACAO_LABELS, ROL_LABELS, TIPO_LABELS } from '../../lib/membresia-labels'
import { agruparAtosPorPessoa, atosQueExigemConferencia, dataCivilLocal, formatarDataCivil } from '../../lib/membresia-temporal'
import { useAuthStore } from '../../stores/auth'
import { MembresiaRol } from '../../types/enums'
import { CATEGORY_LABELS, CATEGORY_ORDER, montarRol, resumirRol } from './dados-rol'
import './relatorios.css'

const modelos = {
  nominal: {
    titulo: 'Rol nominal de membros',
    descricao: 'Relação em ordem alfabética, com situação no rol e modalidade de admissão.',
    colunas: ['Nome', 'Situação no rol', 'Modalidade de admissão'],
    icone: BookOpen,
  },
  resumo: {
    titulo: 'Resumo por situação no rol',
    descricao: 'Total e percentual de pessoas em cada situação do cadastro.',
    colunas: ['Situação no rol', 'Pessoas', 'Percentual'],
    icone: BarChart3,
  },
  movimentacoes: {
    titulo: 'Movimentações de membresia',
    descricao: 'Admissões, demissões e mudanças de rol registradas no período.',
    colunas: ['Data', 'Pessoa', 'Evento', 'Motivação', 'Rol resultante'],
    icone: FileText,
  },
} as const

type Modelo = keyof typeof modelos
type Relatorio = {
  modelo: Modelo
  igreja: string
  referencia: string
  emitido: string
  filtro?: string
  total: number
  aviso?: string
  linhas: { id: string; celulas: string[] }[]
}

const percentual = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const totalPt = new Intl.NumberFormat('pt-BR')

export function RelatoriosMembresia({ podeConsultarPessoas }: { podeConsultarPessoas: boolean }) {
  const hoje = dataCivilLocal(new Date())
  const [modelo, setModelo] = useState<Modelo>(podeConsultarPessoas ? 'nominal' : 'movimentacoes')
  const [situacao, setSituacao] = useState('ativos')
  const [inicio, setInicio] = useState(hoje.slice(0, 7) + '-01')
  const [fim, setFim] = useState(hoje)
  const [tipo, setTipo] = useState('todos')
  const [previa, setPrevia] = useState<Relatorio>()
  const identidade = useAuthStore(s => `${s.user?.igreja_id}:${s.user?.sub}`)
  const igrejaId = useAuthStore(s => s.user?.igreja_id)
  const modelosVisiveis = (Object.keys(modelos) as Modelo[]).filter(id => podeConsultarPessoas || id === 'movimentacoes')

  const igrejas = useQuery({ queryKey: ['igrejas-relatorios'], queryFn: igrejaApi.listPublic })
  const pessoas = useQuery({
    queryKey: ['pessoas', identidade], queryFn: pessoasApi.list, enabled: podeConsultarPessoas && modelo !== 'movimentacoes',
  })
  const eventos = useQuery({ queryKey: ['eventos-membresia', identidade], queryFn: eventosMembresiaApi.list })
  const nomeIgreja = igrejas.data?.find(i => i.id === igrejaId)?.nome
  const consultas = modelo === 'movimentacoes' ? [igrejas, eventos] : [igrejas, eventos, pessoas]
  const falha = consultas.find(q => q.isError)
  const carregando = consultas.some(q => q.isPending)
  const periodoInvalido = modelo === 'movimentacoes' && !!inicio && !!fim && inicio > fim

  function gerar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!nomeIgreja || !eventos.data || falha || periodoInvalido) return

    const dados = {
      modelo,
      igreja: nomeIgreja,
      emitido: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      referencia: formatarDataCivil(hoje),
    }

    if (modelo === 'movimentacoes') {
      if (!inicio || !fim) return
      const emConferencia = new Set([...agruparAtosPorPessoa(eventos.data).values()]
        .flatMap(atosQueExigemConferencia).map(e => e.id))
      const selecao = eventos.data.filter(ev => {
        const data = ev.data_evento.slice(0, 10)
        return data >= inicio && data <= fim && (tipo === 'todos' || tipo === ev.tipo_evento)
      })
      const linhas = selecao.filter(ev => !emConferencia.has(ev.id))
        .map(ev => ({
          id: ev.id,
          celulas: [formatarDataCivil(ev.data_evento), ev.pessoas?.nome_completo ?? 'Pessoa indisponível',
            TIPO_LABELS[ev.tipo_evento], MOTIVACAO_LABELS[ev.motivacao_evento], ROL_LABELS[ev.rol]],
        }))
      setPrevia({
        ...dados,
        referencia: `${formatarDataCivil(inicio)} a ${formatarDataCivil(fim)}`,
        filtro: tipo === 'todos' ? 'Todos os tipos de evento' : TIPO_LABELS[tipo as keyof typeof TIPO_LABELS],
        total: linhas.length,
        aviso: selecao.length > linhas.length ? `Movimentações fora do relatório até conferência (${selecao.length - linhas.length}).` : undefined,
        linhas,
      })
      return
    }

    if (!pessoas.data || !podeConsultarPessoas) return
    const { members: rol, pendencias } = montarRol(pessoas.data, eventos.data, hoje)
    const aviso = pendencias > 0 ? `Cadastros fora do rol até conferência (${pendencias}).` : undefined
    if (modelo === 'resumo') {
      const linhas = resumirRol(rol).map(item => ({
        id: item.key, celulas: [item.label, totalPt.format(item.count), `${percentual.format(item.percent)}%`],
      }))
      setPrevia({ ...dados, total: rol.length, aviso, linhas })
      return
    }

    const linhas = rol
      .filter(p => situacao === 'todas' || (situacao === 'ativos'
        ? p.rolKey === MembresiaRol.COMUNGANTES || p.rolKey === MembresiaRol.NAO_COMUNGANTES
        : p.rolKey === situacao))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map(p => ({ id: p.id, celulas: [p.nome, p.rolLabel, p.admissaoLabel] }))
    const filtro = situacao === 'ativos' ? 'Comungantes e não comungantes'
      : situacao === 'todas' ? 'Todas as situações no rol' : CATEGORY_LABELS[situacao]
    setPrevia({ ...dados, filtro, total: linhas.length, aviso, linhas })
  }

  return <section className="relatorios-membresia space-y-5" aria-label="Relatórios de membresia">
    <form className="surface space-y-5" onSubmit={gerar}>
      <fieldset className="min-w-0">
        <legend className="mb-3 text-lg font-heading font-semibold">Modelo de relatório</legend>
        <div className="grid gap-3 lg:grid-cols-3">
          {modelosVisiveis.map(id => {
            const { titulo, descricao, icone: Icon } = modelos[id]
            return <label key={id} className="relative grid cursor-pointer grid-cols-[auto_1fr] items-start gap-x-3 rounded-xl border p-4 transition-colors has-[:checked]:border-purple has-[:checked]:bg-purple-muted/25 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-purple hover:bg-muted/60">
              <Icon className="size-5 text-purple" aria-hidden />
              <span className="grid gap-1 pr-5">
                <strong className="text-sm">{titulo}</strong>
                <span className="text-sm text-muted-foreground">{descricao}</span>
              </span>
              <input type="radio" name="modelo-relatorio" value={id} checked={modelo === id}
                onChange={() => { setModelo(id); setPrevia(undefined) }} aria-label={titulo}
                className="absolute top-4 right-4 accent-purple" />
            </label>
          })}
        </div>
      </fieldset>

      {modelo === 'nominal' && <div className="max-w-xs space-y-1.5">
        <label htmlFor="relatorio-situacao" className="text-sm font-medium">Situação no rol</label>
        <Select value={situacao} onValueChange={valor => { setSituacao(valor); setPrevia(undefined) }}>
          <SelectTrigger id="relatorio-situacao" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ativos">Comungantes e não comungantes</SelectItem>
            <SelectItem value="todas">Todas as situações</SelectItem>
            {CATEGORY_ORDER.map(id => <SelectItem key={id} value={id}>{CATEGORY_LABELS[id]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>}

      {modelo === 'movimentacoes' && <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-36 gap-1.5 text-sm font-medium">Data inicial
          <Input type="date" required max={fim || undefined} value={inicio} onChange={e => { setInicio(e.target.value); setPrevia(undefined) }} />
        </label>
        <label className="grid min-w-36 gap-1.5 text-sm font-medium">Data final
          <Input type="date" required min={inicio || undefined} value={fim} onChange={e => { setFim(e.target.value); setPrevia(undefined) }} />
        </label>
        <div className="min-w-40 space-y-1.5">
          <label htmlFor="relatorio-tipo" className="text-sm font-medium">Tipo de evento</label>
          <Select value={tipo} onValueChange={valor => { setTipo(valor); setPrevia(undefined) }}>
            <SelectTrigger id="relatorio-tipo" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(TIPO_LABELS).map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>}
      {periodoInvalido && <p role="alert">A data final deve ser igual ou posterior à data inicial.</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={carregando || !!falha || !nomeIgreja || periodoInvalido}>Gerar prévia</Button>
        {previa && !falha && <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" />Imprimir / salvar PDF
        </Button>}
      </div>
    </form>

    {carregando && <p role="status">Carregando dados dos relatórios…</p>}
    {falha && <ErrorState error={falha.error} onRetry={() => falha.refetch()} />}
    {!carregando && !falha && !nomeIgreja && <p role="alert">Não foi possível identificar a igreja para o cabeçalho do relatório.</p>}
    {previa && !falha && <article className="relatorio-membresia" aria-label="Prévia do relatório">
      <header className="relatorio-membresia-cabecalho">
        <img src={logo} alt="ProVisão" width="36" height="36" />
        <div>
          <p className="text-sm font-semibold">{previa.igreja}</p>
          <h2 className="font-heading text-xl font-bold sm:text-2xl">{modelos[previa.modelo].titulo}</h2>
        </div>
      </header>
      <dl className="relatorio-membresia-dados">
        <div><dt>{previa.modelo === 'movimentacoes' ? 'Período' : 'Data de referência'}</dt><dd>{previa.referencia}</dd></div>
        <div><dt>Emissão</dt><dd>{previa.emitido}</dd></div>
        <div><dt>{previa.modelo === 'movimentacoes' ? 'Total de eventos' : 'Total de pessoas'}</dt><dd>{totalPt.format(previa.total)}</dd></div>
        {previa.filtro && <div><dt>Seleção</dt><dd>{previa.filtro}</dd></div>}
      </dl>
      {previa.aviso && <p className="px-4 text-sm">{previa.aviso}</p>}
      <div className="relatorio-membresia-tabela" data-modelo={previa.modelo}>
        {previa.linhas.length ? <table aria-label={modelos[previa.modelo].titulo}>
          <thead><tr>{modelos[previa.modelo].colunas.map(coluna => <th key={coluna} scope="col">{coluna}</th>)}</tr></thead>
          <tbody>{previa.linhas.map(linha => <tr key={linha.id}>
            {linha.celulas.map((celula, indice) => <td key={indice}>{celula || '—'}</td>)}
          </tr>)}</tbody>
        </table> : <p className="p-4 text-sm">Nenhum registro para a seleção informada.</p>}
      </div>
      <footer>ProVisão · Gestão eclesiástica</footer>
    </article>}
  </section>
}
