import { useCrud } from '../../hooks/useCrud';
import { Conta } from './schemas';

export const useContas = () => {
  return useCrud<Conta>(['contas'], '/contas');
};
