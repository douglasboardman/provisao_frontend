import { useNavegacao } from '../../hooks/use-navegacao'
import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '../../stores/auth'

const rotas: Record<string, string[]> = {
  '/orgaos': ['orgaos'], '/oficiais': ['oficiais'], '/secretaria': ['secretaria'],
  '/pessoas': ['pessoas', 'grupos-familiares'], '/grupos-familiares': ['grupos-familiares'],
  '/rol-membros': ['eventos-membresia'], '/gestao-membresia': ['eventos-membresia'],
  '/contas': ['contas'], '/lancamentos': ['lancamentos'], '/receitas': ['receitas'], '/despesas': ['despesas'],
  '/tipo-receita': ['receitas'], '/tipo-despesa': ['despesas'],
  '/cat-receita': ['cat-receita'], '/cat-despesa': ['cat-despesa'], '/balanco-mensal': ['balanco-mensal'],
  '/acoes': ['acoes'],
  '/usuarios': ['usuarios', 'solicitacoes-acesso'], '/solicitacoes-acesso': ['solicitacoes-acesso'],
  '/autorizacoes-financeiras': ['autorizacoes-financeiras'],
  '/perfis-atuacao': ['perfis-atuacao'],
  '/configuracoes': ['igreja', 'regras-relacao-enum', 'profissoes', 'logs', 'autorizacoes-financeiras', 'campos-secretaria'],
}

function RotaDaContaComum({ pathname }: { pathname: string }) {
  const navegacao = useNavegacao()
  const caminho = '/' + (pathname.split('/').filter(Boolean)[0] ?? '')
  if (navegacao.isPending) return <p>Consultando acessos…</p>
  if (!rotas[caminho]?.some(modulo => navegacao.data?.permissoes[modulo]?.includes('view') ||
    modulo === 'pessoas' && navegacao.data?.permissoes.pessoas?.includes('create')))
    return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export function ProtectedRoute() {
  const location = useLocation()
  const status = useAuthStore(s => s.status)
  const user = useAuthStore(s => s.user)
  const restore = useAuthStore(s => s.restore)
  useEffect(() => { void restore() }, [restore])
  if (status !== 'ready') return <p>Verificando sessão...</p>
  if (!user) return <Navigate to="/login" replace />
  if (user.mfa_enrollment_required && location.pathname !== '/mfa-obrigatorio') return <Navigate to="/mfa-obrigatorio" replace />
  if (user.perfil === 'COMUM' && !['/', '/dashboard', '/perfil', '/mfa-obrigatorio'].includes(location.pathname))
    return <RotaDaContaComum pathname={location.pathname} />
  return <Outlet />
}
