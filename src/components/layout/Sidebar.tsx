import { Home, Users, ArrowRightLeft, FileSpreadsheet, Settings, Building2, Tag, KeySquare, Calculator } from "lucide-react"
import { NavLink } from "react-router"
import { cn } from "@/lib/utils"

const navItems = [
  { group: "Acesso Rápido" },
  { path: "/dashboard", icon: Home, label: "Dashboard" },
  { group: "Operacional" },
  { path: "/pessoas", icon: Users, label: "Pessoas" },
  { path: "/acoes", icon: FileSpreadsheet, label: "Ações" },
  { path: "/lancamentos", icon: ArrowRightLeft, label: "Lançamentos" },
  { group: "Cadastros Base" },
  { path: "/grupos-familiares", icon: Building2, label: "Grupos Familiares" },
  { path: "/categorias", icon: Tag, label: "Categorias" },
  { path: "/tipos", icon: Calculator, label: "Tipos" },
  { path: "/contas", icon: KeySquare, label: "Contas" },
  { group: "Sistema" },
  { path: "/configuracoes", icon: Settings, label: "Configurações" }
]

export function Sidebar() {
  return (
    <aside className="w-[280px] bg-sidebar flex-shrink-0 flex flex-col h-full text-white/90 overflow-y-auto">
      <div className="p-6 h-20 flex items-center">
        {/* Logo Placeholder */}
        <h1 className="font-heading font-bold text-2xl tracking-tight text-white flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-lime flex items-center justify-center text-sidebar">
            <Calculator size={18} strokeWidth={2.5} />
          </div>
          ProVisão
        </h1>
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

      {/* Perfil Mini */}
      <div className="p-4 border-t border-purple-light/20">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10">
          <div className="w-9 h-9 rounded-full bg-purple-light flex items-center justify-center text-sm font-bold shadow-sm">
            DB
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold truncate w-[130px] font-sans">Douglas</span>
            <span className="text-xs text-purple-muted truncate w-[130px] font-sans">Administrador</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
