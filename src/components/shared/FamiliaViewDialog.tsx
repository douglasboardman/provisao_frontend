import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Pencil, History, ArrowLeft } from "lucide-react"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../ui/dialog"
import { pessoasApi } from "../../api/pessoas"
import { eventosMembresiaApi } from "../../api/eventos-membresia"
import type { EventoMembresia } from "../../types/models"
import { ROL_LABELS, TIPO_LABELS, TIPO_BADGE_VARIANT, calcAge } from "../../lib/membresia-labels"
import { usePermissions } from "../../hooks/use-permissions"
import { useAuthStore } from "../../stores/auth"
import { ErrorState } from "./ErrorState"
import { agruparAtosPorPessoa, atosQueExigemConferencia, dataCivilLocal, eventoMembresiaVigente } from "../../lib/membresia-temporal"

interface FamiliaViewDialogProps {
  grupo: { id: string; nome_familia: string } | null
  onClose: () => void
  onBack?: () => void
  onEditPessoa: (pessoaId: string) => void
  onViewHistorico: (pessoaId: string) => void
}

export function FamiliaViewDialog({ grupo, onClose, onBack, onEditPessoa, onViewHistorico }: FamiliaViewDialogProps) {
  const identidade = useAuthStore(s => `${s.user?.igreja_id}:${s.user?.sub}`)
  const cadastro = usePermissions("pessoas")
  const membresia = usePermissions("eventos-membresia")
  const pessoasQuery = useQuery({ queryKey: ["pessoas", identidade], queryFn: pessoasApi.list, enabled: !!grupo && cadastro.canView })
  const { data: eventos, isSuccess: eventosConsultados } = useQuery({ queryKey: ["eventos-membresia", identidade], queryFn: eventosMembresiaApi.list, enabled: !!grupo && cadastro.canView && membresia.canView })
  const pessoas = pessoasQuery.data

  const hoje = dataCivilLocal(new Date())
  const { lastEventMap, pendencias } = useMemo(() => {
    const map = new Map<string, EventoMembresia>()
    const pendencias = new Set<string>()
    for (const [pessoa, grupo] of agruparAtosPorPessoa(eventos ?? [])) {
      const atos = grupo.filter(e => e.data_evento.slice(0, 10) <= hoje)
      if (atosQueExigemConferencia(atos).length) {
        pendencias.add(pessoa)
        continue
      }
      const vigente = eventoMembresiaVigente(atos, hoje)
      if (vigente.situacao === 'DEFINIDO') map.set(pessoa, vigente.evento)
    }
    return { lastEventMap: map, pendencias }
  }, [eventos, hoje])

  const membros = useMemo(() => {
    if (!grupo || !pessoas) return []
    return pessoas.filter((p) => p.grupo_familiar_id === grupo.id)
  }, [grupo, pessoas])

  return (
    <Dialog open={!!grupo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
              <ArrowLeft size={16} />
              Voltar
            </button>
          )}
          <DialogTitle>Família {grupo?.nome_familia}</DialogTitle>
        </DialogHeader>

        {!cadastro.canView ? (
          <p className="text-sm text-muted-foreground">Sua conta pode consultar a composição numérica do grupo.</p>
        ) : pessoasQuery.isPending ? (
          <p role="status">Carregando integrantes…</p>
        ) : pessoasQuery.isError ? (
          <ErrorState error={pessoasQuery.error} onRetry={pessoasQuery.refetch} />
        ) : !membros.length ? (
          <div className="py-8 text-center text-muted-foreground">Nenhum integrante neste grupo familiar</div>
        ) : (
          <div className="space-y-3">
            {membros.map((pessoa) => {
              const lastEvent = lastEventMap.get(pessoa.id)
              const age = calcAge(pessoa.data_nascimento)
              return (
                <div key={pessoa.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-medium truncate">{pessoa.nome_completo}</span>
                        <span className="text-sm text-muted-foreground shrink-0">{age} anos</span>
                      </div>
                      {membresia.canView && eventosConsultados && <div className="flex items-center gap-2 flex-wrap">
                        {lastEvent ? (
                          <>
                            <Badge variant={TIPO_BADGE_VARIANT[lastEvent.tipo_evento]}>{TIPO_LABELS[lastEvent.tipo_evento]}</Badge>
                            <Badge variant="outline">{ROL_LABELS[lastEvent.rol]}</Badge>
                          </>
                        ) : <span className="text-sm text-muted-foreground">{pendencias.has(pessoa.id) ? 'Histórico a conferir' : 'Sem registro de membresia'}</span>}
                      </div>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {cadastro.canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar pessoa" onClick={() => onEditPessoa(pessoa.id)}>
                        <Pencil size={14} />
                      </Button>}
                      {membresia.canView && (lastEvent || pendencias.has(pessoa.id)) && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Histórico de membresia" onClick={() => onViewHistorico(pessoa.id)}>
                          <History size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
