import { BookUser, FileText, IdCard } from 'lucide-react'
import { Navigate, useSearchParams } from 'react-router'
import { WorkspaceHeader } from '../../components/shared/Workspace'
import { Abas, type Aba } from '../../components/ui/abas'
import { useNavegacao } from '../../hooks/use-navegacao'
import { usePermissions } from '../../hooks/use-permissions'
import { useAuthStore } from '../../stores/auth'
import { IndicadoresRol, ListagemRol } from './RolMembrosPage'
import { useDadosRol } from './useDadosRol'
import { GestaoMembresiaPage } from './GestaoMembresiaPage'
import { RelatoriosMembresia } from './RelatoriosMembresia'

export function AreaMembresia() {
  const [params, setParams] = useSearchParams()
  const navegacao = useNavegacao()
  const membresia = usePermissions('eventos-membresia')
  const pessoas = usePermissions('pessoas')
  const identidade = useAuthStore(s => `${s.user?.igreja_id}:${s.user?.sub}`)
  const abas: Aba[] = []
  const consultaRol = pessoas.canView && membresia.canView && !navegacao.isPending && !['gestao', 'relatorios'].includes(params.get('aba') ?? '')
  const dadosRol = useDadosRol(consultaRol)

  if (navegacao.isPending) return <p role="status">Consultando acessos…</p>
  if (!membresia.canView) return <Navigate to="/dashboard" replace />

  if (pessoas.canView) abas.push({ id: 'rol', nome: 'Listagem do Rol', icone: BookUser, conteudo: <ListagemRol dados={dadosRol} /> })
  abas.push(
    { id: 'gestao', nome: 'Gestão de Membresia', icone: IdCard, conteudo: <GestaoMembresiaPage /> },
    { id: 'relatorios', nome: 'Relatórios', icone: FileText, conteudo: <RelatoriosMembresia key={String(pessoas.canView)} podeConsultarPessoas={pessoas.canView} /> },
  )
  const ativa = abas.find(a => a.id === params.get('aba'))?.id ?? abas[0].id

  return <div className="workspace">
    <WorkspaceHeader icon={BookUser} title="Rol de Membros" description="Composição do rol, movimentações de membresia e emissão de relatórios." />
    {ativa === 'rol' && <IndicadoresRol dados={dadosRol} />}
    <Abas key={identidade} titulo="Seções do Rol de Membros" abas={abas} ativa={ativa} selecionar={aba => setParams(aba === 'rol' ? {} : { aba })} />
  </div>
}
