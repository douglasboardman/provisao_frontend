import type { BloqueioOrgao } from '../../api/oficiais'
import type { ReactNode } from 'react'

export function AvisoImpactoOrgaos({ bloqueio, children }: { bloqueio?: BloqueioOrgao; children?: ReactNode }) {
  if (!bloqueio?.bloqueia) return null
  const descricao = { ALTERADO: 'rol alterado', PRESERVADO: 'rol preservado', INDETERMINADO: 'rol indeterminado' }
  return <div><p role="alert">A alteração exige revisão de vínculos de órgão: {bloqueio.participacoes} participação(ões) e {bloqueio.ocupacoes} ocupação(ões) potencialmente afetadas. A confirmação exige decisões favoráveis e revisão integral dos vínculos da E03.</p>{bloqueio.rol_alterado !== undefined && <p>Na data de início dos vínculos: rol alterado em {bloqueio.rol_alterado}, preservado em {bloqueio.rol_preservado} e indeterminado em {bloqueio.rol_indeterminado}. A comparação considera apenas o rol, não confirma elegibilidade nem valida o ato.</p>}{!!bloqueio.detalhes?.length && <details><summary>Ver vínculos analisados</summary>{bloqueio.detalhes.map(v => <p key={`${v.tipo}:${v.id}`}>{v.tipo === 'PARTICIPACAO' ? 'Participação' : v.cargo ?? 'Ocupação'} em {v.orgao} · início em {v.inicio.split('-').reverse().join('/')} · {descricao[v.comparacao_rol]}</p>)}{bloqueio.detalhes_limitados && <p>São mostrados os primeiros 100 vínculos; consulte todos na prévia de órgãos.</p>}</details>}{children}</div>
}
