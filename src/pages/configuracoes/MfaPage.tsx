import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { authApi } from '../../api/auth'
import { ApiRequestError } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import { Perfil } from '../../types/enums'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

export function MfaPage() {
  const user = useAuthStore(s => s.user)
  const allowed = user?.perfil === Perfil.ADMINISTRADOR || user?.perfil === Perfil.GESTOR || user?.perfil === Perfil.COMUM || !!user?.mfa_enrollment_required
  const status = useQuery({ queryKey: ['mfa-status', user?.sub], queryFn: authApi.mfaStatus, enabled: allowed })
  const [password, setPassword] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [recovery, setRecovery] = useState<string[]>([])
  const [sessionsRevoked, setSessionsRevoked] = useState(false)
  const [confirmCode, setConfirmCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function setup() {
    setError(''); setBusy(true)
    try { const result = await authApi.mfaSetup(password); setSecret(result.secret); setPassword('') }
    catch { setError('Não foi possível iniciar a configuração. Confira a senha ou aguarde uma configuração pendente expirar.') }
    finally { setBusy(false) }
  }
  async function activate() {
    setError(''); setBusy(true)
    try { const result = await authApi.mfaActivate(code); setRecovery(result.recovery_codes); setSessionsRevoked(true); setSecret(''); setCode('') }
    catch { setError('Código inválido, expirado ou temporariamente bloqueado.') }
    finally { setBusy(false) }
  }
  async function renew() {
    setError(''); setBusy(true)
    try { const result = await authApi.mfaRecovery(password, code || undefined); setRecovery(result.recovery_codes); setSessionsRevoked(false); setPassword(''); setCode('') }
    catch { setError('Não foi possível renovar os códigos. Confira a senha e o código de autenticação ou recuperação.') }
    finally { setBusy(false) }
  }
  async function resume() {
    setError(''); setBusy(true)
    try { const result = await authApi.mfaRecoveryResume(password); setRecovery(result.recovery_codes); setSessionsRevoked(false); setPassword('') }
    catch { setError('Não há renovação disponível nesta sessão ou a senha está incorreta.') }
    finally { setBusy(false) }
  }
  async function confirmRecovery() {
    setError(''); setBusy(true)
    try { await authApi.mfaRecoveryConfirm(confirmCode); useAuthStore.setState(state => ({ user: state.user ? { ...state.user, mfa_recovery_recent: false } : null })); setRecovery([]); setConfirmCode('') }
    catch { setError('Código inválido ou renovação expirada. Os códigos anteriores permanecem válidos.') }
    finally { setBusy(false) }
  }
  async function policy(required: boolean) {
    setError(''); setBusy(true)
    try { await authApi.mfaPolicy(password, code, required); setPassword(''); setCode(''); await status.refetch() }
    catch { setError('Não foi possível alterar a política. Confira a senha, o código do aplicativo e seus códigos de recuperação.') }
    finally { setBusy(false) }
  }
  async function desativarNoEspelho() {
    setError(''); setBusy(true)
    try {
      await authApi.desativarMfaNoEspelho(password)
      window.location.replace('/login')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Não foi possível desativar o MFA no espelho.')
      setBusy(false)
    }
  }
  if (!allowed) return <p>A configuração está disponível para administradores e gestores.</p>
  if (recovery.length) return <div className="space-y-4"><p>Guarde estes códigos em local seguro. Cada código funciona uma vez.</p><div className="grid grid-cols-2 gap-2 font-mono text-sm">{recovery.map(c => <span key={c}>{c}</span>)}</div>{sessionsRevoked ? <><p>As sessões anteriores foram encerradas. Use um novo código do autenticador ou um código de recuperação no próximo acesso.</p><Link className="underline" to="/login">Ir para login</Link></> : <><p>Confirme que guardou o lote informando um dos códigos novos. Ele será consumido na confirmação. Os demais códigos anteriores permanecem válidos; o código usado para iniciar fica reservado até a confirmação ou expiração.</p>{error && <p role="alert" className="text-destructive">{error}</p>}<Label htmlFor="confirm-recovery">Um código novo</Label><Input id="confirm-recovery" value={confirmCode} onChange={e => setConfirmCode(e.target.value)} /><Button disabled={busy || !/^[a-f0-9]{24}$/i.test(confirmCode)} onClick={confirmRecovery}>Confirmar novos códigos</Button></>}</div>
  if (status.isLoading) return <p>Carregando...</p>
  if (status.isError) return <p role="alert">Não foi possível verificar a configuração.</p>
  if (status.data?.enabled) return <div className="max-w-lg space-y-4"><p>Autenticação em duas etapas ativa. A exigência para administradores está {status.data.required ? 'ativada' : 'desativada'} nesta igreja.</p>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Label htmlFor="mfa-existing-password">Confirme sua senha</Label><Input id="mfa-existing-password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
    {status.data.pode_desativar_no_espelho && <div className="space-y-2">
      <p className="text-sm">Para entrar apenas com a senha neste espelho, confirme sua senha acima. A desativação encerra suas sessões locais e invalida os códigos de recuperação desta cópia.</p>
      <Button variant="outline" disabled={busy || !password} onClick={desativarNoEspelho}>Desativar MFA neste espelho</Button>
    </div>}
    <Label htmlFor="mfa-existing-code">Código do autenticador ou de recuperação</Label><Input id="mfa-existing-code" value={code} onChange={e => setCode(e.target.value)} />
    {user?.mfa_recovery_recent && <p className="text-sm">Como você entrou recentemente com um código de recuperação, pode renovar informando apenas sua senha nesta sessão.</p>}
    <div className="flex flex-wrap gap-2"><Button disabled={busy || !password || (!code && !user?.mfa_recovery_recent)} onClick={renew}>Renovar códigos de recuperação</Button><Button variant="outline" disabled={busy || !password} onClick={resume}>Retomar renovação nesta sessão</Button></div>
    {user?.perfil === Perfil.ADMINISTRADOR && <div><p className="my-3 text-sm">Para alterar a exigência, informe um código atual do aplicativo e mantenha um código de recuperação não utilizado.</p><Button variant="outline" disabled={busy || !password || !/^\d{6}$/.test(code)} onClick={() => policy(!status.data!.required)}>{status.data.required ? 'Desativar exigência' : 'Exigir MFA nesta igreja'}</Button></div>}
  </div>
  return <div className="max-w-lg space-y-4"><p>Configure um aplicativo autenticador. Se exigido pela igreja, o acesso completo será liberado após a ativação.</p>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {!secret ? <><Label htmlFor="mfa-password">Confirme sua senha</Label><Input id="mfa-password" type="password" value={password} onChange={e => setPassword(e.target.value)} /><Button disabled={busy || !password} onClick={setup}>Iniciar configuração</Button></> : <>
      <p>Adicione manualmente esta chave ao aplicativo autenticador:</p><code className="block break-all rounded bg-muted p-3">{secret}</code>
      <Label htmlFor="mfa-activation">Código de seis dígitos</Label><Input id="mfa-activation" inputMode="numeric" value={code} onChange={e => setCode(e.target.value)} /><Button disabled={busy || !/^\d{6}$/.test(code)} onClick={activate}>Ativar autenticação</Button>
    </>}
  </div>
}
