import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { oficiaisApi } from '../api/oficiais'
import { Painel } from '../components/shared/Painel'
import { GestaoOficial } from '../pages/oficiais/GestaoOficial'
import { useAuthStore } from '../stores/auth'
import { Perfil } from '../types/enums'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('registra a ordenação do docente com data obrigatória e sem exigir ordem ou comprovação', async () => {
  useAuthStore.setState({ user: { sub: 'usuario', igreja_id: 'igreja', login: 'login', username: 'Operador', perfil: Perfil.ADMINISTRADOR } })
  vi.spyOn(oficiaisApi, 'periodos').mockResolvedValue({ mandatos: [], vinculos: [] })
  vi.spyOn(oficiaisApi, 'acervo').mockResolvedValue([])
  const salvar = vi.spyOn(oficiaisApi, 'criarAto').mockResolvedValue({})
  render(<QueryClientProvider client={new QueryClient()}><Painel>
    <GestaoOficial voltar={() => {}} oficial={{ id: 'docente', tipo: 'PRESBITERO_DOCENTE', ativo: true, pessoa: { id: 'pessoa', nome_completo: 'Pastor' } }}
      identidade="igreja:usuario" podeConsultarDetalhe={false} />
  </Painel></QueryClientProvider>)

  const data = screen.getByLabelText('Data da ordenação') as HTMLInputElement
  expect(data.required).toBe(true)
  expect((screen.getByLabelText('Autoridade do ato (opcional)') as HTMLInputElement).required).toBe(false)
  expect((screen.getByLabelText('Referência (opcional)') as HTMLInputElement).required).toBe(false)
  expect(screen.queryByLabelText('Ordem do ato no dia')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Salvar registro' }))
  expect(salvar).not.toHaveBeenCalled()

  fireEvent.change(data, { target: { value: '2016-10-01' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar registro' }))
  await screen.findByText('Registro salvo.')
  expect(salvar.mock.calls[0][0]).toBe('docente/eventos')
  expect(JSON.parse(JSON.stringify(salvar.mock.calls[0][1]))).toEqual({
    tipo: 'ORDENACAO', data_efeito: '2016-10-01',
  })
})
