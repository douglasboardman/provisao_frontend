import { useCrud } from '../../hooks/useCrud';
import { Usuario } from './schemas';

export const useUsuarios = () => {
  return useCrud<Usuario>(['usuarios'], '/usuarios');
};
