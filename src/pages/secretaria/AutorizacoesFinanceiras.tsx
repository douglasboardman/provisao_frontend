import { Painel, SecaoPainel } from '../../components/shared/Painel'
import { Scale, type LucideIcon } from 'lucide-react'
import { CabecalhoPainel } from '../../components/shared/Workspace'
import { useRecurso } from '../../lib/recursos'
import { useState, useRef, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '../../api/client'
import { referenciasAtaApi, situacoesAta, tiposFinanceiros } from '../../api/referencias-ata'
import { PaginacaoAta, ReferenciaAta } from '../../components/shared/ReferenciaAta'
import { Abas } from '../../components/ui/abas'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { formatarDataCivil } from '../../lib/membresia-temporal'
import { useAuthStore } from '../../stores/auth'
import { usePermissions } from '../../hooks/use-permissions'

type DadosAutorizacoes = {
  projetos?: { id: string; nome: string }[]
  contas?: { id: string; descricao: string }[]
  selecao?: 'projetos' | 'contas' | 'ambos'
}

export function AutorizacoesFinanceiras({ projetos = [], contas = [], selecao = 'ambos' }: DadosAutorizacoes) {
  const { canView } = usePermissions('autorizacoes-financeiras')
  const secretariaHabilitada = useRecurso('secretaria')
  const usuario = useAuthStore(s => s.user)
  if (!secretariaHabilitada || !usuario || !canView) return null
  const identidade = `${usuario.igreja_id}:${usuario.sub}`
  return <ListaAutorizacoes key={identidade} identidade={identidade} projetos={projetos} contas={contas} selecao={selecao} />
}

export function DadosFinanceiros({ nome, icone, children, ...dados }: DadosAutorizacoes & {
  nome: string; icone: LucideIcon; children: ReactNode
}) {
  const { canView } = usePermissions('autorizacoes-financeiras')
  const secretariaHabilitada = useRecurso('secretaria')
  const perfil = useAuthStore(s => s.user?.perfil)
  const [aba, selecionar] = useState('cadastros')
  if (!secretariaHabilitada || !perfil || !canView) return children
  return <Abas titulo={`Seções de ${nome.toLocaleLowerCase('pt-BR')}`} ativa={aba} selecionar={selecionar} abas={[
    { id: 'cadastros', nome, icone, manter: true, conteudo: children },
    { id: 'autorizacoes', nome: 'Autorizações documentadas', icone: Scale, conteudo: <AutorizacoesFinanceiras {...dados} /> },
  ]} />
}

function ListaAutorizacoes({ identidade, projetos, contas, selecao }: {
  identidade: string; projetos: { id: string; nome: string }[]; contas: { id: string; descricao: string }[]
  selecao: 'projetos' | 'contas' | 'ambos'
}) {
  const [filtro, setFiltro] = useState('')
  const [pagina, setPagina] = useState(0)
  const [preparar, setPreparar] = useState(false)
  const [tipo, setTipo] = useState<keyof typeof tiposFinanceiros>('ORCAMENTO')
  const [alvo, setAlvo] = useState('')
  const [novo, setNovo] = useState('')
  const idempotencia = useRef<string | null>(null)
  const client = useQueryClient()
  const chave = ['referencias-ata', identidade]
  const consulta = useQuery({
    queryKey: [...chave, 'financeiro', pagina, filtro],
    queryFn: () => referenciasAtaApi.autorizacoes(pagina, filtro.startsWith('p:') ? filtro.slice(2) : undefined, filtro.startsWith('c:') ? filtro.slice(2) : undefined),
    gcTime: 0,
  })
  const cadastro = useMutation({
    mutationFn: (dados: unknown) => referenciasAtaApi.registrarAutorizacao(dados),
    onSuccess: async r => { setNovo(r.id); setPreparar(false); idempotencia.current = null; await client.invalidateQueries({ queryKey: chave }) },
  })
  function registrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const campos = new FormData(e.currentTarget)
    if (!campos.has('decisao_ocorreu')) return
    idempotencia.current ??= crypto.randomUUID()
    cadastro.mutate({
      idempotencia: idempotencia.current, tipo, assunto: campos.get('assunto'), autoridade: campos.get('autoridade'),
      evidencia: campos.get('evidencia'), data_decisao: campos.get('data_decisao'), decisao_ocorreu: true,
      ...(alvo.startsWith('p:') ? { projeto_id: alvo.slice(2) } : alvo.startsWith('c:') ? { conta_id: alvo.slice(2) } : {}),
    })
  }
  const exigeProjeto = tipo === 'APROVACAO_PROJETO' || tipo === 'ENCERRAMENTO_PROJETO'
  const exigeConta = tipo === 'CONTA_SIGNATARIOS'
  const opcoes = <>
    {selecao !== 'contas' && projetos.map(p => <option key={p.id} value={`p:${p.id}`}>{p.nome}</option>)}
    {selecao !== 'projetos' && contas.map(c => <option key={c.id} value={`c:${c.id}`}>{c.descricao}</option>)}
  </>
  return <div className="space-y-4">
    {(projetos.length > 0 || contas.length > 0) && <section aria-label="Filtros de autorizações" className="surface">
      <label className="grid max-w-md gap-1.5 text-sm font-medium">Filtrar por projeto ou conta
        <select className="h-10 rounded-lg border border-input bg-card px-3" value={filtro} onChange={e => { setFiltro(e.target.value); setPagina(0) }}>
          <option value="">Todas as autorizações</option>{opcoes}
        </select>
      </label>
    </section>}
    <section className="surface"><Painel>
      <CabecalhoPainel icone={Scale} titulo="Autorizações financeiras documentadas">
        {consulta.data?.pode_criar && <Button type="button" variant="outline" onClick={() => { setPreparar(true); setNovo(''); setAlvo(filtro); cadastro.reset(); idempotencia.current = null }}>
          Registrar decisão financeira
        </Button>}
      </CabecalhoPainel>
      {preparar && consulta.data?.pode_criar && <SecaoPainel titulo="Registrar decisão financeira" voltar={() => setPreparar(false)} ocupado={cadastro.isPending}><form className="space-y-3" onSubmit={registrar}>
        <label className="block">Tipo de decisão <select className="block rounded border bg-background p-2" value={tipo} onChange={e => { setTipo(e.target.value as keyof typeof tiposFinanceiros); setAlvo('') }}>
          {Object.entries(tiposFinanceiros).filter(([id]) =>
            (selecao !== 'contas' || !['APROVACAO_PROJETO', 'ENCERRAMENTO_PROJETO'].includes(id)) &&
            (selecao !== 'projetos' || id !== 'CONTA_SIGNATARIOS')).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
        </select></label>
        <label className="block">Projeto ou conta <select className="block rounded border bg-background p-2" value={alvo} onChange={e => setAlvo(e.target.value)} required={exigeProjeto || exigeConta}>
          <option value="">{exigeProjeto || exigeConta ? 'Selecione' : 'Sem projeto ou conta'}</option>
          {!exigeConta && selecao !== 'contas' && projetos.map(p => <option key={p.id} value={`p:${p.id}`}>{p.nome}</option>)}
          {!exigeProjeto && selecao !== 'projetos' && contas.map(c => <option key={c.id} value={`c:${c.id}`}>{c.descricao}</option>)}
        </select></label>
        <label className="block">Assunto<Input name="assunto" maxLength={255} required /></label>
        <label className="block">Data da decisão<Input name="data_decisao" type="date" required /></label>
        <label className="block">Autoridade que decidiu<Input name="autoridade" maxLength={255} required /></label>
        <label className="block">Evidência da decisão<Textarea name="evidencia" maxLength={1000} required /></label>
        <label className="block"><input name="decisao_ocorreu" type="checkbox" required /> Confirmo que a decisão já ocorreu.</label>
        <Button type="submit" disabled={cadastro.isPending || ((exigeConta || exigeProjeto) && !alvo)}>Registrar decisão</Button>
      </form>
      {cadastro.isError && <p role="alert">{cadastro.error instanceof ApiRequestError ? cadastro.error.message : 'Não foi possível registrar a decisão.'}</p>}
      </SecaoPainel>}
      {novo && <div><p role="status">Decisão registrada. Informe a referência quando disponível.</p><ReferenciaAta alvo={{ grupo: 'FINANCEIRO', alvo_id: novo, etapa: 'ATO' }} identidade={identidade} /></div>}
      {consulta.isPending && <p>Consultando autorizações…</p>}
      {consulta.isError && <p role="alert">Não foi possível consultar as autorizações.</p>}
      {consulta.data?.itens.length === 0 && <p>Nenhuma autorização nesta página.</p>}
      {consulta.data?.itens.filter(r => r.id !== novo).map(r => <article key={r.id} className="space-y-1 rounded border p-3">
        <p className="font-medium">{r.assunto}</p>
        <p>{tiposFinanceiros[r.tipo]} · {formatarDataCivil(r.data_decisao)} · {r.autoridade}</p>
        {(r.projeto || r.conta) && <p>{r.projeto ?? r.conta}</p>}
        <p>{r.evidencia}</p><p>{situacoesAta[r.situacao]}</p>
        <ReferenciaAta alvo={{ grupo: 'FINANCEIRO', alvo_id: r.id, etapa: 'ATO' }} identidade={identidade} />
      </article>)}
      <PaginacaoAta pagina={pagina} mudar={setPagina} proxima={consulta.data?.tem_proxima} />
    </Painel></section>
  </div>
}
