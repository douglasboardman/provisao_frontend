import { useNavegacao } from '../../hooks/use-navegacao'
import {
  Home, Users, BookUser, IdCard,
  Landmark, ArrowRightLeft, TrendingUp, TrendingDown, Scale,
  Sprout, UserCog, Settings, LogOut, ShieldCheck,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { oficiaisApi } from "../../api/oficiais"
import { NavLink, useNavigate } from "react-router"
import logo from "../../assets/logo-assinatura-horizontal.png"
import { cn } from "@/lib/utils"
import { useAuthStore } from "../../stores/auth"
import { type Module } from "../../lib/permissions"
import type { LucideIcon } from "lucide-react"
import { Perfil, PERFIL_LABELS } from "../../types/enums"
import { useRecurso } from "../../lib/recursos"

type NavGroup = { kind: "group"; label: string }
type NavItem = { kind: "item"; path: string; icon: LucideIcon; label: string; modules?: Module[] }
type NavEntry = NavGroup | NavItem

const navEntries: NavEntry[] = [
  { kind: "item", path: "/dashboard", icon: Home, label: "Dashboard" },

  { kind: "group", label: "Membresia" },
  { kind: "item", path: "/oficiais", icon: IdCard, label: "Oficiais e Pastores" },
  { kind: "item", path: "/orgaos", icon: Landmark, label: "Estrutura da igreja" },
  { kind: "item", path: "/secretaria", icon: BookUser, label: "Secretaria", modules: ["secretaria"] },
  { kind: "item", path: "/pessoas", icon: Users, label: "Pessoas", modules: ["pessoas", "grupos-familiares"] },
  { kind: "item", path: "/rol-membros", icon: BookUser, label: "Rol de Membros", modules: ["eventos-membresia"] },

  { kind: "group", label: "Financeiro" },
  { kind: "item", path: "/contas", icon: Landmark, label: "Contas", modules: ["contas"] },
  { kind: "item", path: "/lancamentos", icon: ArrowRightLeft, label: "Lançamentos", modules: ["lancamentos"] },
  { kind: "item", path: "/balanco-mensal", icon: Scale, label: "Balanço Mensal", modules: ["balanco-mensal"] },

  { kind: "group", label: "Cadastros" },
  { kind: "item", path: "/cat-receita", icon: TrendingUp, label: "Receitas", modules: ["cat-receita"] },
  { kind: "item", path: "/cat-despesa", icon: TrendingDown, label: "Despesas", modules: ["cat-despesa"] },
  { kind: "item", path: "/acoes", icon: Sprout, label: "Ações", modules: ["acoes"] },

  { kind: "group", label: "Administração" },
  { kind: "item", path: "/usuarios", icon: UserCog, label: "Usuários", modules: ["usuarios", "solicitacoes-acesso"] },
  { kind: "item", path: "/perfis-atuacao", icon: ShieldCheck, label: "Perfis de acesso", modules: ["perfis-atuacao"] },
  { kind: "item", path: "/configuracoes", icon: Settings, label: "Configurações", modules: ["igreja", "logs", "profissoes", "regras-relacao-enum", "autorizacoes-financeiras"] },
]

function filterNav(entries: NavEntry[], podeVer: (modulo: Module) => boolean): NavEntry[] {
  const filtered: NavEntry[] = []

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    if (entry.kind === "group") {
      const nextItems: NavItem[] = []
      for (let j = i + 1; j < entries.length && entries[j].kind === "item"; j++) {
        nextItems.push(entries[j] as NavItem)
      }
      const hasVisible = nextItems.some(
        (item) => !item.modules || item.modules.some((m) => podeVer(m)),
      )
      if (hasVisible) filtered.push(entry)
    } else {
      if (!entry.modules || entry.modules.some((m) => podeVer(m))) {
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
  const perfil = user?.perfil ?? Perfil.COMUM
  const identidade = `${user?.igreja_id ?? ''}:${user?.sub ?? ''}`
  const navegacao = useNavegacao()
  const notificacoes = useQuery({ queryKey: ['oficiais', identidade, 'notificacoes'], queryFn: oficiaisApi.notificacoes,
    enabled: governanca && !!user && !user.mfa_enrollment_required && navegacao.data?.permissoes['notificacoes-oficiais']?.includes('view') === true, refetchInterval: 60_000 })
  const pendentes = notificacoes.data?.filter(item => !item.lido_em).length ?? 0
  const rotuloPerfil = navegacao.data?.perfis_atuacao?.join(' · ') || PERFIL_LABELS[perfil]
  const podeVer = (modulo: Module) => {
    const acoes = navegacao.data?.permissoes[modulo]
    return acoes ? acoes.includes('view') || modulo === 'pessoas' && acoes.includes('create') : false
  }
  const liberados: Record<string, boolean> = {
    '/oficiais': governanca && podeVer('oficiais'),
    '/orgaos': governanca && orgaos && podeVer('orgaos'),
    '/secretaria': secretaria && podeVer('secretaria'),
  }
  const visibleEntries = filterNav(navEntries.filter(entry => entry.kind === 'group' || liberados[entry.path] !== false), podeVer)

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
            <span className="line-clamp-2 break-words font-sans text-xs text-purple-muted" title={rotuloPerfil}>{rotuloPerfil}</span>
          </div></NavLink>
          <button onClick={handleLogout} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" title="Sair">
            <LogOut size={16} className="text-purple-muted" />
          </button>
        </div>
      </div>
    </aside>
  )
}
