import { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { X } from 'lucide-react';
import { useCategorias } from './hooks';
import { Categoria, CategoriaSchema } from './schemas';

interface CategoriaFormProps {
  tipo: 'receita' | 'despesa';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Categoria;
}

export function CategoriaForm({ tipo, open, onOpenChange, initialData }: CategoriaFormProps) {
  const { useCreate, useUpdate } = useCategorias(tipo);
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Categoria>({
    resolver: zodResolver(CategoriaSchema),
    defaultValues: { nome: '', cor_hex: '' }
  });

  useEffect(() => {
    if (open) {
      if (initialData) reset(initialData);
      else reset({ nome: '', cor_hex: '' });
    }
  }, [open, initialData, reset]);

  const onSubmit = (data: Categoria) => {
    if (!data.cor_hex) delete data.cor_hex;
    
    if (initialData?.id) {
      updateMutation.mutate({ id: initialData.id, payload: data }, { onSuccess: () => onOpenChange(false) });
    } else {
      createMutation.mutate(data, { onSuccess: () => onOpenChange(false) });
    }
  };

  const titlePrefix = tipo === 'receita' ? 'Receita' : 'Despesa';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 overflow-y-auto" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg">
          <div className="flex flex-col space-y-1.5 mb-4">
            <Dialog.Title className="text-xl font-semibold leading-none tracking-tight">
              {initialData ? `Editar Categoria de ${titlePrefix}` : `Nova Categoria de ${titlePrefix}`}
            </Dialog.Title>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...register('nome')} />
              {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cor_hex">Cor Hexadecimal (opcional)</Label>
              <div className="flex gap-2">
                <Input type="color" className="w-12 p-1" id="cor_hex_picker" {...register('cor_hex')} />
                <Input id="cor_hex" placeholder="#000000" {...register('cor_hex')} />
              </div>
              {errors.cor_hex && <p className="text-sm text-destructive">{errors.cor_hex.message}</p>}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>

          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none">
            <X className="h-4 w-4" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
