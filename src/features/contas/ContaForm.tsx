import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { X, AlertTriangle } from 'lucide-react';
import { useContas } from './hooks';
import { Conta, ContaSchema, TipoConta } from './schemas';
import { applyServerErrors } from '../../lib/server-errors';

interface ContaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Conta;
}

const CONTA_FIELDS = ['descricao', 'tipo_conta', 'banco', 'agencia', 'num_conta', 'saldo_inicial', 'cor_hex'];

export function ContaForm({ open, onOpenChange, initialData }: ContaFormProps) {
  const { useCreate, useUpdate } = useContas();
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Conta>({
    resolver: zodResolver(ContaSchema),
    defaultValues: { 
      descricao: '', 
      banco: '',
      tipo_conta: TipoConta.CORRENTE,
      num_conta: '',
      agencia: '',
      saldo_inicial: 0,
      cor_hex: ''
    }
  });

  useEffect(() => {
    if (open) {
      setGlobalError(null);
      if (initialData) {
        reset({ ...initialData, saldo_inicial: Number(initialData.saldo_inicial) || 0 });
      } else {
        reset({ 
          descricao: '', banco: '', tipo_conta: TipoConta.CORRENTE, 
          num_conta: '', agencia: '', saldo_inicial: 0, cor_hex: ''
        });
      }
    }
  }, [open, initialData, reset]);

  const onSubmit = (data: Conta) => {
    setGlobalError(null);
    const payload = { ...data };
    if (!payload.cor_hex) delete payload.cor_hex;
    if (!payload.banco) delete payload.banco;
    if (!payload.num_conta) delete payload.num_conta;
    if (!payload.agencia) delete payload.agencia;

    const handleError = (err: unknown) => {
      const msg = applyServerErrors(err, setError, CONTA_FIELDS);
      if (msg) setGlobalError(msg);
    };

    if (initialData?.id) {
      updateMutation.mutate({ id: initialData.id, payload }, {
        onSuccess: () => onOpenChange(false), onError: handleError
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => onOpenChange(false), onError: handleError
      });
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 overflow-y-auto" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg">
          <div className="flex flex-col space-y-1.5 mb-4">
            <Dialog.Title className="text-xl font-semibold leading-none tracking-tight">
              {initialData ? 'Editar Conta' : 'Nova Conta'}
            </Dialog.Title>
          </div>

          {globalError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3 mb-4 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>{globalError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="space-y-2 col-span-2">
                <Label htmlFor="descricao">Descrição (Nome da Conta) *</Label>
                <Input id="descricao" {...register('descricao')} placeholder="Ex: Conta Corrente Principal" />
                {errors.descricao && <p className="text-sm text-destructive">{errors.descricao.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_conta">Tipo de Conta *</Label>
                <select 
                  id="tipo_conta"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer"
                  {...register('tipo_conta')}
                >
                  {Object.values(TipoConta).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.tipo_conta && <p className="text-sm text-destructive">{errors.tipo_conta.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="banco">Banco</Label>
                <Input id="banco" {...register('banco')} placeholder="Ex: Itaú, Nubank..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agencia">Agência</Label>
                <Input id="agencia" {...register('agencia')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="num_conta">Número da Conta</Label>
                <Input id="num_conta" {...register('num_conta')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="saldo_inicial">Saldo Inicial (R$) *</Label>
                <Input 
                  id="saldo_inicial"
                  type="number"
                  step="0.01"
                  {...register('saldo_inicial', { valueAsNumber: true })} 
                />
                {errors.saldo_inicial && <p className="text-sm text-destructive">{errors.saldo_inicial.message}</p>}
                <p className="text-xs text-muted-foreground">O saldo não deve incluir R$ e apenas ponto decimal.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cor_hex">Cor (Hexadecimal)</Label>
                <div className="flex gap-2">
                  <Input type="color" className="w-12 p-1" id="cor_hex_picker" {...register('cor_hex')} />
                  <Input id="cor_hex" placeholder="#000000" {...register('cor_hex')} />
                </div>
                {errors.cor_hex && <p className="text-sm text-destructive">{errors.cor_hex.message}</p>}
              </div>

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
