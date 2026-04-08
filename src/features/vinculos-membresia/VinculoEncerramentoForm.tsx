import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { X, AlertTriangle, LogOut } from 'lucide-react';
import { useVinculosMembresia } from './hooks';
import {
  VinculoMembresia,
  VinculoEncerramento,
  VinculoEncerramentoSchema,
  VinculoRolLabel,
  ModalidadeExclusao,
  ModalidadeExclusaoLabel,
} from './schema';
import { applyServerErrors } from '../../lib/server-errors';
import { formatDate } from '../../lib/format';

interface VinculoEncerramentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vinculo: VinculoMembresia;
}

const ENCERRAMENTO_FIELDS = Object.keys(VinculoEncerramentoSchema.shape);

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer';
const SELECT_ERROR_CLASS =
  'flex h-10 w-full rounded-md border border-destructive bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer';
const READONLY_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground select-none cursor-default';

export function VinculoEncerramentoForm({ open, onOpenChange, vinculo }: VinculoEncerramentoFormProps) {
  const { useUpdate } = useVinculosMembresia();
  const updateMutation = useUpdate();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<VinculoEncerramento>({
    resolver: zodResolver(VinculoEncerramentoSchema),
  });

  useEffect(() => {
    if (open) {
      setGlobalError(null);
      reset({ data_exclusao: '', modalidade_exclusao: undefined, igreja_destino: '' });
    }
  }, [open, reset]);

  const onSubmit = (data: VinculoEncerramento) => {
    setGlobalError(null);
    // Payload para o PATCH: vinculo_ativo = false é fixado automaticamente
    const payload: Partial<VinculoMembresia> = {
      vinculo_ativo: false,
      data_exclusao: data.data_exclusao,
      modalidade_exclusao: data.modalidade_exclusao,
    };
    if (data.igreja_destino) payload.igreja_destino = data.igreja_destino;

    updateMutation.mutate(
      { id: vinculo.id!, payload },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => {
          const msg = applyServerErrors(err, setError, ENCERRAMENTO_FIELDS);
          if (msg) setGlobalError(msg);
        },
      },
    );
  };

  const pessoaNome = vinculo.pessoas?.nome_completo ?? '—';
  const rolLabel = VinculoRolLabel[vinculo.rol] ?? vinculo.rol;
  const dataAdmissao = formatDate(vinculo.data_admissao);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 overflow-y-auto" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-xl max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg">

          {/* Cabeçalho com ícone de saída */}
          <div className="flex items-start gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <LogOut className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <Dialog.Title className="text-xl font-semibold leading-none tracking-tight">
                Encerrar Vínculo
              </Dialog.Title>
              <p className="text-sm text-muted-foreground mt-1">
                Registre a saída do membro. Esta ação inativa o vínculo.
              </p>
            </div>
          </div>

          {globalError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3 mb-4 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>{globalError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* ─── Dados de leitura ────────────────────────────────── */}
            <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Dados do Vínculo
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pessoa</Label>
                  <div className={READONLY_CLASS}>{pessoaNome}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Rol</Label>
                  <div className={READONLY_CLASS}>{rolLabel}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Admissão</Label>
                  <div className={READONLY_CLASS}>{dataAdmissao}</div>
                </div>
              </div>
            </div>

            {/* ─── Dados de encerramento ─────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pt-2">

              {/* Data de Exclusão */}
              <div className="space-y-2">
                <Label htmlFor="data_exclusao_enc">
                  Data de Exclusão <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="data_exclusao_enc"
                  type="date"
                  className={errors.data_exclusao ? 'border-destructive' : ''}
                  {...register('data_exclusao')}
                />
                {errors.data_exclusao && (
                  <p className="text-sm text-destructive">{errors.data_exclusao.message}</p>
                )}
              </div>

              {/* Modalidade de Exclusão */}
              <div className="space-y-2">
                <Label htmlFor="modalidade_exclusao_enc">
                  Motivo da Saída <span className="text-destructive">*</span>
                </Label>
                <select
                  id="modalidade_exclusao_enc"
                  className={errors.modalidade_exclusao ? SELECT_ERROR_CLASS : SELECT_CLASS}
                  {...register('modalidade_exclusao')}
                  defaultValue=""
                >
                  <option value="" disabled>Selecione o motivo...</option>
                  {Object.values(ModalidadeExclusao).map((me) => (
                    <option key={me} value={me}>{ModalidadeExclusaoLabel[me]}</option>
                  ))}
                </select>
                {errors.modalidade_exclusao && (
                  <p className="text-sm text-destructive">{errors.modalidade_exclusao.message}</p>
                )}
              </div>

              {/* Igreja de Destino */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="igreja_destino_enc">
                  Igreja de Destino{' '}
                  <span className="text-muted-foreground text-xs">(opcional — transferência)</span>
                </Label>
                <Input
                  id="igreja_destino_enc"
                  placeholder="Ex: IPB Bela Vista"
                  {...register('igreja_destino')}
                />
              </div>

            </div>

            {/* Aviso */}
            <p className="text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
              Ao confirmar, o campo <strong>Vínculo Ativo</strong> será marcado como <strong>Inativo</strong> automaticamente.
            </p>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Encerrando...' : 'Encerrar Vínculo'}
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
