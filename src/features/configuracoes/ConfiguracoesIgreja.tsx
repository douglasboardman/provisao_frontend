import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Church } from 'lucide-react';
import { useCrud } from '../../hooks/useCrud';

const IgrejaSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, 'O nome da igreja é obrigatório'),
  cnpj: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  telefone: z.string().optional().nullable(),
  cep: z.string().optional().nullable(),
  logradouro: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
});

type Igreja = z.infer<typeof IgrejaSchema>;

// Assuming a custom hook to fetch the single tenant config
const useIgrejaSettings = () => {
  return useCrud<Igreja>(['igreja'], '/igreja'); // Mock endpoint: will be handled by the backend
};

export function ConfiguracoesIgreja() {
  const { useList, useUpdate, useCreate } = useIgrejaSettings();
  const { data: list, isLoading } = useList();
  const updateMutation = useUpdate();
  const createMutation = useCreate();

  const igreja = list?.[0]; // Get the first config record (Tenant)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Igreja>({
    resolver: zodResolver(IgrejaSchema),
    defaultValues: { nome: '' }
  });

  useEffect(() => {
    if (igreja) {
      reset(igreja);
    }
  }, [igreja, reset]);

  const onSubmit = async (data: Igreja) => {
    try {
      if (igreja?.id) {
        await updateMutation.mutateAsync({ id: igreja.id, payload: data });
      } else {
        await createMutation.mutateAsync(data);
      }
      alert('Configurações salvas com sucesso!');
    } catch {
      alert('Ocorreu um erro ao salvar as configurações.');
    }
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">Carregando dados da congregação...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-primary/10 p-3 rounded-xl text-primary">
          <Church className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações da Igreja</h1>
          <p className="text-muted-foreground">Administre os dados oficiais e informações de contato.</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-8">
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label htmlFor="nome">Nome da Igreja / Congregação *</Label>
                <Input id="nome" {...register('nome')} placeholder="Ex: Comunidade Provisão" className="text-lg" />
                {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
              </div>
              
              <div className="space-y-2 col-span-1">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" {...register('cnpj')} placeholder="00.000.000/0000-00" />
              </div>
              
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Contato & Localização</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" {...register('cep')} placeholder="00000-000" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input id="logradouro" {...register('logradouro')} placeholder="Rua / Avenida" />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" {...register('numero')} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input id="complemento" {...register('complemento')} placeholder="Sala, Andar, Referência" />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="bairro">Bairro</Label>
                <Input id="bairro" {...register('bairro')} />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" {...register('cidade')} />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="estado">Estado</Label>
                <Input id="estado" {...register('estado')} placeholder="SP, RJ..." />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" size="lg" disabled={isSubmitting || updateMutation.isPending || createMutation.isPending}>
              {isSubmitting || updateMutation.isPending || createMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
