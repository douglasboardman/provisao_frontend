import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { pessoasApi } from "../../api/pessoas"
import { eventosMembresiaApi } from "../../api/eventos-membresia"
import { dataCivilLocal } from "../../lib/membresia-temporal"
import { useAuthStore } from "../../stores/auth"
import { montarRol } from "./dados-rol"

export function useDadosRol(enabled = true) {
  const identidade = useAuthStore(s => `${s.user?.igreja_id}:${s.user?.sub}`)

  const { data: pessoas, isLoading: loadingPessoas, isError: errorPessoas, error: errPessoas, refetch: refetchPessoas } = useQuery({ queryKey: ["pessoas", identidade], queryFn: pessoasApi.list, enabled })
  const { data: eventos, isLoading: loadingEventos, isError: errorEventos, error: errEventos, refetch: refetchEventos } = useQuery({ queryKey: ["eventos-membresia", identidade], queryFn: eventosMembresiaApi.list, enabled })

  const isLoading = loadingPessoas || loadingEventos

  // Sem fuso da igreja cadastrado, a referência é a data civil deste dispositivo.
  const hoje = dataCivilLocal(new Date())
  const { members, pendencias } = useMemo(() => montarRol(pessoas ?? [], eventos ?? [], hoje), [pessoas, eventos, hoje])
  return { pessoas, members, pendencias, isLoading, errorPessoas, errPessoas, refetchPessoas, errorEventos, errEventos, refetchEventos }
}
