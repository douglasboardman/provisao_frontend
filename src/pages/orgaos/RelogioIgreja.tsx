import { createContext, useContext, type ReactNode } from 'react'

const RelogioContexto = createContext<string | null>(null)

export function RelogioIgreja({ dia, children }: { dia: string; children: ReactNode }) {
  return <RelogioContexto.Provider value={dia}>{children}</RelogioContexto.Provider>
}

export function useHojeIgreja() {
  return useContext(RelogioContexto) ?? new Date().toISOString().slice(0, 10)
}
