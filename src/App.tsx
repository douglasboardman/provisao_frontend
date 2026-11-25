import { AccessRequestsPanel } from './pages/configuracoes/AccessRequestsPanel'
import { AutorizacoesFinanceiras } from './pages/secretaria/AutorizacoesFinanceiras'
import { FormularioSenha } from './pages/perfil/FormularioSenha'
import { MinhaContaComum } from './pages/configuracoes/AtuacaoConta'
import { lazy, Suspense } from 'react'
import { useRecurso } from './lib/recursos'
import { ConviteAssinaturaPage, VerificacaoAssinaturaPage } from './pages/assinaturas/PortalAssinaturas'
import { Routes, Route, Navigate } from "react-router"
import { AppLayout } from "./components/layout/AppLayout"
import { AuthLayout } from "./components/layout/AuthLayout"
import { ProtectedRoute } from "./components/shared/ProtectedRoute"
import { LoginPage } from "./pages/login/LoginPage"
import { ForgotPasswordPage } from "./pages/forgot-password/ForgotPasswordPage"
import { SetPasswordPage } from "./pages/set-password/SetPasswordPage"
import { ConfirmAccessPage } from "./pages/confirm-access/ConfirmAccessPage"
import { RegisterPage } from "./pages/register/RegisterPage"
import { SobrePage } from "./pages/sobre/SobrePage"
import { DashboardPage } from "./pages/dashboard/DashboardPage"
import { useAuthStore } from "./stores/auth"
import { Perfil } from "./types/enums"
import { ContasPage } from "./pages/contas/ContasPage"
import { LancamentosPage } from "./pages/lancamentos/LancamentosPage"
import { TipoReceitaPage } from "./pages/tipo-receita/TipoReceitaPage"
import { TipoDespesaPage } from "./pages/tipo-despesa/TipoDespesaPage"
import { CatReceitaPage } from "./pages/cat-receita/CatReceitaPage"
import { CatDespesaPage } from "./pages/cat-despesa/CatDespesaPage"
import { BalancoMensalPage } from "./pages/balanco-mensal/BalancoMensalPage"
import { AcoesPage } from "./pages/acoes/AcoesPage"
import { UsuariosPage } from "./pages/configuracoes/UsuariosPage"
import { MfaPage } from "./pages/configuracoes/MfaPage"

const MinhaAssembleia = lazy(() => import('./pages/secretaria/MinhaAssembleia'))
const PresidenciaAssembleia = lazy(() => import('./pages/secretaria/PresidenciaAssembleia'))
const EditorSecretariaPage = lazy(() => import('./pages/secretaria/editor/EditorSecretariaPage'))
const SecretariaPage = lazy(() => import('./pages/secretaria/SecretariaPage').then(m => ({ default: m.SecretariaPage })))
const PerfilPage = lazy(() => import('./pages/perfil/PerfilPage').then(m => ({ default: m.PerfilPage })))
const OficiaisPage = lazy(() => import('./pages/oficiais/OficiaisPage').then(m => ({ default: m.OficiaisPage })))
const OrgaosPage = lazy(() => import('./pages/orgaos/OrgaosPage').then(m => ({ default: m.OrgaosPage })))
const ConfiguracoesPage = lazy(() => import('./pages/configuracoes/ConfiguracoesPage').then(m => ({ default: m.ConfiguracoesPage })))
const GestaoMembresiaPage = lazy(() => import('./pages/membresia/GestaoMembresiaPage').then(m => ({ default: m.GestaoMembresiaPage })))
const RolMembrosPage = lazy(() => import('./pages/membresia/RolMembrosPage').then(m => ({ default: m.RolMembrosPage })))
const PessoasPage = lazy(() => import('./pages/pessoas/PessoasPage').then(m => ({ default: m.PessoasPage })))
const GruposFamiliaresPage = lazy(() => import('./pages/grupos-familiares/GruposFamiliaresPage').then(m => ({ default: m.GruposFamiliaresPage })))

function OficiaisRoute() {
  const governancaHabilitada = useRecurso('governanca')
  const perfil = useAuthStore((s) => s.user?.perfil)
  if (!governancaHabilitada || !perfil || ![Perfil.ADMINISTRADOR, Perfil.GESTOR, Perfil.SECRETARIO, Perfil.AUDITOR, Perfil.COMUM].includes(perfil)) return <Navigate to="/dashboard" replace />
  return <OficiaisPage />
}

function OrgaosRoute() {
  const orgaosHabilitados = useRecurso('orgaos')
  const governancaHabilitada = useRecurso('governanca')
  const perfil = useAuthStore((s) => s.user?.perfil)
  if (!governancaHabilitada || !orgaosHabilitados || !perfil || ![Perfil.ADMINISTRADOR, Perfil.GESTOR, Perfil.SECRETARIO, Perfil.AUDITOR, Perfil.COMUM].includes(perfil)) return <Navigate to="/dashboard" replace />
  return <OrgaosPage />
}

function SecretariaRoute({ editor = false }: { editor?: boolean }) {
  const secretariaHabilitada = useRecurso('secretaria')
  const perfil = useAuthStore(s => s.user?.perfil)
  if (!secretariaHabilitada || !perfil || ![Perfil.ADMINISTRADOR, Perfil.GESTOR, Perfil.SECRETARIO, Perfil.AUDITOR, Perfil.COMUM].includes(perfil)) return <Navigate to="/dashboard" replace />
  return editor ? <Suspense fallback={<p role="status">Carregando editor…</p>}><EditorSecretariaPage /></Suspense> : <SecretariaPage />
}

function App() {
  const comum = useAuthStore(s => s.user?.perfil === Perfil.COMUM)
  return (
    <Routes>
      <Route path="/minha-assembleia" element={<Suspense fallback={<p>Carregando assembleia…</p>}><MinhaAssembleia/></Suspense>}/>
      <Route path="/assinaturas/convite" element={<ConviteAssinaturaPage />} />
      <Route path="/assinaturas/verificar" element={<VerificacaoAssinaturaPage />} />
      <Route path="/login" element={<AuthLayout />}>
        <Route index element={<LoginPage />} />
      </Route>
      <Route path="/forgot-password" element={<AuthLayout />}>
        <Route index element={<ForgotPasswordPage />} />
      </Route>
      <Route path="/register" element={<AuthLayout />}>
        <Route index element={<RegisterPage />} />
      </Route>
      <Route path="/auth/confirm-access" element={<AuthLayout />}>
        <Route index element={<ConfirmAccessPage />} />
      </Route>
      <Route path="/auth/set-password" element={<AuthLayout />}>
        <Route index element={<SetPasswordPage />} />
      </Route>
      <Route path="/sobre" element={<AuthLayout />}>
        <Route index element={<SobrePage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/assembleia/:reuniao/presidencia" element={<Suspense fallback={<p>Carregando presidência…</p>}><PresidenciaAssembleia/></Suspense>}/>
        <Route path="/secretaria/:contextoId/editor/:entidade/:id" element={<SecretariaRoute editor />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="mfa-obrigatorio" element={<MfaPage />} />
          <Route path="perfil" element={comum ? <section className="surface space-y-3"><h1 className="text-xl font-semibold">Segurança da conta</h1><FormularioSenha/><MfaPage/></section> : <PerfilPage />} />
          <Route path="dashboard" element={comum ? <MinhaContaComum /> : <DashboardPage />} />

          {/* Membresia */}
          <Route path="oficiais" element={<OficiaisRoute />} />
          <Route path="orgaos" element={<OrgaosRoute />} />
          <Route path="secretaria" element={<SecretariaRoute />} />
          <Route path="secretaria/:contextoId/documentos/:documentoId" element={<SecretariaRoute />} />
          <Route path="pessoas" element={<PessoasPage />} />
          <Route path="grupos-familiares" element={<GruposFamiliaresPage />} />
          <Route path="rol-membros" element={<RolMembrosPage />} />
          <Route path="gestao-membresia" element={<GestaoMembresiaPage />} />

          {/* Financeiro */}
          <Route path="contas" element={<ContasPage />} />
          <Route path="lancamentos" element={<LancamentosPage />} />
          <Route path="receitas" element={<TipoReceitaPage />} />
          <Route path="despesas" element={<TipoDespesaPage />} />
          <Route path="balanco-mensal" element={<BalancoMensalPage />} />

          {/* Cadastros */}
          <Route path="cat-receita" element={<CatReceitaPage />} />
          <Route path="cat-despesa" element={<CatDespesaPage />} />
          <Route path="tipo-receita" element={<TipoReceitaPage />} />
          <Route path="tipo-despesa" element={<TipoDespesaPage />} />

          {/* Administração */}
          <Route path="acoes" element={<AcoesPage />} />
          <Route path="solicitacoes-acesso" element={<AccessRequestsPanel />} />
          <Route path="autorizacoes-financeiras" element={<AutorizacoesFinanceiras />} />
          <Route path="usuarios" element={<UsuariosPage />} />
          <Route path="configuracoes" element={<ConfiguracoesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
