import { useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { ApiRequestError } from "../../api/client"
import { profissoesApi } from "../../api/profissoes"
import { DataTable, type Column } from "../../components/shared/DataTable"
import { DeleteDialog } from "../../components/shared/DeleteDialog"
import { ErrorState } from "../../components/shared/ErrorState"
import { Button } from "../../components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { toast } from "../../components/ui/use-toast"
import { useAuthStore } from "../../stores/auth"
import type { Profissao } from "../../types/models"

const colunas: Column<Profissao>[] = [{ key: "nome", header: "Profissão", sortable: true }]

export function ProfissoesPage() {
  const igrejaId = useAuthStore(s => s.user?.igreja_id)
  const client = useQueryClient()
  const chave = ["profissoes", igrejaId]
  const lista = useQuery({ queryKey: chave, queryFn: profissoesApi.list })
  const [editando, setEditando] = useState<Profissao | null | undefined>(undefined)
  const [nome, setNome] = useState("")
  const [excluindo, setExcluindo] = useState<Profissao | null>(null)

  const salvar = useMutation({
    mutationFn: ({ id, nome }: { id?: string; nome: string }) =>
      id ? profissoesApi.update(id, nome) : profissoesApi.create(nome),
    onSuccess: async () => {
      setEditando(undefined)
      await client.invalidateQueries({ queryKey: chave })
    },
  })
  const excluir = useMutation({
    mutationFn: profissoesApi.remove,
    onSuccess: async () => {
      setExcluindo(null)
      await client.invalidateQueries({ queryKey: chave })
    },
    onError: erro => {
      setExcluindo(null)
      toast({ title: "Erro ao excluir", description: erro instanceof ApiRequestError ? erro.messages[0] : "Não foi possível excluir a profissão.", variant: "destructive" })
    },
  })

  function abrir(profissao: Profissao | null) {
    salvar.reset()
    setNome(profissao?.nome ?? "")
    setEditando(profissao)
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (nome.trim()) salvar.mutate({ id: editando?.id, nome: nome.trim() })
  }

  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-lg font-semibold">Profissões</h2>
      <Button onClick={() => abrir(null)}><Plus size={16} className="mr-2" />Nova profissão</Button>
    </div>
    {lista.isPending ? <p>Carregando profissões...</p> : lista.isError ? (
      <ErrorState error={lista.error} onRetry={() => void lista.refetch()} />
    ) : lista.data.length === 0 ? (
      <p className="text-sm text-muted-foreground">Nenhuma profissão cadastrada.</p>
    ) : (
      <DataTable data={lista.data} columns={colunas} keyExtractor={p => p.id} actions={p => <>
        <Button variant="ghost" size="icon" aria-label={`Editar ${p.nome}`} onClick={() => abrir(p)}><Pencil size={16} /></Button>
        <Button variant="ghost" size="icon" aria-label={`Excluir ${p.nome}`} onClick={() => setExcluindo(p)}><Trash2 size={16} className="text-destructive" /></Button>
      </>} />
    )}
    <Dialog open={editando !== undefined} onOpenChange={aberto => { if (!aberto && !salvar.isPending) setEditando(undefined) }}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader><DialogTitle>{editando ? "Editar profissão" : "Nova profissão"}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={enviar}>
          <div className="space-y-2">
            <Label htmlFor="nome-profissao">Nome da profissão</Label>
            <Input id="nome-profissao" value={nome} onChange={e => setNome(e.target.value)} disabled={salvar.isPending} required maxLength={120} />
          </div>
          {salvar.isError && <p role="alert" className="text-sm text-destructive">{salvar.error instanceof ApiRequestError ? salvar.error.messages[0] : "Não foi possível salvar a profissão."}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditando(undefined)} disabled={salvar.isPending}>Cancelar</Button>
            <Button type="submit" disabled={!nome.trim() || salvar.isPending}>Salvar profissão</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <DeleteDialog
      open={!!excluindo} onOpenChange={aberto => { if (!aberto && !excluir.isPending) setExcluindo(null) }}
      title="Excluir profissão" description={`Excluir "${excluindo?.nome}" da lista de profissões?`}
      loading={excluir.isPending} onConfirm={() => excluindo && excluir.mutate(excluindo.id)}
    />
  </section>
}
