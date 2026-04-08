import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { usePessoas } from '../pessoas/hooks';
import { useVinculosMembresia } from '../vinculos-membresia/hooks';

export function RelatoriosMembresia() {
  const { useList: usePessoasList } = usePessoas();
  const { useList: useVinculosList } = useVinculosMembresia();

  const { data: pessoas = [], isLoading: isLoadingPessoas } = usePessoasList();
  const { data: vinculos = [], isLoading: isLoadingVinculos } = useVinculosList();

  const totalPessoas = pessoas.length;
  
  // Ativos vs Inativos
  const ativos = vinculos.filter(v => v.vinculo_ativo).length;
  const inativos = vinculos.filter(v => !v.vinculo_ativo).length;

  // Por tipo de rol
  const comungantes = vinculos.filter(v => v.rol === 'MEMBRO_COMUNGANTE' && v.vinculo_ativo).length;
  const naoComungantes = vinculos.filter(v => v.rol === 'MEMBRO_NAO_COMUNGANTE' && v.vinculo_ativo).length;
  const congregados = vinculos.filter(v => v.rol === 'CONGREGADO' && v.vinculo_ativo).length;
  const visitantes = vinculos.filter(v => v.rol === 'VISITANTE' && v.vinculo_ativo).length;
  const criancas = vinculos.filter(v => v.rol === 'CRIANCA' && v.vinculo_ativo).length;

  const exportCSV = () => {
    // TODO: backend endpoint real para relatórios
    const headers = ['Nome', 'Email', 'Celular', 'Rol', 'Status'];
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + vinculos.map(v => {
          const nome = v.pessoa?.nome_completo || '';
          const pessoaFull = pessoas.find(p => p.id === v.pessoa_id);
          const email = pessoaFull?.email || '';
          const celular = pessoaFull?.telefone_celular || '';
          return `${nome},${email},${celular},${v.rol},${v.vinculo_ativo ? 'Ativo' : 'Inativo'}`;
      }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_membresia.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Relatórios de Membresia" 
        subtitle="Métricas e consolidado de cadastros. (TODO: Backend Integrado)"
      />

      <div className="flex justify-end">
        <button 
          onClick={exportCSV}
          className="bg-purple text-white px-4 py-2 rounded-md hover:bg-purple-dark text-sm font-medium"
        >
          Baixar CSV Completo
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pessoas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingPessoas ? '...' : totalPessoas}</div>
            <p className="text-xs text-muted-foreground">Cadastros totais no sistema</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vínculos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-lime-700">{isLoadingVinculos ? '...' : ativos}</div>
            <p className="text-xs text-muted-foreground">Membros e congregados atuais</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vínculos Inativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{isLoadingVinculos ? '...' : inativos}</div>
            <p className="text-xs text-muted-foreground">Transferidos ou inativos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Composição Ativa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-full">
                  <div className="flex items-center justify-between text-sm">
                    <span>Membros Comungantes</span>
                    <span className="font-bold">{comungantes}</span>
                  </div>
                  <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple" style={{ width: ativos ? `${(comungantes / ativos) * 100}%` : '0%' }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full">
                  <div className="flex items-center justify-between text-sm">
                    <span>Membros Não-Comungantes</span>
                    <span className="font-bold">{naoComungantes}</span>
                  </div>
                  <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-light" style={{ width: ativos ? `${(naoComungantes / ativos) * 100}%` : '0%' }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full">
                  <div className="flex items-center justify-between text-sm">
                    <span>Congregados</span>
                    <span className="font-bold">{congregados}</span>
                  </div>
                  <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-lime text-lime" style={{ width: ativos ? `${(congregados / ativos) * 100}%` : '0%' }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full">
                  <div className="flex items-center justify-between text-sm">
                    <span>Crianças</span>
                    <span className="font-bold">{criancas}</span>
                  </div>
                  <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 text-blue-400" style={{ width: ativos ? `${(criancas / ativos) * 100}%` : '0%' }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-full">
                  <div className="flex items-center justify-between text-sm">
                    <span>Visitantes</span>
                    <span className="font-bold">{visitantes}</span>
                  </div>
                  <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gray-400" style={{ width: ativos ? `${(visitantes / ativos) * 100}%` : '0%' }} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
