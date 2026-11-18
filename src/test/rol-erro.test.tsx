import { afterEach, describe, it, expect, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RolMembrosPage } from '../pages/membresia/RolMembrosPage'
vi.mock('../api/pessoas', () => ({ pessoasApi: { list: vi.fn(async () => [{ id: 'p', nome_completo: 'Pessoa' }]) } }))
vi.mock('../api/eventos-membresia', () => ({ eventosMembresiaApi: { list: vi.fn(async () => { throw new Error('Falha de membresia') }) } }))
vi.mock('../hooks/use-enum-relations', () => ({ useEnumRelations: () => ({ getFilter: () => [] }) }))
describe('consulta de rol', () => {
  afterEach(cleanup)
  it('não classifica pessoas como não arroladas quando a consulta de eventos falha', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><RolMembrosPage /></QueryClientProvider>)
    expect(await screen.findByText('Falha de membresia')).toBeTruthy()
    expect(screen.queryByText('Não Arrolados')).toBeNull()
  })
})
