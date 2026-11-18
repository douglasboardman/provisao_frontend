import { useQuery } from '@tanstack/react-query'
import { igrejaApi } from '../../api/igreja'

export function IgrejaSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { data, isLoading, isError } = useQuery({ queryKey: ['igrejas-public'], queryFn: igrejaApi.listPublic })
  return <div>
    <label htmlFor="igreja-acesso" className="mb-1 block text-sm text-white">Igreja</label>
    <select id="igreja-acesso" value={value} onChange={e => onChange(e.target.value)} disabled={isLoading || isError}
      className="w-full rounded-lg bg-[#4B336E] px-4 py-3 text-white disabled:opacity-50" style={{ colorScheme: 'dark' }}>
      <option value="">{isLoading ? 'Carregando igrejas...' : 'Selecione sua igreja'}</option>
      {data?.map(igreja => <option key={igreja.id} value={igreja.id}>{igreja.nome}</option>)}
    </select>
    {isError && <p role="alert" className="mt-1 text-sm text-white">Não foi possível carregar as igrejas. Tente novamente mais tarde.</p>}
  </div>
}
