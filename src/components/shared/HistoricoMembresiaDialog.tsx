import { Painel } from './Painel'
import { useRecurso } from '../../lib/recursos'
import { ReferenciaAta } from './ReferenciaAta';
import { HistoricoRevisoesEleitorais } from '../../pages/oficiais/DecisaoEleitoral';
import { CorrecaoConteudo } from '../../pages/oficiais/CorrecaoConteudo';
import { InsercaoRetroativa } from '../../pages/oficiais/InsercaoRetroativa';
import { CorrecaoMembresia } from '../../pages/oficiais/CorrecaoMembresia';
import { OrdenacaoMembresia } from '../../pages/oficiais/OrdenacaoMembresia';
import { ErrorState } from "./ErrorState";
import { eventoMembresiaVigente, formatarDataCivil } from "../../lib/membresia-temporal";
import { useState, useMemo, useEffect, useRef, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { DeleteDialog } from "./DeleteDialog";
import { usePermissions } from "../../hooks/use-permissions";
import { toast } from "../ui/use-toast";
import { podeHistorico, oficiaisApi } from "../../api/oficiais";
import { useAuthStore } from "../../stores/auth";
import { Perfil } from "../../types/enums";
import { eventosMembresiaApi } from "../../api/eventos-membresia";
import { pessoasApi } from "../../api/pessoas";
import { ApiRequestError } from "../../api/client";
import { formatCpf } from "../../lib/formatters";
import { TipoEvento, MembresiaRol, MotivacaoEvento } from "../../types/enums";
import type { EventoMembresia } from "../../types/models";
import {
  ROL_LABELS,
  TIPO_LABELS,
  TIPO_BADGE_VARIANT,
  MOTIVACAO_LABELS,
  calcAge,
} from "../../lib/membresia-labels";
import { useEnumRelations } from "../../hooks/use-enum-relations";

const admissaoSchema = z.object({
  rol: z.nativeEnum(MembresiaRol),
  motivacao_evento: z.string().min(1, "Motivação é obrigatória"),
  data_evento: z.string().min(1, "Data é obrigatória"),
  igreja_origem: z.string().optional().or(z.literal("")),
  observacoes: z.string().optional().or(z.literal("")),
});

const demissaoSchema = z.object({
  motivacao_evento: z.string().min(1, "Motivação é obrigatória"),
  data_evento: z.string().min(1, "Data é obrigatória"),
  igreja_destino: z.string().optional().or(z.literal("")),
  observacoes: z.string().optional().or(z.literal("")),
});

const mudancaRolSchema = z.object({
  rol: z.nativeEnum(MembresiaRol),
  motivacao_evento: z.string().min(1, "Motivação é obrigatória"),
  data_evento: z.string().min(1, "Data é obrigatória"),
  observacoes: z.string().optional().or(z.literal("")),
});

type EditFormType = "admissao" | "demissao" | "mudanca" | null;

interface HistoricoMembresiaDialogProps {
  pessoaId: string | null;
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
}

export function HistoricoMembresiaDialog({
  pessoaId,
  open,
  onClose,
  onBack,
}: HistoricoMembresiaDialogProps) {
  const secretariaHabilitada = useRecurso('secretaria')
  const governancaHabilitada = useRecurso('governanca')
  const { canEdit, canDelete } = usePermissions("eventos-membresia");
  const { canView: podeConsultarPessoas } = usePermissions("pessoas");
  const { getFilter, getMapping } = useEnumRelations("membresia");
  const queryClient = useQueryClient();

  const [editForm, setEditForm] = useState<EditFormType>(null);
  const [editingEvento, setEditingEvento] = useState<EventoMembresia | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<EventoMembresia | null>(
    null,
  );
  const [rolOrigem, setRolOrigem] = useState("");
  const [ordemEventoId, setOrdemEventoId] = useState<string | null>(null);
  const chaveOrdem = useRef('');
  const authUser = useAuthStore(s => s.user);
  const identidade = `${authUser?.igreja_id ?? ''}:${authUser?.sub ?? ''}`;
  const acesso = useQuery({ queryKey: ['oficiais', identidade, 'meu-acesso'], queryFn: oficiaisApi.meuAcesso,
    enabled: governancaHabilitada && open && !!authUser && [Perfil.ADMINISTRADOR, Perfil.GESTOR, Perfil.SECRETARIO, Perfil.AUDITOR, Perfil.COMUM].includes(authUser.perfil), staleTime: 0, gcTime: 0 });
  const consultaHistorico = !!acesso.data?.pode_consultar && podeHistorico(acesso.data, 'HISTORICO_MEMBRESIA_CONSULTAR');
  const retificaHistorico = !!acesso.data?.pode_registrar && podeHistorico(acesso.data, 'HISTORICO_MEMBRESIA_RETIFICAR');
  const decideRevisao = !!acesso.data?.pode_registrar && podeHistorico(acesso.data, 'REVISOES_ELEITORAIS_DECIDIR');
  const ordenarAto = useMutation({ mutationFn: ({ id, dados }: { id: string; dados: Parameters<typeof eventosMembresiaApi.ordenarUnico>[1] }) => eventosMembresiaApi.ordenarUnico(id, dados), onSuccess: async () => {
    setOrdemEventoId(null); await queryClient.invalidateQueries({ queryKey: ['eventos-membresia'] }); toast({ title: 'Ordem conferida' });
  }, onError: (e) => toast({ title: 'Erro', description: e instanceof ApiRequestError ? e.messages[0] : 'Não foi possível conferir a ordem', variant: 'destructive' }) });
  function enviarOrdem(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault(); const d = new FormData(e.currentTarget), texto = (nome: string) => String(d.get(nome) ?? '').trim();
    ordenarAto.mutate({ id, dados: { ordem: Number(texto('ordem')), justificativa: texto('justificativa'), autoridade: texto('autoridade'), evidencia: texto('evidencia'), idempotencia: chaveOrdem.current, ciente: true } });
  }

  const { data: allPessoas } = useQuery({
    queryKey: ["pessoas", identidade],
    queryFn: pessoasApi.list,
    enabled: open && !!pessoaId && podeConsultarPessoas,
  });
  const { data: pessoaEventos, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["eventos-membresia", identidade, "pessoa", pessoaId],
    queryFn: () => eventosMembresiaApi.getByPessoa(pessoaId!),
    enabled: !!pessoaId && open,
  });

  const estadoFinal = useMemo(() => eventoMembresiaVigente(pessoaEventos ?? [], '9999-12-31'), [pessoaEventos]);

  const pessoa = useMemo(() => {
    if (!pessoaId || !allPessoas) return null;
    return allPessoas.find((p) => p.id === pessoaId) ?? null;
  }, [pessoaId, allPessoas]);

  const admForm = useForm({
    resolver: zodResolver(admissaoSchema),
    defaultValues: {
      rol: MembresiaRol.COMUNGANTES,
      motivacao_evento: "",
      data_evento: "",
      igreja_origem: "",
      observacoes: "",
    },
  });
  const demForm = useForm({
    resolver: zodResolver(demissaoSchema),
    defaultValues: {
      motivacao_evento: "",
      data_evento: "",
      igreja_destino: "",
      observacoes: "",
    },
  });
  const mudForm = useForm({
    resolver: zodResolver(mudancaRolSchema),
    defaultValues: {
      rol: MembresiaRol.COMUNGANTES,
      motivacao_evento: "",
      data_evento: "",
      observacoes: "",
    },
  });

  const editMinDate = useMemo(() => {
    if (!pessoaEventos || pessoaEventos.length < 2) return undefined;
    const penultimo = pessoaEventos[pessoaEventos.length - 2];
    return penultimo.data_evento.split("T")[0];
  }, [pessoaEventos]);

  useEffect(() => {
    if (!open) {
      setEditForm(null);
      setEditingEvento(null);
      setRolOrigem("");
      setOrdemEventoId(null);
    }
  }, [open]);

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<EventoMembresia> }) =>
      eventosMembresiaApi.update(id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-membresia"] });
      toast({ title: "Último evento registradoizado" });
      closeEditForm();
    },
    onError: (e) =>
      toast({
        title: "Erro",
        description:
          e instanceof ApiRequestError ? e.messages[0] : "Erro ao atualizar",
        variant: "destructive",
      }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => eventosMembresiaApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-membresia"] });
      toast({ title: "Evento excluído" });
      setDeleteTarget(null);
    },
    onError: (e) =>
      toast({
        title: "Erro",
        description:
          e instanceof ApiRequestError ? e.messages[0] : "Erro ao excluir",
        variant: "destructive",
      }),
  });

  function closeEditForm() {
    setEditForm(null);
    setEditingEvento(null);
    setRolOrigem("");
    admForm.reset();
    demForm.reset();
    mudForm.reset();
  }

  function openEdit(ev: EventoMembresia) {
    setEditingEvento(ev);
    if (ev.tipo_evento === TipoEvento.ADMISSAO) {
      admForm.reset({
        rol: ev.rol,
        motivacao_evento: ev.motivacao_evento,
        data_evento: ev.data_evento.split("T")[0],
        igreja_origem: ev.igreja_origem ?? "",
        observacoes: ev.observacoes ?? "",
      });
      setEditForm("admissao");
    } else if (ev.tipo_evento === TipoEvento.DEMISSAO) {
      demForm.reset({
        motivacao_evento: ev.motivacao_evento,
        data_evento: ev.data_evento.split("T")[0],
        igreja_destino: ev.igreja_destino ?? "",
        observacoes: ev.observacoes ?? "",
      });
      setEditForm("demissao");
    } else {
      setRolOrigem(ev.rol_origem ? ROL_LABELS[ev.rol_origem] : "");
      mudForm.reset({
        rol: ev.rol,
        motivacao_evento: ev.motivacao_evento,
        data_evento: ev.data_evento.split("T")[0],
        observacoes: ev.observacoes ?? "",
      });
      setEditForm("mudanca");
    }
  }

  function onSubmitAdm(d: z.infer<typeof admissaoSchema>) {
    if (!editingEvento) return;
    updateMut.mutate({
      id: editingEvento.id,
      d: {
        ...d,
        tipo_evento: TipoEvento.ADMISSAO,
        motivacao_evento: d.motivacao_evento as MotivacaoEvento,
        pessoa_id: editingEvento.pessoa_id,
        igreja_origem: d.igreja_origem || undefined,
        observacoes: d.observacoes || undefined,
      },
    });
  }

  function onSubmitDem(d: z.infer<typeof demissaoSchema>) {
    if (!editingEvento) return;
    const rol = getMapping("Rol de Destino por Motivação de Demissão", d.motivacao_evento);
    if (!rol) return;
    updateMut.mutate({
      id: editingEvento.id,
      d: {
        ...d,
        tipo_evento: TipoEvento.DEMISSAO,
        motivacao_evento: d.motivacao_evento as MotivacaoEvento,
        pessoa_id: editingEvento.pessoa_id,
        rol: rol as MembresiaRol,
        igreja_destino: d.igreja_destino || undefined,
        observacoes: d.observacoes || undefined,
      },
    });
  }

  function onSubmitMud(d: z.infer<typeof mudancaRolSchema>) {
    if (!editingEvento) return;
    updateMut.mutate({
      id: editingEvento.id,
      d: {
        ...d,
        tipo_evento: TipoEvento.MUDANCA_DE_ROL,
        motivacao_evento: d.motivacao_evento as MotivacaoEvento,
        pessoa_id: editingEvento.pessoa_id,
        observacoes: d.observacoes || undefined,
      },
    });
  }

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

  const editMudRolValue = mudForm.watch("rol");
  const mudMotivacoes = useMemo(
    () => {
      const valores = editMudRolValue
        ? getFilter("Motivações por Rol de Destino", editMudRolValue)
        : getFilter("Motivações de Mudança de Rol", "MUDANCA_DE_ROL");
      return valores
        .map((k) => [k, MOTIVACAO_LABELS[k as MotivacaoEvento]] as const)
        .filter(([, v]) => v);
    },
    [getFilter, editMudRolValue],
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
    <>
      <Dialog open={open && !editForm} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>
            )}
            <DialogTitle>Histórico de Membresia</DialogTitle>
          </DialogHeader>
          <Painel>

          {pessoa && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="font-semibold text-lg">
                {pessoa.nome_completo}{" "}
                <span className="font-normal text-muted-foreground text-base">
                  {" "}
                  — {calcAge(pessoa.data_nascimento)} anos
                </span>
              </h3>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-muted-foreground">
                {pessoa.cpf && <span>CPF: {formatCpf(pessoa.cpf)}</span>}
                <span>
                  Nascimento:{" "}
                  {new Date(pessoa.data_nascimento).toLocaleDateString("pt-BR")}
                </span>
                {pessoa.email && <span>Email: {pessoa.email}</span>}
                {pessoa.telefone && <span>Telefone: {pessoa.telefone}</span>}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Carregando histórico...
            </div>
          ) : isError ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : !pessoaEventos?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum evento registrado
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Eventos
              </h4>
              {estadoFinal.situacao === "AMBIGUO" && <p role="alert">Os últimos atos têm a mesma data e precisam de ordem conferida antes de edição ou exclusão.</p>}
              {pessoaEventos
                .slice()
                .reverse()
                .map((ev) => {
                  const isLast = estadoFinal.situacao === 'DEFINIDO' && estadoFinal.evento.id === ev.id;
                  return (
                    <div
                      key={ev.id}
                      className={`rounded-lg border p-4 ${isLast ? "border-primary/30 bg-primary/5" : "border-border"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={TIPO_BADGE_VARIANT[ev.tipo_evento]}>
                            {TIPO_LABELS[ev.tipo_evento]}
                          </Badge>
                          <Badge variant="outline">{ROL_LABELS[ev.rol]}</Badge>
                          {ev.ordem_dia != null && <Badge variant="outline">Ordem {ev.ordem_dia}</Badge>}
                          {isLast && (
                            <Badge variant="secondary" className="text-xs">
                              Último evento registrado
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {formatarDataCivil(ev.data_evento)}
                          </span>
                          {isLast && canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(ev)}
                            >
                              <Pencil size={14} />
                            </Button>
                          )}
                          {isLast && canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setDeleteTarget(ev)}
                            >
                              <Trash2 size={14} className="text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {retificaHistorico && ev.ordem_dia == null && pessoaEventos.filter(e => e.data_evento.slice(0, 10) === ev.data_evento.slice(0, 10)).length === 1 && <div className="mt-2">
                        <Button type="button" variant="outline" disabled={ordenarAto.isPending} onClick={() => { chaveOrdem.current = crypto.randomUUID(); setOrdemEventoId(ev.id); }}>Conferir ordem deste ato</Button>
                        {ordemEventoId === ev.id && <form className="mt-2 space-y-2" onSubmit={e => enviarOrdem(e, ev.id)}>
                          <p className="text-sm text-muted-foreground">Como há um único ato neste dia, registrar a ordem não altera o rol. Informe a referência conferida.</p>
                          <label className="block">Ordem no dia<Input name="ordem" type="number" min="1" max="9999" required /></label>
                          <label className="block">Justificativa<Input name="justificativa" maxLength={1000} required /></label>
                          <label className="block">Autoridade<Input name="autoridade" maxLength={255} required /></label>
                          <label className="block">Evidência<Input name="evidencia" maxLength={1000} required /></label>
                          <label className="block"><input type="checkbox" required /> Conferi a ordem e a evidência.</label>
                          <div className="flex gap-2"><Button type="submit" disabled={ordenarAto.isPending}>Salvar ordem</Button><Button type="button" variant="outline" disabled={ordenarAto.isPending} onClick={() => setOrdemEventoId(null)}>Cancelar</Button></div>
                        </form>}
                      </div>}
                      {secretariaHabilitada && authUser && [Perfil.ADMINISTRADOR, Perfil.GESTOR, Perfil.SECRETARIO, Perfil.AUDITOR, Perfil.COMUM].includes(authUser.perfil) && <ReferenciaAta alvo={{ grupo: "MEMBRESIA", alvo_id: ev.id, etapa: "ATO" }} identidade={identidade} />}
                      <div className="mt-2 text-sm space-y-1">
                        <p>
                          <span className="text-muted-foreground">
                            Motivação:
                          </span>{" "}
                          {MOTIVACAO_LABELS[ev.motivacao_evento]}
                        </p>
                        {ev.rol_origem && (
                          <p>
                            <span className="text-muted-foreground">
                              Rol de Origem:
                            </span>{" "}
                            {ROL_LABELS[ev.rol_origem]}
                          </p>
                        )}
                        {ev.igreja_origem && (
                          <p>
                            <span className="text-muted-foreground">
                              Igreja de Origem:
                            </span>{" "}
                            {ev.igreja_origem}
                          </p>
                        )}
                        {ev.igreja_destino && (
                          <p>
                            <span className="text-muted-foreground">
                              Igreja de Destino:
                            </span>{" "}
                            {ev.igreja_destino}
                          </p>
                        )}
                        {ev.observacoes && (
                          <p className="text-muted-foreground italic">
                            {ev.observacoes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
          {pessoaId && consultaHistorico && <><HistoricoRevisoesEleitorais key={`revisao-${pessoaId}`} pessoaId={pessoaId} identidade={identidade} podeRegistrar={decideRevisao} /><CorrecaoConteudo key={`conteudo-${pessoaId}`} pessoaId={pessoaId} identidade={identidade} podeRegistrar={retificaHistorico} /><InsercaoRetroativa key={`insercao-${pessoaId}`} pessoaId={pessoaId} identidade={identidade} podeRegistrar={retificaHistorico} /><CorrecaoMembresia key={`correcao-${pessoaId}`} oficialId={pessoaId} identidade={identidade} podeRegistrar={retificaHistorico} porPessoa /><OrdenacaoMembresia key={`ordem-${pessoaId}`} oficialId={pessoaId} identidade={identidade} podeRegistrar={retificaHistorico} porPessoa /></>}
        </Painel>
        </DialogContent>
      </Dialog>

      {/* Edit Admissão */}
      <Dialog
        open={editForm === "admissao"}
        onOpenChange={(o) => !o && onClose()}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <button
              onClick={closeEditForm}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
            <DialogTitle>Editar Admissão</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={admForm.handleSubmit(onSubmitAdm)}
            className="space-y-4"
          >
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
                <Label htmlFor="hist_adm_data">Data de Admissão *</Label>
                <Input
                  id="hist_adm_data"
                  type="date"
                  min={editMinDate}
                  {...admForm.register("data_evento")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hist_adm_origem">Igreja de Origem</Label>
                <Input
                  id="hist_adm_origem"
                  {...admForm.register("igreja_origem")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hist_adm_obs">Observações</Label>
              <Textarea
                id="hist_adm_obs"
                rows={2}
                {...admForm.register("observacoes")}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMut.isPending}>
                {updateMut.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Demissão */}
      <Dialog
        open={editForm === "demissao"}
        onOpenChange={(o) => !o && onClose()}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <button
              onClick={closeEditForm}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
            <DialogTitle>Editar Demissão</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={demForm.handleSubmit(onSubmitDem)}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hist_dem_data">Data de Demissão *</Label>
                <Input
                  id="hist_dem_data"
                  type="date"
                  min={editMinDate}
                  {...demForm.register("data_evento")}
                />
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
              <Label htmlFor="hist_dem_destino">Igreja de Destino</Label>
              <Input
                id="hist_dem_destino"
                {...demForm.register("igreja_destino")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hist_dem_obs">Observações</Label>
              <Textarea
                id="hist_dem_obs"
                rows={2}
                {...demForm.register("observacoes")}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditForm}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={updateMut.isPending}
              >
                {updateMut.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Mudança de Rol */}
      <Dialog
        open={editForm === "mudanca"}
        onOpenChange={(o) => !o && onClose()}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <button
              onClick={closeEditForm}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
            <DialogTitle>Editar Mudança de Rol</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={mudForm.handleSubmit(onSubmitMud)}
            className="space-y-4"
          >
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
                <Label htmlFor="hist_mud_data">Data *</Label>
                <Input
                  id="hist_mud_data"
                  type="date"
                  min={editMinDate}
                  {...mudForm.register("data_evento")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hist_mud_obs">Observações</Label>
              <Textarea
                id="hist_mud_obs"
                rows={2}
                {...mudForm.register("observacoes")}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMut.isPending}>
                {updateMut.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        loading={deleteMut.isPending}
        title="Excluir evento"
        description="Tem certeza que deseja excluir este evento de membresia? Esta ação não pode ser desfeita."
      />
    </>
  );
}
