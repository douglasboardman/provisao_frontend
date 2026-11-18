import { useRef } from 'react'

/** Reenvio do mesmo conteúdo mantém a chave; uma edição inicia outro pedido. */
export function useIdempotencia() {
  const tentativa = useRef<{ conteudo: string; id: string } | null>(null)
  function obter(valor: unknown) {
    const conteudo = JSON.stringify(valor)
    if (tentativa.current?.conteudo !== conteudo) tentativa.current = { conteudo, id: crypto.randomUUID() }
    return tentativa.current.id
  }
  function limpar() { tentativa.current = null }
  return { obter, limpar }
}
