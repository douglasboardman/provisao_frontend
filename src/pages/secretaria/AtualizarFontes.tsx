import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '../../components/ui/button'
import { secretariaApi, type VersaoInput } from '../../api/secretaria'
import type { DefinicaoCampo, Valores, ValorCampo } from '../../api/campos'

const formatar = (campo?: ValorCampo) => {
  const valor = campo?.valor
  if (Array.isArray(valor)) return valor.join(' · ') || 'Em branco'
  return valor == null ? 'Em branco' : String(valor)
}

export function AtualizarFontes({ documento, revisao, versao, definicoes, aplicar }: {
  documento: string; revisao: number; versao: VersaoInput; definicoes: Record<string, DefinicaoCampo>; aplicar: (valores: Valores, assinatura: string, planejamento?: string) => void
}) {
  const [consultada, consultar] = useState<VersaoInput>()
  const consulta = useMutation({ mutationFn: (v: VersaoInput) => secretariaApi.previaFontes(documento, v, revisao) })
  const previa = consultada === versao ? consulta.data : undefined
  const automaticos = Object.entries(previa?.valores ?? {}).filter(([, c]) => c.origem.tipo === 'sistema')
  const mudancas = automaticos.filter(([id, c]) => JSON.stringify(c.valor) !== JSON.stringify(versao.conteudo.valores?.[id]?.valor))
  const mudouPlanejamento = !!previa?.planejamento_origem && previa.planejamento_origem !== versao.conteudo.planejamento_origem
  return <div className="space-y-2">
    <Button type="button" variant="outline" disabled={consulta.isPending} onClick={() => { consultar(versao); consulta.mutate(versao) }}>Conferir dados de origem</Button>
    {consulta.error && <p role="alert">{consulta.error.message}</p>}
    {previa && (mudancas.length || mudouPlanejamento ? <div className="space-y-2">
      {mudancas.length > 0 ? <ul>{mudancas.map(([id,c]) => <li key={id}><strong>{definicoes[id]?.nome}</strong> · {formatar(versao.conteudo.valores?.[id])} → {formatar(c)}</li>)}</ul>
        : <p>O agendamento foi alterado. Os campos usados mantêm os mesmos valores.</p>}
      <Button type="button" onClick={() => aplicar(Object.fromEntries(automaticos), previa.assinatura, previa.planejamento_origem)}>Aplicar à minuta</Button>
    </div> : <p role="status">Os dados conferem com a origem.</p>)}
  </div>
}
