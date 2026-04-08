import { AxiosError } from 'axios';
import { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';

/**
 * Parseia a resposta de erro 400 do NestJS (formato nestjs-zod ou class-validator)
 * e distribui os erros pelos campos do formulário via setError.
 *
 * @returns Uma mensagem geral caso não haja campos específicos mapeados, ou null.
 */
export function applyServerErrors<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  fieldNames: string[]
): string | null {
  if (!(err instanceof AxiosError) || !err.response) {
    return 'Erro de conexão. Verifique sua rede e tente novamente.';
  }

  const { status, data: body } = err.response;

  if (status === 400) {
    let errors: { field: string; message: string }[] = [];

    // Formato nestjs-zod: { errors: [ { path: ['campo'], message: '...' } ] }
    if (Array.isArray(body?.errors)) {
      errors = body.errors.map((e: any) => ({
        field: Array.isArray(e.path) ? (e.path[0] ?? 'root') : 'root',
        message: e.message ?? 'Valor inválido.',
      }));
    }
    // Formato class-validator: { message: ['campo deve ser...'] }
    else if (Array.isArray(body?.message)) {
      return body.message.join('. ');
    } else if (typeof body?.message === 'string') {
      return body.message;
    }

    let hasFieldError = false;
    errors.forEach(({ field, message }) => {
      if (field !== 'root' && fieldNames.includes(field)) {
        setError(field as FieldPath<T>, { type: 'server', message });
        hasFieldError = true;
      }
    });

    if (!hasFieldError) {
      return errors.map((e) => e.message).join('. ') || 'Erro de validação.';
    }
    return null;
  }

  if (status === 409) {
    // Violação de unique constraint — o backend agora retorna mensagem descritiva
    return body?.message ?? 'Conflito: já existe um registro com esses dados.';
  }

  if (status === 403) {
    return 'Você não tem permissão para realizar esta ação.';
  }

  return body?.message ?? `Erro ${status} ao salvar.`;
}
