import { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { X } from 'lucide-react';
import { useTiposLancamento, useCategorias } from './hooks';
import { TipoLancamento, TipoLancamentoSchema } from './schemas';
import { AsyncSelect } from '../../components/shared/AsyncSelect';

interface TipoLancamentoFormProps {
  tipo: 'receita' | 'despesa';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: TipoLancamento;
}

export function TipoLancamentoForm({ tipo, open, onOpenChange, initialData }: TipoLancamentoFormProps) {
  const { useCreate, useUpdate } = useTiposLancamento(tipo);
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const { useList: useCategoriasList } = useCategorias(tipo);
  const { data: categorias = [], isLoading: isLoadingCategorias } = useCategoriasList();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TipoLancamento>({
    resolver: zodResolver(TipoLancamentoSchema),
    defaultValues: { 
      nome: '', 
      cor_hex: '',
      requer_pessoa: false,
      requer_acao: false,
      requer_conta: false,
      requer_comprovante: false
    }
  });

  useEffect(() => {
    if (open) {
      if (initialData) reset(initialData);
      else reset({ 
        nome: '', cor_hex: '', 
        requer_pessoa: false, requer_acao: false, 
        requer_conta: false, requer_comprovante: false 
      });
    }
  }, [open, initialData, reset]);

  const onSubmit = (data: TipoLancamento) => {
    if (!data.cor_hex) delete data.cor_hex;
    
    if (initialData?.id) {
      updateMutation.mutate({ id: initialData.id, payload: data }, { onSuccess: () => onOpenChange(false) });
    } else {
      createMutation.mutate(data, { onSuccess: () => onOpenChange(false) });
    }
  };

  const titlePrefix = tipo === 'receita' ? 'Receitas' : 'Despesas';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 overflow-y-auto" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg">
          <div className="flex flex-col space-y-1.5 mb-4">
            <Dialog.Title className="text-xl font-semibold leading-none tracking-tight">
              {initialData ? `Editar Tipo de ${titlePrefix}` : `Novo Tipo de ${titlePrefix}`}
            </Dialog.Title>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="space-y-2">
              <AsyncSelect
                label="Categoria *"
                options={categorias.map(c => ({ value: c.id!, label: c.nome }))}
                loading={isLoadingCategorias}
                {...register('categoria_id', { valueAsNumber: true })}
              />
              {errors.categoria_id && <p className="text-sm text-destructive">{errors.categoria_id.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Tipo *</Label>
                <Input id="nome" {...register('nome')} placeholder="Ex: Oferta Voluntária" />
                {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cor_hex">Cor (Hex)</Label>
                <div className="flex gap-2">
                  <Input type="color" className="w-12 p-1" id="cor_hex_picker" {...register('cor_hex')} />
                  <Input id="cor_hex" placeholder="#000000" {...register('cor_hex')} />
                </div>
                {errors.cor_hex && <p className="text-sm text-destructive">{errors.cor_hex.message}</p>}
              </div>
            </div>

            <div className="pt-2">
              <Label className="mb-2 block font-medium">Restrições (Condições para lançamentos futuros deste tipo)</Label>
              <div className="grid grid-cols-2 gap-3 p-3 border rounded-md bg-muted/20">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="requer_pessoa" className="w-4 h-4 cursor-pointer" {...register('requer_pessoa')} />
                  <Label htmlFor="requer_pessoa" className="font-normal m-0 cursor-pointer">Requer Pessoa</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="requer_conta" className="w-4 h-4 cursor-pointer" {...register('requer_conta')} />
                  <Label htmlFor="requer_conta" className="font-normal m-0 cursor-pointer">Requer Conta/Banco</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="requer_comprovante" className="w-4 h-4 cursor-pointer" {...register('requer_comprovante')} />
                  <Label htmlFor="requer_comprovante" className="font-normal m-0 cursor-pointer">Anexar Comprovante</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="requer_acao" className="w-4 h-4 cursor-pointer" {...register('requer_acao')} />
                  <Label htmlFor="requer_acao" className="font-normal m-0 cursor-pointer">Vincular a Ação/Projeto</Label>
                </div>
              </div>
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
