import { PainelLocal, SecaoPainel } from '../../components/shared/Painel'
import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { oficiaisApi, type PoliticaAlertas } from '../../api/oficiais'
import { usuariosApi } from '../../api/usuarios'
import { Perfil } from '../../types/enums'
import { Button } from '../../components/ui/button'
import { ApiRequestError } from '../../api/client'
const classe = 'block w-full rounded border bg-background p-2'
export function ConfiguracaoAlertas({ identidade }: { identidade: string }) {
  const [aberto, setAberto] = useState(false), [usuario, setUsuario] = useState(''), [mensagem, setMensagem] = useState('')
  const client = useQueryClient(), chave = ['oficiais', identidade, 'config-alertas']
  const config = useQuery({ queryKey: chave, queryFn: oficiaisApi.configuracaoAlertas, enabled: aberto })
  const usuarios = useQuery({ queryKey: ['oficiais', identidade, 'usuarios-alertas'], queryFn: usuariosApi.list, enabled: aberto })
  const atualizar = async () => { await client.invalidateQueries({ queryKey: chave }); await client.invalidateQueries({ queryKey: ['oficiais', identidade, 'notificacoes'] }) }
  const salvar = useMutation({ mutationFn: oficiaisApi.configurarAlertas, onSuccess: async () => { setMensagem('Configuração salva.'); await atualizar() } })
  const adicionar = useMutation({ mutationFn: oficiaisApi.adicionarDestinatario, onSuccess: async () => { setMensagem('Destinatário adicionado.'); setUsuario(''); await atualizar() } })
  const remover = useMutation({ mutationFn: oficiaisApi.removerDestinatario, onSuccess: async () => { setMensagem('Destinatário removido.'); await atualizar() } })
  const erro = salvar.error ?? adicionar.error ?? remover.error
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMensagem(''); salvar.reset(); const d = new FormData(e.currentTarget), texto = (n: string) => String(d.get(n) ?? '').trim()
    salvar.mutate({ ativo: d.has('ativo'), dias_antecedencia: Number(texto('antes')), dias_apos_termino: Number(texto('depois')), fuso_iana: texto('fuso'), autoridade: texto('autoridade'), fundamento: texto('fundamento') })
  }
  const politica: PoliticaAlertas | null | undefined = config.data?.politica
  return <PainelLocal><section className="space-y-3"><Button type="button" variant="outline" onClick={() => setAberto(true)}>Configurar avisos de mandatos</Button>
    {aberto && <SecaoPainel titulo="Configurar avisos de mandatos" voltar={() => setAberto(false)}><p className="text-sm text-muted-foreground">A igreja escolhe explicitamente os destinatários. Os avisos são internos; o exercício é calculado pelas datas mesmo se o worker estiver parado.</p>
      {config.isPending ? <p>Carregando configuração...</p> : config.isError ? <p role="alert">Não foi possível carregar a configuração.</p> : <>
        <form key={politica?.atualizado_em ?? 'nova'} className="max-w-xl space-y-3" onSubmit={enviar}>
          <label className="block"><input type="checkbox" name="ativo" defaultChecked={politica?.ativo ?? false} /> Habilitar avisos</label>
          <label className="block">Dias de antecedência<input className={classe} type="number" name="antes" min="1" max="365" required defaultValue={politica?.dias_antecedencia ?? ''} /></label>
          <label className="block">Dias após o término<input className={classe} type="number" name="depois" min="0" max="365" required defaultValue={politica?.dias_apos_termino ?? ''} /></label>
          <label className="block">Fuso horário IANA<input className={classe} name="fuso" required maxLength={100} placeholder="Ex.: America/Sao_Paulo" defaultValue={politica?.fuso_iana ?? ''} /></label>
          <label className="block">Autoridade da configuração<input className={classe} name="autoridade" required maxLength={255} defaultValue={politica?.autoridade ?? ''} /></label>
          <label className="block">Fundamento da configuração<input className={classe} name="fundamento" required maxLength={1000} defaultValue={politica?.fundamento ?? ''} /></label>
          <Button type="submit" disabled={salvar.isPending}>Salvar configuração</Button>
        </form>
        <p className="text-sm">Última tentativa: {config.data?.execucao ? new Date(config.data.execucao.ultima_tentativa).toLocaleString() : 'ainda não registrada'}{config.data?.execucao?.ultimo_erro ? ' — houve falha na geração' : ''}. A data não comprova que o worker esteja ativo agora.</p>
        <form className="max-w-xl space-y-2" onSubmit={e => { e.preventDefault(); setMensagem(''); adicionar.reset(); if (usuario) adicionar.mutate(usuario) }}><label className="block">Destinatário<SeletorPessoa rotulo="Destinatário" value={usuario} onChange={id => setUsuario(id)} required opcoes={usuarios.data?.filter(u => u.ativo && [Perfil.ADMINISTRADOR, Perfil.AUDITOR, Perfil.COMUM].includes(u.perfil)).map(u => ({ id: u.id, nome: `${u.nome_usuario} — ${u.email_login}` }))} /></label>{usuarios.isError && <p role="alert">Não foi possível carregar usuários.</p>}<Button type="submit" disabled={!usuario || adicionar.isPending}>Adicionar destinatário</Button></form>
        <h3 className="font-medium">Destinatários ativos</h3>{!config.data?.destinatarios.length && <p>Nenhum destinatário indicado.</p>}{config.data?.destinatarios.map(d => <div className="flex flex-wrap items-center gap-2" key={d.id}><span>{d.usuario.nome_usuario}{!d.usuario.ativo ? ' (conta inativa)' : ''}</span><Button type="button" variant="outline" disabled={remover.isPending} onClick={() => { setMensagem(''); remover.reset(); remover.mutate(d.id) }}>Remover destinatário</Button></div>)}
      </>}
      {erro && <p role="alert">{erro instanceof ApiRequestError ? erro.messages.join(' ') : 'Não foi possível atualizar a configuração.'}</p>}{mensagem && <p role="status">{mensagem}</p>}
    </SecaoPainel>}
  </section></PainelLocal>
}
