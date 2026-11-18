import { useAuthStore } from "../stores/auth"
import { hasPermission, canAccessModule, type Module, type Action } from "../lib/permissions"

export function usePermissions(module: Module) {
  const user = useAuthStore((s) => s.user)

  if (!user) {
    return {
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      can: (_action: Action) => false,
    }
  }

  return {
    canView: hasPermission(user.perfil, module, "view"),
    canCreate: hasPermission(user.perfil, module, "create"),
    canEdit: hasPermission(user.perfil, module, "edit"),
    canDelete: hasPermission(user.perfil, module, "delete"),
    can: (action: Action) => hasPermission(user.perfil, module, action),
  }
}

export function useCanAccessModule(module: Module): boolean {
  const user = useAuthStore((s) => s.user)
  if (!user) return false
  return canAccessModule(user.perfil, module)
}
