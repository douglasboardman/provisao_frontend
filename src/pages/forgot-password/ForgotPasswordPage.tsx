import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail } from 'lucide-react'
import { authApi } from '../../api/auth'
import { AuthCard } from '../../components/layout/AuthCard'
import { IgrejaSelect } from '../../components/shared/IgrejaSelect'

const schema = z.object({
  email_login: z.string().trim().email('Informe um e-mail válido.'),
  igreja_id: z.string().uuid('Selecione uma igreja.'),
})

type FormData = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(false)

  const {
    register,
    handleSubmit,
    watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email_login: '', igreja_id: '' } })

  async function onSubmit(data: FormData) {
    setError(false)
    try { await authApi.forgotPassword(data); setSent(true) } catch { setError(true) }
  }

  if (sent) {
    return (
      <AuthCard title="E-mail Enviado">
        <p className="text-sm text-white/90">
          Se o e-mail informado estiver cadastrado, você receberá um link para
          redefinir sua senha.
        </p>
        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-white hover:underline">
            Voltar ao login
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Esqueceu sua senha?">
      <p className="mb-6 text-sm text-white/70">
        Informe seu e-mail para receber o link de redefinição.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <IgrejaSelect value={watch('igreja_id')} onChange={(value) => setValue('igreja_id', value, { shouldValidate: true })} />
        {errors.igreja_id && <p className="text-xs text-white/70">{errors.igreja_id.message}</p>}
        {error && <p role="alert" className="text-sm text-white">Não foi possível enviar a solicitação. Tente novamente.</p>}
        <div>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
            />
            <input
              {...register('email_login')}
              placeholder="seu@email.com"
              className="w-full rounded-lg bg-[#4B336E] py-3 pl-10 pr-4 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
          {errors.email_login && (
            <p className="mt-1 text-xs text-white/70">{errors.email_login.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-full py-3 font-semibold text-gray-800 transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#d1d76b' }}
        >
          {isSubmitting ? 'Enviando...' : 'Enviar link'}
        </button>

        <div className="text-center">
          <Link to="/login" className="text-sm text-white hover:underline">
            Voltar ao login
          </Link>
        </div>
      </form>
    </AuthCard>
  )
}
