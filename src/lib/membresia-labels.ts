import { TipoEvento, MembresiaRol, MotivacaoEvento } from "../types/enums"

export const ROL_LABELS: Record<MembresiaRol, string> = {
  [MembresiaRol.COMUNGANTES]: "Comungantes",
  [MembresiaRol.NAO_COMUNGANTES]: "Não Comungantes",
  [MembresiaRol.ROL_SEPARADO]: "Rol Separado",
  [MembresiaRol.EXCLUIDOS]: "Excluídos",
}

export const TIPO_LABELS: Record<TipoEvento, string> = {
  [TipoEvento.ADMISSAO]: "Admissão",
  [TipoEvento.DEMISSAO]: "Demissão",
  [TipoEvento.MUDANCA_DE_ROL]: "Mudança de Rol",
}

export const TIPO_BADGE_VARIANT: Record<TipoEvento, "success" | "destructive" | "secondary"> = {
  [TipoEvento.ADMISSAO]: "success",
  [TipoEvento.DEMISSAO]: "destructive",
  [TipoEvento.MUDANCA_DE_ROL]: "secondary",
}

export const MOTIVACAO_LABELS: Record<MotivacaoEvento, string> = {
  [MotivacaoEvento.PROFISSAO_DE_FE]: "Profissão de Fé",
  [MotivacaoEvento.PROFISSAO_DE_FE_E_BATISMO]: "Profissão de Fé e Batismo",
  [MotivacaoEvento.CARTA_DE_TRANSFERENCIA_RECEBIDA]: "Carta de Transferência (Recebida)",
  [MotivacaoEvento.JURISDICAO_A_PEDIDO]: "Jurisdição a Pedido",
  [MotivacaoEvento.JURISDICAO_EX_OFFICIO]: "Jurisdição Ex Officio",
  [MotivacaoEvento.RESTAURACAO]: "Restauração",
  [MotivacaoEvento.DESIGNACAO_PRESBITERIO]: "Designação do Presbitério",
  [MotivacaoEvento.BATISMO_NA_INFANCIA]: "Batismo na Infância",
  [MotivacaoEvento.TRANSFERENCIA_PAIS_OU_RESPONSAVEIS]: "Transferência dos Pais ou Responsáveis",
  [MotivacaoEvento.JURISDICAO_ASSUMIDA_SOBRE_PAIS_OU_RESPONSAVEIS]: "Jurisdição Assumida sobre Pais ou Responsáveis",
  [MotivacaoEvento.EXCLUSAO_POR_DISCIPLINA]: "Exclusão por Disciplina",
  [MotivacaoEvento.EXCLUSAO_A_PEDIDO]: "Exclusão a Pedido",
  [MotivacaoEvento.EXCLUSAO_POR_AUSENCIA]: "Exclusão por Ausência",
  [MotivacaoEvento.CARTA_DE_TRANSFERENCIA_CONCEDIDA]: "Carta de Transferência (Concedida)",
  [MotivacaoEvento.JURISDICAO_ASSUMIDA]: "Jurisdição Assumida por Outra Igreja",
  [MotivacaoEvento.FALECIMENTO]: "Falecimento",
  [MotivacaoEvento.CARTA_DE_TRANSFERENCIA_DOS_PAIS_OU_RESPONSAVEIS]: "Carta de Transferência dos Pais ou Responsáveis",
  [MotivacaoEvento.DEZOITO_ANOS_COMPLETOS]: "18 Anos Completos",
  [MotivacaoEvento.SOLICITACAO_PAIS_OUTRA_COMUNIDADE]: "Solicitação dos Pais (Outra Comunidade)",
  [MotivacaoEvento.PARADEIRO_IGNORADO]: "Paradeiro Ignorado",
}

export function calcAge(dataNascimento: string): number {
  const birth = new Date(dataNascimento)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}
