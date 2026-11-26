import { PainelLocal, SecaoPainel } from '../../components/shared/Painel'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '../../api/client'
import { gestaoOrgaosApi, type DetalheOrgao } from '../../api/orgaos'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useIdempotencia } from './useIdempotencia'

function dataCivil(v: string) { return v.slice(0, 10).split('-').reverse().join('/') }

export function PoliticaUnidade({ orgaoId, identidade, politicas, limitadas }: { orgaoId: string; identidade: string; politicas: DetalheOrgao['politicas']; limitadas: boolean }) {
  const [aberto, setAberto] = useState(false), [versao, setVersao] = useState(''), [fonte, setFonte] = useState(''), [inicio, setInicio] = useState(''), [fim, setFim] = useState(''), [prazo, setPrazo] = useState(''), [autoridade, setAutoridade] = useState(''), [evidencia, setEvidencia] = useState(''), [mensagem, setMensagem] = useState('')
  const chave = useIdempotencia(), queryClient = useQueryClient()
  const salvar = useMutation({ mutationFn: async () => {
    const corpo = { versao: versao.trim(), fonte: fonte.trim(), inicio, fim, prazo_maximo_meses: Number(prazo), autoridade: autoridade.trim(), evidencia: evidencia.trim() }
    return gestaoOrgaosApi.registrarPolitica(orgaoId, { ...corpo, idempotencia: chave.obter({ orgaoId, corpo }) })
  }, onSuccess: async () => { chave.limpar(); setAberto(false); setVersao(''); setFonte(''); setInicio(''); setFim(''); setPrazo(''); setAutoridade(''); setEvidencia(''); setMensagem('Política registrada.'); await queryClient.invalidateQueries({ queryKey: ['orgaos', identidade] }) } })
  return <PainelLocal><div className="space-y-3">
    <h3 className="font-semibold">Políticas de eleição da unidade</h3>
    {!politicas.length && <p>Nenhuma política registrada.</p>}
    {politicas.map(p => <p key={p.id}>Versão {p.versao} · {p.fonte} · vigência de {dataCivil(p.inicio)} a {dataCivil(p.fim)} · prazo máximo de {p.prazo_maximo_meses} meses.</p>)}
    {limitadas && <p>São exibidas as 100 versões mais recentes.</p>}
    <Button type="button" variant="outline" onClick={() => { salvar.reset(); setMensagem(''); setAberto(true) }}>Registrar política de eleição</Button>
    {mensagem && <p role="status">{mensagem}</p>}
    {aberto && <SecaoPainel titulo="Registrar política de eleição" voltar={() => setAberto(false)} ocupado={salvar.isPending}>
      <form className="max-w-xl space-y-3" onSubmit={e => { e.preventDefault(); salvar.mutate() }}>
      <p className="text-sm text-muted-foreground">Registre a norma aplicável, sua vigência e o prazo máximo deliberado. As vigências de políticas da mesma unidade não podem se sobrepor.</p>
      <div className="space-y-1"><Label htmlFor="politica-versao">Versão da política</Label><Input id="politica-versao" value={versao} onChange={e => setVersao(e.target.value)} maxLength={100} required /></div>
      <div className="space-y-1"><Label htmlFor="politica-fonte">Fonte da política</Label><Input id="politica-fonte" value={fonte} onChange={e => setFonte(e.target.value)} maxLength={500} required /></div>
      <div className="space-y-1"><Label htmlFor="politica-inicio">Início de vigência</Label><Input id="politica-inicio" type="date" value={inicio} onChange={e => setInicio(e.target.value)} required /></div>
      <div className="space-y-1"><Label htmlFor="politica-fim">Último dia de vigência</Label><Input id="politica-fim" type="date" value={fim} onChange={e => setFim(e.target.value)} required /></div>
      <div className="space-y-1"><Label htmlFor="politica-prazo">Prazo máximo em meses</Label><Input id="politica-prazo" type="number" min={1} step={1} value={prazo} onChange={e => setPrazo(e.target.value)} required /></div>
      <div className="space-y-1"><Label htmlFor="politica-autoridade">Autoridade da política</Label><Input id="politica-autoridade" value={autoridade} onChange={e => setAutoridade(e.target.value)} maxLength={255} required /></div>
      <div className="space-y-1"><Label htmlFor="politica-evidencia">Evidência da política</Label><Input id="politica-evidencia" value={evidencia} onChange={e => setEvidencia(e.target.value)} maxLength={1000} required /></div>
      {salvar.isError && <p role="alert">{salvar.error instanceof ApiRequestError ? salvar.error.messages.join(' ') : 'Não foi possível registrar a política.'}</p>}
      <Button type="submit" disabled={salvar.isPending || !prazo || Number(prazo) < 1 || !!(inicio && fim && inicio > fim)}>Salvar política</Button>
    </form>
    </SecaoPainel>}
  </div></PainelLocal>
}
