export type Module =
  | "usuarios" | "igreja" | "pessoas" | "grupos-familiares"
  | "eventos-membresia" | "acoes" | "contas" | "cat-despesa"
  | "cat-receita" | "despesas" | "receitas" | "lancamentos" | "logs"
  | "regras-relacao-enum" | "secretaria" | "profissoes"
  | "tratamentos" | "solicitacoes-acesso" | "autorizacoes-financeiras" | "balanco-mensal" | "oficiais" | "orgaos"
  | "perfis-atuacao" | "campos-secretaria" | "unidades" | "notificacoes-oficiais" | "vinculos-documentais"

export type Action = "view" | "create" | "edit" | "delete"
