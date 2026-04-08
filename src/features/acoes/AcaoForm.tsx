import { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { X } from 'lucide-react';
import { useAcoes } from './hooks';
import { Acao, AcaoSchema } from './schemas';
import { usePessoas } from '../pessoas/hooks';
import { useContas } from '../contas/hooks';
import { AsyncSelect } from '../../components/shared/AsyncSelect';

interface AcaoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Acao;
}

export function AcaoForm({ open, onOpenChange, initialData }: AcaoFormProps) {
  const { useCreate, useUpdate } = useAcoes();
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const { useList: usePessoasList } = usePessoas();
  const { data: pessoas = [], isLoading: isLoadingPessoas } = usePessoasList();

  const { useList: useContasList } = useContas();
  const { data: contas = [], isLoading: isLoadingContas } = useContasList();

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<Acao>({
    resolver: zodResolver(AcaoSchema),
    defaultValues: { 
      nome: '',
      descricao_detalhada: '',
      cor_hex: '#10b981',
      responsavel_pessoa_id: '',
      conta_id: '',
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: '',
      orcamento_receita: 0,
      orcamento_despesa: 0,
    }
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          ...initialData,
          data_inicio: initialData.data_inicio ? new Date(initialData.data_inicio).toISOString().split('T')[0] : '',
          data_fim: initialData.data_fim ? new Date(initialData.data_fim).toISOString().split('T')[0] : '',
          orcamento_receita: Number(initialData.orcamento_receita),
          orcamento_despesa: Number(initialData.orcamento_despesa),
        });
      } else {
        reset({ 
          nome: '',
          descricao_detalhada: '',
          cor_hex: '#10b981',
          responsavel_pessoa_id: '',
          conta_id: '',
          data_inicio: new Date().toISOString().split('T')[0],
          data_fim: '',
          orcamento_receita: 0,
          orcamento_despesa: 0,
        });
      }
    }
  }, [open, initialData, reset]);

  const onSubmit = (data: Acao) => {
    if (initialData?.id) {
      updateMutation.mutate({ id: initialData.id, payload: data }, { onSuccess: () => onOpenChange(false) });
    } else {
      createMutation.mutate(data, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg max-h-[90vh] overflow-y-auto">
          <div className="flex flex-col space-y-1.5 mb-4 border-b pb-4">
            <Dialog.Title className="text-xl font-semibold leading-none tracking-tight">
              {initialData ? 'Editar Ação / Projeto' : 'Nova Ação / Projeto'}
            </Dialog.Title>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="nome">Nome da Ação *</Label>
                <Input id="nome" {...register('nome')} placeholder="Ex: Acampamento 2024" />
                {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="descricao_detalhada">Descrição (Opcional)</Label>
                <Input id="descricao_detalhada" {...register('descricao_detalhada')} placeholder="Detalhes do projeto" />
              </div>

              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label htmlFor="data_inicio">Data Início *</Label>
                <Input id="data_inicio" type="date" {...register('data_inicio')} />
                {errors.data_inicio && <p className="text-sm text-destructive">{errors.data_inicio.message}</p>}
              </div>

              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label htmlFor="data_fim">Data Fim (Opcional)</Label>
                <Input id="data_fim" type="date" {...register('data_fim')} />
              </div>

              <div className="space-y-2 col-span-2 md:col-span-1">
                <Controller
                  control={control}
                  name="responsavel_pessoa_id"
                  render={({ field }) => (
                     <>
                        <Label className="mb-2 block">Pessoa Responsável *</Label>
                        <AsyncSelect
                          options={pessoas.map((p: any) => ({ value: p.id, label: p.nome_completo }))}
                          loading={isLoadingPessoas}
                          value={field.value || ''}
                          onChange={field.onChange}
                        />
                     </>
                  )}
                />
                {errors.responsavel_pessoa_id && <p className="text-sm text-destructive">{errors.responsavel_pessoa_id.message}</p>}
              </div>

              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label htmlFor="conta_id">Conta Vinculada *</Label>
                <select 
                  id="conta_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  {...register('conta_id')}
                  disabled={isLoadingContas}
                >
                  <option value="">{isLoadingContas ? 'Carregando...' : 'Selecione'}</option>
                  {contas.map(c => (
                    <option key={c.id} value={c.id}>{c.descricao}</option>
                  ))}
                </select>
                {errors.conta_id && <p className="text-sm text-destructive">{errors.conta_id.message}</p>}
              </div>

              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label htmlFor="orcamento_receita">Orçamento Receita (R$)</Label>
                <Input id="orcamento_receita" type="number" step="0.01" {...register('orcamento_receita', { valueAsNumber: true })} />
                {errors.orcamento_receita && <p className="text-sm text-destructive">{errors.orcamento_receita.message}</p>}
              </div>

              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label htmlFor="orcamento_despesa">Orçamento Despesa (R$)</Label>
                <Input id="orcamento_despesa" type="number" step="0.01" {...register('orcamento_despesa', { valueAsNumber: true })} />
                {errors.orcamento_despesa && <p className="text-sm text-destructive">{errors.orcamento_despesa.message}</p>}
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="cor_hex">Cor de Identificação</Label>
                <div className="flex gap-2 items-center">
                  <Input id="cor_hex" type="color" className="w-16 h-10 p-1" {...register('cor_hex')} />
                  <span className="text-sm text-muted-foreground">Escolha uma cor para os gráficos</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>

          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
