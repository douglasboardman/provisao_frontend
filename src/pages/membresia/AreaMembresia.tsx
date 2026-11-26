import { BookUser } from 'lucide-react'
import { Navigate, useSearchParams } from 'react-router'
import { WorkspaceHeader } from '../../components/shared/Workspace'
import { Abas, type Aba } from '../../components/ui/abas'
import { useNavegacao } from '../../hooks/use-navegacao'
import { usePermissions } from '../../hooks/use-permissions'
import { useAuthStore } from '../../stores/auth'
import { RolMembrosPage } from './RolMembrosPage'
import { GestaoMembresiaPage } from './GestaoMembresiaPage'
import { RelatoriosMembresia } from './RelatoriosMembresia'

export function AreaMembresia() {
  const [params, setParams] = useSearchParams()
  const navegacao = useNavegacao()
  const membresia = usePermissions('eventos-membresia')
  const pessoas = usePermissions('pessoas')
  const identidade = useAuthStore(s => `${s.user?.igreja_id}:${s.user?.sub}`)
  const abas: Aba[] = []

  if (navegacao.isPending) return <p role="status">Consultando acessos…</p>
  if (!membresia.canView) return <Navigate to="/dashboard" replace />

  if (pessoas.canView) abas.push({ id: 'rol', nome: 'Listagem do Rol', conteudo: <RolMembrosPage dentroDaArea /> })
  abas.push(
    { id: 'gestao', nome: 'Gestão de Membresia', conteudo: <GestaoMembresiaPage /> },
    { id: 'relatorios', nome: 'Relatórios', conteudo: <RelatoriosMembresia key={String(pessoas.canView)} podeConsultarPessoas={pessoas.canView} /> },
  )
  const ativa = abas.find(a => a.id === params.get('aba'))?.id ?? abas[0].id

  return <div className="workspace">
    <WorkspaceHeader icon={BookUser} title="Rol de Membros" description="Composição do rol, movimentações de membresia e emissão de relatórios." />
    <Abas key={identidade} titulo="Seções do Rol de Membros" abas={abas} ativa={ativa} selecionar={aba => setParams(aba === 'rol' ? {} : { aba })} />
  </div>
}
