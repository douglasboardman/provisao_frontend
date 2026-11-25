import { useAuthStore } from "../stores/auth"
import { hasPermission, type Module, type Action } from "../lib/permissions"
import { useNavegacao } from './use-navegacao'

export function usePermissions(module: Module) {
  const user = useAuthStore(s => s.user)
  const navegacao = useNavegacao()
  function can(action: Action) {
    if (!user) return false
    const opcoes = navegacao.data?.permissoes[module]
    return opcoes ? opcoes.includes(action) : hasPermission(user.perfil, module, action)
  }
  return { canView: can('view'), canCreate: can('create'), canEdit: can('edit'), canDelete: can('delete'), can }
}

export function useCanAccessModule(module: Module) {
  return usePermissions(module).canView
}
