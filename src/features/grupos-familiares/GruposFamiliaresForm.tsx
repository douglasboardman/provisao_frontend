import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { X, AlertTriangle } from 'lucide-react';
import { useGruposFamiliares } from './hooks';
import { GrupoFamiliar, GrupoFamiliarSchema } from './schema';
import { applyServerErrors } from '../../lib/server-errors';

interface GruposFamiliaresFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: GrupoFamiliar;
}

export function GruposFamiliaresForm({ open, onOpenChange, initialData }: GruposFamiliaresFormProps) {
  const { useCreate, useUpdate } = useGruposFamiliares();
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<GrupoFamiliar>({
    resolver: zodResolver(GrupoFamiliarSchema),
    defaultValues: { nome_familia: '' }
  });

  useEffect(() => {
    if (open) {
      setGlobalError(null);
      if (initialData) {
        reset(initialData);
      } else {
        reset({ nome_familia: '' });
      }
    }
  }, [open, initialData, reset]);

  const onSubmit = (data: GrupoFamiliar) => {
    setGlobalError(null);
    const handleError = (err: unknown) => {
      const msg = applyServerErrors(err, setError, ['nome_familia']);
      if (msg) setGlobalError(msg);
    };
    if (initialData?.id) {
      updateMutation.mutate({ id: initialData.id, payload: data }, {
        onSuccess: () => onOpenChange(false), onError: handleError
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => onOpenChange(false), onError: handleError
      });
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              {initialData ? 'Editar Família' : 'Nova Família'}
            </Dialog.Title>
          </div>

          {globalError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3 mb-4 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>{globalError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome_familia">Nome da Família</Label>
              <Input
                id="nome_familia"
                placeholder="Ex: Família Silva"
                {...register('nome_familia')}
              />
              {errors.nome_familia && (
                <p className="text-sm text-destructive">{errors.nome_familia.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
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
