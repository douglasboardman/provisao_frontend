import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Lock, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../stores/auth'
import { ApiRequestError } from '../../api/client'
import { AuthCard } from '../../components/layout/AuthCard'
import { IgrejaSelect } from '../../components/shared/IgrejaSelect'

const loginSchema = z.object({
  login: z.string().trim().email('Informe um e-mail válido.'),
  igreja_id: z.string().uuid('Selecione uma igreja.'),
  senha: z.string().min(1, 'Informe sua senha.'),
})

type LoginForm = z.infer<typeof loginSchema>
const mfaSchema = z.object({
  codigo: z.string().trim().min(1, 'Informe o código de autenticação.')
    .regex(/^(?:\d{6}|[0-9a-f]{24})$/i, 'Use 6 dígitos do autenticador ou 24 caracteres de recuperação (0–9 e A–F), sem espaços ou hífens.'),
})
type MfaForm = z.infer<typeof mfaSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [credentials, setCredentials] = useState<LoginForm | null>(null)
  const mfa = useForm<MfaForm>({ resolver: zodResolver(mfaSchema), defaultValues: { codigo: '' } })

  const {
    register,
    handleSubmit,
    watch, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { login: '', senha: '', igreja_id: '' } })

  async function onSubmit(data: LoginForm) {
    setError(null)
    try {
      const user = await authApi.login(data)
      setAuth(user)
      reset()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err instanceof ApiRequestError && err.statusCode === 401 && err.code === 'MFA_REQUIRED') {
        setCredentials(data)
        reset({ ...data, senha: '' })
        mfa.reset()
        return
      }
      if (err instanceof ApiRequestError) {
        setError(err.messages[0])
      } else {
        setError('Erro ao conectar com o servidor.')
      }
    }
  }

  async function onMfaSubmit({ codigo }: MfaForm) {
    if (!credentials) return
    setError(null)
    try {
      const user = await authApi.login({ ...credentials, mfa_code: codigo })
      setCredentials(null)
      mfa.reset()
      setAuth(user)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.messages[0] : 'Erro ao conectar com o servidor.')
    }
  }

  function voltar() {
    setCredentials(null)
    setError(null)
    setShowPassword(false)
    mfa.reset()
  }

  if (credentials) return (
    <AuthCard title="Autenticação">
      <form onSubmit={mfa.handleSubmit(onMfaSubmit)} className="flex flex-col gap-4">
        <p className="text-sm text-white/80">Informe os 6 dígitos do aplicativo autenticador ou um código de recuperação do ProVisão com 24 caracteres.</p>
        {error && <div role="alert" className="rounded-lg bg-white/10 p-3 text-sm text-white">{error}</div>}
        <div>
          <label htmlFor="mfa-code" className="mb-1 block text-sm text-white/80">Código de autenticação</label>
          <input id="mfa-code" {...mfa.register('codigo')} autoFocus autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} maxLength={24} aria-invalid={!!mfa.formState.errors.codigo} aria-describedby={mfa.formState.errors.codigo ? 'mfa-error' : undefined} className="w-full rounded-lg bg-[#4B336E] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-white/30" />
          {mfa.formState.errors.codigo && <p id="mfa-error" className="mt-1 text-xs text-white/70">{mfa.formState.errors.codigo.message}</p>}
        </div>
        <button type="submit" disabled={mfa.formState.isSubmitting} className="mt-2 w-full rounded-full py-3 font-semibold text-gray-800 transition-opacity hover:opacity-90 disabled:opacity-60" style={{ backgroundColor: '#d1d76b' }}>
          {mfa.formState.isSubmitting ? 'Verificando...' : 'Confirmar código'}
        </button>
        <button type="button" disabled={mfa.formState.isSubmitting} onClick={voltar} className="text-sm text-white hover:underline disabled:opacity-60">Voltar ao login</button>
      </form>
    </AuthCard>
  )

  return (
    <AuthCard title="Log in">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {error && (
          <div role="alert" className="rounded-lg bg-white/10 p-3 text-sm text-white">{error}</div>
        )}

        <IgrejaSelect value={watch('igreja_id')} onChange={(value) => setValue('igreja_id', value, { shouldValidate: true })} />
        {errors.igreja_id && <p className="text-xs text-white/70">{errors.igreja_id.message}</p>}
        {/* E-mail */}
        <div>
          <div className="relative">
            <User
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
            />
            <input
              {...register('login')}
              autoComplete="username"
              placeholder="E-mail"
              className="w-full rounded-lg bg-[#4B336E] py-3 pl-10 pr-4 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
          {errors.login && (
            <p className="mt-1 text-xs text-white/70">{errors.login.message}</p>
          )}
        </div>

        {/* Senha */}
        <div>
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
            />
            <input
              {...register('senha')}
              autoComplete="current-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              className="w-full rounded-lg bg-[#4B336E] py-3 pl-10 pr-10 text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-white/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.senha && (
            <p className="mt-1 text-xs text-white/70">{errors.senha.message}</p>
          )}
        </div>

        {/* Esqueci */}
        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm italic text-white/80 hover:text-white"
          >
            Esqueci minha senha
          </Link>
        </div>

        {/* Botão */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-full py-3 font-semibold text-gray-800 transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#d1d76b' }}
        >
          {isSubmitting ? 'Entrando...' : 'Log in'}
        </button>

        {/* Solicitar cadastro */}
        <div className="text-center">
          <Link to="/register" className="text-sm text-white hover:underline">
            Solicitar Cadastro
          </Link>
        </div>
      </form>
    </AuthCard>
  )
}
