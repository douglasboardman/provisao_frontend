import { useState } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable, Column } from '../../components/shared/DataTable';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Edit2, Trash2 } from 'lucide-react';
import { usePessoas } from './hooks';
import { Pessoa } from './schema';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { PessoaForm } from './PessoaForm';
import { formatCpf, formatPhone } from '../../lib/format';

export function PessoasList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPessoa, setEditingPessoa] = useState<Pessoa | undefined>();
  const [deletingPessoa, setDeletingPessoa] = useState<Pessoa | undefined>();

  const { useList, useDelete } = usePessoas();
  const { data = [], isLoading } = useList();
  const deleteMutation = useDelete();

  const filteredData = data.filter((p) => 
    p.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.cpf && p.cpf.includes(searchTerm))
  );

  const handleDelete = () => {
    if (deletingPessoa?.id) {
      deleteMutation.mutate(deletingPessoa.id, {
        onSuccess: () => setDeletingPessoa(undefined)
      });
    }
  };

  const columns: Column<Pessoa>[] = [
    {
      key: 'nome_completo',
      header: 'Nome',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.url_foto ? (
             <img src={row.url_foto} alt="Foto" className="w-8 h-8 rounded-full object-cover" />
          ) : (
             <div className="w-8 h-8 rounded-full bg-purple/10 text-purple flex items-center justify-center font-bold text-xs uppercase">
                {row.nome_completo.substring(0, 2)}
             </div>
          )}
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.nome_completo}</span>
            <span className="text-xs text-muted-foreground">{formatCpf(row.cpf)}</span>
          </div>
        </div>
      )
    },
    {
      key: 'contato',
      header: 'Contato',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm">{formatPhone(row.telefone_celular)}</span>
          <span className="text-xs text-muted-foreground">{row.email}</span>
        </div>
      )
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => {
            setEditingPessoa(row);
            setIsFormOpen(true);
          }}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="action-delete" size="icon" onClick={() => setDeletingPessoa(row)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <>
      <PageHeader 
        title="Gestão de Pessoas" 
        subtitle="Gerencie todos os membros, congregados e contatos da congregação."
        totalCount={data.length}
        newButtonLabel="Nova Pessoa"
        onNew={() => {
          setEditingPessoa(undefined);
          setIsFormOpen(true);
        }}
      />

      <div className="mb-4 flex items-center gap-4">
        <div className="max-w-md w-full">
          <Input 
            placeholder="Buscar pessoas por nome ou documento..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        data={filteredData}
        columns={columns}
        keyExtractor={(item) => item.id || ''}
        loading={isLoading}
      />

      {isFormOpen && (
        <PessoaForm 
          open={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          initialData={editingPessoa} 
        />
      )}

      <ConfirmDialog
        open={!!deletingPessoa}
        onOpenChange={(open) => !open && setDeletingPessoa(undefined)}
        title="Excluir Pessoa?"
        description={`Tem certeza que deseja excluir ${deletingPessoa?.nome_completo}? Esta ação não afeta registros vinculados mas é irreversível.`}
        confirmBrand="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
