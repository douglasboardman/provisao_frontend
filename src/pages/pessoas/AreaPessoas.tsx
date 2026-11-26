import { ContactRound } from 'lucide-react'
import { Navigate, useSearchParams } from 'react-router'
import { WorkspaceHeader } from '../../components/shared/Workspace'
import { Abas, type Aba } from '../../components/ui/abas'
import { useNavegacao } from '../../hooks/use-navegacao'
import { usePermissions } from '../../hooks/use-permissions'
import { GruposFamiliaresPage } from '../grupos-familiares/GruposFamiliaresPage'
import { PessoasPage } from './PessoasPage'

export function AreaPessoas() {
  const [params, setParams] = useSearchParams()
  const navegacao = useNavegacao()
  const pessoas = usePermissions('pessoas')
  const familias = usePermissions('grupos-familiares')
  const abas: Aba[] = []

  if (pessoas.canView || pessoas.canCreate) abas.push({ id: 'pessoas', nome: 'Pessoas', conteudo: <PessoasPage /> })
  if (familias.canView) abas.push({ id: 'grupos-familiares', nome: 'Grupos Familiares', conteudo: <GruposFamiliaresPage /> })

  if (navegacao.isPending) return <p role="status">Consultando acessos…</p>
  if (!abas.length) return <Navigate to="/dashboard" replace />
  const ativa = abas.find(a => a.id === params.get('aba'))?.id ?? abas[0].id

  return <div className="workspace">
    <WorkspaceHeader icon={ContactRound} title="Pessoas" description="Cadastros individuais e grupos familiares da igreja." />
    <Abas titulo="Cadastros de pessoas" abas={abas} ativa={ativa} selecionar={aba => setParams(aba === 'pessoas' ? {} : { aba })} />
  </div>
}
