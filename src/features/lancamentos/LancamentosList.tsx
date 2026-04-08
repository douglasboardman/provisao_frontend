import { useState } from 'react';
import { DataTable, Column } from '../../components/shared/DataTable';
import { Button } from '../../components/ui/button';
import { Edit2, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useLancamentos } from './hooks';
import { Lancamento, TipoTransacao } from './schemas';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { LancamentoForm } from './LancamentoForm';
import { formatCurrency, formatDate } from '../../lib/format';

export function LancamentosTable() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Lancamento | undefined>();
  const [deletingItem, setDeletingItem] = useState<Lancamento | undefined>();
  const [defaultTipo, setDefaultTipo] = useState<TipoTransacao>(TipoTransacao.DESPESA);

  const { useList, useDelete } = useLancamentos();
  // TODO: Add pagination parameters when backend allows
  const { data = [], isLoading } = useList();
  const deleteMutation = useDelete();

  const handleDelete = () => {
    if (deletingItem?.id) {
      deleteMutation.mutate(deletingItem.id, {
        onSuccess: () => setDeletingItem(undefined)
      });
    }
  };

  const handeNewLancamento = (tipo: TipoTransacao) => {
    setDefaultTipo(tipo);
    setEditingItem(undefined);
    setIsFormOpen(true);
  }

  const columns: Column<any>[] = [
    {
      key: 'status_tipo',
      header: 'Tipo',
      render: (row) => {
        const isReceita = row.tipo_transacao === 'RECEITA';
        return isReceita ? (
          <ArrowUpCircle className="w-6 h-6 text-emerald-500" />
        ) : (
          <ArrowDownCircle className="w-6 h-6 text-destructive" />
        );
      }
    },
    {
      key: 'data_transacao',
      header: 'Data',
      render: (row) => <span className="text-sm font-medium">{formatDate(row.data_transacao)}</span>
    },
    {
      key: 'detalhes',
      header: 'Detalhes',
      render: (row) => {
        const tipoNome = row.tipo_transacao === 'RECEITA' ? row.receitas?.nome : row.despesas?.nome;
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{tipoNome || 'Lançamento Manual'}</span>
            <span className="text-xs text-muted-foreground">{row.contas?.descricao || 'Sem Conta'}</span>
            {row.observacao && <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">{row.observacao}</span>}
          </div>
        );
      }
    },
    {
      key: 'pessoa',
      header: 'Pessoa/Ação',
      render: (row) => (
        <div className="flex flex-col max-w-[150px]">
          {row.pessoas && <span className="text-xs truncate" title={row.pessoas.nome_completo}>👤 {row.pessoas.nome_completo}</span>}
          {row.acoes && <span className="text-xs truncate text-blue-600" title={row.acoes.nome}>🎯 {row.acoes.nome}</span>}
          {!row.pessoas && !row.acoes && <span className="text-xs text-muted-foreground">---</span>}
        </div>
      )
    },
    {
      key: 'valor',
      header: 'Valor',
      align: 'right',
      render: (row) => {
        const isReceita = row.tipo_transacao === 'RECEITA';
        return (
          <span className={`font-semibold ${isReceita ? 'text-emerald-600' : 'text-destructive'}`}>
            {isReceita ? '+' : '-'}{formatCurrency(row.valor)}
          </span>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Lançamentos</h1>
          <p className="text-sm text-muted-foreground mt-1">Livro caixa principal: visualize e controle o fluxo financeiro.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-destructive border-transparent bg-destructive/10 hover:bg-destructive/20 hover:text-destructive" onClick={() => handeNewLancamento(TipoTransacao.DESPESA)}>
            <ArrowDownCircle className="w-4 h-4 mr-2" />
            Nova Despesa
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handeNewLancamento(TipoTransacao.RECEITA)}>
            <ArrowUpCircle className="w-4 h-4 mr-2" />
            Nova Receita
          </Button>
        </div>
      </div>

      {/* TODO: Add Filters here (Período, Conta, Tipo) */}
      
      <div className="mb-4 text-sm text-muted-foreground">
        Exibindo os últimos lançamentos cadastrados. (Paginador em breve)
      </div>

      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(item) => item.id || ''}
        loading={isLoading}
      />

      {isFormOpen && (
        <LancamentoForm 
          open={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          initialData={editingItem} 
          defaultTipo={defaultTipo}
        />
      )}

      <ConfirmDialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(undefined)}
        title="Estornar Lançamento?"
        description={`Tem certeza que deseja excluir permanentemente o lançamento no valor de ${formatCurrency(deletingItem?.valor || 0)}? Esta ação atualizará os saldos e não pode ser revertida.`}
        confirmBrand="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
