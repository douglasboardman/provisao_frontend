import { useRecurso } from '../../lib/recursos'
import { ReferenciaAta } from '../../components/shared/ReferenciaAta';
import { useAuthStore } from '../../stores/auth';
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  UserPlus,
  UserMinus,
  ArrowLeftRight,
  History,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { DataTable, type Column } from "../../components/shared/DataTable";
import { HistoricoMembresiaDialog } from "../../components/shared/HistoricoMembresiaDialog";
import { EmptyState } from "../../components/shared/EmptyState";
import { ErrorState } from "../../components/shared/ErrorState";
import { Badge } from "../../components/ui/badge";
import { usePermissions } from "../../hooks/use-permissions";
import { toast } from "../../components/ui/use-toast";
import { eventosMembresiaApi } from "../../api/eventos-membresia";
import { pessoasApi } from "../../api/pessoas";
import { ApiRequestError } from "../../api/client";
import { TipoEvento, MembresiaRol, MotivacaoEvento } from "../../types/enums";
import type { EventoMembresia } from "../../types/models";
import {
  ROL_LABELS,
  TIPO_LABELS,
  TIPO_BADGE_VARIANT,
  MOTIVACAO_LABELS,
} from "../../lib/membresia-labels";
import { eventoMembresiaVigente, formatarDataCivil } from "../../lib/membresia-temporal";
import { useEnumRelations } from "../../hooks/use-enum-relations";

const admissaoSchema = z.object({
  pessoa_id: z.string().min(1, "Pessoa é obrigatória"),
  rol: z.nativeEnum(MembresiaRol),
  motivacao_evento: z.string().min(1, "Motivação é obrigatória"),
  data_evento: z.string().min(1, "Data é obrigatória"),
  ordem_dia: z.string().regex(/^[1-9][0-9]{0,3}$/, "Informe uma ordem de 1 a 9999").or(z.literal("")),
  igreja_origem: z.string().optional().or(z.literal("")),
  observacoes: z.string().optional().or(z.literal("")),
});

const demissaoSchema = z.object({
  pessoa_id: z.string().min(1, "Pessoa é obrigatória"),
  motivacao_evento: z.string().min(1, "Motivação é obrigatória"),
  data_evento: z.string().min(1, "Data é obrigatória"),
  ordem_dia: z.string().regex(/^[1-9][0-9]{0,3}$/, "Informe uma ordem de 1 a 9999").or(z.literal("")),
  igreja_destino: z.string().optional().or(z.literal("")),
  observacoes: z.string().optional().or(z.literal("")),
});

const mudancaRolSchema = z.object({
  pessoa_id: z.string().min(1, "Pessoa é obrigatória"),
  rol: z.nativeEnum(MembresiaRol),
  motivacao_evento: z.string().min(1, "Motivação é obrigatória"),
  data_evento: z.string().min(1, "Data é obrigatória"),
  ordem_dia: z.string().regex(/^[1-9][0-9]{0,3}$/, "Informe uma ordem de 1 a 9999").or(z.literal("")),
  observacoes: z.string().optional().or(z.literal("")),
});

type ModalType = "admissao" | "demissao" | "mudanca" | null;

export function GestaoMembresiaPage() {
  const secretariaHabilitada = useRecurso('secretaria')
  const [modal, setModal] = useState<ModalType>(null);
  const [historyPessoaId, setHistoryPessoaId] = useState<string | null>(null);
  const { canCreate } = usePermissions("eventos-membresia");
  const { getFilter, getMapping } = useEnumRelations("membresia");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["eventos-membresia"],
    queryFn: eventosMembresiaApi.list,
  });
  const { data: pessoas } = useQuery({
    queryKey: ["pessoas"],
    queryFn: pessoasApi.list,
  });

  const { lastEventMap, ambiguos } = useMemo(() => {
    const grupos = new Map<string, EventoMembresia[]>();
    for (const ev of data ?? []) { const grupo = grupos.get(ev.pessoa_id) ?? []; grupo.push(ev); grupos.set(ev.pessoa_id, grupo); }
    const mapa = new Map<string, EventoMembresia>();
    const pendentes = new Set<string>();
    for (const [pessoaId, grupo] of grupos) {
      const resultado = eventoMembresiaVigente(grupo, '9999-12-31');
      if (resultado.situacao === 'DEFINIDO') mapa.set(pessoaId, resultado.evento);
      else if (resultado.situacao === 'AMBIGUO') pendentes.add(pessoaId);
    }
    return { lastEventMap: mapa, ambiguos: pendentes };
  }, [data]);

  const lastEvents = useMemo(
    () => Array.from(lastEventMap.values()),
    [lastEventMap],
  );

  const pessoasAdmissao = useMemo(() => {
    if (!pessoas) return [];
    return pessoas.filter((p) => {
      const last = lastEventMap.get(p.id);
      return !ambiguos.has(p.id) && (!last || last.tipo_evento === TipoEvento.DEMISSAO);
    });
  }, [pessoas, lastEventMap, ambiguos]);

  const pessoasAtivas = useMemo(() => {
    if (!pessoas) return [];
    return pessoas.filter((p) => {
      const last = lastEventMap.get(p.id);
      return (
        last &&
        (last.tipo_evento === TipoEvento.ADMISSAO ||
          last.tipo_evento === TipoEvento.MUDANCA_DE_ROL)
      );
    });
  }, [pessoas, lastEventMap]);

  const admForm = useForm({
    resolver: zodResolver(admissaoSchema),
    defaultValues: {
      pessoa_id: "",
      rol: MembresiaRol.COMUNGANTES,
      motivacao_evento: "",
      data_evento: "",
      ordem_dia: "",
      igreja_origem: "",
      observacoes: "",
    },
  });
  const demForm = useForm({
    resolver: zodResolver(demissaoSchema),
    defaultValues: {
      pessoa_id: "",
      motivacao_evento: "",
      data_evento: "",
      ordem_dia: "",
      igreja_destino: "",
      observacoes: "",
    },
  });
  const mudForm = useForm({
    resolver: zodResolver(mudancaRolSchema),
    defaultValues: {
      pessoa_id: "",
      rol: MembresiaRol.COMUNGANTES,
      motivacao_evento: "",
      data_evento: "",
      ordem_dia: "",
      observacoes: "",
    },
  });

  const [rolOrigem, setRolOrigem] = useState("");

  const admPessoaId = admForm.watch("pessoa_id");
  const admMinDate = useMemo(() => {
    if (!admPessoaId) return undefined;
    const lastEvent = lastEventMap.get(admPessoaId);
    return lastEvent ? lastEvent.data_evento.split("T")[0] : undefined;
  }, [admPessoaId, lastEventMap]);

  const demPessoaId = demForm.watch("pessoa_id");
  const demMinDate = useMemo(() => {
    if (!demPessoaId) return undefined;
    const lastEvent = lastEventMap.get(demPessoaId);
    return lastEvent ? lastEvent.data_evento.split("T")[0] : undefined;
  }, [demPessoaId, lastEventMap]);

  const mudPessoaId = mudForm.watch("pessoa_id");
  const mudMinDate = useMemo(() => {
    if (!mudPessoaId) return undefined;
    const lastEvent = lastEventMap.get(mudPessoaId);
    return lastEvent ? lastEvent.data_evento.split("T")[0] : undefined;
  }, [mudPessoaId, lastEventMap]);

  const usuario = useAuthStore(s => s.user);
  const identidade = `${usuario?.igreja_id}:${usuario?.sub}`;
  const [eventoCriado, setEventoCriado] = useState<{ id: string; identidade: string } | null>(null);

  const createMut = useMutation({
    mutationFn: (d: Partial<EventoMembresia>) => eventosMembresiaApi.create(d),
    onSuccess: (evento) => {
      setEventoCriado({ id: evento.id, identidade });
      queryClient.invalidateQueries({ queryKey: ["eventos-membresia"] });
      toast({ title: "Evento registrado com sucesso" });
      closeFormModal();
    },
    onError: (e) =>
      toast({
        title: "Erro",
        description:
          e instanceof ApiRequestError ? e.messages[0] : "Erro ao registrar",
        variant: "destructive",
      }),
  });

  function closeFormModal() {
    setModal(null);
    setRolOrigem("");
    admForm.reset();
    demForm.reset();
    mudForm.reset();
  }

  function onSubmitAdmissao(d: z.infer<typeof admissaoSchema>) {
    createMut.mutate({
      ...d,
      ordem_dia: d.ordem_dia ? Number(d.ordem_dia) : undefined,
      tipo_evento: TipoEvento.ADMISSAO,
      motivacao_evento: d.motivacao_evento as MotivacaoEvento,
      igreja_origem: d.igreja_origem || undefined,
      observacoes: d.observacoes || undefined,
    });
  }

  function onSubmitDemissao(d: z.infer<typeof demissaoSchema>) {
    const rol = getMapping("Rol de Destino por Motivação de Demissão", d.motivacao_evento);
    if (!rol) return;
    createMut.mutate({
      ...d,
      ordem_dia: d.ordem_dia ? Number(d.ordem_dia) : undefined,
      tipo_evento: TipoEvento.DEMISSAO,
      motivacao_evento: d.motivacao_evento as MotivacaoEvento,
      rol: rol as MembresiaRol,
      igreja_destino: d.igreja_destino || undefined,
      observacoes: d.observacoes || undefined,
    });
  }

  function onSubmitMudanca(d: z.infer<typeof mudancaRolSchema>) {
    createMut.mutate({
      ...d,
      ordem_dia: d.ordem_dia ? Number(d.ordem_dia) : undefined,
      tipo_evento: TipoEvento.MUDANCA_DE_ROL,
      motivacao_evento: d.motivacao_evento as MotivacaoEvento,
      observacoes: d.observacoes || undefined,
    });
  }

  function handleMudancaPessoaChange(pessoaId: string) {
    mudForm.setValue("pessoa_id", pessoaId);
    const lastEvent = lastEventMap.get(pessoaId);
    setRolOrigem(
      lastEvent ? (ROL_LABELS[lastEvent.rol] ?? "") : "Sem registro anterior",
    );
  }

  const columns: Column<EventoMembresia>[] = [
    {
      key: "pessoa",
      header: "Pessoa",
      render: (v) => (
        <span className="font-medium">
          {v.pessoas?.nome_completo ?? v.pessoa_id.slice(0, 8)}
        </span>
      ),
      sortable: true,
    },
    {
      key: "tipo_evento",
      header: "Último Evento",
      render: (v) => (
        <Badge variant={TIPO_BADGE_VARIANT[v.tipo_evento]}>
          {TIPO_LABELS[v.tipo_evento]}
        </Badge>
      ),
    },
    {
      key: "rol",
      header: "Rol do último evento registrado",
      render: (v) => <Badge variant="outline">{ROL_LABELS[v.rol]}</Badge>,
    },
    {
      key: "data_evento",
      header: "Data",
      render: (v) => (
        <span className="text-sm">
          {formatarDataCivil(v.data_evento)}
        </span>
      ),
    },
  ];

  const admMotivacoes = useMemo(
    () => getFilter("Motivações de Admissão", "ADMISSAO")
      .map((k) => [k, MOTIVACAO_LABELS[k as MotivacaoEvento]] as const)
      .filter(([, v]) => v),
    [getFilter],
  );

  const demMotivacoes = useMemo(
    () => getFilter("Motivações de Demissão", "DEMISSAO")
      .map((k) => [k, MOTIVACAO_LABELS[k as MotivacaoEvento]] as const)
      .filter(([, v]) => v),
    [getFilter],
  );

  const rolsAdmissao = useMemo(
    () => getFilter("Rols de Admissão", "ADMISSAO")
      .map((k) => [k, ROL_LABELS[k as MembresiaRol]] as const)
      .filter(([, v]) => v),
    [getFilter],
  );

  const rolsMudanca = useMemo(
    () => getFilter("Rols de Mudança de Rol", "MUDANCA_DE_ROL")
      .map((k) => [k, ROL_LABELS[k as MembresiaRol]] as const)
      .filter(([, v]) => v),
    [getFilter],
  );

  const mudRolValue = mudForm.watch("rol");
  const mudMotivacoes = useMemo(
    () => {
      const valores = mudRolValue
        ? getFilter("Motivações por Rol de Destino", mudRolValue)
        : getFilter("Motivações de Mudança de Rol", "MUDANCA_DE_ROL");
      return valores
        .map((k) => [k, MOTIVACAO_LABELS[k as MotivacaoEvento]] as const)
        .filter(([, v]) => v);
    },
    [getFilter, mudRolValue],
  );

  useEffect(() => {
    if (mudMotivacoes.length === 1) {
      mudForm.setValue("motivacao_evento", mudMotivacoes[0][0]);
    } else {
      const current = mudForm.getValues("motivacao_evento");
      if (current && !mudMotivacoes.some(([k]) => k === current)) {
        mudForm.setValue("motivacao_evento", "");
      }
    }
  }, [mudMotivacoes]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-bold">
            Gestão de Membresia
          </h2>
          <p className="text-sm text-muted-foreground">
            Registre e acompanhe eventos de admissão, demissão e mudança de rol
          </p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={() => {
                admForm.reset();
                setModal("admissao");
              }}
            >
              <UserPlus size={18} className="mr-2" />
              Admitir
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                demForm.reset();
                setModal("demissao");
              }}
            >
              <UserMinus size={18} className="mr-2" />
              Demitir
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                mudForm.reset();
                setRolOrigem("");
                setModal("mudanca");
              }}
            >
              <ArrowLeftRight size={18} className="mr-2" />
              Mudar Rol
            </Button>
          </div>
        )}
      </div>

      {ambiguos.size > 0 && <p role="alert">{ambiguos.size} histórico(s) têm atos recentes no mesmo dia sem ordem confirmada e foram excluídos das ações até a conferência.</p>}
      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">
          Carregando...
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !lastEvents.length ? (
        <EmptyState
          icon={History}
          title="Nenhum evento"
          description="Nenhum evento de membresia registrado"
        />
      ) : (
        <DataTable
          data={lastEvents}
          columns={columns}
          keyExtractor={(v) => v.pessoa_id}
          actions={(item) => (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setHistoryPessoaId(item.pessoa_id)}
            >
              <History size={16} />
              Histórico
            </Button>
          )}
        />
      )}

      {secretariaHabilitada && eventoCriado?.identidade === identidade && (
        <div className="rounded border p-3">
          <ReferenciaAta key={eventoCriado.id} alvo={{ grupo: 'MEMBRESIA', alvo_id: eventoCriado.id, etapa: 'ATO' }} identidade={identidade} label="Vincular ata ao evento registrado" />
        </div>
      )}

      <HistoricoMembresiaDialog
        pessoaId={historyPessoaId}
        open={!!historyPessoaId}
        onClose={() => setHistoryPessoaId(null)}
      />

      {/* Create Admissão */}
      <Dialog
        open={modal === "admissao"}
        onOpenChange={(o) => !o && closeFormModal()}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Admissão</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={admForm.handleSubmit(onSubmitAdmissao)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Pessoa *</Label>
              <Select
                value={admForm.watch("pessoa_id")}
                onValueChange={(v) => admForm.setValue("pessoa_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {pessoasAdmissao.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {admForm.formState.errors.pessoa_id && (
                <p className="text-xs text-destructive">
                  {admForm.formState.errors.pessoa_id.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rol *</Label>
                <Select
                  value={admForm.watch("rol")}
                  onValueChange={(v) =>
                    admForm.setValue("rol", v as MembresiaRol)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rolsAdmissao.map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motivação *</Label>
                <Select
                  value={admForm.watch("motivacao_evento")}
                  onValueChange={(v) => admForm.setValue("motivacao_evento", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {admMotivacoes.map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adm_data">Data de Admissão *</Label>
                <Input
                  id="adm_data"
                  type="date"
                  min={admMinDate}
                  {...admForm.register("data_evento")}
                />
                {admForm.formState.errors.data_evento && (
                  <p className="text-xs text-destructive">
                    {admForm.formState.errors.data_evento.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="adm_origem">Igreja de Origem</Label>
                <Input id="adm_origem" {...admForm.register("igreja_origem")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adm_ordem">Ordem do ato no dia (opcional)</Label>
              <Input id="adm_ordem" type="number" min="1" max="9999" {...admForm.register("ordem_dia")} />
              {admForm.formState.errors.ordem_dia && <p className="text-xs text-destructive">{admForm.formState.errors.ordem_dia.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adm_obs">Observações</Label>
              <Textarea
                id="adm_obs"
                rows={2}
                {...admForm.register("observacoes")}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeFormModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Demissão */}
      <Dialog
        open={modal === "demissao"}
        onOpenChange={(o) => !o && closeFormModal()}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Demissão</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={demForm.handleSubmit(onSubmitDemissao)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Pessoa *</Label>
              <Select
                value={demForm.watch("pessoa_id")}
                onValueChange={(v) => demForm.setValue("pessoa_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {pessoasAtivas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {demForm.formState.errors.pessoa_id && (
                <p className="text-xs text-destructive">
                  {demForm.formState.errors.pessoa_id.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dem_data">Data de Demissão *</Label>
                <Input
                  id="dem_data"
                  type="date"
                  min={demMinDate}
                  {...demForm.register("data_evento")}
                />
                {demForm.formState.errors.data_evento && (
                  <p className="text-xs text-destructive">
                    {demForm.formState.errors.data_evento.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Motivação *</Label>
                <Select
                  value={demForm.watch("motivacao_evento")}
                  onValueChange={(v) => demForm.setValue("motivacao_evento", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {demMotivacoes.map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dem_destino">Igreja de Destino</Label>
              <Input id="dem_destino" {...demForm.register("igreja_destino")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dem_ordem">Ordem do ato no dia (opcional)</Label>
              <Input id="dem_ordem" type="number" min="1" max="9999" {...demForm.register("ordem_dia")} />
              {demForm.formState.errors.ordem_dia && <p className="text-xs text-destructive">{demForm.formState.errors.ordem_dia.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dem_obs">Observações</Label>
              <Textarea
                id="dem_obs"
                rows={2}
                {...demForm.register("observacoes")}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeFormModal}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={createMut.isPending}
              >
                {createMut.isPending ? "Salvando..." : "Confirmar Demissão"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Mudança de Rol */}
      <Dialog
        open={modal === "mudanca"}
        onOpenChange={(o) => !o && closeFormModal()}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Mudança de Rol</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={mudForm.handleSubmit(onSubmitMudanca)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Pessoa *</Label>
              <Select
                value={mudForm.watch("pessoa_id")}
                onValueChange={handleMudancaPessoaChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {pessoasAtivas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mudForm.formState.errors.pessoa_id && (
                <p className="text-xs text-destructive">
                  {mudForm.formState.errors.pessoa_id.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rol de Origem</Label>
                <Input value={rolOrigem} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Novo Rol *</Label>
                <Select
                  value={mudForm.watch("rol")}
                  onValueChange={(v) => mudForm.setValue("rol", v as MembresiaRol)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rolsMudanca.map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Motivação *</Label>
                <Select
                  value={mudForm.watch("motivacao_evento")}
                  onValueChange={(v) => mudForm.setValue("motivacao_evento", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {mudMotivacoes.map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mud_data">Data *</Label>
                <Input
                  id="mud_data"
                  type="date"
                  min={mudMinDate}
                  {...mudForm.register("data_evento")}
                />
                {mudForm.formState.errors.data_evento && (
                  <p className="text-xs text-destructive">
                    {mudForm.formState.errors.data_evento.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mud_ordem">Ordem do ato no dia (opcional)</Label>
              <Input id="mud_ordem" type="number" min="1" max="9999" {...mudForm.register("ordem_dia")} />
              {mudForm.formState.errors.ordem_dia && <p className="text-xs text-destructive">{mudForm.formState.errors.ordem_dia.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="mud_obs">Observações</Label>
              <Textarea
                id="mud_obs"
                rows={2}
                {...mudForm.register("observacoes")}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeFormModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
