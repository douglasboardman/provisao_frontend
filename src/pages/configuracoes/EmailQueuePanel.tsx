import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'

interface Summary {
  pendentes: number
  processando: number
  falhas: number
  mais_antigo_pendente: string | null
  falhas_recentes: { criado_em: string; tentativas: number; tipo: string; destinatario: string }[]
}

export function EmailQueuePanel() {
  const query = useQuery({ queryKey: ['indicadores-fila'], queryFn: () => apiClient.get<Summary>('usuarios/indicadores-fila'), refetchInterval: 60_000 })
  const summary = query.data
  return <section className="space-y-3 rounded-panel border p-4">
    <h3 className="font-semibold">Envio de e-mails</h3>
    {query.isLoading && <p>Carregando indicadores...</p>}
    {query.isError && <p role="alert">Não foi possível consultar a fila de e-mails.</p>}
    {summary && <>
      <p className="text-sm">Pendentes: {summary.pendentes} · Em processamento: {summary.processando} · Com falha: {summary.falhas}</p>
      {summary.mais_antigo_pendente && <p className="text-sm">Pendente mais antigo desde {new Date(summary.mais_antigo_pendente).toLocaleString('pt-BR')}.</p>}
      {summary.falhas_recentes.length > 0 && <><p className="text-sm">Falhas mais recentes (até 20):</p><ul className="space-y-1 text-sm">{summary.falhas_recentes.map((item, index) => <li key={`${item.criado_em}-${index}`}>{item.destinatario} — {({ CONFIRMACAO: 'confirmação', CONVITE: 'convite', RECUPERACAO: 'recuperação' } as Record<string, string>)[item.tipo] ?? item.tipo}; {item.tentativas} tentativas</li>)}</ul><p className="text-sm text-muted-foreground">Verifique o serviço de e-mail; para convites, reenvie pela conta do usuário após corrigir a falha.</p></>}
      <p className="text-xs text-muted-foreground">Os indicadores não confirmam se o serviço de envio está ativo.</p>
    </>}
  </section>
}
