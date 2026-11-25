import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '../../api/client'
import { gestaoOrgaosApi, type OcupacaoAtual, type VagaCargo } from '../../api/orgaos'
import type { BuscaAtaOpcao } from '../../api/referencias-ata'
import { SeletorAta, descreverAta } from '../../components/shared/SeletorAta'
import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { useHojeIgreja } from './RelogioIgreja'
import { useIdempotencia } from './useIdempotencia'
import { formatarDataCivil } from '../../lib/membresia-temporal'

export function primeiraPosse(hoje: string, titular?: OcupacaoAtual) {
  if (!titular) return hoje
  const fim = titular.fim?.slice(0,10)
  if (fim) return fim < hoje ? hoje : fim
  const previsto = titular.termino_previsto?.slice(0,10)
  if (!previsto) return null
  const seguinte = new Date(Date.parse(previsto) + 86_400_000).toISOString().slice(0,10)
  return seguinte < hoje ? hoje : seguinte
}

export function ProvimentoCargo({ identidade, orgao, cargo, titular, encerrar, prazoSugerido, aoFechar }: {
  identidade: string; orgao: string; cargo: VagaCargo; titular?: OcupacaoAtual; encerrar: boolean
  prazoSugerido?: number | null; aoFechar: () => void
}) {
  const hoje = useHojeIgreja()
  const minimo = encerrar ? hoje : primeiraPosse(hoje, titular)
  const [historico, definirHistorico] = useState(false)
  const [efeito, definirEfeito] = useState(minimo ?? hoje)
  const [busca, buscarPessoa] = useState('')
  const [pessoa, escolher] = useState('')
  const [eleicao, escolherEleicao] = useState<BuscaAtaOpcao | null>(null)
  const [posse, escolherPosse] = useState<BuscaAtaOpcao | null>(null)
  const [mesmaAta, usarMesmaAta] = useState(true)
  const chave = useIdempotencia()
  const client = useQueryClient()
  const dataEleicao = eleicao?.data.slice(0,10) ?? ''
  const pessoas = useQuery({ queryKey: ['orgaos', identidade, orgao, cargo.id, 'candidatos', dataEleicao, efeito, busca],
    queryFn: () => gestaoOrgaosApi.candidatosCargo(orgao, cargo.id, { eleicao: dataEleicao, posse: efeito, busca }),
    enabled: !encerrar && !!dataEleicao && !!efeito && dataEleicao <= efeito })
  const limite = pessoas.data?.find(p => p.id === pessoa)?.limite_exercicio
  const salvar = useMutation({
    mutationFn: async (campos: FormData) => {
      const texto = (campo: string) => String(campos.get(campo) ?? '').trim()
      const origem = { autoridade: texto('autoridade'), evidencia: texto('trecho') }
      if (!eleicao) throw new Error('Selecione a ata.')
      const prova = { versao_id: eleicao.versao_id, trecho: texto('trecho') }
      if (encerrar && titular) {
        const dados = { ...origem, data_efeito: texto('efeito'), motivo: texto('motivo'), comprovacao: prova }
        return gestaoOrgaosApi.encerrarOcupacao(orgao, titular.id, 'oficial', { ...dados, idempotencia: chave.obter(dados) })
      }
      const ataPosse = mesmaAta ? eleicao : posse
      if (!ataPosse) throw new Error('Selecione a ata de posse.')
      const dados = { ...origem, pessoa_id: pessoa, data_eleicao: eleicao.data.slice(0,10), data_posse: texto('efeito'), termino_previsto: texto('termino'),
        comprovacao: { eleicao: prova, posse: { versao_id: ataPosse.versao_id, trecho: texto('trechoPosse') }, sucede_id: titular?.id, ...(historico && { confirmar_historico: true as const }) } }
      return gestaoOrgaosApi.registrarEleicao(orgao, cargo.id, 'oficial', { ...dados, idempotencia: chave.obter(dados) })
    },
    onSuccess: async () => {
      await Promise.all([client.invalidateQueries({ queryKey: ['orgaos', identidade] }), client.invalidateQueries({ queryKey: ['secretaria', identidade] })])
      aoFechar()
    },
  })
  return <form className="space-y-3 rounded-xl border p-4" onSubmit={e => { e.preventDefault(); salvar.mutate(new FormData(e.currentTarget)) }}>
    <h4 className="font-semibold">{encerrar ? 'Encerramento' : titular ? 'Sucessão ou reeleição' : 'Eleição e posse'} · {cargo.nome}</h4>
    {!encerrar && !historico && minimo && <p>Primeira posse após este titular em {formatarDataCivil(minimo)}. A API confere os demais períodos da vaga.</p>}
    {!encerrar && !minimo && <p>Registre o encerramento do titular para definir a primeira data disponível.</p>}
    <SeletorAta label={encerrar ? 'Ata do encerramento' : 'Ata da eleição'} valor={eleicao ? descreverAta(eleicao) : ''}
      chave={[identidade, orgao, 'ata-cargo']} buscar={f => gestaoOrgaosApi.atasCargos(orgao, f)} selecionar={a => { escolherEleicao(a); escolher('') }} />
    <label className="block">Item da ata que identifica a pessoa e o ato<Input name="trecho" required maxLength={1000} /></label>
    {!encerrar && <>
      <label className="block">Pessoa eleita<SeletorPessoa value={pessoa} onChange={escolher} onBusca={buscarPessoa} carregando={pessoas.isFetching}
        opcoes={pessoas.data?.map(p => ({ id: p.id, nome: p.nome_completo }))} required /></label>
      {pessoas.isSuccess && !pessoas.data.length && <p>Nenhuma pessoa elegível nas datas informadas.</p>}
      {pessoas.isError && <p role="alert">Não foi possível consultar as pessoas.</p>}
      <label className="flex items-center gap-2"><input type="checkbox" checked={mesmaAta} onChange={e => usarMesmaAta(e.target.checked)} />A ata da eleição também documenta a posse</label>
      {!mesmaAta && <SeletorAta label="Ata da posse" valor={posse ? descreverAta(posse) : ''}
        chave={[identidade, orgao, 'ata-cargo-posse']} buscar={f => gestaoOrgaosApi.atasCargos(orgao, f)} selecionar={escolherPosse} />}
      <label className="block">Item da ata que documenta a posse<Input name="trechoPosse" required maxLength={1000} /></label>
      <label className="block">Último dia previsto no cargo<Input type="date" name="termino" min={efeito || minimo || hoje} max={limite ?? undefined} required /></label>
      {!!prazoSugerido && <p>Prazo sugerido na configuração consultada · {prazoSugerido} meses.</p>}
      {limite && <p>Exercício documentado até {formatarDataCivil(limite)}.</p>}
    </>}
    {!encerrar && !titular && <label className="flex items-center gap-2"><input type="checkbox" checked={historico} onChange={e => { definirHistorico(e.target.checked); definirEfeito(hoje); escolher('') }} />Transcrever posse anterior a hoje</label>}
    {historico && <p>Se houver atos ou documentos do órgão no período, a API pedirá revisão institucional antes da inclusão.</p>}
    <label className="block">{encerrar ? 'Data de efeito do encerramento' : 'Data da posse'}<Input type="date" name="efeito" min={historico ? dataEleicao || undefined : minimo ?? hoje} value={efeito} onChange={e => { definirEfeito(e.target.value); escolher('') }} required /></label>
    {encerrar && <label className="block">Motivo<Input name="motivo" maxLength={1000} required /></label>}
    <label className="block">Autoridade do ato<Input name="autoridade" maxLength={255} required /></label>
    {salvar.error && <p role="alert">{salvar.error instanceof ApiRequestError ? salvar.error.messages.join(' ') : salvar.error.message}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={salvar.isPending || !eleicao || (!encerrar && (!pessoa || !minimo || (!mesmaAta && !posse)))}>Confirmar ato</Button>
      <Button type="button" variant="outline" onClick={aoFechar}>Fechar</Button></div>
  </form>
}
