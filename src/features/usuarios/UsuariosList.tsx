import { useState } from 'react';
import { DataTable, Column } from '../../components/shared/DataTable';
import { Button } from '../../components/ui/button';
import { Edit2, ShieldAlert } from 'lucide-react';
import { useUsuarios } from './hooks';
import { Usuario } from './schemas';
import { UsuarioForm } from './UsuarioForm';

export function UsuariosList() {
  const { useList } = useUsuarios();
  const { data: usuarios, isLoading } = useList();

  const [formOpen, setFormOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | undefined>();

  const handleEdit = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedUsuario(undefined);
    setFormOpen(true);
  };

  const columns: Column<Usuario>[] = [
    {
      key: 'nome_usuario',
      header: 'Nome Completo',
      render: (row) => <span className="font-medium">{row.nome_usuario}</span>
    },
    {
      key: 'email_login',
      header: 'E-mail (Login)',
    },
    {
      key: 'perfil',
      header: 'Nível de Acesso',
      render: (row) => (
        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
          {row.perfil.replace('_', ' ')}
        </span>
      )
    },
    {
      key: 'ativo',
      header: 'Status',
      render: (row) => (
        <span className={`inline-flex items-center rounded-md ${row.ativo ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'} px-2 py-1 text-xs font-medium ring-1 ring-inset`}>
          {row.ativo ? 'Ativo' : 'Inativo'}
        </span>
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
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center">
            <ShieldAlert className="h-8 w-8 mr-3 text-primary" />
            Gestão de Usuários
          </h1>
          <p className="text-muted-foreground">
            Administre os acessos à plataforma.
          </p>
        </div>
        <Button onClick={handleAdd} size="lg" className="rounded-full font-semibold shadow-md active:scale-95 transition-transform">
          Novo Usuário
        </Button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <DataTable 
          data={usuarios || []} 
          columns={columns} 
          keyExtractor={(row) => row.id!}
          loading={isLoading} 
          emptyMessage="Nenhum usuário cadastrado."
        />
      </div>

      <UsuarioForm 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        initialData={selectedUsuario} 
      />
    </div>
  );
}
