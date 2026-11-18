import { useState } from "react"
import { Building2, FileText, SlidersHorizontal, ShieldCheck } from "lucide-react"
import { useAuthStore } from "../../stores/auth"
import { canAccessModule } from "../../lib/permissions"
import { MfaPage } from "./MfaPage"
import { IgrejaPage } from "./IgrejaPage"
import { LogsPage } from "./LogsPage"
import { ParametrosRolMembrosPage } from "./ParametrosRolMembrosPage"
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
  { key: "parametros-membresia", label: "Parâmetros Membresia", icon: SlidersHorizontal, module: "regras-relacao-enum", component: ParametrosRolMembrosPage },
  { key: "logs", label: "Logs", icon: FileText, module: "logs", component: LogsPage },
]

export function ConfiguracoesPage() {
  const user = useAuthStore((s) => s.user)
  const visibleTabs = TABS.filter((t) => user && canAccessModule(user.perfil, t.module))
  const [activeKey, setActiveKey] = useState(visibleTabs[0]?.key ?? "igreja")

  const activeTab = visibleTabs.find((t) => t.key === activeKey) ?? visibleTabs[0]
  if (!activeTab) return null

  const ActiveComponent = activeTab.component

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Configurações da igreja e logs do sistema</p>
      </div>

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
