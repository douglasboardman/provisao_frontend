import { useState } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, Column } from '../../components/shared/DataTable';
import { Button } from '../../components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { useContas } from './hooks';
import { Conta } from './schemas';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { ContaForm } from './ContaForm';
import { formatCurrency } from '../../lib/format';

export function ContasList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Conta | undefined>();
  const [deletingItem, setDeletingItem] = useState<Conta | undefined>();

  const { useList, useDelete } = useContas();
  const { data = [], isLoading } = useList();
  const deleteMutation = useDelete();

  const handleDelete = () => {
    if (deletingItem?.id) {
      deleteMutation.mutate(deletingItem.id, {
        onSuccess: () => setDeletingItem(undefined)
      });
    }
  };

  const columns: Column<Conta>[] = [
    {
      key: 'cor_hex',
      header: 'Identificação',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded border" 
            style={{ backgroundColor: row.cor_hex || '#e2e8f0' }} 
          />
          <div className="flex flex-col">
             <span className="font-semibold text-foreground">{row.descricao}</span>
             <span className="text-xs text-muted-foreground">{row.tipo_conta}</span>
          </div>
        </div>
      )
    },
    {
      key: 'instituicao',
      header: 'Instituição',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm">{row.banco || '---'}</span>
          <span className="text-xs text-muted-foreground">
            {row.agencia ? `Ag: ${row.agencia}` : ''} {row.num_conta ? `Cc: ${row.num_conta}` : ''}
          </span>
        </div>
      )
    },
    {
      key: 'saldo_inicial',
      header: 'Saldo Inicial',
      align: 'right',
      render: (row) => <span className="font-medium">{formatCurrency(row.saldo_inicial)}</span>
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => {
            setEditingItem(row);
            setIsFormOpen(true);
          }}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="action-delete" size="icon" onClick={() => setDeletingItem(row)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <>
      <PageHeader 
        title="Contas Financeiras" 
        subtitle="Gerencie as contas bancárias, caixinhas e fundos da igreja."
        totalCount={data.length}
        newButtonLabel="Nova Conta"
        onNew={() => {
          setEditingItem(undefined);
          setIsFormOpen(true);
        }}
      />

      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(item) => item.id || ''}
        loading={isLoading}
      />

      {isFormOpen && (
        <ContaForm 
          open={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          initialData={editingItem} 
        />
      )}

      <ConfirmDialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(undefined)}
        title="Excluir Conta?"
        description={`Tem certeza que deseja excluir '${deletingItem?.descricao}'? Excluir uma conta pode falhar se já houver lançamentos vinculados.`}
        confirmBrand="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
