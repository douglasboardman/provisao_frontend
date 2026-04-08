import { useState } from "react"
import { useNavigate } from "react-router"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion } from "framer-motion"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAuthStore, type AuthUser } from "@/stores/useAuthStore"
import { api, extractApiErrorMessage } from "@/lib/api"
import logoVertical from "@/assets/logo/vertical.png"

const loginSchema = z.object({
  login: z.string().min(1, { message: "Informe seu e-mail ou nome de usuário" }),
  senha: z.string().min(1, { message: "Informe sua senha" }),
})

type LoginForm = z.infer<typeof loginSchema>

export function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    setServerError(null)
    try {
      // 1. Autentica e obtém o access_token
      const { data: loginResp } = await api.post<{ access_token: string }>("/auth/login", {
        login: data.login,
        senha: data.senha,
      })

      // 2. Persiste o token antes do próximo request — o interceptor
      //    vai usar ele no header Authorization do /auth/profile
      login(loginResp.access_token, {} as AuthUser)

      // 3. Hidrata o usuário logado a partir do payload do JWT
      const { data: profile } = await api.get<AuthUser>("/auth/profile")
      login(loginResp.access_token, profile)

      navigate("/dashboard")
    } catch (err) {
      setServerError(extractApiErrorMessage(err, "Não foi possível autenticar. Tente novamente."))
      useAuthStore.getState().logout()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center space-y-6"
    >
      <img src={logoVertical} alt="ProVisão" className="h-32 mb-4 object-contain mx-auto" />

      <div className="flex flex-col space-y-2 text-center w-full">
        <h1 className="text-2xl font-semibold tracking-tight text-text-main font-heading">
          Acesso ao Sistema
        </h1>
        <p className="text-sm text-text-sub">
          Insira suas credenciais corporativas
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login">E-mail ou usuário</Label>
            <Input
              id="login"
              type="text"
              placeholder="seu@email.com"
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect="off"
              disabled={isLoading}
              className={errors.login ? "border-despesa focus-visible:ring-despesa" : ""}
              {...register("login")}
            />
            {errors.login && (
              <p className="text-xs text-despesa">{errors.login.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="senha">Senha</Label>
              <a href="#" className="font-semibold text-sm text-purple hover:text-purple-light transition-colors">Esqueceu sua senha?</a>
            </div>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              disabled={isLoading}
              className={errors.senha ? "border-despesa focus-visible:ring-despesa" : ""}
              {...register("senha")}
            />
            {errors.senha && (
              <p className="text-xs text-despesa">{errors.senha.message}</p>
            )}
          </div>
        </div>

        {serverError && (
          <div className="rounded-md border border-despesa/30 bg-despesa/5 px-3 py-2 text-sm text-despesa">
            {serverError}
          </div>
        )}

        <Button className="w-full bg-purple hover:bg-purple-light text-white font-semibold transition-all mt-4" disabled={isLoading} type="submit">
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
            />
          ) : "Entrar de Forma Segura"}
        </Button>
      </form>
    </motion.div>
  )
}
