import { useCrud } from '../../hooks/useCrud';
import { VinculoMembresia } from './schema';

export const useVinculosMembresia = () => {
  return useCrud<VinculoMembresia, Partial<VinculoMembresia>, Partial<VinculoMembresia>>(
    ['vinculos-membresia'], 
    '/vinculos-membresia'
  );
};
