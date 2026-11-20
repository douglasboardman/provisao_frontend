import {
  Home, Users, UsersRound, BookUser, IdCard,
  Landmark, ArrowRightLeft, TrendingUp, TrendingDown, Scale,
  Sprout, UserCog, Settings, LogOut,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { oficiaisApi } from "../../api/oficiais"
import { NavLink, useNavigate } from "react-router"
import logo from "../../assets/logo-assinatura-horizontal.png"
import { cn } from "@/lib/utils"
import { useAuthStore } from "../../stores/auth"
import { canAccessModule, type Module } from "../../lib/permissions"
import type { LucideIcon } from "lucide-react"
import { Perfil } from "../../types/enums"
import { useRecurso } from "../../lib/recursos"

type NavGroup = { kind: "group"; label: string }
type NavItem = { kind: "item"; path: string; icon: LucideIcon; label: string; modules?: Module[] }
type NavEntry = NavGroup | NavItem

const navEntries: NavEntry[] = [
  { kind: "item", path: "/dashboard", icon: Home, label: "Dashboard" },

  { kind: "group", label: "Membresia" },
  { kind: "item", path: "/oficiais", icon: IdCard, label: "Oficiais" },
  { kind: "item", path: "/orgaos", icon: Landmark, label: "Órgãos e unidades" },
  { kind: "item", path: "/secretaria", icon: BookUser, label: "Secretaria", modules: ["secretaria"] },
  { kind: "item", path: "/pessoas", icon: Users, label: "Pessoas", modules: ["pessoas"] },
  { kind: "item", path: "/grupos-familiares", icon: UsersRound, label: "Grupos Familiares", modules: ["grupos-familiares"] },
  { kind: "item", path: "/rol-membros", icon: BookUser, label: "Rol de Membros", modules: ["eventos-membresia"] },
  { kind: "item", path: "/gestao-membresia", icon: IdCard, label: "Gestão de Membresia", modules: ["eventos-membresia"] },

  { kind: "group", label: "Financeiro" },
  { kind: "item", path: "/contas", icon: Landmark, label: "Contas", modules: ["contas"] },
  { kind: "item", path: "/lancamentos", icon: ArrowRightLeft, label: "Lançamentos", modules: ["lancamentos"] },
  { kind: "item", path: "/balanco-mensal", icon: Scale, label: "Balanço Mensal", modules: ["lancamentos"] },

  { kind: "group", label: "Cadastros" },
  { kind: "item", path: "/cat-receita", icon: TrendingUp, label: "Receitas", modules: ["cat-receita"] },
  { kind: "item", path: "/cat-despesa", icon: TrendingDown, label: "Despesas", modules: ["cat-despesa"] },
  { kind: "item", path: "/acoes", icon: Sprout, label: "Ações", modules: ["acoes"] },

  { kind: "group", label: "Administração" },
  { kind: "item", path: "/usuarios", icon: UserCog, label: "Usuários", modules: ["usuarios"] },
  { kind: "item", path: "/configuracoes", icon: Settings, label: "Configurações", modules: ["igreja", "logs"] },
]

const PERFIL_LABELS: Record<Perfil, string> = {
  [Perfil.ADMINISTRADOR]: "Administrador",
  [Perfil.AUDITOR]: "Auditor",
  [Perfil.OPERADOR]: "Operador",
  [Perfil.SECRETARIO]: "Secretário",
  [Perfil.TESOUREIRO]: "Tesoureiro",
  [Perfil.GESTOR]: "Gestor",
}

function filterNav(entries: NavEntry[], perfil: Perfil): NavEntry[] {
  const filtered: NavEntry[] = []

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    if (entry.kind === "group") {
      const nextItems: NavItem[] = []
      for (let j = i + 1; j < entries.length && entries[j].kind === "item"; j++) {
        nextItems.push(entries[j] as NavItem)
      }
      const hasVisible = nextItems.some(
        (item) => !item.modules || item.modules.some((m) => canAccessModule(perfil, m)),
      )
      if (hasVisible) filtered.push(entry)
    } else {
      if (!entry.modules || entry.modules.some((m) => canAccessModule(perfil, m))) {
        filtered.push(entry)
      }
    }
  }

  return filtered
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((s) => s.user)
  const governanca = useRecurso('governanca')
  const orgaos = useRecurso('orgaos')
  const secretaria = useRecurso('secretaria')
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const perfil = user?.perfil ?? Perfil.OPERADOR
  const identidade = `${user?.igreja_id ?? ''}:${user?.sub ?? ''}`
  const notificacoes = useQuery({ queryKey: ['oficiais', identidade, 'notificacoes'], queryFn: oficiaisApi.notificacoes,
    enabled: governanca && !!user && !user.mfa_enrollment_required && [Perfil.ADMINISTRADOR, Perfil.GESTOR, Perfil.SECRETARIO].includes(perfil), refetchInterval: 60_000 })
  const pendentes = notificacoes.data?.filter(item => !item.lido_em).length ?? 0
  const acessoInstitucional = [Perfil.ADMINISTRADOR, Perfil.GESTOR, Perfil.SECRETARIO, Perfil.AUDITOR].includes(perfil)
  const liberados: Record<string, boolean> = {
    '/oficiais': governanca && acessoInstitucional,
    '/orgaos': governanca && orgaos && acessoInstitucional,
    '/secretaria': secretaria,
  }
  const visibleEntries = filterNav(navEntries.filter(entry => entry.kind === 'group' || liberados[entry.path] !== false), perfil)

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "?"

  async function handleLogout() {
    try { await logout() } catch { window.alert("Não foi possível encerrar a sessão. Tente novamente."); return }
    navigate("/login")
  }

  return (
    <aside className="w-64 max-w-[90vw] bg-sidebar flex-shrink-0 flex flex-col h-full text-white/90 overflow-y-auto">
      <div className="h-20 px-4 flex items-center">
        <img src={logo} alt="ProVisão" className="h-14 w-auto" />
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {visibleEntries.map((entry, i) => {
          if (entry.kind === "group") {
            return (
              <div key={i} className="pt-4 pb-1.5 px-3 text-[10px] tracking-widest font-semibold uppercase tracking-wider text-white/65 font-sans">
                {entry.label}
              </div>
            )
          }

          const Icon = entry.icon
          return (
            <NavLink
              key={entry.path}
              to={entry.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-sans",
                  isActive
                    ? "bg-white/15 text-white font-semibold shadow-[inset_3px_0_0_#c5d44e]"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                )
              }
            >
              <Icon size={18} strokeWidth={2} />
              {entry.label}
              {entry.path === "/oficiais" && pendentes > 0 && <span className="ml-auto rounded-full bg-white px-2 text-xs font-semibold text-purple-900" aria-label={`${pendentes} ${pendentes === 1 ? 'aviso não lido' : 'avisos não lidos'}`}>{pendentes}</span>}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-4 border-t border-purple-light/20">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10">
          <NavLink to="/perfil" onClick={onNavigate} className="flex flex-1 min-w-0 items-center gap-3 rounded-md hover:bg-white/10" aria-label="Abrir meu perfil"><div className="w-9 h-9 shrink-0 rounded-full bg-purple-light flex items-center justify-center text-sm font-bold shadow-sm">
            {initials}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-semibold truncate font-sans">{user?.username ?? "Usuário"}</span>
            <span className="text-xs text-purple-muted truncate font-sans">{PERFIL_LABELS[perfil]}</span>
          </div></NavLink>
          <button onClick={handleLogout} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" title="Sair">
            <LogOut size={16} className="text-purple-muted" />
          </button>
        </div>
      </div>
    </aside>
  )
}
