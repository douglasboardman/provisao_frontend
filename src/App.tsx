import { Routes, Route, Navigate } from "react-router"
import { AppLayout } from "./components/layout/AppLayout"
import { AuthLayout } from "./components/layout/AuthLayout"
import { ProtectedRoute } from "./components/layout/ProtectedRoute"

import { Login } from "./features/auth/Login"
import { Dashboard } from "./features/dashboard/Dashboard"
import { PessoasList } from "./features/pessoas/PessoasList"
import { GruposFamiliaresList } from "./features/grupos-familiares/GruposFamiliaresList"
import { VinculosList } from "./features/vinculos-membresia/VinculosList"
import { RelatoriosMembresia } from "./features/pessoas/RelatoriosMembresia"
import { CategoriaList } from "./features/cadastros-basicos/CategoriaList"
import { TipoLancamentoList } from "./features/cadastros-basicos/TipoLancamentoList"
import { ContasList } from "./features/contas/ContasList"
import { LancamentosTable } from "./features/lancamentos/LancamentosList"
import { AcoesList } from "./features/acoes/AcoesList"
import { UsuariosList } from "./features/usuarios/UsuariosList"
import { ConfiguracoesIgreja } from "./features/configuracoes/ConfiguracoesIgreja"

// Placeholders for non-implemented views
const PlaceholderView = ({ title }: { title: string }) => (
  <div className="flex h-[50vh] flex-col items-center justify-center p-8 text-center animate-pulse">
    <div className="rounded-full bg-muted p-4 mb-4">
      <div className="w-8 h-8 flex items-center justify-center font-bold text-muted-foreground text-xl">?</div>
    </div>
    <h2 className="text-xl font-semibold mb-2 font-heading">{title}</h2>
    <p className="text-muted-foreground">Esta visão está em fase de estruturação e será entregue na próxima rodada arquitetural.</p>
  </div>
)

function App() {
  return (
    <Routes>
      {/* Público / Autenticação */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<PlaceholderView title="Registro" />} />
        <Route path="/forgot-password" element={<PlaceholderView title="Recuperação de Senha" />} />
      </Route>

      {/* Áreas Protegidas (Requer JWT) */}
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* MEMBRESIA */}
        <Route path="pessoas" element={<PessoasList />} />
        <Route path="pessoas/novo" element={<PlaceholderView title="Cadastro de Pessoa" />} />
        <Route path="pessoas/:id" element={<PlaceholderView title="Detalhes da Pessoa" />} />
        <Route path="grupos-familiares" element={<GruposFamiliaresList />} />
        <Route path="vinculos-membresia" element={<VinculosList />} />
        <Route path="relatorios-membresia" element={<RelatoriosMembresia />} />
        
        {/* FINANCEIRO */}
        <Route path="contas" element={<ContasList />} />
        <Route path="lancamentos" element={<LancamentosTable />} />
        
        <Route path="acoes" element={<AcoesList />} />
        <Route path="usuarios" element={<UsuariosList />} />
        <Route path="configuracoes" element={<ConfiguracoesIgreja />} />
        <Route path="receitas" element={<PlaceholderView title="Receitas" />} />
        <Route path="despesas" element={<PlaceholderView title="Despesas" />} />
        <Route path="balanco-mensal" element={<PlaceholderView title="Balanço Mensal" />} />
        <Route path="relatorios-financeiro" element={<PlaceholderView title="Relatórios Financeiros" />} />
        
        {/* CADASTROS */}
        <Route path="cat-receita" element={<CategoriaList tipo="receita" />} />
        <Route path="cat-despesa" element={<CategoriaList tipo="despesa" />} />
        <Route path="receitas" element={<TipoLancamentoList tipo="receita" />} />
        <Route path="despesas" element={<TipoLancamentoList tipo="despesa" />} />
        
        {/* ADMINISTRAÇÃO */}
        <Route path="acoes" element={<PlaceholderView title="Ações" />} />
        <Route path="usuarios" element={<PlaceholderView title="Usuários" />} />
        <Route path="logs" element={<PlaceholderView title="Logs do Sistema" />} />
        <Route path="configuracoes" element={<PlaceholderView title="Configurações do Sistema" />} />
      </Route>
      
      {/* 404 Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App

