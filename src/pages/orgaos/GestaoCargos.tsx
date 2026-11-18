import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '../../api/client'
import { gestaoOrgaosApi } from '../../api/orgaos'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useIdempotencia } from './useIdempotencia'

type Cargo = { id: string; nome: string; codigo: string; permite_acumulacao: boolean }

export function GestaoCargos({ orgaoId, identidade, cargos }: { orgaoId: string; identidade: string; cargos: Cargo[] }) {
  const [funcao, setFuncao] = useState<'SECRETARIO' | 'TESOUREIRO' | 'OUTRO'>('OUTRO')
  const [modo, setModo] = useState<'novo' | 'acumulacao' | null>(null), [cargo, setCargo] = useState(''), [codigo, setCodigo] = useState(''), [nome, setNome] = useState(''), [permite, setPermite] = useState(false), [fonte, setFonte] = useState(''), [versao, setVersao] = useState(''), [autoridade, setAutoridade] = useState(''), [evidencia, setEvidencia] = useState(''), [mensagem, setMensagem] = useState('')
  const chave = useIdempotencia(), queryClient = useQueryClient()
  const salvar = useMutation({ mutationFn: async () => {
    const regra = { permite_acumulacao: permite, fonte: fonte.trim(), versao: versao.trim(), autoridade: autoridade.trim(), evidencia: evidencia.trim() }
    const corpo = modo === 'novo' ? { ...regra, codigo: codigo.trim(), nome: nome.trim(), funcao } : regra
    const idempotencia = chave.obter({ orgaoId, modo, cargo: modo === 'acumulacao' ? cargo : null, corpo })
    return modo === 'novo' ? gestaoOrgaosApi.criarCargo(orgaoId, { ...regra, codigo: codigo.trim(), nome: nome.trim(), funcao, idempotencia }) : gestaoOrgaosApi.configurarAcumulacao(orgaoId, cargo, { ...regra, idempotencia })
  }, onSuccess: async () => { chave.limpar(); setModo(null); setCodigo(''); setNome(''); setCargo(''); setFonte(''); setVersao(''); setAutoridade(''); setEvidencia(''); setPermite(false); setMensagem('Configuração registrada.'); await queryClient.invalidateQueries({ queryKey: ['orgaos', identidade] }) } })
  function abrir(m: 'novo' | 'acumulacao') { salvar.reset(); setMensagem(''); setModo(m) }
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => abrir('novo')}>Adicionar cargo</Button><Button type="button" variant="outline" onClick={() => abrir('acumulacao')}>Configurar acumulação</Button></div>
    {mensagem && <p role="status">{mensagem}</p>}
    {modo && <form className="max-w-xl space-y-3 rounded border p-4" onSubmit={e => { e.preventDefault(); salvar.mutate() }}>
      <h3 className="font-semibold">{modo === 'novo' ? 'Adicionar cargo' : 'Configurar acumulação'}</h3>
      <p className="text-sm text-muted-foreground">Informe a norma e a evidência da configuração. Alterações exigem nova versão normativa. Acumulações vigentes devem ser resolvidas antes de restringir a regra; os atos anteriores preservam sua configuração.</p>
      {modo === 'novo' ? <><label className="block">Função administrativa<select className="w-full rounded border bg-background p-2" value={funcao} onChange={e => setFuncao(e.target.value as typeof funcao)}><option value="OUTRO">Outra função autorizada</option><option value="SECRETARIO">Secretaria</option><option value="TESOUREIRO">Tesouraria</option></select></label><div className="space-y-1"><Label htmlFor="cargo-codigo">Código do cargo</Label><Input id="cargo-codigo" value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} pattern="[A-Z][A-Z0-9_]{1,79}" maxLength={80} required /><p className="text-sm text-muted-foreground">Use letras, números e sublinhado.</p></div><div className="space-y-1"><Label htmlFor="cargo-nome">Nome do cargo</Label><Input id="cargo-nome" value={nome} onChange={e => setNome(e.target.value)} maxLength={120} required /></div></> : <div className="space-y-1"><Label htmlFor="cargo-selecao">Cargo</Label><select id="cargo-selecao" className="w-full rounded border bg-background p-2" value={cargo} onChange={e => { const id = e.target.value; setCargo(id); setPermite(cargos.find(c => c.id === id)?.permite_acumulacao ?? false) }} required><option value="">Selecione o cargo</option>{cargos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>}
      <label className="flex items-center gap-2"><input type="checkbox" checked={permite} onChange={e => setPermite(e.target.checked)} />Permitir acumulação autorizada</label>
      <div className="space-y-1"><Label htmlFor="cargo-fonte">Fonte normativa</Label><Input id="cargo-fonte" value={fonte} onChange={e => setFonte(e.target.value)} maxLength={255} required /></div>
      <div className="space-y-1"><Label htmlFor="cargo-versao">Versão da norma</Label><Input id="cargo-versao" value={versao} onChange={e => setVersao(e.target.value)} maxLength={100} required /></div>
      <div className="space-y-1"><Label htmlFor="cargo-autoridade">Autoridade da configuração</Label><Input id="cargo-autoridade" value={autoridade} onChange={e => setAutoridade(e.target.value)} maxLength={255} required /></div>
      <div className="space-y-1"><Label htmlFor="cargo-evidencia">Evidência da configuração</Label><Input id="cargo-evidencia" value={evidencia} onChange={e => setEvidencia(e.target.value)} maxLength={1000} required /></div>
      {salvar.isError && <p role="alert">{salvar.error instanceof ApiRequestError ? salvar.error.messages.join(' ') : 'Não foi possível salvar a configuração.'}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={salvar.isPending || (modo === 'acumulacao' && !cargo)}>Salvar configuração</Button><Button type="button" variant="outline" onClick={() => setModo(null)}>Cancelar</Button></div>
    </form>}
  </div>
}
