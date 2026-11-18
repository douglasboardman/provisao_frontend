import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ModeloForm } from '../pages/secretaria/ModeloForm'
import type { ContextoSecretaria } from '../api/secretaria'
import { LeituraEstrutura } from '../pages/secretaria/Compositor'

afterEach(cleanup)

it('preenche sugestão sem presumir signatários e permite ajustes', () => {
  const contexto: ContextoSecretaria = { id: 'c', nome: 'Conselho', sigla: 'CONS', tipo: 'ORGAO', orgao_id: 'o', orgao: { tipo: 'CONSELHO', constituicao: 'OFICIAL' }, pode_preparar: true, pode_aprovar: false, pode_deliberar: false, pode_consultar_restritos: false }
  render(<QueryClientProvider client={new QueryClient()}><ModeloForm contexto={contexto} cargos={[]} pronto={vi.fn()} /></QueryClientProvider>)
  fireEvent.change(screen.getByLabelText('Sugestão da biblioteca'), { target: { value: 'TERMO_ABERTURA' } })
  expect((screen.getByLabelText('Nome do modelo') as HTMLInputElement).value).toBe('Termo de abertura')
  expect((screen.getByLabelText('Tipo documental') as HTMLSelectElement).value).toBe('OUTRO')
  expect((screen.getByLabelText('Finalidade') as HTMLInputElement).value).toBe('TERMO_ABERTURA')
  expect((screen.getByLabelText('Papéis de assinatura obrigatórios (separados por vírgula)') as HTMLInputElement).value).toBe('')
  fireEvent.change(screen.getByLabelText('Nome do modelo'), { target: { value: 'Termo adaptado' } })
  expect((screen.getByLabelText('Nome do modelo') as HTMLInputElement).value).toBe('Termo adaptado')
})

it('apresenta campos estruturados como texto, sem interpretar HTML', () => {
  const { container } = render(<LeituraEstrutura campos={{ NOME: '<img src=x onerror=alert(1)>' }} valor={{ cabecalho: [], corpo: [{ tipo: 'TEXTO', texto: 'Olá {{NOME}}', alinhamento: 'ESQUERDA', estilo: 'NORMAL' }], rodape: [] }} />)
  expect(container.textContent).toContain('<img src=x onerror=alert(1)>')
  expect(container.querySelector('img')).toBeNull()
})
