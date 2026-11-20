import type { ReactNode } from 'react'
import logoAssinatura from '../../assets/logo-assinatura.png'

interface AuthCardProps {
  title: string
  children: ReactNode
}

export function AuthCard({ title, children }: AuthCardProps) {
  return (
    <div className="flex w-full flex-col sm:flex-row max-w-3xl overflow-hidden rounded-2xl shadow-xl">
      {/* Painel esquerdo — branco */}
      <div className="flex w-full sm:w-5/12 flex-col items-center justify-center bg-white p-4 sm:p-10">
        <img src={logoAssinatura} alt="ProVisão" className="h-16 sm:h-auto sm:w-48 object-contain" />
        <p className="hidden sm:block mt-3 text-sm text-gray-400">Gestão Eclesiástica</p>
      </div>

      {/* Painel direito — roxo */}
      <div className="flex w-full sm:w-7/12 flex-col bg-[#6a489b] p-5 sm:p-10 text-white">
        <h2 className="mb-6 text-3xl font-light text-white">{title}</h2>
        {children}
      </div>
    </div>
  )
}
