import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useCrud<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  queryKey: string[],
  endpoint: string
) {
  const queryClient = useQueryClient();

  const useList = (params?: Record<string, any>) => 
    useQuery({
      queryKey: [...queryKey, params],
      queryFn: async () => {
        const { data } = await api.get<{ data: T[]; [key: string]: any }>(endpoint, { params });
        // Retorna data.data se for um paginado padrão nestjs, senão array direto
        return Array.isArray(data) ? data : (data.data || data);
      },
    });

  const useGet = (id: string | number, enabled = true) =>
    useQuery({
      queryKey: [...queryKey, id],
      queryFn: async () => {
        const { data } = await api.get<T>(`${endpoint}/${id}`);
        return data;
      },
      enabled: !!id && enabled,
    });

  const useCreate = () =>
    useMutation({
      mutationFn: async (payload: TCreate) => {
        const { data } = await api.post<T>(endpoint, payload);
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    });

  const useUpdate = () =>
    useMutation({
      mutationFn: async ({ id, payload }: { id: string | number; payload: TUpdate }) => {
        const { data } = await api.patch<T>(`${endpoint}/${id}`, payload);
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    });

  const useDelete = () =>
    useMutation({
      mutationFn: async (id: string | number) => {
        const { data } = await api.delete(`${endpoint}/${id}`);
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    });

  return {
    useList,
    useGet,
    useCreate,
    useUpdate,
    useDelete,
  };
}
