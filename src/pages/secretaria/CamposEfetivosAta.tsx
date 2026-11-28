import type { EfetivosAta } from '../../api/secretaria'
import { Campo } from './formulario'

function horaLocal(iso?: string) {
  if (!iso) return ''
  const data = new Date(iso)
  return new Date(data.getTime() - data.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export function CamposEfetivosAta({
  valor,
  alterar,
  conselho,
  minimoDeclarado,
}: {
  valor: EfetivosAta
  alterar: (v: EfetivosAta) => void
  conselho: boolean
  minimoDeclarado: boolean
}) {
  const contagens: Partial<Record<keyof EfetivosAta, string>> = {
    presentes: 'Total de presentes na lista de presença',
    habilitados_presentes: 'Presentes habilitados para quórum',
    universo: 'Total de membros habilitados',
    ...(minimoDeclarado && { minimo_declarado: 'Quórum mínimo declarado na ata' }),
    ...(conselho && {
      pastores_presentes: 'Pastores presentes',
      regentes_presentes: 'Presbíteros regentes presentes',
      regentes_exercicio: 'Presbíteros regentes em exercício',
    }),
  }
  return (
    <fieldset id="efetivos" className="space-y-3">
      <legend className="font-semibold">Dados efetivos da ata</legend>
      <div className="grid gap-3 md:grid-cols-2">
        {(['inicio', 'fim'] as const).map((k) => (
          <Campo
            key={k}
            label={k === 'inicio' ? 'Data e hora de início' : 'Data e hora de encerramento'}
            type="datetime-local"
            required={false}
            value={horaLocal(valor[k])}
            onChange={(s) => alterar({ ...valor, [k]: s ? new Date(s).toISOString() : undefined })}
          />
        ))}
        <Campo
          label="Local efetivo"
          required={false}
          value={valor.local ?? ''}
          onChange={(s) => alterar({ ...valor, local: s || undefined })}
        />
        {Object.entries(contagens).map(([k, label]) => (
          <Campo
            key={k}
            label={label}
            type="number"
            required={false}
            value={valor[k as keyof EfetivosAta] ?? ''}
            onChange={(s) => alterar({ ...valor, [k]: s === '' ? undefined : Number(s) })}
          />
        ))}
      </div>
    </fieldset>
  )
}
