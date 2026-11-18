import { Perfil } from "../types/enums"

export type Module =
  | "usuarios" | "igreja" | "pessoas" | "grupos-familiares"
  | "eventos-membresia" | "acoes" | "contas" | "cat-despesa"
  | "cat-receita" | "despesas" | "receitas" | "lancamentos" | "logs"
  | "regras-relacao-enum" | "secretaria"

export type Action = "view" | "create" | "edit" | "delete"

type PermissionMap = Record<Perfil, Partial<Record<Module, Action[]>>>

const PERMISSIONS: PermissionMap = {
  [Perfil.ADMINISTRADOR]: {
    secretaria: ["view"],
    usuarios: ["view", "create", "edit", "delete"],
    igreja: ["view"],
    pessoas: ["view"],
    "grupos-familiares": ["view"],
    "eventos-membresia": ["view"],
    acoes: ["view"],
    contas: ["view"],
    "cat-despesa": ["view"],
    "cat-receita": ["view"],
    despesas: ["view"],
    receitas: ["view"],
    lancamentos: ["view"],
    logs: ["view"],
    "regras-relacao-enum": ["view", "create", "edit", "delete"],
  },
  [Perfil.AUDITOR]: {
    secretaria: ["view"],
    usuarios: ["view"],
    igreja: ["view"],
    pessoas: ["view"],
    "grupos-familiares": ["view"],
    "eventos-membresia": ["view"],
    acoes: ["view"],
    contas: ["view"],
    "cat-despesa": ["view"],
    "cat-receita": ["view"],
    despesas: ["view"],
    receitas: ["view"],
    lancamentos: ["view"],
    logs: ["view"],
  },
  [Perfil.OPERADOR]: {
    pessoas: ["view"],
    "grupos-familiares": ["view"],
    "eventos-membresia": ["view"],
    acoes: ["view"],
    despesas: ["view"],
    receitas: ["view"],
    lancamentos: ["view", "create", "edit"],
  },
  [Perfil.SECRETARIO]: {
    secretaria: ["view"],
    igreja: ["view", "edit"],
    pessoas: ["view", "create", "edit", "delete"],
    "grupos-familiares": ["view", "create", "edit", "delete"],
    "eventos-membresia": ["view", "create", "edit", "delete"],
    acoes: ["view"],
    despesas: ["view"],
    receitas: ["view"],
    lancamentos: ["view"],
    usuarios: ["view"],
    contas: ["view"],
    "cat-despesa": ["view"],
    "cat-receita": ["view"],
    logs: ["view"],
  },
  [Perfil.TESOUREIRO]: {
    pessoas: ["view", "create", "edit"],
    acoes: ["view", "create", "edit"],
    contas: ["view", "create", "edit", "delete"],
    "cat-despesa": ["view", "create", "edit", "delete"],
    "cat-receita": ["view", "create", "edit", "delete"],
    despesas: ["view", "create", "edit", "delete"],
    receitas: ["view", "create", "edit", "delete"],
    lancamentos: ["view", "create", "edit", "delete"],
    igreja: ["view"],
    "grupos-familiares": ["view"],
    "eventos-membresia": ["view"],
    usuarios: ["view"],
    logs: ["view"],
  },
  [Perfil.GESTOR]: {
    secretaria: ["view"],
    igreja: ["view", "edit"],
    pessoas: ["view", "create", "edit"],
    "grupos-familiares": ["view", "create", "edit"],
    "eventos-membresia": ["view", "create", "edit"],
    acoes: ["view", "create", "edit", "delete"],
    despesas: ["view"],
    receitas: ["view"],
    lancamentos: ["view"],
    contas: ["view"],
    "cat-despesa": ["view"],
    "cat-receita": ["view"],
    usuarios: ["view"],
    logs: ["view"],
  },
}

export function hasPermission(
  perfil: Perfil,
  module: Module,
  action: Action,
): boolean {
  return PERMISSIONS[perfil]?.[module]?.includes(action) ?? false
}

export function canAccessModule(perfil: Perfil, module: Module): boolean {
  return hasPermission(perfil, module, "view")
}
