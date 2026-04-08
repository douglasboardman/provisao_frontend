import { useCrud } from '../../hooks/useCrud';
import { Categoria, TipoLancamento } from './schemas';

// As the backend has slightly different keys mapping to the same concept (cat_receita_id vs cat_despesa_id)
// We handle this internally in the custom hooks instead of complicating the unified form component.

export const useCategorias = (tipo: 'receita' | 'despesa') => {
  const endpoint = tipo === 'receita' ? '/cat-receita' : '/cat-despesa';
  const queryKey = [`categorias-${tipo}`];
  return useCrud<Categoria>(queryKey, endpoint);
};

export const useTiposLancamento = (tipo: 'receita' | 'despesa') => {
  const endpoint = tipo === 'receita' ? '/receitas' : '/despesas';
  const queryKey = [`tipos-${tipo}`];
  
  // Custom API mapping
  const crud = useCrud<any>(queryKey, endpoint);
  
  return {
    ...crud,
    useList: () => {
      const result = crud.useList();
      return {
        ...result,
        data: result.data?.map(item => ({
          ...item,
          categoria_id: tipo === 'receita' ? item.cat_receita_id : item.cat_despesa_id
        })) as TipoLancamento[] | undefined
      }
    },
    useCreate: () => {
      const mutation = crud.useCreate();
      return {
        ...mutation,
        mutate: (payload: any, options?: any) => {
          const apiPayload = { ...payload };
          if (tipo === 'receita') {
            apiPayload.cat_receita_id = apiPayload.categoria_id;
          } else {
            apiPayload.cat_despesa_id = apiPayload.categoria_id;
          }
          delete apiPayload.categoria_id;
          return mutation.mutate(apiPayload, options);
        }
      }
    },
    useUpdate: () => {
      const mutation = crud.useUpdate();
      return {
        ...mutation,
        mutate: (params: { id: number | string; payload: any }, options?: any) => {
          const apiPayload = { ...params.payload };
          if (apiPayload.categoria_id) {
            if (tipo === 'receita') apiPayload.cat_receita_id = apiPayload.categoria_id;
            else apiPayload.cat_despesa_id = apiPayload.categoria_id;
            delete apiPayload.categoria_id;
          }
          return mutation.mutate({ id: params.id, payload: apiPayload }, options);
        }
      }
    }
  };
};
