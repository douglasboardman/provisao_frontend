import {
  EstadoBrasil, Perfil, Sexo, EstadoCivil, TipoConta,
  TipoTransacao, LogAcao,
  TipoEvento, MembresiaRol, MotivacaoEvento,
  TipoRegra,
} from "./enums"

export interface Igreja {
  id: string
  cnpj: string | null
  nome: string
  url_logo: string | null
  congregacao: boolean
  vinculada_a: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: EstadoBrasil | null
  ativa: boolean
  created_at: string
  updated_at: string
}

export interface Pessoa {
  id: string
  igreja_id: string
  nome_completo: string
  url_foto: string | null
  cpf: string | null
  data_nascimento: string
  sexo: Sexo
  estado_civil: EstadoCivil
  email: string | null
  telefone: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: EstadoBrasil | null
  grupo_familiar_id: string | null
  tratamento_id: number | null
  profissao_id?: string | null
  conjuge_id: string | null
  created_at: string
  updated_at: string
  grupos_familiares?: GrupoFamiliar | null
  tratamentos?: Tratamento | null
  conjuge?: Pessoa | null
  eventos_membresia?: EventoMembresia[]
}

export interface GrupoFamiliar {
  id: string
  igreja_id: string
  nome_familia: string
  created_at: string
  updated_at: string
  pessoas?: Pessoa[]
  _count?: { pessoas: number }
}

export interface Tratamento {
  id: number
  descricao: string
  abreviacao: string
  created_at: string
  updated_at: string
}

export interface Profissao {
  id: string
  nome: string
}

export interface EventoMembresia {
  id: string
  igreja_id: string
  pessoa_id: string
  tipo_evento: TipoEvento
  rol: MembresiaRol
  rol_origem: MembresiaRol | null
  motivacao_evento: MotivacaoEvento
  data_evento: string
  ordem_dia?: number | null
  igreja_origem: string | null
  igreja_destino: string | null
  referencia_documental?: string | null
  documentado?: boolean
  observacoes: string | null
  created_at: string
  updated_at: string
  pessoas?: Pessoa
}

export interface Conta {
  id: string
  igreja_id: string
  descricao: string
  banco: string | null
  tipo_conta: TipoConta
  num_conta: string | null
  agencia: string | null
  saldo_inicial: number
  cor_hex: string | null
  created_at: string
  updated_at: string
}

export interface Acao {
  id: string
  igreja_id: string
  nome: string
  descricao_detalhada: string | null
  cor_hex: string | null
  responsavel_pessoa_id: string
  conta_id: string
  data_inicio: string
  data_fim: string | null
  orcamento_receita: number
  orcamento_despesa: number
  created_at: string
  updated_at: string
  pessoas?: Pessoa
  contas?: Conta
}

export interface CatDespesa {
  id: number
  igreja_id: string
  nome: string
  cor_hex: string | null
  created_at: string
  updated_at: string
  _count?: { despesas: number }
}

export interface CatReceita {
  id: number
  igreja_id: string
  nome: string
  cor_hex: string | null
  created_at: string
  updated_at: string
  _count?: { receitas: number }
}

export interface Despesa {
  id: number
  igreja_id: string
  nome: string
  cat_despesa_id: number
  requer_pessoa: boolean
  requer_acao: boolean
  requer_conta: boolean
  requer_comprovante: boolean
  created_at: string
  updated_at: string
  cat_despesa?: CatDespesa
}

export interface Receita {
  id: number
  igreja_id: string
  nome: string
  cat_receita_id: number
  requer_pessoa: boolean
  requer_acao: boolean
  requer_conta: boolean
  requer_comprovante: boolean
  created_at: string
  updated_at: string
  cat_receita?: CatReceita
}

export interface Lancamento {
  id: string
  igreja_id: string
  data_transacao: string
  valor: number
  tipo_transacao: TipoTransacao
  conta_id: string
  acao_id: string | null
  receita_id: number | null
  despesa_id: number | null
  pessoa_id: string | null
  usuario_id: string
  observacao: string | null
  comprovante_url: string | null
  created_at: string
  updated_at: string
  contas?: Conta
  acoes?: Acao | null
  receitas?: Receita | null
  despesas?: Despesa | null
  pessoas?: Pessoa | null
}

export interface Usuario {
  pessoa_id: string | null
  id: string
  igreja_id: string
  nome_usuario: string
  email_login: string
  url_imagem_perfil: string | null
  perfil: Perfil
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface LogAtividade {
  id: number
  igreja_id: string
  usuario_id: string
  ip_address: string | null
  acao: LogAcao
  tabela_afetada: string
  registro_id: string | null
  dados_antigos: unknown | null
  dados_novos: unknown | null
  created_at: string
  usuarios?: Usuario
}

export interface RelacaoEnumValor {
  id: string
  regra_id: string
  valor_classificador: string
  valor_classificado: string
  created_at: string
}

export interface RegraRelacaoEnum {
  id: string
  modulo: string
  nome: string
  descricao: string | null
  tipo_regra: TipoRegra
  enum_classificador: string
  enum_classificado: string
  created_at: string
  updated_at: string
  valores: RelacaoEnumValor[]
}
