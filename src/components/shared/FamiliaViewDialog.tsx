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

interface FamiliaViewDialogProps {
  grupo: { id: string; nome_familia: string } | null
  onClose: () => void
  onBack?: () => void
  onEditPessoa: (pessoaId: string) => void
  onViewHistorico: (pessoaId: string) => void
}

export function FamiliaViewDialog({ grupo, onClose, onBack, onEditPessoa, onViewHistorico }: FamiliaViewDialogProps) {
  const { data: pessoas } = useQuery({ queryKey: ["pessoas"], queryFn: pessoasApi.list })
  const { data: eventos } = useQuery({ queryKey: ["eventos-membresia"], queryFn: eventosMembresiaApi.list })

  const lastEventMap = useMemo(() => {
    const map = new Map<string, EventoMembresia>()
    if (!eventos) return map
    for (const ev of eventos) {
      if (!map.has(ev.pessoa_id)) map.set(ev.pessoa_id, ev)
    }
    return map
  }, [eventos])

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

        {!membros.length ? (
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
                      <div className="flex items-center gap-2 flex-wrap">
                        {lastEvent ? (
                          <>
                            <Badge variant={TIPO_BADGE_VARIANT[lastEvent.tipo_evento]}>{TIPO_LABELS[lastEvent.tipo_evento]}</Badge>
                            <Badge variant="outline">{ROL_LABELS[lastEvent.rol]}</Badge>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sem registro de membresia</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar pessoa" onClick={() => onEditPessoa(pessoa.id)}>
                        <Pencil size={14} />
                      </Button>
                      {lastEvent && (
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
