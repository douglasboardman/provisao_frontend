import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Church, UsersRound, Plus, BookOpen } from 'lucide-react'
import { pastoresApi, type CadastroPastor, type Pastor } from '../../api/pastores'
import { pessoasApi } from '../../api/pessoas'
import { ApiRequestError } from '../../api/client'
import type { AcessoSensivel } from '../../api/oficiais'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Painel, SecaoPainel } from '../../components/shared/Painel'
import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { CabecalhoPainel, dataCivil } from '../../components/shared/Workspace'
import { RegistrarPresidencia, EncerrarAutoridade } from '../orgaos/GestaoAutoridades'
import { GestaoOficial } from './GestaoOficial'

function FormularioPastor({ identidade, pastores, inicial, administrador, voltar }: { identidade: string; pastores: Pastor[]; inicial?: Pastor; administrador: boolean; voltar: () => void }) {
  const [v, setV] = useState<CadastroPastor>({ pessoa_id: inicial?.pessoa.id ?? '', funcao: 'AUXILIAR', modalidade: '', concilio: '', ato: '', inicio: '', evidencia: '' })
  const [ord, setOrd] = useState({ data: '', responsavel: '', documento: '' })
  const existente = pastores.find(p => p.pessoa.id === v.pessoa_id)
  const pessoas = useQuery({ queryKey: ['oficiais', identidade, 'pessoas'], queryFn: pessoasApi.list })
  const qc = useQueryClient()
  const salvar = useMutation({ mutationFn: () => pastoresApi.cadastrar({ ...v, ...(!existente?.eventos.length ? { ordenacao: ord } : {}) }), onSuccess: async () => {
    await Promise.all([qc.invalidateQueries({ queryKey: ['pastores', identidade] }), qc.invalidateQueries({ queryKey: ['oficiais', identidade] }), qc.invalidateQueries({ queryKey: ['orgaos', identidade] })]); voltar()
  } })
  const campo = (chave: 'modalidade' | 'concilio' | 'ato' | 'inicio' | 'evidencia', titulo: string, tipo = 'text') => <div className="space-y-1"><Label htmlFor={`pastor-${chave}`}>{titulo}</Label><Input id={`pastor-${chave}`} type={tipo} maxLength={1000} required value={v[chave]} onChange={e => setV({ ...v, [chave]: e.target.value })} /></div>
  return <SecaoPainel titulo={inicial ? `Novo vínculo · ${inicial.pessoa.nome_completo}` : 'Cadastrar pastor'} voltar={voltar} ocupado={salvar.isPending}>
    <form className="space-y-5" onSubmit={e => { e.preventDefault(); salvar.mutate() }}>
      <fieldset className="pastor-form-section"><legend>Identificação e função</legend><div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1"><Label htmlFor="pastor-pessoa">Pessoa vinculada</Label><SeletorPessoa id="pastor-pessoa" value={v.pessoa_id} onChange={id => setV({ ...v, pessoa_id: id })} required opcoes={pessoas.data?.map(p => ({ id: p.id, nome: p.nome_completo }))} />{pessoas.isError && <p role="alert">Não foi possível carregar as pessoas.</p>}</div>
        <div className="space-y-1"><Label htmlFor="pastor-funcao">Função na igreja</Label><select id="pastor-funcao" className="w-full rounded border p-2" value={v.funcao} onChange={e => setV({ ...v, funcao: e.target.value as CadastroPastor['funcao'] })}><option value="AUXILIAR">Pastor auxiliar</option>{administrador && <option value="PRESIDENTE">Pastor presidente do Conselho e da igreja</option>}</select></div>
      </div>{v.funcao === 'PRESIDENTE' && <p className="text-sm text-muted-foreground mt-3">A presidência do Conselho e da igreja será registrada a partir do início deste vínculo.</p>}</fieldset>
      <fieldset className="pastor-form-section"><legend>Ordenação pastoral</legend>{existente?.eventos.length ? <p>Ordenação já registrada em {dataCivil(existente.eventos[0].data_efeito)} · {existente.eventos[0].autoridade}.</p> : <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1"><Label htmlFor="ordenacao-data">Data da ordenação</Label><Input id="ordenacao-data" type="date" required value={ord.data} onChange={e => setOrd({ ...ord, data: e.target.value })} /></div>
        <div className="space-y-1"><Label htmlFor="ordenacao-responsavel">Responsável / concílio ordenador</Label><Input id="ordenacao-responsavel" required maxLength={1000} value={ord.responsavel} onChange={e => setOrd({ ...ord, responsavel: e.target.value })} /></div>
        <div className="space-y-1 md:col-span-2"><Label htmlFor="ordenacao-documento">Documento da ordenação</Label><Input id="ordenacao-documento" required maxLength={1000} value={ord.documento} onChange={e => setOrd({ ...ord, documento: e.target.value })} /></div>
      </div>}</fieldset>
      <fieldset className="pastor-form-section"><legend>Vínculo com a igreja</legend><div className="grid gap-4 md:grid-cols-2">
        {campo('inicio', 'Data de início', 'date')}{campo('modalidade', 'Modalidade do vínculo (efetivo, auxiliar, designado…)')}{campo('concilio', 'Concílio responsável')}{campo('ato', 'Ato de eleição ou designação')}
        <div className="md:col-span-2">{campo('evidencia', 'Referência documental do vínculo e da função')}</div>
      </div></fieldset>
      {salvar.isError && <p role="alert" className="text-destructive">{salvar.error instanceof ApiRequestError ? salvar.error.messages.join(' ') : 'Não foi possível salvar o pastor.'}</p>}
      <div className="flex flex-wrap gap-3 border-t pt-4"><Button disabled={salvar.isPending || !v.pessoa_id} type="submit">{salvar.isPending ? 'Salvando…' : 'Salvar cadastro pastoral'}</Button><Button type="button" variant="outline" disabled={salvar.isPending} onClick={voltar}>Cancelar</Button></div>
    </form>
  </SecaoPainel>
}

export function Pastores({ identidade, data, administrador, podeCadastrar, podeGerir, acesso }: { identidade: string; data: string; administrador: boolean; podeCadastrar: boolean; podeGerir: boolean; acesso?: AcessoSensivel }) {
  const lista = useQuery({ queryKey: ['pastores', identidade, data], queryFn: () => pastoresApi.listar(data), enabled: !!data })
  const [form, setForm] = useState<true | Pastor | null>(null)
  const [detalhe, setDetalhe] = useState<Pastor | null>(null)
  const [gerir, setGerir] = useState<Pastor | null>(null)
  const [presidencia, setPresidencia] = useState(false)
  const [encerrar, setEncerrar] = useState<string | null>(null)
  const presidente = lista.data?.find(p => p.funcao === 'PRESIDENTE')
  const auxiliares = lista.data?.filter(p => p.funcao !== 'PRESIDENTE' && p.ativo && p.vinculo_na_data) ?? []
  const demais = lista.data?.filter(p => p.funcao !== 'PRESIDENTE' && (!p.ativo || !p.vinculo_na_data)) ?? []
  const tabela = (itens: Pastor[]) => <div className="overflow-x-auto"><table className="record-table"><thead><tr><th>Pastor</th><th>Vínculo na data</th><th>Concílio</th><th>Ações</th></tr></thead><tbody>{itens.map(p => <tr key={p.id}><td data-label="Pastor"><strong>{p.pessoa.nome_completo}</strong><p className="text-xs text-muted-foreground">{p.ativo ? 'Cadastro ativo' : 'Cadastro inativo'}</p></td><td data-label="Vínculo na data">{p.vinculo_na_data ? <>{p.vinculo_na_data.modalidade}<p className="text-xs text-muted-foreground">Desde {dataCivil(p.vinculo_na_data.data_inicio)}</p></> : 'Sem vínculo vigente'}</td><td data-label="Concílio">{p.vinculo_na_data?.concilio ?? '—'}</td><td data-label="Ações"><Button variant="outline" size="sm" onClick={() => setDetalhe(p)}>Ver cadastro</Button></td></tr>)}</tbody></table></div>
  return <div className="surface pastores-panel"><Painel className="space-y-5">
    <CabecalhoPainel icone={Church} titulo="Equipe pastoral">{podeCadastrar && <Button disabled={lista.isPending || lista.isError || !data} onClick={() => setForm(true)}><Plus />Cadastrar pastor</Button>}</CabecalhoPainel>
    {!data ? <p>Selecione a data de referência.</p> : lista.isPending ? <p>Carregando pastores…</p> : lista.isError ? <p role="alert">Não foi possível consultar os pastores.</p> : <>
      <div className="pastor-presidencia"><div><span className="text-sm text-purple font-semibold">Presidência do Conselho e da igreja</span><h3 className="text-xl font-semibold mt-2">{presidente?.pessoa.nome_completo ?? 'Nenhuma presidência registrada na data'}</h3>{presidente ? <p className="text-sm text-muted-foreground mt-1">{presidente.vinculo_na_data?.concilio ?? 'Vínculo institucional não encontrado na data'}</p> : <p className="text-sm text-muted-foreground mt-1">Registre a presidência para identificar o pastor responsável pela igreja.</p>}</div><div className="flex flex-wrap gap-2">{presidente && <Button variant="outline" onClick={() => setDetalhe(presidente)}>Ver cadastro</Button>}{administrador && (!presidente ? <Button variant="outline" onClick={() => setPresidencia(true)}>Registrar presidência</Button> : <Button variant="outline" onClick={() => setEncerrar(presidente.presidencias_conselho.find(p => !p.fim)?.id ?? null)} disabled={!presidente.presidencias_conselho.some(p => !p.fim)}>Encerrar presidência</Button>)}</div></div>
      <section className="space-y-3"><CabecalhoPainel icone={UsersRound} titulo={presidente ? "Pastores auxiliares" : "Pastores vinculados"}><span className="pill">{auxiliares.length} na data</span></CabecalhoPainel>{auxiliares.length ? tabela(auxiliares) : <p className="pastor-empty">Nenhum pastor auxiliar com vínculo vigente nesta data.</p>}</section>
      {!!demais.length && <section className="space-y-3 border-t pt-4"><CabecalhoPainel icone={BookOpen} titulo="Outros registros pastorais" /><p className="text-sm text-muted-foreground">Cadastros sem vínculo vigente na data selecionada.</p>{tabela(demais)}</section>}
    </>}
    {form && <FormularioPastor identidade={identidade} pastores={lista.data ?? []} inicial={form === true ? undefined : form} administrador={administrador} voltar={() => setForm(null)} />}
    {presidencia && <RegistrarPresidencia identidade={identidade} aoFechar={() => setPresidencia(false)} />}
    {encerrar && <EncerrarAutoridade tipo="presidencia" id={encerrar} identidade={identidade} aoFechar={() => setEncerrar(null)} />}
    {detalhe && <SecaoPainel titulo={detalhe.pessoa.nome_completo} voltar={() => setDetalhe(null)}><div className="grid gap-4 lg:grid-cols-2">
      <section className="pastor-form-section"><h3 className="font-semibold mb-3">Ordenação pastoral</h3>{detalhe.eventos.length ? detalhe.eventos.map((e, i) => <dl className="pastor-dados" key={i}><dt>Data</dt><dd>{dataCivil(e.data_efeito)}</dd><dt>Responsável</dt><dd>{e.autoridade}</dd><dt>Documento</dt><dd>{e.evidencia}</dd></dl>) : <p>Ordenação ainda não registrada.</p>}</section>
      <section className="pastor-form-section"><h3 className="font-semibold mb-3">Função em {dataCivil(data)}</h3><p>{detalhe.funcao === 'PRESIDENTE' ? 'Pastor presidente do Conselho e da igreja' : detalhe.vinculo_na_data ? (presidente ? 'Pastor auxiliar' : 'Vínculo pastoral ativo · presidência não registrada') : 'Sem vínculo vigente'}</p></section>
    </div><section className="space-y-3"><h3 className="font-semibold">Vínculos pastorais</h3>{detalhe.vinculos_pastorais.length ? detalhe.vinculos_pastorais.map(v => <article key={v.id} className="pastor-form-section"><h4 className="font-semibold">{v.modalidade} · {v.concilio}</h4><p className="text-sm my-2">{dataCivil(v.data_inicio)} — {v.data_fim ? dataCivil(v.data_fim) : 'Sem encerramento registrado'}</p><dl className="pastor-dados"><dt>Ato</dt><dd>{v.ato}</dd><dt>Documento</dt><dd>{v.evidencia}</dd></dl></article>) : <p>Nenhum vínculo registrado.</p>}</section><div className="flex flex-wrap gap-3 border-t pt-4">{podeCadastrar && !detalhe.vinculos_pastorais.some(v => !v.data_fim) && <Button onClick={() => { setForm(detalhe); setDetalhe(null) }}>Registrar novo vínculo</Button>}{podeGerir && <Button variant="outline" onClick={() => { setGerir(detalhe); setDetalhe(null) }}>Gerir registros pastorais</Button>}</div></SecaoPainel>}
    {gerir && <GestaoOficial oficial={gerir} identidade={identidade} podeConsultarDetalhe={!!acesso?.pode_consultar} acesso={acesso} voltar={() => setGerir(null)} />}
  </Painel></div>
}
