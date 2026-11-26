import { PainelLocal, SecaoPainel } from '../../components/shared/Painel'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { gestaoOrgaosApi } from '../../api/orgaos'
import { ApiRequestError } from '../../api/client'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useIdempotencia } from './useIdempotencia'

export function ConfiguracaoFuso({ identidade }: { identidade: string }) {
  const [aberto, setAberto] = useState(false), [fuso, setFuso] = useState(''), [autoridade, setAutoridade] = useState(''), [evidencia, setEvidencia] = useState(''), [mensagem, setMensagem] = useState('')
  const queryClient = useQueryClient(), chave = useIdempotencia()
  const atual = useQuery({ queryKey: ['orgaos', identidade, 'fuso'], queryFn: gestaoOrgaosApi.fuso, enabled: aberto, staleTime: 0, gcTime: 0 })
  const salvar = useMutation({
    mutationFn: () => { const dados = { fuso_iana: fuso.trim(), autoridade: autoridade.trim(), evidencia: evidencia.trim() }; return gestaoOrgaosApi.registrarFuso({ ...dados, idempotencia: chave.obter(dados) }) },
    onSuccess: async () => { chave.limpar(); setMensagem('Fuso registrado.'); setFuso(''); setAutoridade(''); setEvidencia(''); await Promise.all([queryClient.invalidateQueries({ queryKey: ['orgaos', identidade, 'fuso'] }), queryClient.invalidateQueries({ queryKey: ['orgaos', identidade, 'relogio'] })]) },
  })
  return <PainelLocal><section className="space-y-3">
    <Button type="button" variant="outline" disabled={salvar.isPending} onClick={() => { setAberto(true); setMensagem(''); salvar.reset() }}>Configurar fuso da igreja</Button>
    {aberto && <SecaoPainel titulo="Fuso horário da igreja" voltar={() => setAberto(false)} ocupado={salvar.isPending}>
      <form className="max-w-2xl space-y-3" onSubmit={e => { e.preventDefault(); salvar.mutate() }}>
      <p className="text-sm text-muted-foreground">O fuso define a data corrente dos atos de órgãos. Sem configuração, é usada a data UTC. Confira a data antes de registrar cada ato.</p>
      {atual.isPending ? <p>Consultando fuso...</p> : atual.isError ? <p role="alert">Não foi possível consultar o fuso.</p> : <p>{atual.data?.configuracao ? `Fuso registrado: ${atual.data.configuracao.fuso_iana}` : 'Nenhum fuso registrado.'}</p>}
      <div className="space-y-1"><Label htmlFor="fuso-iana">Fuso IANA</Label><Input id="fuso-iana" placeholder="Ex.: America/Sao_Paulo" value={fuso} onChange={e => setFuso(e.target.value)} disabled={salvar.isPending} maxLength={100} required /></div>
      <div className="space-y-1"><Label htmlFor="fuso-autoridade">Autoridade declarada para o fuso</Label><Input id="fuso-autoridade" value={autoridade} onChange={e => setAutoridade(e.target.value)} disabled={salvar.isPending} maxLength={255} required /></div>
      <div className="space-y-1"><Label htmlFor="fuso-evidencia">Referência ou evidência do fuso</Label><Input id="fuso-evidencia" value={evidencia} onChange={e => setEvidencia(e.target.value)} disabled={salvar.isPending} maxLength={1000} required /></div>
      {salvar.isError && <p role="alert">{salvar.error instanceof ApiRequestError ? salvar.error.messages.join(' ') : 'Não foi possível registrar o fuso.'}</p>}
      {mensagem && <p role="status">{mensagem}</p>}
      <Button type="submit" disabled={salvar.isPending || atual.isPending || atual.isError}>Salvar fuso</Button>
    </form>
    </SecaoPainel>}
  </section></PainelLocal>
}
