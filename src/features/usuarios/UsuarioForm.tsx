import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { X, AlertTriangle } from 'lucide-react';
import { useUsuarios } from './hooks';
import { Usuario, UsuarioSchema } from './schemas';
import { applyServerErrors } from '../../lib/server-errors';

interface UsuarioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Usuario;
}

export function UsuarioForm({ open, onOpenChange, initialData }: UsuarioFormProps) {
  const { useCreate, useUpdate } = useUsuarios();
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, setError, formState: { errors } } = useForm<Usuario>({
    resolver: zodResolver(UsuarioSchema),
    defaultValues: { 
      nome_usuario: '',
      email_login: '',
      senha_hash: '',
      perfil: 'OPERADOR',
      ativo: true,
    }
  });

  useEffect(() => {
    if (open) {
      setGlobalError(null);
      if (initialData) {
        reset({ ...initialData, senha_hash: '' });
      } else {
        reset({ 
          nome_usuario: '',
          email_login: '',
          senha_hash: '',
          perfil: 'OPERADOR',
          ativo: true,
        });
      }
    }
  }, [open, initialData, reset]);

  const onSubmit = (data: Usuario) => {
    setGlobalError(null);
    const payload = { ...data };
    if (!payload.senha_hash) delete payload.senha_hash;

    const handleError = (err: unknown) => {
      const msg = applyServerErrors(err, setError, ['nome_usuario', 'email_login', 'senha_hash', 'perfil', 'ativo']);
      if (msg) setGlobalError(msg);
    };

    if (initialData?.id) {
      updateMutation.mutate({ id: initialData.id, payload }, { onSuccess: () => onOpenChange(false), onError: handleError });
    } else {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false), onError: handleError });
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg">
          <div className="flex flex-col space-y-1.5 mb-4 border-b pb-4">
            <Dialog.Title className="text-xl font-semibold leading-none tracking-tight">
              {initialData ? 'Editar Usuário' : 'Novo Usuário'}
            </Dialog.Title>
          </div>

          {globalError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3 mb-4 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>{globalError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="nome_usuario">Nome Completo *</Label>
                <Input id="nome_usuario" {...register('nome_usuario')} placeholder="João da Silva" />
                {errors.nome_usuario && <p className="text-sm text-destructive">{errors.nome_usuario.message}</p>}
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="email_login">E-mail (Login) *</Label>
                <Input id="email_login" type="email" {...register('email_login')} placeholder="joao@igreja.com" />
                {errors.email_login && <p className="text-sm text-destructive">{errors.email_login.message}</p>}
              </div>

              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label htmlFor="senha_hash">Senha {initialData ? '(Opcional para edição)' : '*'}</Label>
                <Input id="senha_hash" type="password" {...register('senha_hash')} placeholder={initialData ? "Deixe em branco para manter" : "Mínimo 6 caracteres"} />
                {errors.senha_hash && <p className="text-sm text-destructive">{errors.senha_hash.message}</p>}
              </div>

              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label htmlFor="perfil">Perfil de Acesso *</Label>
                <select 
                  id="perfil"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer"
                  {...register('perfil')}
                >
                  <option value="ADMINISTRADOR">Administrador</option>
                  <option value="GESTOR">Gestor</option>
                  <option value="TESOUREIRO">Tesoureiro</option>
                  <option value="SECRETARIO">Secretário</option>
                  <option value="OPERADOR">Operador</option>
                  <option value="AUDITOR">Auditor</option>
                </select>
                {errors.perfil && <p className="text-sm text-destructive">{errors.perfil.message}</p>}
              </div>

              <div className="flex items-center space-x-2 col-span-2 mt-2 bg-muted p-3 rounded-lg">
                <Controller
                  control={control}
                  name="ativo"
                  render={({ field }) => (
                    <input 
                      id="ativo"
                      type="checkbox"
                      className="h-4 w-4 ml-2 accent-primary cursor-pointer"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  )}
                />
                <Label htmlFor="ativo" className="cursor-pointer">
                  Acesso Liberado (Ativo)
                </Label>
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

          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none cursor-pointer">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
