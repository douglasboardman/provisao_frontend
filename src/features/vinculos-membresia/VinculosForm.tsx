import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { X, AlertTriangle } from 'lucide-react';
import { useVinculosMembresia } from './hooks';
import {
  VinculoMembresia,
  VinculoMembresiaSchema,
  VinculoRol,
  VinculoRolLabel,
  FormaAdmissao,
  FormaAdmissaoLabel,
  ModalidadeExclusao,
  ModalidadeExclusaoLabel,
} from './schema';
import { usePessoas } from '../pessoas/hooks';
import { AsyncSelect } from '../../components/shared/AsyncSelect';
import { applyServerErrors } from '../../lib/server-errors';

interface VinculosFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: VinculoMembresia;
}

const VINCULOS_FIELDS = Object.keys(VinculoMembresiaSchema.shape);

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer';
const SELECT_ERROR_CLASS =
  'flex h-10 w-full rounded-md border border-destructive bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer';

export function VinculosForm({ open, onOpenChange, initialData }: VinculosFormProps) {
  const { useCreate, useUpdate } = useVinculosMembresia();
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { useList: usePessoasList } = usePessoas();
  const { data: pessoas = [], isLoading: isLoadingPessoas } = usePessoasList();

  const { register, handleSubmit, reset, watch, setError, formState: { errors } } = useForm<VinculoMembresia>({
    resolver: zodResolver(VinculoMembresiaSchema),
    defaultValues: {
      vinculo_ativo: true,
      rol: VinculoRol.COMUNGANTE,
      forma_admissao: FormaAdmissao.BATISMO,
      data_admissao: new Date().toISOString().split('T')[0],
    },
  });

  const vinculoAtivo = watch('vinculo_ativo');

  useEffect(() => {
    if (open) {
      setGlobalError(null);
      if (initialData) {
        let da = initialData.data_admissao;
        if (da && da.includes('T')) da = da.split('T')[0];

        let de = initialData.data_exclusao;
        if (de && de.includes('T')) de = de.split('T')[0];

        reset({ ...initialData, data_admissao: da, data_exclusao: de });
      } else {
        reset({
          vinculo_ativo: true,
          rol: VinculoRol.COMUNGANTE,
          forma_admissao: FormaAdmissao.BATISMO,
          data_admissao: new Date().toISOString().split('T')[0],
        });
      }
    }
  }, [open, initialData, reset]);

  const onSubmit = (data: VinculoMembresia) => {
    setGlobalError(null);
    const payload = { ...data };
    if (!payload.data_exclusao) delete payload.data_exclusao;
    if (!payload.modalidade_exclusao) delete payload.modalidade_exclusao;
    if (!payload.igreja_origem) delete payload.igreja_origem;
    if (!payload.igreja_destino) delete payload.igreja_destino;

    const handleError = (err: unknown) => {
      const msg = applyServerErrors(err, setError, VINCULOS_FIELDS);
      if (msg) setGlobalError(msg);
    };

    if (initialData?.id) {
      updateMutation.mutate({ id: initialData.id, payload }, {
        onSuccess: () => onOpenChange(false), onError: handleError,
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => onOpenChange(false), onError: handleError,
      });
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 overflow-y-auto" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
            <Dialog.Title className="text-xl font-semibold leading-none tracking-tight">
              {initialData ? 'Editar Vínculo' : 'Novo Vínculo'}
            </Dialog.Title>
          </div>

          {/* Banner de erro geral */}
          {globalError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3 mb-4 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>{globalError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              {/* Pessoa */}
              <div className="col-span-2 space-y-2">
                <AsyncSelect
                  label="Pessoa *"
                  options={pessoas.map((p) => ({ value: p.id!, label: p.nome_completo }))}
                  loading={isLoadingPessoas}
                  error={errors.pessoa_id?.message}
                  {...register('pessoa_id')}
                />
              </div>

              {/* Vínculo Ativo */}
              <div className="space-y-2 flex items-center gap-2 md:col-span-2 mt-2">
                <input
                  type="checkbox"
                  id="vinculo_ativo"
                  className="w-4 h-4 cursor-pointer accent-primary"
                  {...register('vinculo_ativo')}
                />
                <Label htmlFor="vinculo_ativo" className="m-0 cursor-pointer">
                  Vínculo Ativo (Membro Atual)
                </Label>
              </div>

              {/* Rol */}
              <div className="space-y-2">
                <Label htmlFor="rol">Rol *</Label>
                <select
                  id="rol"
                  className={errors.rol ? SELECT_ERROR_CLASS : SELECT_CLASS}
                  {...register('rol')}
                >
                  {Object.values(VinculoRol).map((r) => (
                    <option key={r} value={r}>{VinculoRolLabel[r]}</option>
                  ))}
                </select>
                {errors.rol && <p className="text-sm text-destructive">{errors.rol.message}</p>}
              </div>

              {/* Forma de Admissão */}
              <div className="space-y-2">
                <Label htmlFor="forma_admissao">Forma de Admissão *</Label>
                <select
                  id="forma_admissao"
                  className={errors.forma_admissao ? SELECT_ERROR_CLASS : SELECT_CLASS}
                  {...register('forma_admissao')}
                >
                  {Object.values(FormaAdmissao).map((fa) => (
                    <option key={fa} value={fa}>{FormaAdmissaoLabel[fa]}</option>
                  ))}
                </select>
                {errors.forma_admissao && (
                  <p className="text-sm text-destructive">{errors.forma_admissao.message}</p>
                )}
              </div>

              {/* Data de Admissão */}
              <div className="space-y-2">
                <Label htmlFor="data_admissao">Data de Admissão *</Label>
                <Input
                  id="data_admissao"
                  type="date"
                  className={errors.data_admissao ? 'border-destructive' : ''}
                  {...register('data_admissao')}
                />
                {errors.data_admissao && (
                  <p className="text-sm text-destructive">{errors.data_admissao.message}</p>
                )}
              </div>

              {/* Igreja de Origem */}
              <div className="space-y-2">
                <Label htmlFor="igreja_origem">Igreja de Origem</Label>
                <Input id="igreja_origem" {...register('igreja_origem')} placeholder="Ex: IPB Silva" />
              </div>

              {/* Seção de Desligamento — só exibida quando vínculo inativo */}
              {!vinculoAtivo && (
                <>
                  <div className="col-span-2 mt-4 mb-2 border-b uppercase text-sm border-border pb-2 font-semibold text-muted-foreground">
                    Dados de Desligamento
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_exclusao">Data de Exclusão</Label>
                    <Input id="data_exclusao" type="date" {...register('data_exclusao')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="modalidade_exclusao">Motivo da Saída</Label>
                    <select
                      id="modalidade_exclusao"
                      className={SELECT_CLASS}
                      {...register('modalidade_exclusao')}
                    >
                      <option value="">Selecione...</option>
                      {Object.values(ModalidadeExclusao).map((me) => (
                        <option key={me} value={me}>{ModalidadeExclusaoLabel[me]}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="igreja_destino">Igreja de Destino (transferência)</Label>
                    <Input id="igreja_destino" {...register('igreja_destino')} />
                  </div>
                </>
              )}

            </div>

            <div className="flex justify-end space-x-2 pt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>

          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none cursor-pointer">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
