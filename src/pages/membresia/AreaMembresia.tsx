import { BookUser, FileText, IdCard } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router'
import { WorkspaceHeader } from '../../components/shared/Workspace'
import { Abas, type Aba } from '../../components/ui/abas'
import { useNavegacao } from '../../hooks/use-navegacao'
import { usePermissions } from '../../hooks/use-permissions'
import { useAuthStore } from '../../stores/auth'
import { IndicadoresRol, ListagemCategoriaRol, ListagemRol } from './RolMembrosPage'
import { CATEGORY_ORDER, ROTAS_ROL } from './dados-rol'
import { useDadosRol } from './useDadosRol'
import { GestaoMembresiaPage } from './GestaoMembresiaPage'
import { RelatoriosMembresia } from './RelatoriosMembresia'

export function AreaMembresia() {
  const [params, setParams] = useSearchParams()
  const { rol } = useParams()
  const [considerarNaoArrolados, setConsiderarNaoArrolados] = useState(false)
  const navegacao = useNavegacao()
  const membresia = usePermissions('eventos-membresia')
  const pessoas = usePermissions('pessoas')
  const identidade = useAuthStore(s => `${s.user?.igreja_id}:${s.user?.sub}`)
  const abas: Aba[] = []
  const categoria = CATEGORY_ORDER.find(key => ROTAS_ROL[key] === rol)
  const consultaRol = pessoas.canView && membresia.canView && !navegacao.isPending &&
    (rol ? Boolean(categoria) : !['gestao', 'relatorios'].includes(params.get('aba') ?? ''))
  const dadosRol = useDadosRol(consultaRol)

  if (navegacao.isPending) return <p role="status">Consultando acessos…</p>
  if (!membresia.canView) return <Navigate to="/dashboard" replace />
  if (rol) {
    if (!categoria || !pessoas.canView) return <Navigate to="/rol-membros" replace />
    return <div className="workspace">
      <WorkspaceHeader icon={BookUser} title="Rol de Membros" />
      <ListagemCategoriaRol key={categoria} dados={dadosRol} categoria={categoria} />
    </div>
  }

  if (pessoas.canView) abas.push({ id: 'rol', nome: 'Listagem do Rol', icone: BookUser, conteudo: <ListagemRol dados={dadosRol} /> })
  abas.push(
    { id: 'gestao', nome: 'Gestão de Membresia', icone: IdCard, conteudo: <GestaoMembresiaPage /> },
    { id: 'relatorios', nome: 'Relatórios', icone: FileText, conteudo: <RelatoriosMembresia key={String(pessoas.canView)} podeConsultarPessoas={pessoas.canView} /> },
  )
  const ativa = abas.find(a => a.id === params.get('aba'))?.id ?? abas[0].id
  const exibirRol = ativa === 'rol'

  return <div className="workspace">
    <WorkspaceHeader icon={BookUser} title="Rol de Membros" description="Composição do rol, movimentações de membresia e emissão de relatórios." />
    {exibirRol && <IndicadoresRol dados={dadosRol} considerarNaoArrolados={considerarNaoArrolados} />}
    <Abas key={identidade} titulo="Seções do Rol de Membros" abas={abas} ativa={ativa}
      selecionar={aba => setParams(aba === 'rol' ? {} : { aba })}
      controle={exibirRol ? <label className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 text-sm font-medium">
        <input className="peer sr-only" type="checkbox" role="switch" checked={considerarNaoArrolados}
          onChange={e => setConsiderarNaoArrolados(e.target.checked)} />
        <span aria-hidden="true" className="relative h-5 w-9 shrink-0 rounded-full bg-muted-foreground/60 transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-purple peer-checked:after:translate-x-4 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-purple" />
        Considerar Não Arrolados
      </label> : undefined} />
  </div>
}
