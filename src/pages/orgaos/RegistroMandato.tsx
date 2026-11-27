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
  const [tipoPosse, setTipoPosse] = useState<'CONSELHO' | 'ASSEMBLEIA'>('CONSELHO')
  const [pessoa, setPessoa] = useState(titular?.id ?? '')
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState<'existente' | 'documentada' | 'historica'>('existente')
  const chave = useIdempotencia()
  const candidatos = useQuery({ queryKey: ['oficiais', identidade, 'eleitos', eleicao?.versao_id, busca], enabled: !!eleicao && !titular,
    queryFn: () => oficiaisApi.candidatos(eleicao!.versao_id, busca, 'ASSEMBLEIA') })
  const indicacoes = useQuery({ queryKey: ['orgaos', identidade, orgao, 'indicacoes-mandato', pessoa, eleicao?.versao_id],
    enabled: !!eleicao && !!pessoa, queryFn: () => orgaosApi.indicacoesMandato(orgao, pessoa, eleicao!.versao_id) })
  const previa = useMutation({ mutationFn: (entrada: EntradaMandato) => orgaosApi.previaMandato(orgao, entrada) })
  const salvar = useMutation({ mutationFn: () => orgaosApi.registrarMandato(orgao, { ...previa.variables!, previa: previa.data!.previa }), onSuccess: concluir })
  const dataEleicao = eleicao?.data.slice(0, 10)
  const dataPosse = posse?.data.slice(0, 10)
  const posseAnterior = !!dataEleicao && !!dataPosse && dataPosse < dataEleicao
  function conferir(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!pessoa || !eleicao || !posse || posseAnterior) return
    const campos = new FormData(e.currentTarget)
    const ler = (campo: string) => String(campos.get(campo) ?? '').trim()
    const dataOrdenacao = ler('ordenacao'), autoridade = ler('autoridade'), evidencia = ler('evidencia')
    const referencia = evidencia ? { evidencia } : {}
    const registroOrdenacao: EntradaMandato['ordenacao'] = ordenacao === 'historica'
      ? { historica: true, ...(dataOrdenacao && { data: dataOrdenacao }), ...(autoridade && { autoridade }), ...referencia }
      : ordenacao === 'documentada' ? { data: dataOrdenacao, autoridade, ...referencia } : undefined
    const dados = { pessoa_id: pessoa, ata_eleicao: eleicao.versao_id, ata_posse: posse.versao_id,
      ...(ler('indicacao') && { indicacao_id: ler('indicacao') }),
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
      {indicacoes.isError && <p role="status">Não foi possível consultar as indicações históricas.</p>}
      {!!indicacoes.data?.length && <label className="block">Indicação histórica (opcional)
        <select key={pessoa + eleicao?.versao_id} name="indicacao" defaultValue="" className="block w-full rounded border bg-background p-2">
          <option value="">Selecione uma indicação</option>
          {indicacoes.data.map(i => <option key={i.id} value={i.id}>{i.ata_conselho.assunto} · {data(i.ata_conselho.data_documento)}</option>)}
        </select>
      </label>}
      <label className="block">Origem da ata de posse<select className="block rounded border p-2" value={tipoPosse} onChange={e => { setTipoPosse(e.target.value as typeof tipoPosse); setPosse(null) }}>
        <option value="CONSELHO">Conselho</option><option value="ASSEMBLEIA">Assembleia, quando prevista na configuração</option></select></label>
      <SeletorAta key={tipoPosse} label="Ata que documenta a posse" valor={posse ? descreverAta(posse) : ''} chave={[identidade, orgao, 'posse', tipoPosse]}
        buscar={f => oficiaisApi.selecaoAtas(tipoPosse, f)} selecionar={setPosse} />
      {!previa.data && dataEleicao && dataPosse && <p>Eleição em <strong>{data(dataEleicao)}</strong> · Posse em <strong>{data(dataPosse)}</strong></p>}
      {posseAnterior && <p role="alert">A ata da posse tem data anterior à eleição. Selecione a ata que documenta a posse.</p>}
      <fieldset className="space-y-2">
        <legend className="font-medium">Ordenação</legend>
        <label className="flex items-center gap-2"><input type="radio" name="modo-ordenacao" checked={ordenacao === 'existente'} onChange={() => setOrdenacao('existente')} />Usar a ordenação já registrada</label>
        <label className="flex items-center gap-2"><input type="radio" name="modo-ordenacao" checked={ordenacao === 'documentada'} onChange={() => setOrdenacao('documentada')} />Registrar ordenação documentada pela primeira vez</label>
        <label className="flex items-center gap-2"><input type="radio" name="modo-ordenacao" checked={ordenacao === 'historica'} onChange={() => setOrdenacao('historica')} />Registro de ordenação histórico não documentado</label>
        {ordenacao !== 'existente' && <>
          <label className="block">Data da ordenação{ordenacao === 'historica' && ' (opcional)'}<Input name="ordenacao" type="date" max={dataPosse} required={ordenacao === 'documentada'} /></label>
          <label className="block">Autoridade da ordenação{ordenacao === 'historica' && ' (opcional)'}<Input name="autoridade" required={ordenacao === 'documentada'} maxLength={ordenacao === 'historica' ? 255 : 1000} /></label>
          <label className="block">Referência da ordenação (opcional)<Input name="evidencia" maxLength={1000} placeholder="Ex.: ata, livro e folha ou certidão" /></label>
        </>}
      </fieldset>
      {!previa.data && <Button type="submit" disabled={!eleicao || !posse || !pessoa || posseAnterior}>Conferir mandato</Button>}
    </fieldset>
    {previa.data && <section className="space-y-2" aria-live="polite"><h4 className="font-semibold">{previa.data.reeleicao ? 'Reeleição' : 'Investidura'} de {previa.data.nome}</h4>
      <p>Eleição em {data(previa.data.data_eleicao)}. Mandato de {data(previa.data.data_posse)} a {data(previa.data.termino_previsto)}.</p>
      {previa.data.ordenacao_historica && <p>Ordenação histórica declarada, com documentação pendente.</p>}
      {previa.data.assunto_indicacao && <p>Indicação histórica vinculada · {previa.data.assunto_indicacao}</p>}
      {previa.data.transcricao_historica && <p>A eleição antecede o catálogo. Confira a compatibilidade do ato histórico com a configuração inicial, versão {previa.data.versao}.</p>}
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={salvar.isPending} onClick={() => { salvar.reset(); previa.reset() }}>Rever dados</Button>
        <Button type="button" disabled={salvar.isPending} onClick={() => salvar.mutate()}>Confirmar registro</Button></div></section>}
    {erro && <p role="alert">{erro instanceof ApiRequestError ? erro.messages.join(' ') : 'Falha ao conferir ou registrar o mandato.'}</p>}
  </form>
}
