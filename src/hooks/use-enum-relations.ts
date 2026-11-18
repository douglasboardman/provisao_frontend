import { useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { regrasRelacaoEnumApi } from "../api/regras-relacao-enum"

export function useEnumRelations(modulo: string) {
  const { data: regras, isLoading } = useQuery({
    queryKey: ["regras-relacao-enum", modulo],
    queryFn: () => regrasRelacaoEnumApi.getByModulo(modulo),
    staleTime: 5 * 60 * 1000,
  })

  const getFilter = useCallback(
    (nomeRegra: string, valorClassificador: string): string[] => {
      if (!regras) return []
      const regra = regras.find((r) => r.nome === nomeRegra)
      if (!regra) return []
      return regra.valores
        .filter((v) => v.valor_classificador === valorClassificador)
        .map((v) => v.valor_classificado)
    },
    [regras],
  )

  const getMapping = useCallback(
    (nomeRegra: string, valorClassificador: string): string | null => {
      if (!regras) return null
      const regra = regras.find((r) => r.nome === nomeRegra)
      if (!regra) return null
      const entry = regra.valores.find((v) => v.valor_classificador === valorClassificador)
      return entry?.valor_classificado ?? null
    },
    [regras],
  )

  return { regras, getFilter, getMapping, isLoading }
}
