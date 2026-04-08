import { useState } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, Column } from '../../components/shared/DataTable';
import { Button } from '../../components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { useTiposLancamento, useCategorias } from './hooks';
import { TipoLancamento } from './schemas';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { TipoLancamentoForm } from './TipoLancamentoForm';

interface TipoLancamentoListProps {
  tipo: 'receita' | 'despesa';
}

export function TipoLancamentoList({ tipo }: TipoLancamentoListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TipoLancamento | undefined>();
  const [deletingItem, setDeletingItem] = useState<TipoLancamento | undefined>();

  const { useList, useDelete } = useTiposLancamento(tipo);
  const { data = [], isLoading } = useList();
  
  const { useList: useCategoriasList } = useCategorias(tipo);
  const { data: categorias = [] } = useCategoriasList();
  
  const deleteMutation = useDelete();

  const titleText = tipo === 'receita' ? 'Tipos de Receitas' : 'Tipos de Despesas';

  const handleDelete = () => {
    if (deletingItem?.id) {
      deleteMutation.mutate(deletingItem.id, {
        onSuccess: () => setDeletingItem(undefined)
      });
    }
  };

  const getCategoriaName = (catId: number) => {
    return categorias.find(c => c.id === catId)?.nome || '---';
  };

  const columns: Column<TipoLancamento>[] = [
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
      header: 'Nome do Tipo',
      render: (row) => <span className="font-medium text-foreground">{row.nome}</span>
    },
    {
      key: 'categoria',
      header: 'Categoria',
      render: (row) => <span className="text-muted-foreground">{getCategoriaName(row.categoria_id)}</span>
    },
    {
      key: 'restricoes',
      header: 'Exigências',
      render: (row) => {
        const reqs = [];
        if (row.requer_pessoa) reqs.push('Pessoa');
        if (row.requer_conta) reqs.push('Conta');
        if (row.requer_comprovante) reqs.push('Comprovante');
        if (row.requer_acao) reqs.push('Ação');

        return reqs.length > 0 ? (
          <span className="text-xs">{reqs.join(', ')}</span>
        ) : (
          <span className="text-xs text-muted-foreground">Nenhuma</span>
        );
      }
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
        subtitle={`Defina as naturezas de ${tipo} e parametrize suas exigências.`}
        totalCount={data.length}
        newButtonLabel={`Novo Tipo de ${tipo === 'receita' ? 'Receita' : 'Despesa'}`}
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
        <TipoLancamentoForm 
          tipo={tipo}
          open={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          initialData={editingItem} 
        />
      )}

      <ConfirmDialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(undefined)}
        title="Excluir Tipo?"
        description={`Tem certeza que deseja excluir o tipo '${deletingItem?.nome}'? Lançamentos vinculados perderão a referência.`}
        confirmBrand="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
