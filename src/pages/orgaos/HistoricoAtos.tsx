import { useRecurso } from '../../lib/recursos'
import { ReferenciaAta } from '../../components/shared/ReferenciaAta'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { orgaosApi } from '../../api/orgaos'
import { Button } from '../../components/ui/button'

export const tiposAtosOrgao: Record<string, string> = {
  ATIVACAO_SOCIEDADE: 'Ativação da sociedade', INSTITUICAO_MINISTERIO: 'Instituição do ministério',
  MANUTENCAO_MINISTERIO: 'Manutenção do ministério', PROVIMENTO: 'Provimento de cargo',
  CADASTRO_OFICIAL: 'Cadastro do órgão oficial',
  INSTITUICAO: 'Instituição', MANUTENCAO: 'Manutenção cadastral', CONDUCAO_REUNIAO: 'Condução excepcional de reunião', CONFIGURACAO_CARGO: 'Cadastro de cargo', CONFIGURACAO_ACUMULACAO: 'Regra de acumulação',
  POLITICA_UNIDADE: 'Política da unidade', PARTICIPACAO_INCLUSAO: 'Inclusão de participante', PARTICIPACAO_SAIDA: 'Saída de participante',
  DESIGNACAO: 'Designação', DISPENSA: 'Dispensa', ELEICAO_CARGO: 'Eleição e posse', ELEICAO_CARGO_UNIDADE: 'Eleição e posse',
  ENCERRAMENTO_CARGO: 'Encerramento de ocupação', ENCERRAMENTO_CARGO_UNIDADE: 'Encerramento de ocupação', DESATIVACAO: 'Desativação',
}

export function HistoricoAtos({ orgaoId, identidade }: { orgaoId: string; identidade: string }) {
  const secretariaHabilitada = useRecurso('secretaria')
  const [cursor, setCursor] = useState<string | undefined>()
  const [anteriores, setAnteriores] = useState<(string | undefined)[]>([])
  const atos = useQuery({ queryKey: ['orgaos', identidade, 'atos', orgaoId, cursor], queryFn: () => orgaosApi.atos(orgaoId, cursor), staleTime: 0, gcTime: 0 })
  return <section className="space-y-2">
    <h3 className="font-semibold">Histórico de atos</h3>
    <p className="text-sm text-muted-foreground">Ordenado pelo registro, do mais recente ao mais antigo. Atos novos preservam a identificação do momento do registro; atos antigos podem mostrar o cadastro atual; registrar não significa ser a autoridade do ato.</p>
    {atos.isPending && <p>Carregando atos...</p>}
    {atos.isError && <p role="alert">Não foi possível consultar os atos.</p>}
    {atos.data?.itens.length === 0 && <p>Nenhum ato registrado.</p>}
    {atos.data?.itens.map(ato => <div key={ato.id}><p>{tiposAtosOrgao[ato.tipo] ?? 'Outro ato'} — efeito em {ato.data_efeito.slice(0, 10).split('-').reverse().join('/')} · registrado por {ato.operador.nome_usuario}</p><DetalheAto orgao={orgaoId} ato={ato.id} identidade={identidade} />
      {secretariaHabilitada && ato.tipo !== 'CADASTRO_OFICIAL' && (
        ['ELEICAO_CARGO', 'ELEICAO_CARGO_UNIDADE'].includes(ato.tipo)
          ? <><ReferenciaAta alvo={{ grupo: 'ORGAO', alvo_id: ato.id, etapa: 'ELEICAO' }} identidade={identidade} label="Ata da eleição" />
              <ReferenciaAta alvo={{ grupo: 'ORGAO', alvo_id: ato.id, etapa: 'POSSE' }} identidade={identidade} label="Ata da posse" /></>
          : <ReferenciaAta alvo={{ grupo: 'ORGAO', alvo_id: ato.id, etapa: 'ATO' }} identidade={identidade} />
      )}</div>)}
    <div className="flex gap-2"><Button type="button" variant="outline" disabled={!anteriores.length} onClick={() => { const itens = [...anteriores]; setCursor(itens.pop()); setAnteriores(itens) }}>Atos anteriores</Button><Button type="button" variant="outline" disabled={!atos.data?.proximo_cursor} onClick={() => { if (atos.data?.proximo_cursor) { setAnteriores(a => [...a, cursor]); setCursor(atos.data.proximo_cursor) } }}>Mais atos</Button></div>
  </section>
}

function DetalheAto({ orgao, ato, identidade }: { orgao: string; ato: string; identidade: string }) {
  const [aberto, setAberto] = useState(false)
  const consulta = useQuery({ queryKey: ['orgaos', identidade, 'ato', orgao, ato], queryFn: () => orgaosApi.ato(orgao, ato), enabled: aberto, gcTime: 0, staleTime: 0 })
  return <div>
    <Button type="button" variant="ghost" onClick={() => setAberto(v => !v)}>{aberto ? 'Fechar detalhes do registro' : 'Consultar detalhes do registro'}</Button>
    {aberto && (consulta.isPending ? <p>Consultando...</p> : consulta.isError ? <p role="alert">Não foi possível consultar o registro.</p> : consulta.data && <div className="rounded border p-3">
      {consulta.data.autoridade && <p>Autoridade declarada: {consulta.data.retrato?.pessoas?.find(p => p.id === consulta.data!.autoridade)?.nome ?? consulta.data.autoridade}</p>}
      {consulta.data.evidencia && <p>Evidência: {consulta.data.evidencia}</p>}
      {consulta.data.retrato ? <><p>Órgão no registro: {consulta.data.retrato.orgao?.nome}</p>{consulta.data.retrato.pessoas?.map(p => <p key={p.id}>Pessoa no registro: {p.nome}</p>)}</> : <p>Identificação histórica indisponível para este ato anterior.</p>}
      {typeof consulta.data.detalhes.modo === 'string' && <p>Provimento: {consulta.data.detalhes.modo === 'ELEICAO' ? 'Eleição' : consulta.data.detalhes.modo === 'DESIGNACAO' ? 'Designação' : 'Nomeação pelo Conselho'}</p>}
      {typeof consulta.data.detalhes.aprovacao_conselho === 'string' && <p>Aprovação do Conselho: {consulta.data.detalhes.aprovacao_conselho}</p>}
      {typeof consulta.data.detalhes.posse === 'string' && <p>Posse: {consulta.data.detalhes.posse}</p>}
      {typeof consulta.data.detalhes.motivo === 'string' && <p>Motivo: {consulta.data.detalhes.motivo}</p>}
      {typeof consulta.data.detalhes.fundamento === 'string' && <p>Fundamento: {consulta.data.detalhes.fundamento}</p>}
      {typeof consulta.data.detalhes.limites_pauta === 'string' && <p>Limites da pauta: {consulta.data.detalhes.limites_pauta}</p>}
      {consulta.data.detalhes.ratificacao_pendente === true && <p>Ratificação pendente.</p>}
    </div>)}
  </div>
}
