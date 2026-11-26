import { SecaoPainel } from '../../components/shared/Painel'
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
  if (fim) return fim
  const previsto = titular.termino_previsto?.slice(0,10)
  if (!previsto) return null
  const seguinte = new Date(Date.parse(previsto) + 86_400_000).toISOString().slice(0,10)
  return seguinte
}

export function ProvimentoCargo({ identidade, orgao, cargo, titular, encerrar, mandatario, aoSalvar, aoFechar }: {
  identidade: string; orgao: string; cargo: VagaCargo; titular?: OcupacaoAtual; encerrar: boolean
  mandatario?: { id: string; nome_completo: string }; aoSalvar?: () => void
  aoFechar: () => void
}) {
  const hoje = useHojeIgreja()
  const minimo = encerrar ? hoje : primeiraPosse(hoje, titular)
  const [ajustar, abrirAjustes] = useState(false)
  const [dataManual, definirEfeito] = useState('')
  const [fimManual, definirFim] = useState('')
  const [busca, buscarPessoa] = useState('')
  const [selecionada, escolher] = useState('')
  const [eleicao, escolherEleicao] = useState<BuscaAtaOpcao | null>(null)
  const [posse, escolherPosse] = useState<BuscaAtaOpcao | null>(null)
  const [mesmaAta, usarMesmaAta] = useState(true)
  const chave = useIdempotencia()
  const client = useQueryClient()
  const dataEleicao = eleicao?.data.slice(0,10) ?? ''
  const ataPosse = mesmaAta ? eleicao : posse
  const dataDaAta = ataPosse?.data.slice(0,10) ?? dataEleicao
  const inicioSugerido = titular && minimo && minimo > dataDaAta ? minimo : dataDaAta
  const inicioCargo = titular?.inicio.slice(0, 10) ?? ''
  const limiteEncerramento = titular?.termino_previsto
    ? new Date(Date.parse(titular.termino_previsto) + 86_400_000).toISOString().slice(0, 10) : undefined
  const dataDaTroca = limiteEncerramento && dataEleicao > limiteEncerramento ? limiteEncerramento : dataEleicao
  const efeito = dataManual || (encerrar ? (dataDaTroca < inicioCargo ? inicioCargo : dataDaTroca) : inicioSugerido)
  const pessoas = useQuery({ queryKey: ['orgaos', identidade, orgao, cargo.id, 'candidatos', dataEleicao, efeito, mandatario?.id, busca],
    queryFn: () => gestaoOrgaosApi.candidatosCargo(orgao, cargo.id, { eleicao: dataEleicao, posse: efeito, ...(mandatario ? { pessoa_id: mandatario.id } : { busca }) }),
    enabled: !encerrar && !!dataEleicao && !!efeito && dataEleicao <= efeito })
  const candidata = pessoas.data?.find(p => p.id === (mandatario?.id ?? selecionada))
  const pessoa = candidata?.id
  const limite = candidata?.limite_exercicio
  const termino = fimManual || candidata?.termino_sugerido || ''
  const eleito = mandatario?.id || selecionada
  const exigeEncerramento = !!(titular && !titular.fim && eleito && titular.pessoa.id !== eleito)
  const periodoValido = !!efeito && !!termino && efeito >= dataEleicao && termino >= efeito &&
    (!limite || termino <= limite) && (!titular || !!minimo && efeito >= minimo)
  const salvar = useMutation({
    mutationFn: async (campos: FormData) => {
      const texto = (campo: string) => String(campos.get(campo) ?? '').trim()
      if (!eleicao) throw new Error('Selecione a ata.')
      if (encerrar && titular) {
        const prova = { versao_id: eleicao.versao_id, trecho: texto('trecho') }
        const dados = { autoridade: texto('autoridade'), evidencia: prova.trecho, data_efeito: efeito, motivo: texto('motivo'), comprovacao: prova }
        return gestaoOrgaosApi.encerrarOcupacao(orgao, titular.id, 'oficial', { ...dados, idempotencia: chave.obter(dados) })
      }
      if (!pessoa) throw new Error('Confira a elegibilidade da pessoa nas datas da eleição e da posse.')
      if (!ataPosse || !periodoValido) throw new Error('Confira a ata e o período do cargo.')
      const dados = { pessoa_id: pessoa, data_eleicao: dataEleicao, data_posse: efeito, termino_previsto: termino,
        comprovacao: { eleicao: { versao_id: eleicao.versao_id }, posse: { versao_id: ataPosse.versao_id },
          sucede_id: titular?.id, ...(efeito < hoje && { confirmar_historico: true as const }) } }
      return gestaoOrgaosApi.registrarEleicao(orgao, cargo.id, 'oficial', { ...dados, idempotencia: chave.obter(dados) })
    },
    onSuccess: async () => {
      await Promise.all([client.invalidateQueries({ queryKey: ['orgaos', identidade] }), client.invalidateQueries({ queryKey: ['secretaria', identidade] })])
      if (aoSalvar) aoSalvar()
      else aoFechar()
    },
  })
  const operacao = encerrar ? 'Encerramento' : titular ? 'Sucessão ou reeleição' : 'Eleição e posse'
  return <SecaoPainel titulo={`${operacao} · ${cargo.nome}`} voltar={aoFechar} ocupado={salvar.isPending}>
    <form className="max-w-xl space-y-3" onSubmit={e => { e.preventDefault(); salvar.mutate(new FormData(e.currentTarget)) }}>
      {titular && !encerrar && (exigeEncerramento || !minimo) &&
        <p role="status">Registre o encerramento de {titular.pessoa.nome_completo} no Histórico do órgão antes de confirmar a nova posse.</p>}
      {!encerrar && mandatario && <div><p className="text-sm text-muted-foreground">Pessoa eleita</p><strong>{mandatario.nome_completo}</strong></div>}
      <SeletorAta label={encerrar ? 'Ata do encerramento' : 'Ata da eleição'} valor={eleicao ? descreverAta(eleicao) : ''}
        chave={[identidade, orgao, 'ata-cargo']} buscar={f => gestaoOrgaosApi.atasCargos(orgao, f)} selecionar={a => {
          escolherEleicao(a); escolher(''); definirFim('')
          definirEfeito('')
          if (!encerrar) { usarMesmaAta(true); escolherPosse(null) }
        }} />
      {encerrar ? <>
        <label className="block">Item da ata que identifica a pessoa e o ato<Input name="trecho" required maxLength={1000} /></label>
        <label className="block">Data de efeito do encerramento<Input type="date" min={inicioCargo} max={limiteEncerramento} value={efeito} onChange={e => definirEfeito(e.target.value)} required /></label>
        <label className="block">Motivo<Input name="motivo" maxLength={1000} required /></label>
        <label className="block">Autoridade do ato<Input name="autoridade" maxLength={255} required /></label>
      </> : eleicao && <>
        {!mandatario && <label className="block">Pessoa eleita<SeletorPessoa value={selecionada} onChange={p => { escolher(p); definirFim('') }} onBusca={buscarPessoa} carregando={pessoas.isFetching}
          opcoes={pessoas.data?.map(p => ({ id: p.id, nome: p.nome_completo }))} required /></label>}
        {pessoas.isFetching && <p role="status">Conferindo elegibilidade…</p>}
        {pessoas.isSuccess && mandatario && !candidata && <p role="alert">Esta pessoa não está entre os candidatos elegíveis nas datas informadas.</p>}
        {pessoas.isSuccess && !mandatario && !pessoas.data.length && <p>Nenhuma pessoa elegível nas datas informadas.</p>}
        {pessoas.isError && <p role="alert">Não foi possível consultar as pessoas.</p>}
        {efeito && termino && <p>Posse em <strong>{formatarDataCivil(efeito)}</strong> · Término previsto em <strong>{formatarDataCivil(termino)}</strong></p>}
        {!mesmaAta && <p>Ata da posse · {posse ? descreverAta(posse) : 'Selecione a ata em Ajustar posse e período.'}</p>}
        {efeito < hoje && <p className="text-sm text-muted-foreground">A confirmação registrará uma posse anterior a hoje.</p>}
        <Button type="button" variant="outline" onClick={() => abrirAjustes(true)}>Ajustar posse e período</Button>
        {ajustar && <SecaoPainel titulo="Posse e período do cargo" voltar={() => abrirAjustes(false)}>
          <div className="max-w-xl space-y-3">
            <label className="flex items-center gap-2"><input type="checkbox" checked={mesmaAta} onChange={e => { usarMesmaAta(e.target.checked); definirEfeito(''); definirFim('') }} />A ata da eleição também documenta a posse</label>
            {!mesmaAta && <SeletorAta label="Ata da posse" valor={posse ? descreverAta(posse) : ''}
              chave={[identidade, orgao, 'ata-cargo-posse']} buscar={f => gestaoOrgaosApi.atasCargos(orgao, f)} selecionar={a => { escolherPosse(a); definirEfeito(''); definirFim('') }} />}
            <label className="block">Data da posse<Input type="date" min={titular && minimo && minimo > dataEleicao ? minimo : dataEleicao}
              value={efeito} onChange={e => { definirEfeito(e.target.value); definirFim('') }} /></label>
            <label className="block">Último dia previsto no cargo<Input type="date" min={efeito} max={limite ?? undefined}
              value={termino} onChange={e => definirFim(e.target.value)} /></label>
          </div>
        </SecaoPainel>}
        {termino && !periodoValido && <p role="alert">Confira as datas de posse e término em Ajustar posse e período.</p>}
      </>}
      {salvar.error && <p role="alert">{salvar.error instanceof ApiRequestError ? salvar.error.messages.join(' ') : salvar.error.message}</p>}
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={salvar.isPending || !eleicao || (!encerrar && (exigeEncerramento || !pessoa || !ataPosse || !periodoValido || pessoas.isFetching))}>Confirmar ato</Button>
      </div>
    </form>
  </SecaoPainel>
}
