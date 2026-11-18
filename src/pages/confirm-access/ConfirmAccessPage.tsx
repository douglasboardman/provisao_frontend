import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AuthCard } from '../../components/layout/AuthCard'
import { authApi } from '../../api/auth'

export function ConfirmAccessPage() {
  const [params] = useSearchParams()
  const [state, setState] = useState<'idle' | 'pending' | 'confirmed' | 'cancelled' | 'error'>('idle')
  const token = params.get('token') ?? ''
  const cancelToken = params.get('cancel_token') ?? ''
  async function act(cancel: boolean) {
    setState('pending')
    try { if (cancel) await authApi.cancelAccess(cancelToken); else await authApi.confirmAccess(token); setState(cancel ? 'cancelled' : 'confirmed') } catch { setState('error') }
  }
  return <AuthCard title="Solicitação de acesso">
    {state === 'cancelled' ? <p className="text-white">Solicitação cancelada.</p> : <>
      {state === 'confirmed' ? <p className="mb-4 text-white">E-mail confirmado. Sua solicitação aguarda análise.</p> : <p className="mb-4 text-white">Confirme que você solicitou acesso a esta igreja.</p>}
      {state === 'error' && <p role="alert" className="mb-4 text-white">Link inválido, expirado ou ação indisponível. Solicite um novo acesso.</p>}
      {state !== 'confirmed' && <button type="button" disabled={!token || state === 'pending'} onClick={() => void act(false)} className="w-full rounded-full bg-[#d1d76b] py-3 font-semibold text-gray-800 disabled:opacity-60">{state === 'pending' ? 'Aguarde...' : 'Confirmar solicitação'}</button>}
      {cancelToken && <button type="button" disabled={state === 'pending'} onClick={() => void act(true)} className="mt-3 w-full rounded-full border border-white py-3 font-semibold text-white disabled:opacity-60">Cancelar solicitação</button>}
    </>}
    <p className="mt-5 text-center"><Link className="text-white underline" to="/login">Voltar ao login</Link></p>
  </AuthCard>
}
