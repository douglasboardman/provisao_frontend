import { useState } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, Column } from '../../components/shared/DataTable';
import { Button } from '../../components/ui/button';
import { Edit2, LogOut, Trash2 } from 'lucide-react';
import { useVinculosMembresia } from './hooks';
import { VinculoMembresia, VinculoRolLabel } from './schema';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { VinculosForm } from './VinculosForm';
import { VinculoEditForm } from './VinculoEditForm';
import { VinculoEncerramentoForm } from './VinculoEncerramentoForm';
import { formatDate } from '../../lib/format';

export function VinculosList() {
  // ─── State dos modais ────────────────────────────────────────────────────
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVinculo, setEditingVinculo] = useState<VinculoMembresia | undefined>();
  const [encerramentoVinculo, setEncerramentoVinculo] = useState<VinculoMembresia | undefined>();
  const [deletingVinculo, setDeletingVinculo] = useState<VinculoMembresia | undefined>();

  const { useList, useDelete } = useVinculosMembresia();
  const { data = [], isLoading } = useList();
  const deleteMutation = useDelete();

  const handleDelete = () => {
    if (deletingVinculo?.id) {
      deleteMutation.mutate(deletingVinculo.id, {
        onSuccess: () => setDeletingVinculo(undefined),
      });
    }
  };

  const columns: Column<VinculoMembresia>[] = [
    {
      key: 'pessoa',
      header: 'Pessoa',
      render: (row) => row.pessoas?.nome_completo || 'Desconhecida',
    },
    {
      key: 'rol',
      header: 'Rol',
      render: (row) => (
        <span className="font-medium">{VinculoRolLabel[row.rol] ?? row.rol}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        row.vinculo_ativo ? (
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-lime border-lime/20 bg-lime/10">
            Ativo
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground border-border bg-muted">
            Inativo
          </span>
        ),
    },
    {
      key: 'data_admissao',
      header: 'Admissão',
      render: (row) => formatDate(row.data_admissao),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          {/* Editar */}
          <Button
            variant="ghost"
            size="icon"
            title="Editar vínculo"
            onClick={() => setEditingVinculo(row)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>

          {/* Encerrar — só disponível para vínculos ativos */}
          <Button
            variant={row.vinculo_ativo ? 'action-critical' : 'ghost'}
            size="icon"
            title={row.vinculo_ativo ? 'Encerrar vínculo' : 'Vínculo já encerrado'}
            disabled={!row.vinculo_ativo}
            onClick={() => row.vinculo_ativo && setEncerramentoVinculo(row)}
            className={!row.vinculo_ativo ? 'opacity-30' : undefined}
          >
            <LogOut className="h-4 w-4" />
          </Button>

          {/* Excluir */}
          <Button
            variant="action-delete"
            size="icon"
            title="Excluir vínculo"
            onClick={() => setDeletingVinculo(row)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Vínculos de Membresia"
        subtitle="Controle entradas, saídas e status eclesiástico."
        totalCount={data.length}
        newButtonLabel="Novo Vínculo"
        onNew={() => setIsCreateOpen(true)}
      />

      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(item) => item.id || ''}
        loading={isLoading}
      />

      {/* Modal de Criação */}
      {isCreateOpen && (
        <VinculosForm
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
        />
      )}

      {/* Modal de Edição */}
      {editingVinculo && (
        <VinculoEditForm
          open={!!editingVinculo}
          onOpenChange={(open) => !open && setEditingVinculo(undefined)}
          vinculo={editingVinculo}
        />
      )}

      {/* Modal de Encerramento */}
      {encerramentoVinculo && (
        <VinculoEncerramentoForm
          open={!!encerramentoVinculo}
          onOpenChange={(open) => !open && setEncerramentoVinculo(undefined)}
          vinculo={encerramentoVinculo}
        />
      )}

      {/* Confirmação de exclusão */}
      <ConfirmDialog
        open={!!deletingVinculo}
        onOpenChange={(open) => !open && setDeletingVinculo(undefined)}
        title="Excluir Vínculo?"
        description="Tem certeza que deseja excluir este vínculo permanentemente? Se a pessoa saiu da igreja, prefira usar o botão de Encerrar Vínculo para manter o histórico."
        confirmBrand="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
