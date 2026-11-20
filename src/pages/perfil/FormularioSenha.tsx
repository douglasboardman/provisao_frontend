import { useState, type FormEvent } from 'react'
import { apiClient } from '../../api/client'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { toast } from '../../components/ui/use-toast'
import { useAuthStore } from '../../stores/auth'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'

export function FormularioSenha() {
  const navegar = useNavigate()
  const cache = useQueryClient()
  const [erro, setErro] = useState('')
  const [enviando, enviar] = useState(false)
  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const dados = new FormData(e.currentTarget)
    if (dados.get('nova') !== dados.get('confirmacao')) {
      setErro('A confirmação deve ser igual à nova senha.')
      return
    }
    enviar(true)
    setErro('')
    try {
      await apiClient.post('auth/alterar-senha', {
        senha_atual: dados.get('atual'),
        nova_senha: dados.get('nova'),
      })
      useAuthStore.setState({ user: null, status: 'ready' })
      cache.clear()
      navegar('/login', { replace: true })
      toast({ title: 'Senha alterada. Entre novamente.' })
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao alterar a senha.')
      enviar(false)
    }
  }
  return (
    <form className="max-w-md space-y-3" onSubmit={salvar}>
      <label className="block text-sm font-medium">
        Senha atual
        <Input type="password" name="atual" autoComplete="current-password" required />
      </label>
      <label className="block text-sm font-medium">
        Nova senha
        <Input type="password" name="nova" autoComplete="new-password" minLength={8} required />
      </label>
      <label className="block text-sm font-medium">
        Confirmar nova senha
        <Input type="password" name="confirmacao" autoComplete="new-password" required />
      </label>
      <p className="text-sm text-muted-foreground">
        Use pelo menos oito caracteres. Após a alteração, entre novamente nos dispositivos conectados.
      </p>
      {erro && <p role="alert">{erro}</p>}
      <Button disabled={enviando}>{enviando ? 'Salvando…' : 'Alterar senha'}</Button>
    </form>
  )
}
