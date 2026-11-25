import type { Paragrafo } from '../api/pagina'
import type { Valores } from '../api/campos'
import { carregar, serializar } from '../pages/secretaria/editor/texto'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ModeloForm } from '../pages/secretaria/ModeloForm'
import { secretariaApi, type ContextoSecretaria } from '../api/secretaria'
import { LeituraEstrutura } from '../pages/secretaria/Compositor'

afterEach(cleanup)

it('sugere o papel do secretário no termo de abertura e permite ajustes', () => {
  const contexto: ContextoSecretaria = { id: 'c', nome: 'Conselho', sigla: 'CONS', tipo: 'ORGAO', orgao_id: 'o', orgao: { tipo: 'CONSELHO', constituicao: 'OFICIAL' }, pode_preparar: true, pode_aprovar: false, pode_deliberar: false, pode_consultar_restritos: false }
  render(<QueryClientProvider client={new QueryClient()}><ModeloForm contexto={contexto} cargos={[]} pronto={vi.fn()} /></QueryClientProvider>)
  fireEvent.change(screen.getByLabelText('Sugestão da biblioteca'), { target: { value: 'TERMO_ABERTURA' } })
  expect((screen.getByLabelText('Nome do modelo') as HTMLInputElement).value).toBe('Termo de abertura')
  expect((screen.getByLabelText('Tipo documental') as HTMLSelectElement).value).toBe('TERMO_ABERTURA')
  expect(screen.queryByLabelText('Finalidade')).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: 'Regras' }))
  expect(screen.queryByRole('textbox', { name: 'Nome do modelo' })).toBeNull()
  expect((screen.getByLabelText('Papéis de assinatura obrigatórios (separados por vírgula)') as HTMLInputElement).value).toBe('SECRETARIO')
  fireEvent.click(screen.getByRole('tab', { name: 'Identificação' }))
  fireEvent.change(screen.getByLabelText('Nome do modelo'), { target: { value: 'Termo adaptado' } })
  expect((screen.getByLabelText('Nome do modelo') as HTMLInputElement).value).toBe('Termo adaptado')
})

it('apresenta campos estruturados como texto, sem interpretar HTML', () => {
  const { container } = render(<LeituraEstrutura campos={{ NOME: '<img src=x onerror=alert(1)>' }} valor={{ cabecalho: [], corpo: [{ tipo: 'TEXTO', texto: 'Olá {{NOME}}', alinhamento: 'ESQUERDA', estilo: 'NORMAL' }], rodape: [] }} />)
  expect(container.textContent).toContain('<img src=x onerror=alert(1)>')
  expect(container.querySelector('img')).toBeNull()
})

it('reabre e serializa a mesma ocorrência após trocar o rótulo e preencher os valores', () => {
  const id = '69244489-ac15-480b-92c8-e8c89a8089ed'
  const campo = { tipo: 'campo', campo_id: id, apresentacao: 'individual', indice: 1, italico: true } as const
  const paragrafo = { tipo: 'paragrafo', alinhamento: 'direita', trechos: [campo] } as const
  const pagina: Paragrafo[] = [{ ...paragrafo, trechos: [campo] }]
  const definicao = { nome: 'Pauta', tipo: 'texto', multiplo: true, origem: 'manual' } as const
  const valores: Valores = { [id]: { tipo: 'texto', multiplo: true, valor: ['A','B'], origem: { tipo: 'manual' }, ajustado_manualmente: true } }
  const modelos = [carregar(pagina, { [id]: definicao }), carregar(pagina, { [id]: { ...definicao, nome: 'Assuntos' } }), carregar(pagina, {}, valores)]
  expect(modelos.map(doc => doc.firstChild?.firstChild?.attrs.rotulo)).toEqual(['Pauta','Assuntos','B'])
  for (const doc of modelos) expect(serializar(doc)).toEqual(pagina)
})

it('suprime o parágrafo de um grupo opcional vazio na leitura e conserva a pontuação escrita', () => {
  const campo = { tipo: 'campo', campo_id: 'exemplo', apresentacao: 'lista_marcadores' } as const
  const p: Paragrafo = { tipo: 'paragrafo', alinhamento: 'esquerda', trechos: [campo] }
  const pagina: Paragrafo[] = [p, { ...p, trechos: [campo, { tipo: 'texto', texto: '.' }] }]
  expect(carregar(pagina, {}, {}, false).childCount).toBe(2)
  const leitura = carregar(pagina, {}, {}, true)
  expect(leitura.childCount).toBe(1)
  expect(leitura.textContent).toBe('.')
})

it('salva o mesmo rascunho e só publica quando o secretário escolhe publicar', async () => {
  const contexto: ContextoSecretaria = { id: 'ctx', nome: 'Conselho', sigla: 'CONS', tipo: 'ORGAO', orgao_id: 'o', orgao: { tipo: 'CONSELHO', constituicao: 'OFICIAL' }, pode_preparar: true, pode_aprovar: false, pode_deliberar: false, pode_consultar_restritos: false }
  const criar = vi.spyOn(secretariaApi, 'criarModelo').mockResolvedValue({ id: 'modelo', revisao: 1, estado: 'EM_EDICAO' })
  const salvar = vi.spyOn(secretariaApi, 'salvarRascunhoModelo').mockResolvedValue({ id: 'modelo', revisao: 2, estado: 'EM_EDICAO' })
  vi.spyOn(secretariaApi, 'papeisModelo').mockResolvedValue([{ id: 'PRESIDENCIA_CONSELHO', nome: 'Presidente', codigo: 'PRESIDENCIA_CONSELHO' }])
  const publicar = vi.spyOn(secretariaApi, 'publicarModelo').mockResolvedValue({ id: 'modelo', revisao: 3, estado: 'PUBLICADO' })
  const pronto = vi.fn()
  try {
    render(<QueryClientProvider client={new QueryClient()}><ModeloForm contexto={contexto} cargos={[]} pronto={pronto} /></QueryClientProvider>)
    fireEvent.change(screen.getByLabelText('Nome do modelo'), { target: { value: 'Ata' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }))
    await screen.findByText('Editar modelo · Ata')
    expect(criar).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Ata', publicar: false }))
    fireEvent.change(screen.getByLabelText('Nome do modelo'), { target: { value: 'Ata do Conselho' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }))
    await waitFor(() => expect(salvar).toHaveBeenCalledWith('modelo', expect.objectContaining({ revisao: 1, nome: 'Ata do Conselho' })))
    expect(publicar).not.toHaveBeenCalled()
    expect(pronto).not.toHaveBeenCalled()
    expect((screen.getByRole('button', { name: 'Publicar modelo' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('tab', { name: 'Regras' }))
    fireEvent.click((await screen.findAllByLabelText('Presidente'))[0])
    await waitFor(() => expect((screen.getByRole('button', { name: 'Publicar modelo' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar modelo' }))
    await waitFor(() => expect(pronto).toHaveBeenCalledOnce())
    expect(publicar).toHaveBeenCalledWith('modelo', expect.objectContaining({ revisao: 2, nome: 'Ata do Conselho' }))
  } finally { vi.restoreAllMocks() }
})
