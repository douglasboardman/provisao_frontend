import { useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { orgaosApi, type EntradaMandato } from '../../api/orgaos'
import { oficiaisApi } from '../../api/oficiais'
import { ApiRequestError } from '../../api/client'
import type { BuscaAtaOpcao } from '../../api/referencias-ata'
import { SeletorAta, descreverAta } from '../../components/shared/SeletorAta'
import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { useIdempotencia } from './useIdempotencia'
import { formatarDataCivil as data } from '../../lib/membresia-temporal'

export function RegistroMandato({ orgao, identidade, titular, concluir }: { orgao: string; identidade: string; titular?: { id: string; nome_completo: string }; concluir: () => void }) {
  const [eleicao, setEleicao] = useState<BuscaAtaOpcao | null>(null)
  const [posse, setPosse] = useState<BuscaAtaOpcao | null>(null)
  const [dataPosse, setDataPosse] = useState('')
  const [tipoPosse, setTipoPosse] = useState<'CONSELHO' | 'ASSEMBLEIA'>('CONSELHO')
  const [pessoa, setPessoa] = useState(titular?.id ?? '')
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState<'existente' | 'documentada' | 'historica'>('existente')
  const chave = useIdempotencia()
  const candidatos = useQuery({ queryKey: ['oficiais', identidade, 'eleitos', eleicao?.versao_id, busca], enabled: !!eleicao && !titular,
    queryFn: () => oficiaisApi.candidatos(eleicao!.versao_id, busca, 'ASSEMBLEIA') })
  const previa = useMutation({ mutationFn: (entrada: EntradaMandato) => orgaosApi.previaMandato(orgao, entrada) })
  const salvar = useMutation({ mutationFn: () => orgaosApi.registrarMandato(orgao, { ...previa.variables!, previa: previa.data!.previa }), onSuccess: concluir })
  const dataEleicao = (eleicao?.data_reuniao ?? eleicao?.data)?.slice(0, 10)
  const dataAtaPosse = posse?.data.slice(0, 10)
  const posseAnterior = !!dataEleicao && !!dataPosse && dataPosse < dataEleicao
  const possePosterior = !!dataAtaPosse && dataPosse > dataAtaPosse
  const podeConferir = eleicao && posse && pessoa && dataPosse && !posseAnterior && !possePosterior
  function conferir(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!podeConferir) return
    const campos = new FormData(e.currentTarget)
    const ler = (campo: string) => String(campos.get(campo) ?? '').trim()
    const dataOrdenacao = ler('ordenacao'), autoridade = ler('autoridade'), evidencia = ler('evidencia')
    const referencia = evidencia ? { evidencia } : {}
    const registroOrdenacao: EntradaMandato['ordenacao'] = ordenacao === 'historica'
      ? { historica: true, ...(dataOrdenacao && { data: dataOrdenacao }), ...(autoridade && { autoridade }), ...referencia }
      : ordenacao === 'documentada' ? { data: dataOrdenacao, autoridade, ...referencia } : undefined
    const dados = { pessoa_id: pessoa, ata_eleicao: eleicao.versao_id, ata_posse: posse.versao_id, data_posse: dataPosse,
      ...(registroOrdenacao && { ordenacao: registroOrdenacao }) }
    previa.mutate({ ...dados, idempotencia: chave.obter(dados) })
  }
  const erro = previa.error ?? salvar.error
  return <form className="space-y-3 rounded-panel border p-4" onSubmit={conferir}>
    <fieldset disabled={previa.isPending || !!previa.data} className="max-w-2xl space-y-3">
      <legend className="font-semibold">{titular ? 'Reeleição de ' + titular.nome_completo : 'Novo mandato'}</legend>
      <SeletorAta label="Ata da Assembleia que elegeu a pessoa" valor={eleicao ? descreverAta(eleicao) : ''} chave={[identidade, orgao, 'eleicao']}
        buscar={f => oficiaisApi.selecaoAtas('ASSEMBLEIA', f)} selecionar={a => { setEleicao(a); setPessoa(titular?.id ?? ''); setBusca('') }} />
      {eleicao && !titular && <label className="block">Pessoa eleita<SeletorPessoa rotulo="Pessoa eleita" value={pessoa} onChange={setPessoa} onBusca={setBusca}
        opcoes={candidatos.data?.map(p => ({ id: p.id, nome: p.nome_completo }))} carregando={candidatos.isFetching} required /></label>}
      {candidatos.isError && <p role="alert">Não foi possível consultar os candidatos.</p>}
      <label className="block">Origem da ata de posse<select className="block rounded border p-2" value={tipoPosse} onChange={e => { setTipoPosse(e.target.value as typeof tipoPosse); setPosse(null); setDataPosse('') }}>
        <option value="CONSELHO">Conselho</option><option value="ASSEMBLEIA">Assembleia, quando prevista na configuração</option></select></label>
      <SeletorAta key={tipoPosse} label="Ata que documenta a posse" valor={posse ? descreverAta(posse) : ''} chave={[identidade, orgao, 'posse', tipoPosse]}
        buscar={f => oficiaisApi.selecaoAtas(tipoPosse, f)} selecionar={ata => {
          if (ata.versao_id !== posse?.versao_id) setDataPosse(ata.data.slice(0, 10))
          setPosse(ata)
        }} />
      <label className="block">Data da posse
        <Input name="data_posse" type="date" value={dataPosse} disabled={!posse} required
          min={dataEleicao} max={dataAtaPosse} onChange={e => setDataPosse(e.target.value)} />
      </label>
      {!previa.data && dataEleicao && <p>Eleição em <strong>{data(dataEleicao)}</strong></p>}
      {posseAnterior && <p role="alert">A data da posse deve ser igual ou posterior à eleição.</p>}
      {possePosterior && <p role="alert">A data da posse deve ser igual ou anterior à data da ata que a documenta.</p>}
      <fieldset className="space-y-2">
        <legend className="font-medium">Ordenação</legend>
        <label className="flex items-center gap-2"><input type="radio" name="modo-ordenacao" checked={ordenacao === 'existente'} onChange={() => setOrdenacao('existente')} />Usar a ordenação já registrada</label>
        <label className="flex items-center gap-2"><input type="radio" name="modo-ordenacao" checked={ordenacao === 'documentada'} onChange={() => setOrdenacao('documentada')} />Registrar ordenação documentada pela primeira vez</label>
        <label className="flex items-center gap-2"><input type="radio" name="modo-ordenacao" checked={ordenacao === 'historica'} onChange={() => setOrdenacao('historica')} />Registro de ordenação histórico não documentado</label>
        {ordenacao !== 'existente' && <>
          <label className="block">Data da ordenação{ordenacao === 'historica' && ' (opcional)'}<Input name="ordenacao" type="date" max={dataPosse || undefined} required={ordenacao === 'documentada'} /></label>
          <label className="block">Autoridade da ordenação{ordenacao === 'historica' && ' (opcional)'}<Input name="autoridade" required={ordenacao === 'documentada'} maxLength={ordenacao === 'historica' ? 255 : 1000} /></label>
          <label className="block">Referência da ordenação (opcional)<Input name="evidencia" maxLength={1000} placeholder="Ex.: ata, livro e folha ou certidão" /></label>
        </>}
      </fieldset>
      {!previa.data && <Button type="submit" disabled={!podeConferir}>Conferir mandato</Button>}
    </fieldset>
    {previa.data && <section className="space-y-2" aria-live="polite"><h4 className="font-semibold">{previa.data.reeleicao ? 'Reeleição' : 'Investidura'} de {previa.data.nome}</h4>
      <p>Eleição em {data(previa.data.data_eleicao)}. Mandato de {data(previa.data.data_posse)} a {data(previa.data.termino_previsto)}.</p>
      {previa.data.ordenacao_historica && <p>Ordenação histórica declarada, com documentação pendente.</p>}
      {previa.data.transcricao_historica && <p>A eleição antecede o catálogo. Confira a compatibilidade do ato histórico com a configuração inicial, versão {previa.data.versao}.</p>}
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={salvar.isPending} onClick={() => { salvar.reset(); previa.reset() }}>Rever dados</Button>
        <Button type="button" disabled={salvar.isPending} onClick={() => salvar.mutate()}>Confirmar registro</Button></div></section>}
    {erro && <p role="alert">{erro instanceof ApiRequestError ? erro.messages.join(' ') : 'Falha ao conferir ou registrar o mandato.'}</p>}
  </form>
}
