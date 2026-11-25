import { useState } from 'react'
import { tiposCampo, type DefinicaoCampo } from '../../api/campos'
import { SeletorPessoa as SeletorPorNome } from '../../components/shared/SeletorPessoa'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog'
import { CadastroCampo, useBiblioteca } from './BibliotecaCampos'
import { TabelaSecretaria } from './TabelaSecretaria'
import { nomesDeCadastro, type Procedencias } from './procedenciaCampos'

interface Props {
  procedencias?: Procedencias
  ids: string[]
  codigosAntigos: string[]
  definicoes: Record<string, DefinicaoCampo>
  incluir: (id: string) => void
  remover: (id: string) => void
  removerCodigo: (codigo: string) => void
}

export function CamposObrigatoriosModelo({ procedencias = {}, ids, codigosAntigos, definicoes, incluir, remover, removerCodigo }: Props) {
  const biblioteca = useBiblioteca()
  const [escolha, escolher] = useState('')
  const [novo, abrirNovo] = useState(false)
  const nomes = nomesDeCadastro(definicoes, procedencias)
  const rotulo = (id: string) => [nomes[id], procedencias[id]?.detalhe].filter(Boolean).join(' · ')
  const opcoes = (biblioteca.data ?? []).filter(c => c.ativo && !ids.includes(c.id) && !(c.codigo && codigosAntigos.includes(c.codigo)))
  const linhas = ids.map(id => ({ chave: id, nome: rotulo(id) || 'Campo indisponível',
    tipo: definicoes[id] ? tiposCampo[definicoes[id].tipo] : '—', remover: () => remover(id) }))
  for (const codigo of codigosAntigos) {
    const campo = biblioteca.data?.find(c => c.codigo === codigo)
    linhas.push({ chave: codigo, nome: campo?.nome ?? codigo, tipo: campo ? tiposCampo[campo.tipo] : 'Por código', remover: () => removerCodigo(codigo) })
  }
  const cheio = ids.length >= 100
  return <section className="space-y-2" aria-label="Campos obrigatórios">
    <h4 className="font-medium">Campos obrigatórios</h4>
    <div className="flex flex-wrap items-start gap-2">
      <SeletorPorNome rotulo="Pesquisar campo da biblioteca" placeholder="Pesquisar campo da biblioteca" opcoes={opcoes.map(c => ({ id: c.id, nome: rotulo(c.id) || c.nome }))} value={escolha} onChange={escolher} carregando={biblioteca.isLoading} disabled={cheio}/>
      <Button type="button" variant="outline" disabled={cheio || !opcoes.some(c => c.id === escolha)} onClick={() => { incluir(escolha); escolher('') }}>Incluir</Button>
      {biblioteca.gerencia && <Button type="button" variant="outline" disabled={cheio} onClick={() => abrirNovo(true)}>Novo</Button>}
    </div>
    {biblioteca.error && <p role="alert">{biblioteca.error.message}</p>}
    <TabelaSecretaria nome="Campos obrigatórios do modelo" colunas={['Campo', 'Tipo', 'Ação']}>
      {linhas.map(linha => <tr key={linha.chave}><td>{linha.nome}</td><td>{linha.tipo}</td><td><Button type="button" size="sm" variant="ghost" aria-label={'Remover ' + linha.nome} onClick={linha.remover}>Remover</Button></td></tr>)}
      {!linhas.length && <tr><td colSpan={3} className="text-muted-foreground">Nenhum campo obrigatório.</td></tr>}
    </TabelaSecretaria>
    {novo && <Dialog open onOpenChange={abrirNovo}><DialogContent><DialogTitle>Novo campo</DialogTitle>
      <DialogDescription>O campo será cadastrado na biblioteca da igreja e incluído neste modelo.</DialogDescription>
      <CadastroCampo concluir={campo => { incluir(campo.id); escolher(''); abrirNovo(false) }} cancelar={() => abrirNovo(false)}/>
    </DialogContent></Dialog>}
  </section>
}
