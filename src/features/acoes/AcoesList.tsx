import { useState } from 'react';
import { DataTable, Column } from '../../components/shared/DataTable';
import { Button } from '../../components/ui/button';
import { Edit2, Trash2, LayoutList } from 'lucide-react';
import { useAcoes } from './hooks';
import { Acao } from './schemas';
import { AcaoForm } from './AcaoForm';
import { formatDate, formatCurrency } from '../../lib/format';

export function AcoesList() {
  const { useList, useDelete } = useAcoes();
  const { data: acoes, isLoading } = useList();
  const deleteMutation = useDelete();

  const [formOpen, setFormOpen] = useState(false);
  const [selectedAcao, setSelectedAcao] = useState<Acao | undefined>();

  const handleEdit = (acao: Acao) => {
    setSelectedAcao(acao);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedAcao(undefined);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta Ação/Projeto? Lançamentos vinculados perderão a referência.')) {
      deleteMutation.mutate(id);
    }
  };

  const columns: Column<Acao>[] = [
    {
      key: 'nome',
      header: 'Ação / Projeto',
      render: (row) => (
        <div className="flex items-center space-x-2">
          {row.cor_hex && (
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.cor_hex }} />
          )}
          <span className="font-medium">{row.nome}</span>
        </div>
      )
    },
    {
      key: 'data_inicio',
      header: 'Período',
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.data_inicio)} {row.data_fim ? ` a ${formatDate(row.data_fim)}` : ' em diante'}
        </span>
      )
    },
    {
      key: 'orcamento',
      header: 'Orçamento Previsto',
      render: (row) => (
         <div className="flex flex-col text-sm">
           <span className="text-emerald-600">+ {formatCurrency(Number(row.orcamento_receita))}</span>
           <span className="text-destructive">- {formatCurrency(Number(row.orcamento_despesa))}</span>
         </div>
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (row) => (
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="action-delete" size="icon" onClick={() => handleDelete(row.id!)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center">
            <LayoutList className="h-8 w-8 mr-3 text-primary" />
            Ações e Projetos
          </h1>
          <p className="text-muted-foreground">
            Gerencie campanhas, acampamentos e projetos com budgets específicos.
          </p>
        </div>
        <Button onClick={handleAdd} size="lg" className="rounded-full font-semibold shadow-md active:scale-95 transition-transform">
          Nova Ação
        </Button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <DataTable 
          data={acoes || []} 
          columns={columns} 
          keyExtractor={(row) => row.id!}
          loading={isLoading} 
          emptyMessage="Nenhuma ação cadastrada."
        />
      </div>

      <AcaoForm 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        initialData={selectedAcao} 
      />
    </div>
  );
}
