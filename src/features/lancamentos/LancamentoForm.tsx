import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { X } from 'lucide-react';
import { useLancamentos, useAcoes } from './hooks';
import { Lancamento, LancamentoSchema, TipoTransacao } from './schemas';
import { AsyncSelect } from '../../components/shared/AsyncSelect';
import { useTiposLancamento } from '../cadastros-basicos/hooks';
import { useContas } from '../contas/hooks';
import { usePessoas } from '../pessoas/hooks';
import { formatCurrency } from '../../lib/format';

interface LancamentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Lancamento;
  defaultTipo?: TipoTransacao;
}

export function LancamentoForm({ open, onOpenChange, initialData, defaultTipo = TipoTransacao.DESPESA }: LancamentoFormProps) {
  const { useCreate, useUpdate } = useLancamentos();
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [activeTab, setActiveTab] = useState<TipoTransacao>(defaultTipo);

  // Fetch Auxiliares
  const { useList: useTiposReceita } = useTiposLancamento('receita');
  const { data: tiposReceita = [], isLoading: isLoadingReceitas } = useTiposReceita();

  const { useList: useTiposDespesa } = useTiposLancamento('despesa');
  const { data: tiposDespesa = [], isLoading: isLoadingDespesas } = useTiposDespesa();

  const { useList: useContasList } = useContas();
  const { data: contas = [], isLoading: isLoadingContas } = useContasList();

  const { useList: usePessoasList } = usePessoas();
  const { data: pessoas = [], isLoading: isLoadingPessoas } = usePessoasList();

  const { useList: useAcoesList } = useAcoes();
  const { data: acoes = [], isLoading: isLoadingAcoes } = useAcoesList();

  const activeTipos = activeTab === TipoTransacao.RECEITA ? tiposReceita : tiposDespesa;
  const isLoadingTipos = activeTab === TipoTransacao.RECEITA ? isLoadingReceitas : isLoadingDespesas;

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm<Lancamento>({
    resolver: zodResolver(LancamentoSchema),
    defaultValues: { 
      tipo_transacao: defaultTipo,
      data_transacao: new Date().toISOString().split('T')[0],
      valor: 0,
      conta_id: '',
      observacao: ''
    }
  });

  const selectedTipoId = activeTab === TipoTransacao.RECEITA ? watch('receita_id') : watch('despesa_id');
  const selectedTipoObj = activeTipos.find(t => t.id === selectedTipoId);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setActiveTab(initialData.tipo_transacao);
        const dataStr = initialData.data_transacao ? new Date(initialData.data_transacao).toISOString().split('T')[0] : '';
        reset({ ...initialData, data_transacao: dataStr, valor: Number(initialData.valor) });
      } else {
        setActiveTab(defaultTipo);
        reset({ 
          tipo_transacao: defaultTipo,
          data_transacao: new Date().toISOString().split('T')[0],
          valor: 0,
          conta_id: '',
          observacao: '',
          comprovante_url: ''
        });
      }
    }
  }, [open, initialData, defaultTipo, reset]);

  // Handle Tab Switch
  useEffect(() => {
    if (!initialData) {
      setValue('tipo_transacao', activeTab);
      setValue('receita_id', null);
      setValue('despesa_id', null);
    }
  }, [activeTab, setValue, initialData]);

  const onSubmit = (data: Lancamento) => {
    const payload = { ...data };
    
    // Clear unused fields
    if (activeTab === TipoTransacao.RECEITA) delete payload.despesa_id;
    if (activeTab === TipoTransacao.DESPESA) delete payload.receita_id;
    
    if (!payload.comprovante_url) delete payload.comprovante_url;
    if (!payload.observacao) delete payload.observacao;

    if (initialData?.id) {
      updateMutation.mutate({ id: initialData.id, payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 overflow-y-auto" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-3xl max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg">
          <div className="flex flex-col space-y-1.5 mb-4 border-b pb-4">
            <Dialog.Title className="text-xl font-semibold leading-none tracking-tight">
              {initialData ? 'Editar Lançamento' : 'Novo Lançamento'}
            </Dialog.Title>
          </div>
          
          <Tabs.Root value={activeTab} onValueChange={(v: string) => setActiveTab(v as TipoTransacao)}>
            {!initialData && (
              <Tabs.List className="flex space-x-2 border-b mb-6">
                <Tabs.Trigger 
                  value={TipoTransacao.DESPESA}
                  className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-destructive data-[state=active]:text-destructive font-semibold transition-all"
                >
                  Despesa (-)
                </Tabs.Trigger>
                <Tabs.Trigger 
                  value={TipoTransacao.RECEITA}
                  className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600 font-semibold transition-all"
                >
                  Receita (+)
                </Tabs.Trigger>
              </Tabs.List>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label htmlFor="valor" className="text-lg">Valor do Lançamento *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">R$</span>
                    <Input 
                      id="valor"
                      type="number"
                      step="0.01"
                      className={`pl-10 text-lg font-semibold ${activeTab === TipoTransacao.RECEITA ? 'text-emerald-600 focus-visible:ring-emerald-500' : 'text-destructive focus-visible:ring-destructive'}`}
                      {...register('valor', { valueAsNumber: true })} 
                    />
                  </div>
                  {errors.valor && <p className="text-sm text-destructive">{errors.valor.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_transacao">Data da Transação *</Label>
                  <Input 
                    id="data_transacao" 
                    type="date"
                    {...register('data_transacao')} 
                  />
                  {errors.data_transacao && <p className="text-sm text-destructive">{errors.data_transacao.message}</p>}
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>{activeTab === TipoTransacao.RECEITA ? 'Tipo de Receita *' : 'Tipo de Despesa *'}</Label>
                  <Controller
                    control={control}
                    name={activeTab === TipoTransacao.RECEITA ? 'receita_id' : 'despesa_id'}
                    render={({ field }) => (
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || null)}
                        value={field.value || ''}
                        disabled={isLoadingTipos}
                      >
                        <option value="">{isLoadingTipos ? 'Carregando...' : '-- Selecione --'}</option>
                        {activeTipos.map(t => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                    )}
                  />
                  {(errors.receita_id || errors.despesa_id) && <p className="text-sm text-destructive">Selecione o tipo.</p>}
                </div>

                {selectedTipoObj?.requer_conta && (
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="conta_id">Conta Bancária / Caixa *</Label>
                    <select 
                      id="conta_id"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      {...register('conta_id')}
                      disabled={isLoadingContas}
                    >
                      <option value="">{isLoadingContas ? 'Carregando...' : '-- Selecione a Conta --'}</option>
                      {contas.map(c => (
                        <option key={c.id} value={c.id}>{c.descricao} (Saldo: {formatCurrency(c.saldo_inicial)})</option>
                      ))}
                    </select>
                    {errors.conta_id && <p className="text-sm text-destructive">{errors.conta_id.message}</p>}
                  </div>
                )}

                {selectedTipoObj?.requer_pessoa && (
                  <div className="space-y-2 col-span-2">
                    <Controller
                      control={control}
                      name="pessoa_id"
                      render={({ field }) => (
                         <>
                            <Label className="mb-2 block">Pessoa Vinculada *</Label>
                            <AsyncSelect
                              options={pessoas.map((p: any) => ({ value: p.id, label: p.nome_completo }))}
                              loading={isLoadingPessoas}
                              value={field.value || ''}
                              onChange={field.onChange}
                            />
                         </>
                      )}
                    />
                    {errors.pessoa_id && <p className="text-sm text-destructive">A pessoa é obrigatória para este tipo.</p>}
                  </div>
                )}

                {selectedTipoObj?.requer_acao && (
                  <div className="space-y-2 col-span-2">
                    <Controller
                      control={control}
                      name="acao_id"
                      render={({ field }) => (
                         <>
                            <Label className="mb-2 block">Ação / Projeto Vinculado *</Label>
                            <AsyncSelect
                              options={acoes.map(a => ({ value: a.id, label: a.nome }))}
                              loading={isLoadingAcoes}
                              value={field.value || ''}
                              onChange={field.onChange}
                            />
                         </>
                      )}
                    />
                    {errors.acao_id && <p className="text-sm text-destructive">A ação é obrigatória para este tipo.</p>}
                  </div>
                )}

                {selectedTipoObj?.requer_comprovante && (
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="comprovante_url">URL do Comprovante *</Label>
                    <Input id="comprovante_url" {...register('comprovante_url')} placeholder="Anexe o link do comprovante (ex: Google Drive, OneDrive...)" />
                    {errors.comprovante_url && <p className="text-sm text-destructive">Comprovante obrigatório ou URL inválida.</p>}
                  </div>
                )}
                
                {/* Mostramos Conta se não foi exigida especificamente acima, para deixar o usuário selecionar opcionalmente ou porque quase sempre vai pra conta. */}
                {!selectedTipoObj?.requer_conta && (
                   <div className="space-y-2 col-span-2">
                    <Label htmlFor="conta_id">Conta Bancária / Caixa (Destino/Origem) *</Label>
                    <select 
                      id="conta_id"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      {...register('conta_id')}
                      disabled={isLoadingContas}
                    >
                      <option value="">{isLoadingContas ? 'Carregando...' : '-- Selecione a Conta --'}</option>
                      {contas.map(c => (
                        <option key={c.id} value={c.id}>{c.descricao}</option>
                      ))}
                    </select>
                    {errors.conta_id && <p className="text-sm text-destructive">{errors.conta_id.message}</p>}
                  </div>
                )}

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="observacao">Observações Adicionais</Label>
                  <Input id="observacao" {...register('observacao')} placeholder="Descreva brevemente a origem/destino se necessário" />
                </div>

              </div>

              <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Registrando...' : 'Registrar Lançamento'}
                </Button>
              </div>
            </form>
          </Tabs.Root>

          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
