import { usePermissions } from '../../hooks/use-permissions'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/auth'
import { secretariaApi } from '../../api/secretaria'
import { origensCampo, tiposCampo, type CampoIgreja, type DefinicaoCampo } from '../../api/campos'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog'
import { Campo, Check, Escolha, useComando } from './formulario'

export function useBiblioteca() {
  const permissoes = usePermissions('campos-secretaria')
  const user = useAuthStore(s => s.user)
  const chave = ['secretaria', 'biblioteca', user?.igreja_id, user?.sub]
  const consulta = useQuery({ queryKey: chave, queryFn: secretariaApi.camposBiblioteca, enabled: !!user })
  return { ...consulta, chave, gerencia: permissoes.canEdit }
}

export function CadastroCampo({ campo, nome = '', concluir, cancelar }: { campo?: CampoIgreja; nome?: string; concluir: (c: CampoIgreja) => void; cancelar: () => void }) {
  const [d, set] = useState<DefinicaoCampo>({ nome: campo?.nome ?? nome, tipo: campo?.tipo ?? 'texto', multiplo: campo?.multiplo ?? false, origem: campo?.origem ?? 'manual' })
  const [ativo, setAtivo] = useState(campo?.ativo ?? true)
  const { chave } = useBiblioteca()
  const client = useQueryClient()
  const enviar = useComando((v: DefinicaoCampo) => campo ? secretariaApi.editarCampo(campo.id, { ...v, revisao: campo.revisao, ativo }) : secretariaApi.criarCampo(v), r => {
    const novo = r as CampoIgreja
    client.setQueryData<CampoIgreja[]>(chave, atuais => [...(atuais ?? []).filter(c => c.id !== novo.id), novo].sort((a,b) => a.nome.localeCompare(b.nome)))
    concluir(novo)
  }, JSON.stringify([chave, campo?.id, ativo]))
  return <div className="space-y-3">
    <Campo label="Nome do campo" required={false} value={d.nome} onChange={nome => set({ ...d, nome })}/>
    <Escolha label="Origem do valor" value={d.origem} onChange={s => {
      const origem = s as DefinicaoCampo['origem']
      set({ ...d, origem, ...(origem === 'manual' ? {} : { multiplo: ['presentes', 'pauta_reuniao', 'deliberacoes_reuniao'].includes(origem), tipo: ['numero_documento','numero_livro','capacidade_folhas_livro'].includes(origem) ? 'numero' : ['data_documento','data_prevista_reuniao'].includes(origem) ? 'data' : 'texto' }) })
    }}>{Object.entries(origensCampo).map(([k,v]) => <option value={k} key={k}>{v}</option>)}</Escolha>
    {d.origem === 'manual' ? <><Escolha label="Tipo de valor" value={d.tipo} onChange={s => set({ ...d, tipo: s as DefinicaoCampo['tipo'] })}>{Object.entries(tiposCampo).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</Escolha>
      <Check label="Aceita vários valores" checked={d.multiplo} onChange={multiplo => set({ ...d, multiplo })}/></> : <p>{tiposCampo[d.tipo]} · {d.multiplo ? 'Vários valores' : 'Valor único'}</p>}
    {campo && <Check label="Campo ativo" checked={ativo} onChange={setAtivo}/>}
    {enviar.error && <p role="alert">{enviar.error.message}</p>}
    <div className="flex gap-2"><Button type="button" disabled={enviar.isPending || !d.nome.trim() || d.nome.trim().length > 120} onClick={() => enviar.mutate(d)}>Salvar campo</Button>
      <Button type="button" variant="outline" onClick={cancelar}>Cancelar cadastro</Button></div>
  </div>
}

export function BibliotecaCampos() {
  const b = useBiblioteca()
  const [busca, buscar] = useState('')
  const [edicao, editar] = useState<CampoIgreja | 'novo' | null>(null)
  const porPagina = 8
  const [pagina, irPara] = useState(0)
  const filtrados = b.data?.filter(c => [c.nome, c.codigo].join(' ').toLocaleLowerCase().includes(busca.toLocaleLowerCase()))
  const paginas = Math.ceil((filtrados?.length ?? 0) / porPagina)
  const atual = Math.min(pagina, Math.max(0, paginas - 1))
  return <section className="space-y-3 rounded border p-4"><h3 className="font-semibold">Biblioteca de campos</h3>
    <Campo label="Pesquisar campos da igreja" value={busca} onChange={s => { buscar(s); irPara(0) }} required={false}/>
    {b.gerencia && <Button type="button" onClick={() => editar('novo')}>Novo campo</Button>}
    {b.isLoading && <p>Carregando campos…</p>}{b.error && <p role="alert">{b.error.message}</p>}
    <ul className="divide-y">{filtrados?.slice(atual * porPagina, (atual + 1) * porPagina).map(c => <li key={c.id} className="flex items-center justify-between gap-2 py-2"><span>{c.nome}<small className="block text-muted-foreground">{tiposCampo[c.tipo]} · {origensCampo[c.origem]}{c.multiplo && ' · Múltiplo'}{!c.ativo && ' · Desativado'}</small></span>
      {b.gerencia && <Button type="button" variant="outline" aria-label={'Editar '+c.nome} onClick={() => editar(c)}>Editar</Button>}</li>)}</ul>
    {paginas > 1 && <nav aria-label="Páginas da biblioteca de campos" className="flex items-center gap-2">
      <Button variant="outline" disabled={atual === 0} onClick={() => irPara(atual - 1)}>Anterior</Button>
      <span className="text-sm" aria-live="polite">Página {atual + 1} de {paginas}</span>
      <Button variant="outline" disabled={atual + 1 === paginas} onClick={() => irPara(atual + 1)}>Próxima</Button>
    </nav>}
    {filtrados?.length === 0 && <p>Nenhum campo encontrado.</p>}
    {edicao && <Dialog open onOpenChange={aberto => { if (!aberto) editar(null) }}><DialogContent><DialogTitle>{edicao === 'novo' ? 'Novo campo' : 'Editar campo'}</DialogTitle><DialogDescription>Biblioteca da igreja</DialogDescription>
      <CadastroCampo campo={edicao === 'novo' ? undefined : edicao} concluir={() => editar(null)} cancelar={() => editar(null)}/></DialogContent></Dialog>}
  </section>
}
