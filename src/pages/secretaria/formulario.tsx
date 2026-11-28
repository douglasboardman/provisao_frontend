import { useRef, useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/button'
import type { ResultadoSecretaria } from '../../api/secretaria'
export const hoje = () => new Date().toLocaleDateString('en-CA')
export const codigos = (s: string) => [...new Set(s.split(',').map(x => x.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_')).filter(Boolean))]
export function Campo({ label, value, onChange, type = 'text', required = true }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return <label className="grid gap-1 text-sm">{label}<Input type={type} required={required} value={value} onChange={e => onChange(e.target.value)} /></label>
}
export function Area({ label, value, onChange, required = true }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) { return <label className="grid gap-1 text-sm">{label}<Textarea rows={4} required={required} value={value} onChange={e => onChange(e.target.value)} /></label> }
export function Escolha({ label, value, onChange, children, required = true, disabled }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode; required?: boolean; disabled?: boolean }) {
  return <label className="grid gap-1 text-sm">{label}<select disabled={disabled} className="h-10 rounded border bg-background px-2" value={value} onChange={e => onChange(e.target.value)} required={required}>{children}</select></label>
}
export function Check({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) { return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />{label}</label> }
export function useComando<T extends object>(enviar: (v: T & { idempotencia: string }) => Promise<ResultadoSecretaria>, concluido?: (r: ResultadoSecretaria) => void, escopo = '') {
  const client = useQueryClient()
  const pendente = useRef({ corpo: '', chave: '' })
  return useMutation({ mutationFn: (v: T) => {
    const corpo = JSON.stringify([escopo, v])
    if (corpo !== pendente.current.corpo) pendente.current = { corpo, chave: crypto.randomUUID() }
    return enviar({ ...v, idempotencia: pendente.current.chave })
  }, onSuccess: r => { pendente.current = { corpo: '', chave: '' }; void client.invalidateQueries({ queryKey: ['secretaria'] }); void client.invalidateQueries({ queryKey: ['eventos-membresia'] }); concluido?.(r) } })
}
export function Salvar({ pending, error, success, label = 'Salvar', disabled = false }: { pending: boolean; error: Error | null; success: boolean; label?: string; disabled?: boolean }) {
  return <div className="space-y-2">{error && <p role="alert" className="text-destructive">{error instanceof TypeError ? 'Falha de conexão. Suas alterações estão no formulário. Tente salvar novamente.' : error.message}</p>}{success && <p role="status">Registro salvo.</p>}<Button type="submit" disabled={pending || disabled}>{pending ? 'Salvando…' : label}</Button></div>
}

export function CampoPapeis({ value, onChange, label }: { value: string[]; onChange: (v: string[]) => void; label: string }) {
  const [raw, setRaw] = useState(value.join(', '))
  return <Campo label={label} value={raw} onChange={s => { setRaw(s); onChange(codigos(s)) }} />
}
