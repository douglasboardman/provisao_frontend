import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '../../api/client'
import { oficiaisApi, type AtaDeEleicao, type OficioEletivo } from '../../api/oficiais'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

const tipos: Record<OficioEletivo, string> = { DIACONO: 'Diácono', PRESBITERO_REGENTE: 'Presbítero regente' }
const selectClass = 'block w-full rounded border bg-background p-2'
const civil = (data: string) => data.slice(0, 10)
const exibirData = (data: string) => civil(data).split('-').reverse().join('/')
const mensagem = (erro: unknown) => erro instanceof ApiRequestError ? erro.messages.join(' ') : 'Não foi possível salvar o registro.'

function SelecionarAta({ tipo, identidade, ata, selecionar }: {
  tipo: 'CONSELHO' | 'ASSEMBLEIA'
  identidade: string
  ata: AtaDeEleicao | null
  selecionar: (ata: AtaDeEleicao | null) => void
}) {
  const [busca, setBusca] = useState('')
  const atas = useQuery({
    queryKey: ['oficiais', identidade, 'atas-eleicao', tipo, busca],
    queryFn: () => oficiaisApi.atasDeEleicao(tipo, busca),
  })
  return <div className="space-y-2">
    <label className="block">Buscar ata por número ou assunto
      <Input value={busca} maxLength={100} onChange={e => { setBusca(e.target.value); selecionar(null) }} />
    </label>
    <label className="block">{tipo === 'CONSELHO' ? 'Ata do Conselho que aprovou a indicação' : 'Ata da Assembleia que registrou a eleição'}
      <select className={selectClass} required value={ata?.versao_id ?? ''} onChange={e => selecionar(atas.data?.find(a => a.versao_id === e.target.value) ?? null)}>
        <option value="">Selecione a ata</option>
        {atas.data?.map(a => <option key={a.versao_id} value={a.versao_id}>
          {[a.numero && `Ata ${a.numero}`, exibirData(a.data), a.assunto].filter(Boolean).join(' · ')}
        </option>)}
      </select>
    </label>
    {atas.isPending && <p>Buscando atas…</p>}
    {atas.isError && <p role="alert">Não foi possível buscar as atas.</p>}
    {atas.data?.length === 0 && <p>Nenhuma ata encontrada.</p>}
  </div>
}

function FormularioIndicacao({ identidade }: { identidade: string }) {
  const client = useQueryClient()
  const [ata, setAta] = useState<AtaDeEleicao | null>(null)
  const [pessoa, setPessoa] = useState('')
  const [busca, setBusca] = useState('')
  const candidatos = useQuery({
    queryKey: ['oficiais', identidade, 'candidatos', ata?.versao_id, busca],
    queryFn: () => oficiaisApi.candidatos(ata!.versao_id, busca),
    enabled: !!ata,
  })
  const salvar = useMutation({
    mutationFn: oficiaisApi.registrarIndicacao,
    onSuccess: async () => {
      setPessoa('')
      await client.invalidateQueries({ queryKey: ['oficiais', identidade, 'indicacoes'] })
    },
  })
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!ata || !pessoa) return
    const campos = new FormData(e.currentTarget)
    salvar.mutate({
      pessoa_id: pessoa, ata_conselho_versao_id: ata.versao_id,
      oficio: campos.get('oficio') as OficioEletivo, data_assembleia: String(campos.get('assembleia')),
    })
  }
  return <form className="max-w-xl space-y-3" onSubmit={enviar}>
    <SelecionarAta tipo="CONSELHO" identidade={identidade} ata={ata} selecionar={a => { setAta(a); setPessoa(''); salvar.reset() }} />
    {ata && <>
      <label className="block">Buscar membro pelo nome
        <Input value={busca} maxLength={100} onChange={e => { setBusca(e.target.value); setPessoa('') }} />
      </label>
      <label className="block">Membro indicado
        <select className={selectClass} required value={pessoa} onChange={e => setPessoa(e.target.value)}>
          <option value="">Selecione o membro</option>
          {candidatos.data?.map(p => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}
        </select>
      </label>
      {candidatos.isPending && <p>Buscando membros…</p>}
      {candidatos.isError && <p role="alert">Não foi possível consultar os membros aptos.</p>}
      {candidatos.data?.length === 0 && <p>Nenhum membro apto encontrado.</p>}
      <label className="block">Ofício da indicação
        <select name="oficio" className={selectClass} required>
          {Object.entries(tipos).map(([tipo, nome]) => <option value={tipo} key={tipo}>{nome}</option>)}
        </select>
      </label>
      <label className="block">Data da assembleia de eleição
        <Input name="assembleia" type="date" min={civil(ata.data)} required />
      </label>
      <Button type="submit" disabled={!pessoa || salvar.isPending}>Salvar indicação</Button>
    </>}
    {salvar.isError && <p role="alert">{mensagem(salvar.error)}</p>}
    {salvar.isSuccess && <p role="status">Indicação registrada.</p>}
  </form>
}

function FormularioMandato({ identidade }: { identidade: string }) {
  const client = useQueryClient()
  const [ata, setAta] = useState<AtaDeEleicao | null>(null)
  const [indicacao, setIndicacao] = useState('')
  const indicacoes = useQuery({
    queryKey: ['oficiais', identidade, 'indicacoes', ata?.versao_id],
    queryFn: () => oficiaisApi.indicacoes(ata!.versao_id),
    enabled: !!ata,
  })
  const salvar = useMutation({
    mutationFn: oficiaisApi.registrarMandatoPorIndicacao,
    onSuccess: async () => {
      setIndicacao('')
      await client.invalidateQueries({ queryKey: ['oficiais', identidade] })
    },
  })
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!ata || !indicacao) return
    const campos = new FormData(e.currentTarget)
    salvar.mutate({ indicacao_id: indicacao, ata_assembleia_versao_id: ata.versao_id, data_posse: String(campos.get('posse')) })
  }
  return <form className="max-w-xl space-y-3" onSubmit={enviar}>
    <SelecionarAta tipo="ASSEMBLEIA" identidade={identidade} ata={ata} selecionar={a => { setAta(a); setIndicacao(''); salvar.reset() }} />
    {ata && <>
      <label className="block">Indicação para esta eleição
        <select className={selectClass} required value={indicacao} onChange={e => setIndicacao(e.target.value)}>
          <option value="">Selecione a indicação</option>
          {indicacoes.data?.map(i => <option key={i.id} value={i.id}>{i.pessoa.nome_completo} · {tipos[i.oficio]}</option>)}
        </select>
      </label>
      {indicacoes.isPending && <p>Buscando indicações…</p>}
      {indicacoes.isError && <p role="alert">Não foi possível consultar as indicações.</p>}
      {indicacoes.data?.length === 0 && <p>Nenhuma indicação disponível para esta eleição.</p>}
      <label className="block">Data da posse
        <Input name="posse" type="date" min={civil(ata.data)} required />
      </label>
      <Button type="submit" disabled={!indicacao || salvar.isPending}>Salvar mandato</Button>
    </>}
    {salvar.isError && <p role="alert">{mensagem(salvar.error)}</p>}
    {salvar.isSuccess && <p role="status">Mandato registrado e ofício ativo.</p>}
  </form>
}

export function EleicaoOficiais({ identidade }: { identidade: string }) {
  const [modo, setModo] = useState<'indicacao' | 'mandato' | null>(null)
  return <section className="space-y-3 rounded border p-4">
    <h2 className="text-lg font-semibold">Indicações e mandatos</h2>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant={modo === 'indicacao' ? 'default' : 'outline'} aria-pressed={modo === 'indicacao'} onClick={() => setModo(modo === 'indicacao' ? null : 'indicacao')}>Registrar indicação</Button>
      <Button type="button" variant={modo === 'mandato' ? 'default' : 'outline'} aria-pressed={modo === 'mandato'} onClick={() => setModo(modo === 'mandato' ? null : 'mandato')}>Registrar mandato</Button>
    </div>
    {modo === 'indicacao' && <FormularioIndicacao identidade={identidade} />}
    {modo === 'mandato' && <FormularioMandato identidade={identidade} />}
  </section>
}
