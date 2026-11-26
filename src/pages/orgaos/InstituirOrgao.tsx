import { PainelLocal, SecaoPainel } from '../../components/shared/Painel'
import { useHojeIgreja } from './RelogioIgreja'
import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '../../api/client'
import { gestaoOrgaosApi } from '../../api/orgaos'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Perfil } from '../../types/enums'


export function InstituirOrgao({ perfil, identidade }: { perfil: Perfil; identidade: string }) {
  const hoje = useHojeIgreja()
  const [modo, setModo] = useState<'OFICIAL' | 'UNIDADE' | null>(null)
  const [tipo, setTipo] = useState<'CONSELHO' | 'JUNTA'>('CONSELHO')
  const [constituicao, setConstituicao] = useState<'ELEICAO' | 'DESIGNACAO'>('DESIGNACAO')
  const [nome, setNome] = useState(''), [sigla, setSigla] = useState(''), [finalidade, setFinalidade] = useState('')
  const [data, setData] = useState(hoje), [evidencia, setEvidencia] = useState('')
  const [mensagem, setMensagem] = useState('')
  const tentativa = useRef<{ conteudo: string; id: string } | null>(null)
  const queryClient = useQueryClient()
  const salvar = useMutation({
    mutationFn: async () => {
      const comuns = { nome: nome.trim(), ...(sigla.trim() ? { sigla: sigla.trim() } : {}), finalidade: finalidade.trim(), data_criacao: data }
      const corpo = modo === 'OFICIAL' ? { ...comuns, tipo } : { ...comuns, constituicao, evidencia: evidencia.trim() }
      const conteudo = JSON.stringify({ modo, corpo })
      if (tentativa.current?.conteudo !== conteudo) tentativa.current = { conteudo, id: crypto.randomUUID() }
      const idempotencia = tentativa.current.id
      return modo === 'OFICIAL'
        ? gestaoOrgaosApi.criarOficial({ ...comuns, tipo, idempotencia })
        : gestaoOrgaosApi.criarUnidade({ ...comuns, constituicao, evidencia: evidencia.trim(), idempotencia })
    },
    onSuccess: async () => {
      tentativa.current = null; setMensagem('Órgão registrado.'); setModo(null); setNome(''); setSigla(''); setFinalidade(''); setEvidencia('')
      await queryClient.invalidateQueries({ queryKey: ['orgaos', identidade] })
    },
  })
  function abrir(proximo: 'OFICIAL' | 'UNIDADE') { if (!modo) setData(hoje); salvar.reset(); setMensagem(''); setModo(proximo) }
  return <PainelLocal><section className="space-y-3">
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => abrir('OFICIAL')}>Registrar Conselho ou Junta</Button>{perfil === Perfil.GESTOR && <Button type="button" variant="outline" onClick={() => abrir('UNIDADE')}>Registrar unidade ministerial</Button>}</div>
    {mensagem && <p role="status">{mensagem}</p>}
    {modo && <SecaoPainel titulo={modo === 'OFICIAL' ? 'Registrar Conselho ou Junta' : 'Registrar unidade ministerial'} voltar={() => setModo(null)} ocupado={salvar.isPending}>
      <form className="max-w-2xl space-y-3" onSubmit={e => { e.preventDefault(); salvar.mutate() }}>
      <p className="text-sm text-muted-foreground">{modo === 'OFICIAL' ? 'Cadastre os dados do órgão oficial da igreja. A composição e os cargos são registrados separadamente.' : 'A instituição exige competência institucional registrada para o gestor e evidência do ato.'}</p>
      {modo === 'OFICIAL' ? <div className="space-y-1"><Label htmlFor="orgao-tipo">Tipo</Label><select id="orgao-tipo" className="w-full rounded border bg-background p-2" value={tipo} onChange={e => setTipo(e.target.value as typeof tipo)}><option value="CONSELHO">Conselho</option><option value="JUNTA">Junta</option></select></div> : <div className="space-y-1"><Label htmlFor="orgao-constituicao">Constituição</Label><select id="orgao-constituicao" className="w-full rounded border bg-background p-2" value={constituicao} onChange={e => setConstituicao(e.target.value as typeof constituicao)}><option value="DESIGNACAO">Por designação</option><option value="ELEICAO">Por eleição</option></select></div>}
      <div className="space-y-1"><Label htmlFor="orgao-nome">Nome</Label><Input id="orgao-nome" value={nome} onChange={e => setNome(e.target.value)} maxLength={255} required /></div>
      <div className="space-y-1"><Label htmlFor="orgao-sigla">Sigla (opcional)</Label><Input id="orgao-sigla" value={sigla} onChange={e => setSigla(e.target.value)} maxLength={40} /></div>
      <div className="space-y-1"><Label htmlFor="orgao-finalidade">Finalidade</Label><Input id="orgao-finalidade" value={finalidade} onChange={e => setFinalidade(e.target.value)} maxLength={1000} required /></div>
      <div className="space-y-1"><Label htmlFor="orgao-data">Data de criação</Label><Input id="orgao-data" type="date" value={data} onChange={e => setData(e.target.value)} required /></div>
      {modo === 'UNIDADE' && <div className="space-y-1"><Label htmlFor="orgao-evidencia">Referência ou evidência do ato</Label><Input id="orgao-evidencia" value={evidencia} onChange={e => setEvidencia(e.target.value)} maxLength={1000} required /></div>}
      {salvar.isError && <p role="alert">{salvar.error instanceof ApiRequestError ? salvar.error.messages.join(' ') : 'Não foi possível registrar o órgão.'}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={salvar.isPending}>Salvar</Button></div>
    </form>
    </SecaoPainel>}
  </section></PainelLocal>
}
