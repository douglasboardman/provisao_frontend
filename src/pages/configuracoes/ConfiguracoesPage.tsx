import { useQuery } from '@tanstack/react-query'
import { acoesApi } from '../../api/acoes'
import { contasApi } from '../../api/contas'
import { useNavegacao } from '../../hooks/use-navegacao'
import { BibliotecaCampos } from '../secretaria/BibliotecaCampos'
import { useRecurso } from '../../lib/recursos'
import { Settings as PageIcon } from "lucide-react"
import { WorkspaceHeader } from "../../components/shared/Workspace"
import { Briefcase, Building2, FileText, Scale, SlidersHorizontal, ShieldCheck } from "lucide-react"
import { Navigate, useSearchParams } from "react-router"
import { Abas } from "../../components/ui/abas"
import { AutorizacoesFinanceiras } from "../secretaria/AutorizacoesFinanceiras"
import { useAuthStore } from "../../stores/auth"
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
  { key: "campos", label: "Campos da Secretaria", icon: FileText, module: "campos-secretaria", component: BibliotecaCampos },
  { key: "autorizacoes-financeiras", label: "Autorizações financeiras", icon: Scale, module: "autorizacoes-financeiras", component: AutorizacoesNasConfiguracoes },
  { key: "logs", label: "Logs", icon: FileText, module: "logs", component: LogsPage },
]

function AutorizacoesNasConfiguracoes() {
  const user = useAuthStore(s => s.user)
  const { data: navegacao } = useNavegacao()
  const podeConsultar = (modulo: 'contas' | 'acoes') => !!user
    && (navegacao?.permissoes[modulo]?.includes('view') ?? false)
  const contas = useQuery({ queryKey: ['contas', user?.igreja_id, user?.sub, 'autorizacoes'], queryFn: contasApi.list, enabled: podeConsultar('contas') })
  const projetos = useQuery({ queryKey: ['acoes', user?.igreja_id, user?.sub, 'autorizacoes'], queryFn: acoesApi.list, enabled: podeConsultar('acoes') })
  return <AutorizacoesFinanceiras contas={contas.data} projetos={projetos.data} />
}

export function ConfiguracoesPage() {
  const user = useAuthStore((s) => s.user)
  const secretaria = useRecurso('secretaria')
  const navegacao = useNavegacao()
  const [params, selecionar] = useSearchParams()
  const visibleTabs = TABS.filter((t) => {
    if (!user) return false
    if (t.key === 'mfa') return true
    if (t.key === 'liberacoes') return user.perfil === 'ADMINISTRADOR'
    if (t.key === 'campos' && !secretaria) return false
    if (t.key === 'autorizacoes-financeiras' && !secretaria) return false
    return navegacao.data?.permissoes[t.module]?.includes('view') ?? false
  })
  const activeTab = visibleTabs.find((t) => t.key === params.get('aba')) ?? visibleTabs[0]
  if (!activeTab) return navegacao.isPending ? <p role="status">Consultando acessos…</p> : <Navigate to="/dashboard" replace />

  return (
    <div className="workspace">
      <WorkspaceHeader icon={PageIcon} title="Configurações" description="Configurações da igreja e logs do sistema" />

      <Abas titulo="Seções de configurações" ativa={activeTab.key} ocultarSeUnica
        abas={visibleTabs.map(({ key, label, icon, component: Component }) => ({ id: key, nome: label, icone: icon, conteudo: <Component /> }))}
        selecionar={aba => selecionar({ aba })} />
    </div>
  )
}
