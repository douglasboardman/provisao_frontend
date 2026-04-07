import { 
  Home, Users, Building2, Link, FileText, 
  Wallet, ArrowRightLeft, TrendingUp, TrendingDown, Calculator, 
  Tag, Tags, ListPlus, ListMinus, 
  Target, UserCog, History, Settings, LogOut 
} from "lucide-react"
import { NavLink, useNavigate } from "react-router"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/useAuthStore"
import logoImg from "@/assets/logo/horizontal.png"

const navItems = [
  { path: "/dashboard", icon: Home, label: "Dashboard", roles: ["ADMIN", "GESTOR", "TESOUREIRO", "OPERADOR", "AUDITOR", "SECRETARIO"] },
  
  { group: "Membresia" },
  { path: "/pessoas", icon: Users, label: "Pessoas", roles: ["ADMIN", "GESTOR", "TESOUREIRO", "OPERADOR", "AUDITOR", "SECRETARIO"] },
  { path: "/grupos-familiares", icon: Building2, label: "Grupos Familiares", roles: ["ADMIN", "GESTOR", "TESOUREIRO", "OPERADOR", "AUDITOR", "SECRETARIO"] },
  { path: "/vinculos-membresia", icon: Link, label: "Vínculos de Membresia", roles: ["ADMIN", "GESTOR", "TESOUREIRO", "OPERADOR", "AUDITOR", "SECRETARIO"] },
  { path: "/relatorios-membresia", icon: FileText, label: "Relatórios", roles: ["ADMIN", "GESTOR", "AUDITOR", "SECRETARIO"] },
  
  { group: "Financeiro" },
  { path: "/contas", icon: Wallet, label: "Contas", roles: ["ADMIN", "GESTOR", "TESOUREIRO", "OPERADOR", "AUDITOR", "SECRETARIO"] },
  { path: "/lancamentos", icon: ArrowRightLeft, label: "Lançamentos", roles: ["ADMIN", "GESTOR", "TESOUREIRO", "OPERADOR", "AUDITOR", "SECRETARIO"] },
  { path: "/receitas", icon: TrendingUp, label: "Receitas", roles: ["ADMIN", "GESTOR", "TESOUREIRO", "OPERADOR", "AUDITOR", "SECRETARIO"] },
  { path: "/despesas", icon: TrendingDown, label: "Despesas", roles: ["ADMIN", "GESTOR", "TESOUREIRO", "OPERADOR", "AUDITOR", "SECRETARIO"] },
  { path: "/balanco-mensal", icon: Calculator, label: "Balanço Mensal", roles: ["ADMIN", "GESTOR", "TESOUREIRO", "AUDITOR"] },
  { path: "/relatorios-financeiro", icon: FileText, label: "Relatórios", roles: ["ADMIN", "GESTOR", "TESOUREIRO", "AUDITOR"] },

  { group: "Cadastros" },
  { path: "/categoria-receita", icon: Tag, label: "Categoria Receita", roles: ["ADMIN", "GESTOR", "TESOUREIRO", "OPERADOR", "AUDITOR", "SECRETARIO"] },
  { path: "/categoria-despesa", icon: Tags, label: "Categoria Despesa", roles: ["ADMIN", "GESTOR", "TESOUREIRO", "OPERADOR", "AUDITOR", "SECRETARIO"] },
  { path: "/tipo-receita", icon: ListPlus, label: "Tipo Receita", roles: ["ADMIN", "GESTOR", "TESOUREIRO", "OPERADOR", "AUDITOR", "SECRETARIO"] },
  { path: "/tipo-despesa", icon: ListMinus, label: "Tipo Despesa", roles: ["ADMIN", "GESTOR", "TESOUREIRO", "OPERADOR", "AUDITOR", "SECRETARIO"] },

  { group: "Administração" },
  { path: "/acoes", icon: Target, label: "Ações", roles: ["ADMIN", "GESTOR", "TESOUREIRO", "OPERADOR", "AUDITOR", "SECRETARIO"] },
  { path: "/usuarios", icon: UserCog, label: "Usuários", roles: ["ADMIN", "GESTOR", "AUDITOR"] },
  { path: "/logs", icon: History, label: "Logs", roles: ["ADMIN", "AUDITOR"] },
  { path: "/configuracoes", icon: Settings, label: "Configurações", roles: ["ADMIN"] }
]

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const roleLabels: Record<string, string> = {
    ADMIN: "Administrador",
    GESTOR: "Gestor",
    TESOUREIRO: "Tesoureiro",
    OPERADOR: "Operador",
    AUDITOR: "Auditor",
    SECRETARIO: "Secretário"
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <aside className="w-[280px] bg-sidebar flex-shrink-0 flex flex-col h-full text-white/90 overflow-y-auto">
      <div className="p-6 py-8 flex items-center justify-center">
        <img src={logoImg} alt="ProVisão" className="w-full max-w-[200px] object-contain mix-blend-screen" />
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item, i) => {
          if (item.group) {
            return (
              <div key={i} className="pt-6 pb-2 px-2 text-xs font-semibold uppercase tracking-wider text-purple-muted/60 font-sans">
                {item.group}
              </div>
            )
          }

          if (item.roles && user && !item.roles.includes(user.role)) {
             return null;
          }

          const Icon = item.icon!
          return (
            <NavLink
              key={item.path}
              to={item.path!}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-sans",
                  isActive 
                    ? "bg-purple-light/40 text-white font-semibold shadow-sm" 
                    : "text-purple-muted hover:bg-white/5 hover:text-white"
                )
              }
            >
              <Icon size={18} strokeWidth={2} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* Perfil */}
      <div className="p-4 border-t border-purple-light/20 flex flex-col gap-2">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10">
          <div className="w-9 h-9 rounded-full bg-lime text-sidebar flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0">
            {user?.name?.substring(0, 2).toUpperCase() || 'PV'}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-semibold truncate font-sans text-white">{user?.name || 'Sistema'}</span>
            <span className="text-xs text-lime truncate font-sans font-medium">{user?.role ? roleLabels[user.role] : 'Guest'}</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-purple-muted hover:text-white hover:bg-white/10 rounded-md transition-colors" title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
