import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { referenciasAtaApi } from '../api/referencias-ata'
import { ReferenciaAta } from '../components/shared/ReferenciaAta'
import { PendenciasDocumentais } from '../pages/secretaria/RegistrosDocumentais'

const alvo = { grupo: 'MANDATO', alvo_id: 'mandato', etapa: 'POSSE' } as const
const ata = {
  documento_id: 'ata-id', versao_id: 'ata-v1', versao: 1, numero: 1234, ano: 2026, sigla: 'CON',
  data: '2026-01-20', contexto: 'Conselho', contexto_id: 'con', assunto: 'Posse', estado: 'EM_EDICAO',
}

function montar(conteudo: React.ReactNode) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{conteudo}</QueryClientProvider>)
}

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('E09 – referência documental', () => {
  it('busca por órgão, número e data e envia ata e versão sem exigir resolução', async () => {
    vi.spyOn(referenciasAtaApi, 'consultar').mockResolvedValue({ itens: [], tem_proxima: false, pode_editar: true, situacao: 'PENDENTE' })
    const buscar = vi.spyOn(referenciasAtaApi, 'buscar').mockResolvedValue({
      itens: [ata], tem_proxima: false, contextos: [{ id: 'con', nome: 'Conselho', sigla: 'CON' }],
    })
    const registrar = vi.spyOn(referenciasAtaApi, 'registrar').mockResolvedValue({ id: 'referencia' })
    montar(<ReferenciaAta alvo={alvo} identidade="igreja:usuario" />)
    fireEvent.click(screen.getByRole('button', { name: 'Ata e documentação' }))
    await screen.findByText('Documentação pendente')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar referência' }))
    await screen.findByRole('option', { name: 'Conselho (CON)' })
    fireEvent.change(screen.getByLabelText('Órgão'), { target: { value: 'con' } })
    fireEvent.change(screen.getByLabelText('Número'), { target: { value: '1234/2026/CON' } })
    fireEvent.change(screen.getByLabelText('Data da ata'), { target: { value: '2026-01-20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar atas' }))
    await waitFor(() => expect(buscar).toHaveBeenLastCalledWith(alvo, { contexto: 'con', numero: '1234/2026/CON', data: '2026-01-20', pagina: '0' }))
    await screen.findByRole('option', { name: /1234\/2026\/CON.*20\/01\/2026/ })
    fireEvent.change(screen.getByLabelText('Ata', { exact: true }), { target: { value: 'ata-v1' } })
    fireEvent.change(screen.getByLabelText('Justificativa da inclusão ou correção'), { target: { value: 'Ata conferida' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar referência' }))
    await screen.findByText('Referência registrada.')
    expect(registrar).toHaveBeenCalledWith(alvo, {
      ata_documento_id: 'ata-id', versao_id: 'ata-v1', revisao_esperada: null, justificativa: 'Ata conferida',
    })
  })

  it('mostra pendência e abre a consulta respeitando acesso somente de leitura', async () => {
    vi.spyOn(referenciasAtaApi, 'pendencias').mockResolvedValue({
      itens: [{ ...alvo, titulo: 'Oficial de teste', tipo: 'POSSE', data: '2026-01-20', orgao_id: null, versao: 1, situacao: 'MINUTA_VINCULADA' }],
      tem_proxima: false,
    })
    vi.spyOn(referenciasAtaApi, 'consultar').mockResolvedValue({
      itens: [{ id: 'ref', criado_em: '2026-01-20', operador: 'Secretário', justificativa: 'Aguardando a expedição', situacao: 'MINUTA_VINCULADA', ata, referencia_externa: null }],
      situacao: 'MINUTA_VINCULADA', tem_proxima: false, pode_editar: false,
    })
    montar(<PendenciasDocumentais identidade="igreja:auditor" />)
    await screen.findByText('Oficial de teste')
    fireEvent.click(screen.getByRole('button', { name: 'Ata e documentação' }))
    await screen.findByText('Aguardando a expedição')
    expect(screen.queryByRole('button', { name: 'Corrigir referência' })).toBeNull()
  })
})
