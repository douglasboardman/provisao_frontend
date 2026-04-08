import { useCrud } from '../../hooks/useCrud';
import { Acao } from './schemas';

export const useAcoes = () => {
  return useCrud<Acao>(['acoes'], '/acoes');
};
