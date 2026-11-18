import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { ApiRequestError } from '../../api/client'
import { assinaturasApi, dataAssinatura, modalidadeLabel, verificacaoUrl, type ConviteAssinatura } from '../../api/assinaturas'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Area, Check } from '../secretaria/formulario'

function Portal({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <main className="mx-auto my-8 w-full max-w-2xl px-4">
    <section className="space-y-4 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
      <h1 className="text-2xl font-semibold">{titulo}</h1>
      {children}
    </section>
  </main>
}

export function ConviteAssinaturaPage() {
  const [token] = useState(() => window.location.hash.slice(1))
  const valido = /^[a-f0-9]{64}$/.test(token)
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [])

  // A chave da consulta é aleatória para isolar o cache sem guardar o token nele.
  const [chave] = useState(() => crypto.randomUUID())
  const consulta = useQuery({
    queryKey: ['convite-assinatura', chave], queryFn: () => assinaturasApi.consultar(token),
    enabled: valido, retry: false, gcTime: 0,
  })
  const precisaEntrar = consulta.error instanceof ApiRequestError && consulta.error.statusCode === 401
  return <Portal titulo="Convite para assinatura">
    {!valido && <p role="alert">Abra o link completo do convite recebido por e-mail.</p>}
    {valido && consulta.isPending && <p role="status">Consultando convite…</p>}
    {consulta.isError && <div className="space-y-3">
      <p role="alert">{consulta.error.message}</p>
      {precisaEntrar && <a href="/login" target="_blank" rel="noopener noreferrer" className="block underline">Entrar na conta vinculada em outra aba</a>}
      <Button variant="outline" onClick={() => void consulta.refetch()}>{precisaEntrar ? 'Já entrei. Abrir convite' : 'Consultar novamente'}</Button>
    </div>}
    {consulta.data && <LeituraConvite key={consulta.data.versao_id} convite={consulta.data} token={token} atualizar={() => void consulta.refetch()} />}
  </Portal>
}

function LeituraConvite({ convite: c, token, atualizar }: { convite: ConviteAssinatura; token: string; atualizar: () => void }) {
  const [leitura, setLeitura] = useState(false)
  const [consentiu, setConsentiu] = useState(false)
  const [recusa, setRecusa] = useState(false)
  const [motivo, setMotivo] = useState('')
  const escopo = { token, versao_id: c.versao_id, manifesto_sha256: c.manifesto_sha256 }
  const baixar = useMutation({
    mutationFn: async (anexo: ConviteAssinatura['anexos'][number] | null) => {
      const blob = await assinaturasApi.baixar({ ...escopo, arquivo_id: anexo?.id })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = anexo?.nome.replace(/[\\/]/g, '_') ?? 'matriz-aprovada.pdf'
      link.click()
      setTimeout(() => URL.revokeObjectURL(link.href), 1000)
      if (!anexo) setLeitura(true)
    },
  })
  const decidir = useMutation({
    mutationFn: (acao: 'ASSINAR' | 'RECUSAR') => assinaturasApi.decidir(acao === 'ASSINAR'
      ? { ...escopo, decisao: 'ASSINAR', consentimento: true }
      : { ...escopo, decisao: 'RECUSAR', motivo }),
    onSuccess: atualizar,
  })
  const estado = decidir.data?.estado ?? c.estado
  return <div className="space-y-3">
    <div><p className="font-medium">{c.assunto}</p><p>Documento {c.numero} · Versão {c.versao}</p><p>Convite de {c.nome}</p></div>
    {estado === 'ASSINADO' && <section className="space-y-2" aria-label="Comprovante de assinatura">
      <p role="status">Assinatura eletrônica registrada{c.assinatura_em && ` em ${dataAssinatura(c.assinatura_em, c.fuso_iana)} (${c.fuso_iana})`}.</p>
      <p className="break-all text-xs">SHA-256 do manifesto aceito {c.manifesto_sha256}</p>
      {c.codigo ? <Link className="underline" to={verificacaoUrl(c.codigo)}>Verificar documento expedido</Link>
        : <Button variant="outline" onClick={atualizar}>Consultar situação da expedição</Button>}
    </section>}
    {estado === 'RECUSADO' && <p role="status">Recusa registrada.</p>}
    {estado === 'PENDENTE' && <>
      <Button type="button" variant="outline" disabled={baixar.isPending} onClick={() => baixar.mutate(null)}>Baixar matriz aprovada para leitura</Button>
      {c.anexos.length > 0 && <ul className="space-y-2" aria-label="Anexos da versão">{c.anexos.map(a => <li key={a.id}>
        <Button type="button" variant="outline" disabled={baixar.isPending} onClick={() => baixar.mutate(a)}>Baixar {a.nome}</Button>
      </li>)}</ul>}
      <p className="break-all text-xs">SHA-256 da matriz {c.matriz_sha256}</p>
      {baixar.error && <p role="alert" className="text-destructive">{baixar.error.message}</p>}
      {decidir.error && <p role="alert" className="text-destructive">{decidir.error.message}</p>}
      {recusa ? <form className="space-y-2" onSubmit={ev => { ev.preventDefault(); decidir.mutate('RECUSAR') }}>
        <Area label="Motivo da recusa" value={motivo} onChange={setMotivo} />
        <Button type="submit" disabled={decidir.isPending}>Confirmar recusa</Button>
        <Button type="button" variant="ghost" disabled={decidir.isPending} onClick={() => setRecusa(false)}>Voltar</Button>
      </form> : <div className="space-y-3">
        {leitura && <Check label={c.consentimento} checked={consentiu} onChange={setConsentiu} />}
        <div className="flex flex-wrap gap-2">
          <Button disabled={!leitura || !consentiu || decidir.isPending} onClick={() => decidir.mutate('ASSINAR')}>Confirmar assinatura</Button>
          <Button variant="outline" disabled={decidir.isPending} onClick={() => setRecusa(true)}>Recusar assinatura</Button>
        </div>
      </div>}
    </>}
  </div>
}

export function VerificacaoAssinaturaPage() {
  const [parametros, setParametros] = useSearchParams()
  const codigo = (parametros.get('codigo') ?? '').toLowerCase()
  const [entrada, setEntrada] = useState(codigo)
  const valido = /^[a-f0-9]{32}$/.test(codigo)
  const consulta = useQuery({
    queryKey: ['verificacao-assinatura', codigo], queryFn: () => assinaturasApi.verificar(codigo),
    enabled: valido, gcTime: 0, retry: false,
  })
  return <Portal titulo="Verificar documento expedido">
    <form className="space-y-3" onSubmit={ev => { ev.preventDefault(); setParametros({ codigo: entrada.trim().toLowerCase() }); if (entrada.trim().toLowerCase() === codigo) void consulta.refetch() }}>
      <label className="grid gap-1">Código impresso no comprovante
        <Input value={entrada} onChange={ev => setEntrada(ev.target.value)} required maxLength={32} pattern="[a-fA-F0-9]{32}" />
      </label>
      <Button type="submit">Verificar código</Button>
    </form>
    {valido && consulta.isPending && <p role="status">Verificando original arquivado…</p>}
    {consulta.isError && <p role="alert">{consulta.error.message}</p>}
    {consulta.data && <div className="space-y-1" role="status">
      <p className="font-semibold">{consulta.data.estado === 'ANULADO' ? 'Documento anulado' : 'Original arquivado íntegro'}</p>
      <p>Modalidade {modalidadeLabel[consulta.data.modalidade].toLowerCase()}</p>
      <p>Expedição em {dataAssinatura(consulta.data.expedido_em, 'UTC')} UTC</p>
      <p className="break-all text-xs">SHA-256 da via expedida {consulta.data.sha256}</p>
    </div>}
  </Portal>
}
