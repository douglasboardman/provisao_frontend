import { useCrud } from '../../hooks/useCrud';
import { Pessoa } from './schema';

export const usePessoas = () => {
  return useCrud<Pessoa, Partial<Pessoa>, Partial<Pessoa>>(['pessoas'], '/pessoas');
};
