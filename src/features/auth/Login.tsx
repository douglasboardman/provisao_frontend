import { useState } from "react"
import { useNavigate } from "react-router"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion } from "framer-motion"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/stores/useAuthStore"
import logoVertical from "@/assets/logo/vertical.png"

const loginSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
  password: z.string().min(4, { message: "Senha deve conter no mínimo 4 caracteres" }),
})

type LoginForm = z.infer<typeof loginSchema>

export function Login() {
  const [isLoading, setIsLoading] = useState(false)
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
    // Simulação MOCK da API de Login
    setTimeout(() => {
      login("mock-jwt-token-12345", {
        id: "1",
        email: data.email,
        name: data.email.split("@")[0].toUpperCase(),
        role: "ADMIN"
      })
      navigate("/dashboard")
      setIsLoading(false)
    }, 1200)
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
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              className={errors.email ? "border-despesa focus-visible:ring-despesa" : ""}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-despesa">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <a href="#" className="font-semibold text-sm text-purple hover:text-purple-light transition-colors">Esqueceu sua senha?</a>
            </div>
            <Input
              id="password"
              type="password"
              disabled={isLoading}
              className={errors.password ? "border-despesa focus-visible:ring-despesa" : ""}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-despesa">{errors.password.message}</p>
            )}
          </div>
        </div>

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
