import { useState } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, Column } from '../../components/shared/DataTable';
import { Button } from '../../components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { useCategorias } from './hooks';
import { Categoria } from './schemas';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { CategoriaForm } from './CategoriaForm';

interface CategoriaListProps {
  tipo: 'receita' | 'despesa';
}

export function CategoriaList({ tipo }: CategoriaListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Categoria | undefined>();
  const [deletingItem, setDeletingItem] = useState<Categoria | undefined>();

  const { useList, useDelete } = useCategorias(tipo);
  const { data = [], isLoading } = useList();
  const deleteMutation = useDelete();

  const titleText = tipo === 'receita' ? 'Categorias de Receita' : 'Categorias de Despesa';

  const handleDelete = () => {
    if (deletingItem?.id) {
      deleteMutation.mutate(deletingItem.id, {
        onSuccess: () => setDeletingItem(undefined)
      });
    }
  };

  const columns: Column<Categoria>[] = [
    {
      key: 'cor_hex',
      header: 'Cor',
      render: (row) => (
        <div 
          className="w-6 h-6 rounded border" 
          style={{ backgroundColor: row.cor_hex || '#e2e8f0' }} 
        />
      )
    },
    {
      key: 'nome',
      header: 'Nome',
      render: (row) => <span className="font-medium text-foreground">{row.nome}</span>
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
        title={titleText} 
        subtitle="Gerencie agrupamentos gerais para seus lançamentos financeiros."
        totalCount={data.length}
        newButtonLabel="Nova Categoria"
        onNew={() => {
          setEditingItem(undefined);
          setIsFormOpen(true);
        }}
      />

      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(item) => item.id?.toString() || ''}
        loading={isLoading}
      />

      {isFormOpen && (
        <CategoriaForm 
          tipo={tipo}
          open={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          initialData={editingItem} 
        />
      )}

      <ConfirmDialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(undefined)}
        title="Excluir Categoria?"
        description={`Tem certeza que deseja excluir '${deletingItem?.nome}'? Isso pode afetar os tipos vinculados a ela.`}
        confirmBrand="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
