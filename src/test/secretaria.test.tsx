import { MemoryRouter, Routes, Route } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SecretariaPage } from '../pages/secretaria/SecretariaPage'
import { secretariaApi, type ContextoSecretaria, type DocumentoDetalhe, type ModeloDocumento } from '../api/secretaria'
import { pessoasApi } from '../api/pessoas'
import { useAuthStore } from '../stores/auth'
import { Perfil } from '../types/enums'
import { ApiRequestError } from '../api/client'

const contexto: ContextoSecretaria = { id: 'ctx', nome: 'Assembleia Geral', sigla: 'AG', tipo: 'ASSEMBLEIA_GERAL', orgao_id: null, orgao: null, pode_preparar: true, pode_aprovar: false, pode_deliberar: false, pode_consultar_restritos: false }
const modelo: ModeloDocumento = { id: 'm', nome: 'Carta', revisao: 1, versoes: [{ id: 'mv', numero: 1, tipo: 'OUTRO', finalidade: 'CARTA', configuracao: { perfil: 'CARTA', contexto: 'ASSEMBLEIA_GERAL', tipos_orgao: [], constituicoes: [], motivador: 'OPCIONAL', resolucoes: 'OPCIONAL', registro_livro: false, campos_obrigatorios: [], papeis_obrigatorios: [], cargos_obrigatorios: [] } }] }
function documento(): DocumentoDetalhe { return { id: 'doc', contexto_id: 'ctx', revisao: 1, estado: 'EM_EDICAO', versao_atual: 1, restrito: false, tipo: 'OUTRO', numero: null, ano: null, sigla: null, encaminhado_em: null, versoes: [{ id: 'v1', numero: 1, revisao_conteudo: 1, assunto: 'Carta antiga', data_documento: '2026-01-10', modelo_versao_id: 'mv', reuniao_id: null, motivador_id: null, retifica_versao_id: null, modelo: modelo.versoes[0], congelado_em: null, fonte_congelada: null, conteudo: { teor: 'Conteúdo original', campos: {}, arrolados: [], anexos: [] }, arrolados: [], anexos: [], deliberacoes: [] }] } }
function montar(perfil = Perfil.SECRETARIO) {
  useAuthStore.setState({ status: 'ready', user: { sub: 'u', igreja_id: 'i', perfil, username: 'Pessoa', login: 'x' } })
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><MemoryRouter initialEntries={['/secretaria']}><Routes><Route path="/secretaria" element={<SecretariaPage />} /><Route path="/secretaria/:contextoId/documentos/:documentoId" element={<SecretariaPage />} /></Routes></MemoryRouter></QueryClientProvider>)
}
async function selecionarContexto() { fireEvent.change(await screen.findByLabelText('Contexto documental'), { target: { value: 'ctx' } }); await screen.findByRole('button', { name: 'Novo documento' }) }
beforeEach(() => {
  vi.spyOn(secretariaApi, 'resumo').mockResolvedValue({ documentos: 1, atas: 1, em_edicao: 1, reunioes: 0 })
  vi.spyOn(secretariaApi, 'historico').mockResolvedValue([])
  vi.spyOn(secretariaApi, 'artefatos').mockResolvedValue([])
  vi.spyOn(secretariaApi, 'contextos').mockResolvedValue([contexto])
  vi.spyOn(secretariaApi, 'modelos').mockResolvedValue([modelo])
  vi.spyOn(secretariaApi, 'reunioes').mockResolvedValue([])
  vi.spyOn(secretariaApi, 'documentos').mockResolvedValue([])
  vi.spyOn(secretariaApi, 'documento').mockResolvedValue(documento())
  vi.spyOn(secretariaApi, 'cargos').mockResolvedValue([])
  vi.spyOn(pessoasApi, 'list').mockResolvedValue([{ id: 'p', nome_completo: 'Pessoa da igreja' }] as Awaited<ReturnType<typeof pessoasApi.list>>)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
describe('E04: interface da secretaria', () => {
  it('auditor consulta conteúdo e versões sem controles de preparação, aprovação ou assinatura', async () => {
    vi.mocked(secretariaApi.contextos).mockResolvedValue([{ ...contexto, pode_preparar: false }])
    const d = documento(); d.estado = 'APROVADO'; d.versoes[0].congelado_em = '2026-01-10T12:00:00Z'
    vi.mocked(secretariaApi.documentos).mockResolvedValue([d]); vi.mocked(secretariaApi.documento).mockResolvedValue(d)
    montar(Perfil.AUDITOR)
    fireEvent.change(await screen.findByLabelText('Contexto documental'), { target: { value: 'ctx' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir documento' }))
    await screen.findByText('Conteúdo original')
    expect(screen.queryByRole('button', { name: 'Novo documento' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Editar conteúdo' })).toBeNull()
    expect(screen.queryByLabelText('Ação documental')).toBeNull()
    expect(screen.queryByRole('button', { name: /assinar|expedir/i })).toBeNull()
    expect(pessoasApi.list).not.toHaveBeenCalled()
  })
  it('arrola uma pessoa com vários papéis e registra separadamente responsabilidade e assinatura', async () => {
    vi.mocked(secretariaApi.cargos).mockResolvedValue([{ id: 'cargo1', nome: 'Secretário titular' }, { id: 'cargo2', nome: 'Tesoureiro' }])
    const criar = vi.spyOn(secretariaApi, 'criarDocumento').mockResolvedValue({ id: 'doc', revisao: 1 })
    montar(); await selecionarContexto()
    fireEvent.click(screen.getByRole('button', { name: 'Novo documento' }))
    fireEvent.change(await screen.findByLabelText('Modelo e versão'), { target: { value: 'mv' } })
    fireEvent.change(screen.getByLabelText('Assunto'), { target: { value: 'Carta nova' } })
    fireEvent.change(screen.getByLabelText('Teor'), { target: { value: 'Teor da carta' } })
    fireEvent.change(screen.getByLabelText('Adicionar arrolado'), { target: { value: 'igreja' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Pessoa da igreja' }))
    fireEvent.click(screen.getByRole('button', { name: 'Arrolar pessoa' }))
    fireEvent.change(screen.getByLabelText('Papéis no documento (separados por vírgula)'), { target: { value: 'Presidente, Secretário' } })
    fireEvent.click(screen.getByLabelText('Responsável pelo documento'))
    fireEvent.click(screen.getByLabelText('Secretário titular'))
    fireEvent.click(screen.getByLabelText('Tesoureiro'))
    fireEvent.change(screen.getByLabelText('Fundamento do papel e da competência'), { target: { value: 'Indicação expressa' } })
    fireEvent.focus(screen.getByLabelText('Adicionar arrolado'))
    expect(screen.queryByRole('option', { name: 'Pessoa da igreja' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar documento' }))
    await waitFor(() => expect(criar).toHaveBeenCalledWith(expect.objectContaining({ contexto_id: 'ctx', restrito: false, idempotencia: expect.any(String), versao: expect.objectContaining({ assunto: 'Carta nova', conteudo: expect.objectContaining({ arrolados: [{ pessoa_id: 'p', papeis: ['PRESIDENTE', 'SECRETARIO'], cargo_id: null, cargos_ids: ['cargo1', 'cargo2'], assina: false, obrigatorio: false, responsavel: true, fundamento: 'Indicação expressa' }] }) }) })))
  })
  it('mantém a edição quando o servidor detecta conflito e oferece recarga explícita', async () => {
    vi.mocked(secretariaApi.documentos).mockResolvedValue([documento()])
    const editar = vi.spyOn(secretariaApi, 'editarDocumento').mockRejectedValue(new ApiRequestError(409, ['Registro alterado por outra operação. Recarregue antes de continuar.']))
    montar(); await selecionarContexto()
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir documento' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Editar conteúdo' }))
    fireEvent.change(await screen.findByLabelText('Assunto'), { target: { value: 'Minha alteração' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar documento' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Recarregue')
    expect((screen.getByLabelText('Assunto') as HTMLInputElement).value).toBe('Minha alteração')
    expect(editar).toHaveBeenCalledWith('doc', expect.objectContaining({ revisao: 1 }))
    expect(screen.getByRole('button', { name: 'Recarregar documento' })).toBeTruthy()
  })
})

describe('E06: livros da secretaria', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('abre a preparação do termo pelo livro e envia seu vínculo no documento', async () => {
    vi.stubEnv('VITE_FEATURE_SECRETARIA_LIVROS', 'true')
    const livro: Awaited<ReturnType<typeof secretariaApi.livro>> = {
      id: 'livro-1', contexto_id: contexto.id, titular: contexto.nome, serie: 'ATA_ASSEMBLEIA', numero: 1, estado: 'EM_PREPARACAO',
      revisao: 1, restrito: false, capacidade_folhas: 50, faces_por_folha: 2, modalidade: 'PARA_ENCADERNACAO',
      perfil: 'LOCAL_V1', capacidade_faces: 100, fonte_normativa: 'Regimento local', reserva_exame: 2,
      aberto_em: null, encerrado_em: null, motivo_encerramento: null, manifesto_sha256: null,
      arquivo_historico_id: null, data_historica: null,
      totais: { paginas_utilizadas: 0, folhas_utilizadas: 0, saldo_folhas: 50, saldo_faces: 100, total_atas: 0, pendencias: 0, ultima_posicao: 0 },
      registros: [], termos: [], eventos: [], complementos: [],
    }
    const termo: ModeloDocumento = { ...modelo, id: 'm-termo', nome: 'Termo de abertura', versoes: [{
      ...modelo.versoes[0], id: 'mv-termo', finalidade: 'TERMO_ABERTURA',
      configuracao: { ...modelo.versoes[0].configuracao, campos_obrigatorios: ['NUMERO_LIVRO'] },
    }] }
    vi.mocked(secretariaApi.modelos).mockResolvedValue([modelo, termo])
    vi.spyOn(secretariaApi, 'livros').mockResolvedValue([livro])
    vi.spyOn(secretariaApi, 'livro').mockResolvedValue(livro)
    const criar = vi.spyOn(secretariaApi, 'criarDocumento').mockResolvedValue({ id: 'doc' })
    montar()
    await selecionarContexto()
    fireEvent.click(screen.getByRole('tab', { name: 'Livros' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Consultar livro' }))
    await screen.findByText(/capacidade declarada de 50 folhas e 100 faces/i)
    fireEvent.click(screen.getByRole('button', { name: 'Preparar termo de abertura' }))
    const modelos = await screen.findByLabelText('Modelo e versão')
    expect(within(modelos).queryByRole('option', { name: /carta/i })).toBeNull()
    fireEvent.change(modelos, { target: { value: 'mv-termo' } })
    expect(screen.queryByLabelText(/campo: numero livro/i)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar documento' }))
    await waitFor(() => expect(criar).toHaveBeenCalledWith(expect.objectContaining({
      contexto_id: contexto.id, versao: expect.objectContaining({ modelo_versao_id: 'mv-termo', livro_id: livro.id }),
    })))
  })
})

describe('E08: resoluções e atuação', () => {
  it('salva uma resolução rejeitada com apuração secreta e autoria vazia', async () => {
    const criar = vi.spyOn(secretariaApi, 'criarDocumento').mockResolvedValue({ id: 'doc' })
    montar()
    await selecionarContexto()
    fireEvent.click(screen.getByRole('button', { name: 'Novo documento' }))
    fireEvent.change(await screen.findByLabelText('Modelo e versão'), { target: { value: 'mv' } })
    fireEvent.change(screen.getByLabelText('Assunto'), { target: { value: 'Registro da reunião' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar resolução' }))
    fireEvent.change(screen.getByLabelText('Assunto da resolução'), { target: { value: 'Relatório mensal' } })
    fireEvent.change(screen.getByLabelText('Resultado da resolução'), { target: { value: 'REJEITADA' } })
    fireEvent.change(screen.getByLabelText('Texto proposto'), { target: { value: 'Texto submetido' } })
    fireEvent.click(screen.getByLabelText('Votação secreta'))
    fireEvent.change(screen.getByLabelText('Contrários'), { target: { value: '4' } })
    expect(screen.getByText('Sem proponente informado')).toBeTruthy()
    expect(screen.queryByLabelText('Registrar eficácia da decisão')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar documento' }))
    await waitFor(() => expect(criar).toHaveBeenCalledWith(expect.objectContaining({
      versao: expect.objectContaining({ resolucoes: [expect.objectContaining({
        ordem: 1, resultado: 'REJEITADA', eficaz: false, votacao_secreta: true,
        proponentes_pessoas_ids: [], dissidentes_pessoas_ids: [], apuracao: { contrarios: 4 },
      })] }),
    })))
  })

  it('filtra a atuação e abre a versão histórica indicada pelo resultado', async () => {
    const d = documento()
    d.versao_atual = 2
    d.versoes.push({ ...d.versoes[0], id: 'v2', numero: 2, assunto: 'Versão atual da carta' })
    vi.mocked(secretariaApi.documento).mockResolvedValue(d)
    const consulta = vi.spyOn(secretariaApi, 'atuacao').mockResolvedValue({
      pagina: 0, tamanho: 30, totais: { total: 1, autoria: 0, coautoria: 0, dissidencia: 0, presenca: 1, assinatura: 0 },
      itens: [{
        documento_id: d.id, versao_id: 'v1', contexto_id: 'ctx', versao: 1, versao_atual: false,
        contexto: 'Assembleia Geral', numero: '001/2026/AG', data: '2026-01-10', estado: 'APROVADO',
        resolucao_id: 'resolucao1', assunto: 'Relatório mensal', resultado: 'REJEITADA', ordem: 1,
        eficaz: false, proponentes: null, dissidentes: null,
        autoria: false, coautoria: false, dissidencia: false, assinatura: false, presenca: true,
      }],
    })
    montar(Perfil.AUDITOR)
    fireEvent.click(await screen.findByRole('button', { name: 'Consultar atuação' }))
    fireEvent.change(screen.getByLabelText('Pessoa'), { target: { value: 'igreja' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Pessoa da igreja' }))
    fireEvent.change(screen.getByLabelText('Resultado da resolução'), { target: { value: 'REJEITADA' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }))
    await waitFor(() => expect(consulta).toHaveBeenLastCalledWith({ tipo: 'resolucoes', pessoa: 'p', resultado: 'REJEITADA' }, 0))
    expect(await screen.findByText('Sem proponente informado')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir versão' }))
    expect((await screen.findByText('Versão 1: Carta antiga')).closest('details')?.open).toBe(true)
    expect(screen.getByText('Versão 2: Versão atual da carta').closest('details')?.open).toBe(false)
  })
})
