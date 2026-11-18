import { useState, useCallback } from "react"

export type ModalEntry =
  | { type: "familia"; grupo: { id: string; nome_familia: string } }
  | { type: "pessoa-edit"; pessoaId: string | null }
  | { type: "historico"; pessoaId: string }

export function useModalStack() {
  const [stack, setStack] = useState<ModalEntry[]>([])
  const current = stack[stack.length - 1] ?? null
  const hasBack = stack.length > 1
  const push = useCallback((entry: ModalEntry) => setStack((s) => [...s, entry]), [])
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), [])
  const closeAll = useCallback(() => setStack([]), [])
  return { current, hasBack, push, pop, closeAll }
}
