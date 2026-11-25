import { nomeFinalidade } from './catalogoModelos'
import { useState } from 'react'
import { useAbrirEditor } from './editor/navegacao'
import { finalidadeTermo, politicaLivro, secretariaApi, type ContextoSecretaria, type ModeloDocumento } from '../../api/secretaria'
import { colunaDetalhe, TabelaSecretaria } from './TabelaSecretaria'
import { Eye, Pencil } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { useComando } from './formulario'
import { BibliotecaCampos } from './BibliotecaCampos'
import { PaineisSecretaria, type AbaSecretaria } from './PaineisSecretaria'

function registroModelo(v: Pick<ModeloDocumento['versoes'][number], 'finalidade' | 'configuracao'>) {
  if (finalidadeTermo(v.finalidade)) return 'Termo de livro'
  return { OBRIGATORIO: 'Obrigatório', OPCIONAL: 'Opcional', NAO_PERMITE: 'Sem registro' }[politicaLivro(v.configuracao)]
}

export function ModelosContexto({ contexto, gerencia, modelos }: {
  contexto: ContextoSecretaria; gerencia: boolean; modelos?: ModeloDocumento[]
}) {
  const [aba, selecionar] = useState('lista')
  const abrir = useAbrirEditor(contexto.id)
  const iniciar = useComando<{ id: string; revisao: number }>(({ id, ...dados }) =>
    secretariaApi.iniciarEdicaoModelo(id, dados), r => abrir('modelos', r.id))
  function editar(m: ModeloDocumento) {
    if (m.estado === 'EM_EDICAO') abrir('modelos', m.id)
    else iniciar.mutate({ id: m.id, revisao: m.revisao })
  }
  const contextual = contexto.registro_livro === false
  const abas: AbaSecretaria[] = [
    { id: 'lista', nome: 'Modelos cadastrados', conteudo: <div className="space-y-3">
      {gerencia && <Button onClick={() => abrir('modelos')}>Novo modelo</Button>}
      {iniciar.error && <p role="alert">{iniciar.error.message}</p>}
      {modelos?.length === 0 && <p>Nenhum modelo cadastrado.</p>}
      {!!modelos?.length && <TabelaSecretaria nome="Modelos cadastrados" principais={['Modelo', 'Situação', 'Ações']} colunas={['Modelo', 'Tipo', 'Finalidade', 'Registro em livro', 'Situação', 'Última versão', 'Ações']}>
        {modelos.map(m => {
          const publicada = m.versoes[0]
          const dados = m.rascunho ?? publicada
          const emEdicao = m.estado === 'EM_EDICAO'
          return <tr key={m.id}>
            <td className="font-medium">{m.rascunho?.nome ?? m.nome}</td>
            <td className={colunaDetalhe}>{dados ? (dados.tipo === 'ATA' ? 'Ata' : 'Outro') : '—'}</td>
            <td className={colunaDetalhe}>{dados ? nomeFinalidade(dados.finalidade) : '—'}</td>
            <td className={colunaDetalhe}>{dados ? registroModelo(dados) : '—'}</td>
            <td><span className={'inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ' + (emEdicao ? 'bg-muted text-muted-foreground' : 'bg-purple/10 text-purple')}>{emEdicao ? 'Em edição' : 'Publicado'}</span>{!emEdicao && !dados?.configuracao.atuacao && <small className="mt-1 block text-muted-foreground">Definir cargos para uso</small>}</td>
            <td className={colunaDetalhe}>{publicada ? 'v' + publicada.numero : '—'}</td>
            <td><div className="flex items-center gap-1.5">
              {publicada && <Button size="sm" variant="outline" title="Consultar" onClick={() => abrir('modelos', m.id, { versao: publicada.id })}><Eye aria-hidden="true"/><span className="sr-only md:not-sr-only">Consultar</span></Button>}
              {gerencia && <Button size="sm" variant="outline" title={emEdicao ? 'Continuar edição' : 'Editar'} disabled={iniciar.isPending} onClick={() => editar(m)}><Pencil aria-hidden="true"/><span className="sr-only md:not-sr-only">{emEdicao ? 'Continuar edição' : 'Editar'}</span></Button>}
              {!publicada && !gerencia && '—'}
            </div></td>
          </tr>
        })}
      </TabelaSecretaria>}
    </div> },
    ...(!contextual ? [{ id: 'campos', nome: 'Campos da igreja', conteudo: <BibliotecaCampos/> }] : []),
  ]
  return <PaineisSecretaria titulo="Modelos do contexto" abas={abas} ativa={aba} selecionar={selecionar}/>
}
