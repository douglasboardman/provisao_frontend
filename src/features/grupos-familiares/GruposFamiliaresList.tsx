import { useState } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { DataTable } from '../../components/shared/DataTable';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Edit2, Trash2 } from 'lucide-react';
import { useGruposFamiliares } from './hooks';
import { GrupoFamiliar } from './schema';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { GruposFamiliaresForm } from './GruposFamiliaresForm';

export function GruposFamiliaresList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<GrupoFamiliar | undefined>();
  const [deletingGrupo, setDeletingGrupo] = useState<GrupoFamiliar | undefined>();

  const { useList, useDelete } = useGruposFamiliares();
  const { data = [], isLoading } = useList();
  const deleteMutation = useDelete();

  const filteredData = data.filter((g) => 
    g.nome_familia.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = () => {
    if (deletingGrupo?.id) {
      deleteMutation.mutate(deletingGrupo.id, {
        onSuccess: () => setDeletingGrupo(undefined)
      });
    }
  };

  const columns = [
    {
      key: 'nome_familia',
      header: 'Família',
    },
    {
      key: 'data_cad',
      header: 'Cadastrado Em',
      render: (row: GrupoFamiliar) => row.created_at ? new Date(row.created_at).toLocaleDateString('pt-BR') : '-'
    },
    {
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (row: GrupoFamiliar) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => {
            setEditingGrupo(row);
            setIsFormOpen(true);
          }}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="action-delete" size="icon" onClick={() => setDeletingGrupo(row)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <>
      <PageHeader 
        title="Grupos Familiares" 
        subtitle="Gerencie os agregados familiares e suas nominações."
        totalCount={data.length}
        newButtonLabel="Nova Família"
        onNew={() => {
          setEditingGrupo(undefined);
          setIsFormOpen(true);
        }}
      />

      <div className="mb-4 flex items-center gap-4">
        <div className="max-w-sm w-full">
          <Input 
            placeholder="Buscar por nome da família..." 
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
        <GruposFamiliaresForm 
          open={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          initialData={editingGrupo} 
        />
      )}

      <ConfirmDialog
        open={!!deletingGrupo}
        onOpenChange={(open) => !open && setDeletingGrupo(undefined)}
        title="Excluir Grupo Familiar?"
        description={`Tem certeza que deseja excluir a família ${deletingGrupo?.nome_familia}? Esta ação não poderá ser desfeita.`}
        confirmBrand="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
