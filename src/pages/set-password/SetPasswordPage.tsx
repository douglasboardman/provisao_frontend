import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../../api/auth'
import { ApiRequestError } from '../../api/client'
import { AuthCard } from '../../components/layout/AuthCard'

const schema = z
  .object({
    nova_senha: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres.'),
    confirmar_senha: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine((d) => d.nova_senha === d.confirmar_senha, {
    message: 'As senhas não coincidem.',
    path: ['confirmar_senha'],
  })

type FormData = z.infer<typeof schema>

function PasswordInput({
  label,
  show,
  onToggle,
  ...inputProps
}: {
  label: string
  show: boolean
  onToggle: () => void
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
      <input
        {...inputProps}
        type={show ? 'text' : 'password'}
        placeholder={label}
        className="w-full rounded-lg bg-[#4B336E] py-3 pl-10 pr-10 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-white/30"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

export function SetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNova, setShowNova] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setError(null)
    try {
      await authApi.setPassword({ token, nova_senha: data.nova_senha })
      setDone(true)
    } catch (err) {
      if (err instanceof ApiRequestError) setError(err.messages[0])
      else setError('Erro ao definir a senha.')
    }
  }

  if (!token) {
    return (
      <AuthCard title="Link Inválido">
        <p className="text-sm text-white/90">
          Link inválido. Solicite um novo link de redefinição.
        </p>
        <div className="mt-6 text-center">
          <Link to="/forgot-password" className="text-sm text-white hover:underline">
            Solicitar novo link
          </Link>
        </div>
      </AuthCard>
    )
  }

  if (done) {
    return (
      <AuthCard title="Senha Definida!">
        <p className="mb-6 text-sm text-white/90">Sua senha foi definida com sucesso.</p>
        <div className="text-center">
          <Link to="/login" className="text-sm text-white hover:underline">
            Ir para o login
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Defina sua senha">
      <p className="mb-6 text-sm text-white/70">
        Escolha uma senha segura com no mínimo 8 caracteres.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-white/10 p-3 text-sm text-white">{error}</div>
        )}

        <div>
          <PasswordInput
            label="Nova senha"
            show={showNova}
            onToggle={() => setShowNova((v) => !v)}
            {...register('nova_senha')}
          />
          {errors.nova_senha && (
            <p className="mt-1 text-xs text-white/70">{errors.nova_senha.message}</p>
          )}
        </div>

        <div>
          <PasswordInput
            label="Confirmar senha"
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            {...register('confirmar_senha')}
          />
          {errors.confirmar_senha && (
            <p className="mt-1 text-xs text-white/70">{errors.confirmar_senha.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-full py-3 font-semibold text-gray-800 transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#d1d76b' }}
        >
          {isSubmitting ? 'Salvando...' : 'Definir senha'}
        </button>
      </form>
    </AuthCard>
  )
}
