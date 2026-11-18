import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Mail, ExternalLink, ArrowLeft } from 'lucide-react'
import { apiClient } from '../../api/client'
import { AuthCard } from '../../components/layout/AuthCard'

export function SobrePage() {
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    apiClient
      .get<{ version: string }>('version')
      .then((data) => setVersion(data.version))
      .catch(() => setVersion(null))
  }, [])

  return (
    <AuthCard title="Sobre o ProVisão">
      <div
        className="flex flex-col gap-4 overflow-y-auto text-sm text-white/90"
        style={{ maxHeight: '65vh' }}
      >
        <p className="font-semibold text-white">
          ProVisão — Gestão Eclesiástica Especializada para Igrejas Presbiterianas.
        </p>
        <p>
          Aplicação para Gestão Administrativa e Financeira de Igrejas que fornece
          módulos de Secretaria, para gestão completa de rol de membros normatizado
          a partir da Constituição da IPB; módulo financeiro, para controle e registro
          de lançamentos financeiros mensais da igreja com atribuição de comprovantes
          e emissão de balancetes e relatórios diversos; Módulo de auditoria, para
          Comissão de Exame de Contas e outras ferramentas relacionadas a Administração
          de igrejas Presbiterianas do Brasil.
        </p>

        <hr className="border-white/20" />

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">
            Desenvolvedor
          </p>
          <p className="mb-2 font-semibold text-white">
            Douglas Ricardo Boardman dos Reis
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="mailto:douglas.boardman@gmail.com"
              className="flex items-center gap-2 text-white/70 transition-colors hover:text-white"
            >
              <Mail size={14} />
              douglas.boardman@gmail.com
            </a>
            <a
              href="https://github.com/douglasboardman"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-white/70 transition-colors hover:text-white"
            >
              <ExternalLink size={14} />
              github.com/douglasboardman
            </a>
          </div>
        </div>

        <hr className="border-white/20" />

        <p className="text-xs text-white/50">
          Versão {version ? `v${version}` : '—'}
        </p>

        <Link
          to="/login"
          className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
        >
          <ArrowLeft size={14} />
          Voltar ao login
        </Link>
      </div>
    </AuthCard>
  )
}
