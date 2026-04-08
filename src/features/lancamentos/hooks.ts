import { useCrud } from '../../hooks/useCrud';
import { Lancamento } from './schemas';

export const useLancamentos = () => {
  return useCrud<Lancamento>(['lancamentos'], '/lancamentos');
};

export const useAcoes = () => {
  return useCrud<{id: string, nome: string}>(['acoes'], '/acoes');
};
