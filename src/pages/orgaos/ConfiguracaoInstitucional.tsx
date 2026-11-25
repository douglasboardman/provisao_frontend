import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiRequestError } from '../../api/client'
import { orgaosApi, type PropostaConfiguracao } from '../../api/orgaos'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { formatarDataCivil } from '../../lib/membresia-temporal'

function mensagem(erro: unknown) {
  return erro instanceof ApiRequestError ? erro.messages.join(' ') : 'Não foi possível atualizar a configuração do órgão.'
}

const orgaos = { CONSELHO: 'Conselho', ASSEMBLEIA_GERAL: 'Assembleia Geral' }
const exibir = (valor: string | number) => orgaos[valor as keyof typeof orgaos] ?? valor

export function ConfiguracaoInstitucional({ orgao, identidade }: { orgao: string; identidade: string }) {
  const [aberto, abrir] = useState(false)
  const [editar, setEditar] = useState(false)
  const queryClient = useQueryClient()
  const chave = ['orgaos', identidade, 'configuracao', orgao]
  const consulta = useQuery({ queryKey: chave, queryFn: () => orgaosApi.configuracao(orgao), enabled: aberto })
  const propor = useMutation({
    mutationFn: (dados: PropostaConfiguracao) => orgaosApi.proporConfiguracao(orgao, dados),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: chave })
      setEditar(false)
    },
  })
  const adotar = useMutation({
    mutationFn: (proposta: { id: string; previa: string }) => orgaosApi.adotarConfiguracao(orgao, proposta),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['orgaos', identidade] }),
  })
  const dados = consulta.data
  const proposta = dados?.proposta
  const ocupada = propor.isPending || adotar.isPending

  return <section className="space-y-3">
    <Button type="button" variant="outline" aria-expanded={aberto} onClick={() => abrir(!aberto)}>Versões da configuração</Button>
    {aberto && consulta.isPending && <p>Consultando versões…</p>}
    {aberto && consulta.isError && <p role="alert">{mensagem(consulta.error)}</p>}
    {aberto && dados && <div className="space-y-4 rounded border p-4">
      <h3 className="font-semibold">Histórico e vigências</h3>
      <ul className="space-y-1 text-sm">{dados.versoes.map(v => <li key={v.id}>
        Versão {v.numero} · {v.fonte} · {v.inicio.slice(0, 10) > dados.hoje ? 'Programada para' : 'Em vigor desde'} {formatarDataCivil(v.inicio)}
        {v.fim && ` · substituída em ${formatarDataCivil(v.fim)}`}
      </li>)}</ul>

      {proposta && <div className="space-y-2">
        <h4 className="font-medium">Proposta para {formatarDataCivil(proposta.entrada.inicio)}</h4>
        <p className="text-sm">{proposta.entrada.autoridade} · {proposta.entrada.evidencia}</p>
        {proposta.base_id !== dados.versoes[0]?.id && <p role="alert">A versão de referência mudou. Prepare uma nova proposta.</p>}
        <dl className="space-y-1 text-sm">
          {proposta.alteracoes.map(a => <div key={a.campo}>
            <dt className="font-medium">{a.campo}</dt>
            <dd>{exibir(a.antes)} → {exibir(a.depois)}</dd>
          </div>)}
        </dl>
        {dados.pode_adotar && <Button type="button" disabled={ocupada || editar || proposta.base_id !== dados.versoes[0]?.id}
          onClick={() => adotar.mutate({ id: proposta.id, previa: proposta.previa })}>Confirmar adoção</Button>}
      </div>}

      {dados.pode_adotar && !editar && <Button type="button" variant="outline" disabled={ocupada} onClick={() => {
        adotar.reset()
        setEditar(true)
      }}>{proposta ? 'Rever proposta' : 'Preparar nova versão'}</Button>}
      {dados.pode_adotar && editar && <form className="max-w-lg space-y-3" onSubmit={e => {
        e.preventDefault()
        const campos = new FormData(e.currentTarget)
        const ler = (nome: string) => String(campos.get(nome) ?? '').trim()
        const maximo = ler('maximo'), sugerido = ler('sugerido'), posse = ler('posse')
        propor.mutate({ inicio: ler('inicio'), fonte: ler('fonte'), autoridade: ler('autoridade'), evidencia: ler('evidencia'),
          ...(maximo && { prazo_maximo_meses: Number(maximo) }), ...(sugerido && { prazo_sugerido_meses: Number(sugerido) }),
          ...(posse && { posse_integrante: posse as PropostaConfiguracao['posse_integrante'] }),
        })
      }}>
        <label className="block">Início da vigência<Input name="inicio" type="date" defaultValue={proposta?.entrada.inicio} required /></label>
        <label className="block">Fonte da configuração<Input name="fonte" maxLength={1000} defaultValue={proposta?.entrada.fonte ?? dados.versoes[0]?.fonte} required /></label>
        <label className="block">Autoridade que aprovou<Input name="autoridade" maxLength={255} defaultValue={proposta?.entrada.autoridade} required /></label>
        <label className="block">Referência ao ato de aprovação<Input name="evidencia" maxLength={1000} defaultValue={proposta?.entrada.evidencia} required /></label>
        {dados.prazo_limite_meses && <label className="block">Prazo máximo dos cargos em meses<Input name="maximo" type="number" min={1}
          max={dados.prazo_limite_meses} defaultValue={proposta?.entrada.prazo_maximo_meses} /></label>}
        {dados.oficial && <>
          <label className="block">Prazo sugerido dos cargos em meses<Input name="sugerido" type="number" min={1}
            max={dados.prazo_limite_meses ?? undefined} defaultValue={proposta?.entrada.prazo_sugerido_meses} /></label>
          <label className="block">Órgão que documenta a posse do integrante
            <select name="posse" defaultValue={proposta?.entrada.posse_integrante ?? ''} className="block w-full rounded border bg-background p-2">
              <option value="">Manter órgão vigente</option>
              {Object.entries(orgaos).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
            </select>
          </label>
        </>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={ocupada}>Conferir diferenças</Button>
          <Button type="button" variant="outline" disabled={ocupada} onClick={() => setEditar(false)}>Fechar formulário</Button>
        </div>
      </form>}
      {(propor.isError || adotar.isError) && <p role="alert">{mensagem(propor.error ?? adotar.error)}</p>}
      {adotar.isSuccess && <p role="status">Versão programada.</p>}
    </div>}
  </section>
}
