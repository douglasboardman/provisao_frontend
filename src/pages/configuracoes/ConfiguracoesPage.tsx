import { useNavegacao } from '../../hooks/use-navegacao'
import { BibliotecaCampos } from '../secretaria/BibliotecaCampos'
import { useRecurso } from '../../lib/recursos'
import { Settings as PageIcon } from "lucide-react"
import { WorkspaceHeader } from "../../components/shared/Workspace"
import { useState } from "react"
import { Briefcase, Building2, FileText, SlidersHorizontal, ShieldCheck } from "lucide-react"
import { useAuthStore } from "../../stores/auth"
import { canAccessModule } from "../../lib/permissions"
import { MfaPage } from "./MfaPage"
import { IgrejaPage } from "./IgrejaPage"
import { LogsPage } from "./LogsPage"
import { ParametrosRolMembrosPage } from "./ParametrosRolMembrosPage"
import { ProfissoesPage } from "./ProfissoesPage"
import { LiberacaoAcessos } from "./LiberacaoAcessos"
import type { LucideIcon } from "lucide-react"
import type { Module } from "../../lib/permissions"

interface Tab {
  key: string
  label: string
  icon: LucideIcon
  module: Module
  component: React.ComponentType
}

const TABS: Tab[] = [
  { key: "igreja", label: "Igreja", icon: Building2, module: "igreja", component: IgrejaPage },
  { key: "mfa", label: "Autenticação", icon: ShieldCheck, module: "igreja", component: MfaPage },
  { key: "liberacoes", label: "Liberação de acessos", icon: ShieldCheck, module: "igreja", component: LiberacaoAcessos },
  { key: "parametros-membresia", label: "Parâmetros Membresia", icon: SlidersHorizontal, module: "regras-relacao-enum", component: ParametrosRolMembrosPage },
  { key: "profissoes", label: "Profissões", icon: Briefcase, module: "profissoes", component: ProfissoesPage },
  { key: "campos", label: "Campos da Secretaria", icon: FileText, module: "secretaria", component: BibliotecaCampos },
  { key: "logs", label: "Logs", icon: FileText, module: "logs", component: LogsPage },
]

export function ConfiguracoesPage() {
  const user = useAuthStore((s) => s.user)
  const secretaria = useRecurso('secretaria')
  const navegacao = useNavegacao()
  const visibleTabs = TABS.filter((t) => {
    if (!user) return false
    if (t.key === 'liberacoes') return user.perfil === 'ADMINISTRADOR'
    if (t.key === 'campos' && (!secretaria || !['ADMINISTRADOR', 'SECRETARIO'].includes(user.perfil))) return false
    return navegacao.data?.permissoes[t.module]?.includes('view') ?? canAccessModule(user.perfil, t.module)
  })
  const [activeKey, setActiveKey] = useState(visibleTabs[0]?.key ?? "igreja")

  const activeTab = visibleTabs.find((t) => t.key === activeKey) ?? visibleTabs[0]
  if (!activeTab) return null

  const ActiveComponent = activeTab.component

  return (
    <div className="workspace">
      <WorkspaceHeader icon={PageIcon} title="Configurações" description="Configurações da igreja e logs do sistema" />

      {visibleTabs.length > 1 && (
        <div className="flex gap-1 border-b border-border overflow-x-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveKey(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeKey === tab.key
                    ? "border-purple text-purple"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>
      )}

      <ActiveComponent />
    </div>
  )
}
