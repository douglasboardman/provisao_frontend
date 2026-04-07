import { Routes, Route, Navigate } from "react-router"
import { AppLayout } from "./components/layout/AppLayout"
import { AuthLayout } from "./components/layout/AuthLayout"

function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthLayout />}>
        {/* Login Page Placeholder */}
        <Route index element={<div className="p-8">Login Form Placeholder</div>} />
      </Route>

      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<div className="p-8">Dashboard Overview</div>} />
        <Route path="pessoas" element={<div className="p-8">Gestão de Pessoas</div>} />
        <Route path="lancamentos" element={<div className="p-8">Lançamentos Financeiros</div>} />
        {/* Mapear demais rotas aqui */}
      </Route>
    </Routes>
  )
}

export default App
