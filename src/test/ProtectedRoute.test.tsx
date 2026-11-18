import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ProtectedRoute } from '../components/shared/ProtectedRoute'
import { useAuthStore } from '../stores/auth'

describe('acesso à rota protegida', () => {
  beforeEach(() => useAuthStore.setState({ user: null, status: 'ready' }))
  it('redireciona visitante para login', () => {
    render(<MemoryRouter initialEntries={['/privado']}><Routes>
      <Route path="/login" element={<p>Entre na conta</p>} />
      <Route element={<ProtectedRoute />}><Route path="/privado" element={<p>Privado</p>} /></Route>
    </Routes></MemoryRouter>)
    expect(screen.getByText('Entre na conta')).toBeTruthy()
    expect(screen.queryByText('Privado')).toBeNull()
  })
})
