import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { X, AlertTriangle } from 'lucide-react';
import { usePessoas } from './hooks';
import { Pessoa, PessoaSchema, Sexo, EstadoCivil } from './schema';
import { useGruposFamiliares } from '../grupos-familiares/hooks';
import { AsyncSelect } from '../../components/shared/AsyncSelect';
import { maskCpf, maskPhone } from '../../lib/masks';
import { applyServerErrors } from '../../lib/server-errors';

interface PessoaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Pessoa;
}

/** Campos conhecidos do schema de Pessoa para distribuição de erros por campo */
const PESSOA_FIELDS = Object.keys(PessoaSchema.shape);

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer';
const SELECT_ERROR_CLASS =
  'flex h-10 w-full rounded-md border border-destructive bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer';

const EMPTY_FORM: Partial<Pessoa> = {
  nome_completo: '',
  cpf: '',
  data_nascimento: '',
  sexo: Sexo.MASCULINO,
  estado_civil: undefined,
  email: '',
  telefone_celular: '',
  grupo_familiar_id: '',
};

export function PessoaForm({ open, onOpenChange, initialData }: PessoaFormProps) {
  const { useCreate, useUpdate } = usePessoas();
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Banner de erro geral (erros não mapeados a campos)
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { useList: useGruposList } = useGruposFamiliares();
  const { data: grupos = [], isLoading: isLoadingGrupos } = useGruposList();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    control,
    formState: { errors },
  } = useForm<Pessoa>({
    resolver: zodResolver(PessoaSchema),
    defaultValues: EMPTY_FORM as Pessoa,
  });

  useEffect(() => {
    if (open) {
      setGlobalError(null);
      if (initialData) {
        let dn = initialData.data_nascimento;
        if (dn && dn.includes('T')) dn = dn.split('T')[0];
        reset({ ...EMPTY_FORM, ...initialData, data_nascimento: dn } as Pessoa);
      } else {
        reset(EMPTY_FORM as Pessoa);
      }
    }
  }, [open, initialData, reset]);

  const onSubmit = (data: Pessoa) => {
    setGlobalError(null);

    // Limpa strings opcionais vazias antes de enviar
    const payload = { ...data };
    if (!payload.cpf) delete payload.cpf;
    if (!payload.email) delete payload.email;
    if (!payload.grupo_familiar_id) delete payload.grupo_familiar_id;
    if (!payload.estado_civil) delete payload.estado_civil;
    if (!payload.telefone_celular) delete payload.telefone_celular;

    const handleError = (err: unknown) => {
      const msg = applyServerErrors(err, setError, PESSOA_FIELDS);
      if (msg) setGlobalError(msg);
    };

    if (initialData?.id) {
      updateMutation.mutate(
        { id: initialData.id, payload },
        { onSuccess: () => onOpenChange(false), onError: handleError }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => onOpenChange(false),
        onError: handleError,
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
              {initialData ? 'Editar Pessoa' : 'Nova Pessoa'}
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

              {/* Nome Completo */}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="nome_completo">Nome Completo *</Label>
                <Input
                  id="nome_completo"
                  className={errors.nome_completo ? 'border-destructive' : ''}
                  {...register('nome_completo')}
                />
                {errors.nome_completo && (
                  <p className="text-sm text-destructive">{errors.nome_completo.message}</p>
                )}
              </div>

              {/* CPF */}
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  className={errors.cpf ? 'border-destructive' : ''}
                  {...register('cpf')}
                  onChange={(e) => setValue('cpf', maskCpf(e.target.value))}
                />
                {errors.cpf && (
                  <p className="text-sm text-destructive">{errors.cpf.message}</p>
                )}
              </div>

              {/* Data de Nascimento */}
              <div className="space-y-2">
                <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  className={errors.data_nascimento ? 'border-destructive' : ''}
                  {...register('data_nascimento')}
                />
                {errors.data_nascimento && (
                  <p className="text-sm text-destructive">{errors.data_nascimento.message}</p>
                )}
              </div>

              {/* Sexo */}
              <div className="space-y-2">
                <Label htmlFor="sexo">Sexo *</Label>
                <select
                  id="sexo"
                  className={errors.sexo ? SELECT_ERROR_CLASS : SELECT_CLASS}
                  {...register('sexo')}
                >
                  <option value={Sexo.MASCULINO}>Masculino</option>
                  <option value={Sexo.FEMININO}>Feminino</option>
                </select>
                {errors.sexo && (
                  <p className="text-sm text-destructive">{errors.sexo.message}</p>
                )}
              </div>

              {/* Estado Civil */}
              <div className="space-y-2">
                <Label htmlFor="estado_civil">Estado Civil</Label>
                <select
                  id="estado_civil"
                  className={errors.estado_civil ? SELECT_ERROR_CLASS : SELECT_CLASS}
                  {...register('estado_civil')}
                >
                  <option value="">Selecione...</option>
                  {Object.entries(EstadoCivil).map(([, val]) => (
                    <option key={val} value={val}>
                      {val.charAt(0) + val.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
                {errors.estado_civil && (
                  <p className="text-sm text-destructive">{errors.estado_civil.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  className={errors.email ? 'border-destructive' : ''}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Celular */}
              <div className="space-y-2">
                <Label htmlFor="telefone_celular">Celular</Label>
                <Input
                  id="telefone_celular"
                  className={errors.telefone_celular ? 'border-destructive' : ''}
                  {...register('telefone_celular')}
                  onChange={(e) => setValue('telefone_celular', maskPhone(e.target.value))}
                />
                {errors.telefone_celular && (
                  <p className="text-sm text-destructive">{errors.telefone_celular.message}</p>
                )}
              </div>

              {/* Grupo Familiar */}
              <div className="col-span-2 space-y-2 pt-2 border-t mt-2">
                <Controller
                  control={control}
                  name="grupo_familiar_id"
                  render={({ field }) => (
                    <AsyncSelect
                      label="Grupo Familiar (Opcional)"
                      options={grupos.map((g) => ({ value: g.id!, label: g.nome_familia }))}
                      loading={isLoadingGrupos}
                      error={errors.grupo_familiar_id?.message}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || undefined)}
                    />
                  )}
                />
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
