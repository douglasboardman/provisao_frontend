import { useCrud } from '../../hooks/useCrud';
import { GrupoFamiliar, CreateGrupoFamiliarDTO, UpdateGrupoFamiliarDTO } from './schema';

export const useGruposFamiliares = () => {
  return useCrud<GrupoFamiliar, CreateGrupoFamiliarDTO, UpdateGrupoFamiliarDTO>(
    ['grupos-familiares'],
    '/grupos-familiares'
  );
};
