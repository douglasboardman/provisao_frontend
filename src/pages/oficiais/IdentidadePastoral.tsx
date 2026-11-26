import { PainelLocal, SecaoPainel } from '../../components/shared/Painel'
import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { igrejaApi } from '../../api/igreja'
import { oficiaisApi } from '../../api/oficiais'
import { useAuthStore } from '../../stores/auth'
import { Button } from '../../components/ui/button'
const classe = 'block w-full rounded border bg-background p-2'
type Codigo = { codigo: string; expira_em: string }

export function IdentidadePastoral({ oficialId, identidade }: { oficialId: string; identidade: string }) {
  const [aberto, setAberto] = useState(false), [ocupado, setOcupado] = useState(false), [codigo, setCodigo] = useState<Codigo | null>(null), [mensagem, setMensagem] = useState(''), [erro, setErro] = useState('')
  const igrejaAtual = useAuthStore(s => s.user?.igreja_id), client = useQueryClient()
  const local = useQuery({ queryKey: ['oficiais', identidade, 'identidade-pastoral', oficialId], queryFn: () => oficiaisApi.identidadePastoral(oficialId), enabled: aberto, staleTime: 0 })
  const igrejas = useQuery({ queryKey: ['igrejas-public'], queryFn: igrejaApi.listPublic, enabled: aberto })
  async function executar(e: FormEvent<HTMLFormElement>, acao: 'convidar' | 'receber' | 'revogar') {
    e.preventDefault(); if (ocupado) return
    const form = e.currentTarget, d = new FormData(form), texto = (nome: string) => String(d.get(nome) ?? '').trim()
    setOcupado(true); setErro(''); setMensagem(''); setCodigo(null)
    try {
      if (acao === 'convidar') {
        const convite = await oficiaisApi.convidarIdentidade(oficialId, { destino_igreja_id: texto('igreja'), autoridade: texto('autoridade'), evidencia: texto('evidencia') })
        setCodigo(convite); setMensagem('Código criado.'); form.reset()
      } else if (acao === 'receber') {
        await oficiaisApi.receberIdentidade(oficialId, { codigo: texto('codigo'), autoridade: texto('autoridade'), evidencia: texto('evidencia') })
        form.reset(); setMensagem('Referência local registrada.')
      } else {
        await oficiaisApi.revogarIdentidade(oficialId, texto('motivo')); form.reset(); setMensagem('Referência local revogada.')
      }
      await client.invalidateQueries({ queryKey: ['oficiais', identidade, 'identidade-pastoral', oficialId] })
    } catch { setErro('Não foi possível concluir a operação. Confira os dados e se o código continua válido.') }
    finally { setOcupado(false) }
  }
  return <PainelLocal><section className="space-y-3"><Button type="button" variant="outline" onClick={() => { setAberto(true); setCodigo(null); setMensagem(''); setErro('') }}>Referência entre igrejas</Button>
    {aberto && <SecaoPainel titulo="Referência entre igrejas" voltar={() => { setAberto(false); setCodigo(null); setMensagem(''); setErro('') }}><p className="text-sm text-muted-foreground">Cada igreja deve conferir a identidade e a autoridade por procedimento próprio. A referência não concede acesso a contas ou cadastros da outra igreja.</p>
      {local.isPending ? <p>Consultando referência local...</p> : local.isError ? <p role="alert">Não foi possível consultar a referência local.</p> : <p>{local.data?.referencia ? 'Há uma referência local ativa.' : 'Não há referência local ativa.'}</p>}
      {erro && <p role="alert">{erro}</p>}{mensagem && <p role="status">{mensagem}</p>}
      {codigo && <div className="space-y-2 rounded border p-3"><p>Este código é exibido somente agora. Entregue-o à igreja destinatária por canal protegido; quem o possuir poderá tentar utilizá-lo até {new Date(codigo.expira_em).toLocaleString()}.</p><code className="block break-all select-all">{codigo.codigo}</code><Button type="button" variant="outline" onClick={() => setCodigo(null)}>Ocultar código</Button></div>}
      {!local.isPending && !local.isError && <>
        <form className="max-w-xl space-y-2" onSubmit={e => void executar(e, 'convidar')}><h3 className="font-medium">Criar código para outra igreja</h3><label className="block">Igreja destinatária<select className={classe} name="igreja" required defaultValue=""><option value="">Selecione</option>{igrejas.data?.filter(i => i.id !== igrejaAtual).map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}</select></label>{igrejas.isError && <p role="alert">Não foi possível carregar as igrejas.</p>}<label className="block">Autoridade local<input className={classe} name="autoridade" maxLength={255} required /></label><label className="block">Evidência da autorização<input className={classe} name="evidencia" maxLength={1000} required /></label><Button type="submit" disabled={ocupado || igrejas.isPending || igrejas.isError}>Criar código</Button></form>
        {!local.data?.referencia && <form className="max-w-xl space-y-2" onSubmit={e => void executar(e, 'receber')}><h3 className="font-medium">Confirmar código recebido</h3><label className="block">Código recebido<input className={classe} name="codigo" type="password" autoComplete="off" minLength={64} maxLength={64} pattern="[a-f0-9]{64}" required /></label><label className="block">Autoridade local<input className={classe} name="autoridade" maxLength={255} required /></label><label className="block">Evidência da conferência<input className={classe} name="evidencia" maxLength={1000} required /></label><Button type="submit" disabled={ocupado}>Confirmar referência</Button></form>}
        {local.data?.referencia && <form className="max-w-xl space-y-2" onSubmit={e => void executar(e, 'revogar')}><h3 className="font-medium">Revogar referência local</h3><label className="block">Motivo<input className={classe} name="motivo" maxLength={1000} required /></label><Button type="submit" variant="outline" disabled={ocupado}>Revogar referência</Button></form>}
      </>}
    </SecaoPainel>}
  </section></PainelLocal>
}
