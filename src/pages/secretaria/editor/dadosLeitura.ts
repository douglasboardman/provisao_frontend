import { resultadosResolucao, type Arrolado, type ResolucaoInput } from '../../../api/secretaria'
import type { ResolucaoLeitura } from './complementos-leitura'

export interface DadosLeitura {
  signatarios: string[]
  resolucoes: ResolucaoLeitura[]
  natureza?: string
  campos: Record<string, string>
  numeroVisivel?: number | null
}
export function dadosLeitura(
  arrolados: Pick<Arrolado, 'assina' | 'pessoa_id'>[],
  resolucoes: ResolucaoInput[],
  nome: (id: string) => string,
  cargos: (id: string) => string[],
  finalidade: string | undefined,
  campos: Record<string, string>,
  numeroVisivel?: number | null,
): DadosLeitura {
  const nomes = (ids: string[]) =>
    ids
      .map((id) => {
        const titulos = cargos(id)
        return titulos.length ? nome(id) + ' (' + titulos.join(', ') + ')' : nome(id)
      })
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  return {
    signatarios: arrolados
      .filter((p) => p.assina)
      .sort((a, b) => a.pessoa_id.localeCompare(b.pessoa_id))
      .map((p) => {
        const titulos = cargos(p.pessoa_id)
        return [nome(p.pessoa_id), titulos.join(', ')].filter(Boolean).join(' — ')
      }),
    resolucoes: [...resolucoes]
      .sort((a, b) => a.ordem - b.ordem)
      .map((r) => ({
        ordem: r.ordem,
        assunto: r.assunto,
        proposta: r.texto_proposta,
        deliberado: r.texto_deliberado,
        resultado: resultadosResolucao[r.resultado],
        eficaz: r.eficaz,
        dataEfeito: r.data_efeito?.slice(0, 10),
        secreta: r.votacao_secreta,
        apuracao: r.apuracao,
        proponentes: nomes(r.proponentes_pessoas_ids),
        dissidentes: nomes(r.dissidentes_pessoas_ids),
      })),
    campos,
    numeroVisivel,
    natureza:
      finalidade === 'TERMO_ABERTURA'
        ? 'ABERTURA'
        : finalidade === 'TERMO_ENCERRAMENTO'
          ? 'ENCERRAMENTO'
          : undefined,
  }
}
