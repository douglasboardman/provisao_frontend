export const tiposCampo = { texto: 'Texto', numero: 'Número', data: 'Data', sim_nao: 'Sim ou não' }
export const camposEndereco = {
  endereco_logradouro: 'Logradouro do local da reunião',
  endereco_numero: 'Número do local da reunião',
  endereco_complemento: 'Complemento do local da reunião',
  endereco_bairro: 'Bairro do local da reunião',
  endereco_cep: 'CEP do local da reunião',
  endereco_cidade: 'Cidade do local da reunião',
  endereco_uf: 'UF do local da reunião',
  endereco_extenso: 'Endereço por extenso do local da reunião',
  endereco_declarativo: 'Endereço declarativo do local da reunião',
}
export const camposDataHoraReuniao = {
  horario_inicio_reuniao: 'Horário de início da reunião',
  horario_inicio_reuniao_por_extenso: 'Horário de início da reunião por extenso',
  horario_encerramento_reuniao: 'Horário de encerramento da reunião',
  horario_encerramento_reuniao_por_extenso: 'Horário de encerramento da reunião por extenso',
  dia_reuniao_por_extenso: 'Dia da reunião por extenso',
  mes_reuniao_por_extenso: 'Mês da reunião por extenso',
  ano_reuniao_por_extenso: 'Ano da reunião por extenso',
}
export function ehCampoDataHoraReuniao(origem: string): origem is keyof typeof camposDataHoraReuniao {
  return Object.prototype.hasOwnProperty.call(camposDataHoraReuniao, origem)
}
export function ehCampoNumeracao(origem: string) {
  return origem === 'numero_documento' || origem === 'numero_documento_por_extenso'
}
type ContextoDocumental = { nome: string; sigla: string; por_extenso?: string }

export function valorDoContexto(origem: string, contexto: ContextoDocumental) {
  switch (origem) {
    case 'contexto_nome': return contexto.nome
    case 'contexto_sigla': return contexto.sigla
    case 'contexto_por_extenso': return contexto.por_extenso
  }
}

export const origensCampo = {
  contexto_nome: 'Nome do contexto',
  contexto_sigla: 'Sigla do contexto',
  contexto_por_extenso: 'Contexto por extenso',
  data_prevista_reuniao: 'Data prevista da reunião',
  horario_previsto_reuniao: 'Horário previsto da reunião',
  horario_previsto_reuniao_por_extenso: 'Horário previsto da reunião por extenso',
  numero_livro: 'Número do livro',
  titular_livro: 'Titular do livro',
  serie_livro: 'Série do livro',
  capacidade_folhas_livro: 'Capacidade em folhas do livro',
  modalidade_livro: 'Modalidade do livro',
  nome_convocante: 'Nome do convocante',
  nome_secretario_livro: 'Secretário responsável pelo livro',
  nome_preparador: 'Nome de quem preparou a minuta',
  nome_presidente_mesa: 'Presidente efetivo da mesa',
  nome_secretario_mesa: 'Secretário eleito da mesa',
 redator_ata: 'Redator da ata', numero_documento: 'Número do documento', numero_documento_por_extenso: 'Número do documento por extenso', ...camposEndereco, ...camposDataHoraReuniao, manual: 'Preenchimento manual', igreja: 'Nome da igreja', assunto: 'Assunto', data_documento: 'Data do documento', local_reuniao: 'Local da reunião', deliberacoes_reuniao: 'Deliberações da reunião', pauta_reuniao: 'Itens da reunião vinculada', presentes: 'Presentes na reunião' }
export interface DefinicaoCampo { nome: string; tipo: keyof typeof tiposCampo; origem: keyof typeof origensCampo; multiplo: boolean }
export interface CampoIgreja extends DefinicaoCampo { id: string; codigo: string | null; ativo: boolean; revisao: number }
export type Apresentacao = 'individual' | 'em_linha' | 'lista_numerada' | 'lista_marcadores'
export interface ReferenciaCampo { tipo: 'campo'; campo_id: string; apresentacao: Apresentacao; indice?: number }
export type ItemCampo = string | number | boolean
export interface ValorCampo { tipo: DefinicaoCampo['tipo']; multiplo: boolean; valor: ItemCampo | ItemCampo[] | null; origem: { tipo: 'manual' | 'sistema'; chave?: string; cadastro?: string; registro_id?: string; revisao?: number; atualizado_em?: string } | { tipo: 'documento_anterior'; versao_id: string; campo_id: string }; ajustado_manualmente: boolean }
export type Valores = Record<string, ValorCampo>
export function amostra(d: DefinicaoCampo, quantidade = 3, contexto?: ContextoDocumental): ValorCampo {
  const exemploContexto = valorDoContexto(d.origem, contexto ?? { nome: 'Conselho', sigla: 'CON', por_extenso: 'Conselho da Igreja Exemplo' })
  if (exemploContexto !== undefined) return { tipo: 'texto', multiplo: false, valor: exemploContexto, origem: { tipo: 'sistema', chave: d.origem, cadastro: 'contexto' }, ajustado_manualmente: false }
  const exemploData = {
    horario_inicio_reuniao: '19:30', horario_inicio_reuniao_por_extenso: 'dezenove horas e trinta minutos',
    horario_encerramento_reuniao: '22:01', horario_encerramento_reuniao_por_extenso: 'vinte e duas horas e um minuto',
    dia_reuniao_por_extenso: 'vinte e dois', mes_reuniao_por_extenso: 'novembro', ano_reuniao_por_extenso: 'dois mil e vinte e seis' }
  const itens = { texto: d.origem === 'deliberacoes_reuniao' ? ['Reforma do salão — Aprovada', 'Calendário de visitas — Aprovada', 'Compra de equipamento — Adiada'] : d.origem === 'numero_documento_por_extenso' ? ['doze'] : ehCampoDataHoraReuniao(d.origem) ? [exemploData[d.origem]] : ['Ana','Bruno','Carla'], data: ['2026-11-22','2026-11-23','2026-11-24'], numero: d.origem === 'numero_documento' ? [12] : [1,2,3], sim_nao: [true,false,true] }[d.tipo]
  return { tipo: d.tipo, multiplo: d.multiplo, valor: d.multiplo ? itens.slice(0, quantidade) : itens[0], origem: { tipo: 'manual' }, ajustado_manualmente: false }
}
export function apresentar(c: ReferenciaCampo, v?: ValorCampo) {
  if (!v || v.valor === null) return ''
  const itens = (Array.isArray(v.valor) ? v.valor : [v.valor]).map(x => v.tipo === 'data' ? String(x).split('-').reverse().join('/') : typeof x === 'number' ? x.toLocaleString('pt-BR', { maximumFractionDigits: 15 }) : typeof x === 'boolean' ? (x ? 'Sim' : 'Não') : x.trim())
  if (c.apresentacao === 'individual') return itens[c.indice ?? 0] ?? ''
  const preenchidos = itens.filter(Boolean)
  if (c.apresentacao === 'em_linha') return preenchidos.length < 2 ? preenchidos.join('') : preenchidos.slice(0,-1).join(', ') + ' e ' + preenchidos[preenchidos.length-1]
  return preenchidos.map((x,i) => (c.apresentacao === 'lista_numerada' ? (i+1) + '. ' : '• ') + x).join('\n')
}
