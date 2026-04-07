import { Routes, Route, Navigate } from "react-router"
import { AppLayout } from "./components/layout/AppLayout"
import { AuthLayout } from "./components/layout/AuthLayout"
import { ProtectedRoute } from "./components/layout/ProtectedRoute"

import { Login } from "./features/auth/Login"
import { Dashboard } from "./features/dashboard/Dashboard"
import { PessoasList } from "./features/pessoas/PessoasList"
import { LancamentosTable } from "./features/lancamentos/LancamentosTable"

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
        <Route path="grupos-familiares" element={<PlaceholderView title="Grupos Familiares" />} />
        <Route path="vinculos-membresia" element={<PlaceholderView title="Vínculos de Membresia" />} />
        <Route path="relatorios-membresia" element={<PlaceholderView title="Relatórios de Membresia" />} />
        
        {/* FINANCEIRO */}
        <Route path="contas" element={<PlaceholderView title="Contas Financeiras" />} />
        <Route path="lancamentos" element={<LancamentosTable />} />
        <Route path="receitas" element={<PlaceholderView title="Receitas" />} />
        <Route path="despesas" element={<PlaceholderView title="Despesas" />} />
        <Route path="balanco-mensal" element={<PlaceholderView title="Balanço Mensal" />} />
        <Route path="relatorios-financeiro" element={<PlaceholderView title="Relatórios Financeiros" />} />
        
        {/* CADASTROS */}
        <Route path="categoria-receita" element={<PlaceholderView title="Categoria de Receita" />} />
        <Route path="categoria-despesa" element={<PlaceholderView title="Categoria de Despesa" />} />
        <Route path="tipo-receita" element={<PlaceholderView title="Tipo de Receita" />} />
        <Route path="tipo-despesa" element={<PlaceholderView title="Tipo de Despesa" />} />
        
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

