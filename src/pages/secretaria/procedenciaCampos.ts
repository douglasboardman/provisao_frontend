import type { DefinicaoCampo, Valores } from '../../api/campos'
import type { Antecedente, ModeloDocumento, RegraAntecedente } from '../../api/secretaria'

export interface IndicacaoCampo {
  selo: string
  detalhe: string
}
export type Procedencias = Record<string, IndicacaoCampo>

export function origensPrevistas(regras: RegraAntecedente[] = [], modelos: ModeloDocumento[]) {
  const fontes = new Map<string, string[]>()
  for (const regra of regras) {
    const modelo = modelos.find(m => m.id === regra.modelo_id)
    for (const destino of Object.keys(regra.campos)) {
      const nomes = fontes.get(destino) ?? []
      nomes.push(modelo?.nome ?? 'modelo anterior')
      fontes.set(destino, nomes)
    }
  }
  const indicacoes: Procedencias = {}
  for (const [id, nomes] of fontes) {
    indicacoes[id] = { selo: 'A receber', detalhe: 'A receber de ' + nomes.join(' ou ') }
  }
  return indicacoes
}

export function origensDoDocumento(previstas: Procedencias, valores: Valores, anterior: Antecedente | undefined, vinculado: boolean, opcional: boolean) {
  const indicacoes: Procedencias = {}
  if (!vinculado) {
    for (const [id, prevista] of Object.entries(previstas)) {
      indicacoes[id] = { selo: 'A receber', detalhe: prevista.detalhe + (opcional ? ' · Vínculo opcional em aberto' : ' · Aguardando documento anterior') }
    }
  }
  for (const [id, campo] of Object.entries(valores)) {
    if (campo.origem.tipo !== 'documento_anterior') {
      const nomes: Record<string, string> = { contexto: 'Do contexto', reuniao: 'Da reunião', livro: 'Do livro', mesa: 'Da mesa', pessoa: 'Da pessoa', igreja: 'Da igreja', documento: 'Do documento' }
      const origem = campo.origem
      let cadastro = origem.cadastro
      if (!cadastro) {
        if (origem.chave === 'igreja') cadastro = 'igreja'
        else if (origem.chave === 'redator_ata') cadastro = 'pessoa'
        else if (/reuniao|^endereco_|^presentes$/.test(origem.chave ?? '')) cadastro = 'reuniao'
        else cadastro = 'documento'
      }
      const selo = origem.tipo === 'manual' ? 'Manual' : nomes[cadastro]
      if (selo && !indicacoes[id]) indicacoes[id] = { selo, detalhe: selo + (origem.revisao ? ' · revisão ' + origem.revisao : '') }
      continue
    }
    const fonte = anterior?.versao_id === campo.origem.versao_id ? anterior.identificacao : 'documento anterior'
    indicacoes[id] = {
      selo: campo.ajustado_manualmente ? 'Recepcionado · ajustado' : 'Recepcionado',
      detalhe: 'Recepcionado de ' + fonte + (campo.ajustado_manualmente ? ' · Ajustado manualmente' : ''),
    }
  }
  return indicacoes
}

export function distinguirHomonimos(origens: Procedencias, campos: Record<string, DefinicaoCampo> = {}): Procedencias {
  const nomesRecebidos = new Set(Object.entries(origens).filter(([, o]) => o.selo.startsWith('Recepcionado') || o.selo === 'A receber').map(([id]) => campos[id]?.nome))
  const indicacoes = { ...origens }
  for (const [id, campo] of Object.entries(campos)) {
    if ((!origens[id] || origens[id].selo === 'Manual') && nomesRecebidos.has(campo.nome)) indicacoes[id] = { selo: 'Local', detalhe: 'Campo local do modelo' }
  }
  return indicacoes
}

// Campos homônimos continuam selecionáveis antes de configurar a primeira associação.
export function nomesDeCadastro(campos: Record<string, DefinicaoCampo>, origens: Procedencias = {}) {
  const frequencias = new Map<string, number>()
  const chave = (id: string) => JSON.stringify([campos[id].nome, origens[id]?.detalhe])
  for (const id of Object.keys(campos)) frequencias.set(chave(id), (frequencias.get(chave(id)) ?? 0) + 1)
  return Object.fromEntries(Object.entries(campos).map(([id,c]) => [id,
    frequencias.get(chave(id))! > 1 ? c.nome + ' · ' + (('codigo' in c && c.codigo) || id) : c.nome]))
}
