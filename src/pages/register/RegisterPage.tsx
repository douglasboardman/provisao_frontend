import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Mail, CheckCircle2 } from 'lucide-react'
import { authApi } from '../../api/auth'
import { igrejaApi } from '../../api/igreja'
import { ApiRequestError } from '../../api/client'
import { AuthCard } from '../../components/layout/AuthCard'

const registerSchema = z.object({
  nome_usuario: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres.'),
  email_login: z.string().trim().email('Informe um e-mail válido.'),
  igreja_id: z.string().uuid('Selecione uma igreja.'),
})

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { data: igrejas, isLoading: loadingIgrejas } = useQuery({
    queryKey: ['igrejas-cadastro'],
    queryFn: igrejaApi.listForRegistration,
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { nome_usuario: '', email_login: '', igreja_id: '' },
  })

  async function onSubmit(data: RegisterForm) {
    setError(null)
    try {
      await authApi.register(data)
      setSuccess(true)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.messages[0])
      } else {
        setError('Erro ao conectar com o servidor.')
      }
    }
  }

  if (success) {
    return (
      <AuthCard title="Cadastro Solicitado!">
        <div className="flex flex-col items-center gap-6 py-4">
          <CheckCircle2 size={56} style={{ color: '#d1d76b' }} />
          <p className="text-center text-sm text-white/90">
            Se os dados puderem ser processados, enviaremos um link para confirmar seu e-mail. Após a confirmação, a solicitação seguirá para análise.
          </p>
          <Link to="/login">
            <button
              className="rounded-full px-8 py-3 font-semibold text-gray-800 hover:opacity-90"
              style={{ backgroundColor: '#d1d76b' }}
            >
              Voltar para o Login
            </button>
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Solicitar Cadastro">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-white/10 p-3 text-sm text-white">{error}</div>
        )}

        {/* Nome */}
        <div>
          <div className="relative">
            <User
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
            />
            <input
              {...register('nome_usuario')}
              placeholder="Nome de Usuário"
              className="w-full rounded-lg bg-[#4B336E] py-3 pl-10 pr-4 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
          {errors.nome_usuario && (
            <p className="mt-1 text-xs text-white/70">{errors.nome_usuario.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
            />
            <input
              {...register('email_login')}
              type="email"
              placeholder="E-mail"
              className="w-full rounded-lg bg-[#4B336E] py-3 pl-10 pr-4 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
          {errors.email_login && (
            <p className="mt-1 text-xs text-white/70">{errors.email_login.message}</p>
          )}
        </div>

        {/* Igreja */}
        <div>
          <select
            value={watch('igreja_id')}
            onChange={(e) => setValue('igreja_id', e.target.value)}
            disabled={loadingIgrejas}
            className="w-full appearance-none rounded-lg bg-[#4B336E] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50"
            style={{ colorScheme: 'dark' }}
          >
            <option value="" disabled style={{ background: '#4B336E' }}>
              {loadingIgrejas ? 'Carregando...' : igrejas?.length === 0 ? 'Nenhuma igreja disponível para cadastro' : 'Selecione sua igreja'}
            </option>
            {igrejas?.map((i) => (
              <option key={i.id} value={i.id} style={{ background: '#4B336E' }}>
                {i.nome}
              </option>
            ))}
          </select>
          {errors.igreja_id && (
            <p className="mt-1 text-xs text-white/70">{errors.igreja_id.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !igrejas?.length}
          className="mt-2 w-full rounded-full py-3 font-semibold text-gray-800 transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#d1d76b' }}
        >
          {isSubmitting ? 'Enviando...' : 'Solicitar Cadastro'}
        </button>

        <div className="text-center">
          <Link to="/login" className="text-sm text-white hover:underline">
            Já tem uma conta? Faça login
          </Link>
        </div>
      </form>
    </AuthCard>
  )
}
