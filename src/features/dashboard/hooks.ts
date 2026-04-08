import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export interface UltimoLancamento {
  id: string;
  data_transacao: string;
  tipo_transacao: 'RECEITA' | 'DESPESA';
  valor: number;
  historico: string | null;
  contas: { descricao: string } | null;
  receitas: { nome: string } | null;
  despesas: { nome: string } | null;
}

export interface DashboardResumo {
  financeiro: {
    receitas_mes: number;
    despesas_mes: number;
    saldo_consolidado: number;
  };
  membresia: {
    comungantes_ativos: number;
    congregados_ativos: number;
  };
  acoes_em_andamento: number;
  ultimos_lancamentos: UltimoLancamento[];
}

async function fetchResumo(): Promise<DashboardResumo> {
  const { data } = await api.get<DashboardResumo>('/dashboard/resumo');
  return data;
}

export function useDashboardResumo() {
  return useQuery<DashboardResumo>({
    queryKey: ['dashboard-resumo'],
    queryFn: fetchResumo,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}
