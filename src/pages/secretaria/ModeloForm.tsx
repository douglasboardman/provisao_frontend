import { useState } from 'react'
import { secretariaApi, finalidadeTermo, livrosHabilitados, politicaLivro, type ContextoSecretaria, type ModeloDocumento, type PoliticaDocumento, type EstruturaDocumento, type TipoCampo } from '../../api/secretaria'
import { Campo, Escolha, Check, Salvar, codigos, useComando } from './formulario'
import { Compositor } from './Compositor'
import { Button } from '../../components/ui/button'

const corpoAta = 'Local: {{LOCAL}}.\nPauta: {{PAUTA}}.\nRegistro da reunião: {{REGISTRO}}.'
const biblioteca = [
  { nome: 'Ata de reunião', tipo: 'ATA', finalidade: 'ATA_REUNIAO', perfil: 'ATA_PADRAO', livro: true, corpo: corpoAta, campos: ['LOCAL', 'PAUTA', 'REGISTRO'] },
  { nome: 'Ata de Assembleia Geral Ordinária', tipo: 'ATA', finalidade: 'ATA_AGO', perfil: 'ATA_ASSEMBLEIA', livro: true, corpo: corpoAta, campos: ['LOCAL', 'PAUTA', 'REGISTRO'] },
  { nome: 'Ata de Assembleia Geral Extraordinária', tipo: 'ATA', finalidade: 'ATA_AGE', perfil: 'ATA_ASSEMBLEIA', livro: true, corpo: corpoAta, campos: ['LOCAL', 'PAUTA', 'REGISTRO'] },
  { nome: 'Convocação', tipo: 'OUTRO', finalidade: 'CONVOCACAO', perfil: 'CORRESPONDENCIA', livro: false, corpo: 'Convocamos {{DESTINATARIOS}} para reunião em {{DATA_REUNIAO}}, às {{HORARIO}}, em {{LOCAL}}, para tratar de {{PAUTA}}.', campos: ['DESTINATARIOS', 'DATA_REUNIAO', 'HORARIO', 'LOCAL', 'PAUTA'] },
  { nome: 'Relatório', tipo: 'OUTRO', finalidade: 'RELATORIO', perfil: 'CORRESPONDENCIA', livro: false, corpo: 'Período: {{PERIODO}}.\nAtividades: {{ATIVIDADES}}.\nResultados: {{RESULTADOS}}.', campos: ['PERIODO', 'ATIVIDADES', 'RESULTADOS'] },
  { nome: 'Ofício', tipo: 'OUTRO', finalidade: 'OFICIO', perfil: 'CORRESPONDENCIA', livro: false, corpo: 'A {{DESTINATARIO}}.\nAssunto: {{ASSUNTO}}.\n{{MENSAGEM}}\nAtenciosamente,', campos: ['DESTINATARIO', 'ASSUNTO', 'MENSAGEM'] },
  { nome: 'Carta', tipo: 'OUTRO', finalidade: 'CARTA', perfil: 'CORRESPONDENCIA', livro: false, corpo: 'A {{DESTINATARIO}}.\n{{MENSAGEM}}\nCordialmente,', campos: ['DESTINATARIO', 'MENSAGEM'] },
  { nome: 'Termo de abertura', tipo: 'OUTRO', finalidade: 'TERMO_ABERTURA', perfil: 'TERMO', livro: false, corpo: 'Abre-se o Livro nº {{NUMERO_LIVRO}}, com {{CAPACIDADE_FOLHAS}} folhas, destinado ao registro das atas de {{TITULAR}}.', campos: ['NUMERO_LIVRO', 'CAPACIDADE_FOLHAS', 'TITULAR'] },
  { nome: 'Termo de exame', tipo: 'OUTRO', finalidade: 'TERMO_EXAME', perfil: 'TERMO', livro: false, corpo: 'Exame realizado por {{AUTORIDADE}}.\nObservações: {{OBSERVACOES}}.', campos: ['AUTORIDADE', 'OBSERVACOES'] },
  { nome: 'Termo de encerramento', tipo: 'OUTRO', finalidade: 'TERMO_ENCERRAMENTO', perfil: 'TERMO', livro: false, corpo: 'Encerra-se o Livro nº {{NUMERO_LIVRO}} de {{TITULAR}}, com {{FOLHAS_UTILIZADAS}} folhas utilizadas e {{TOTAL_ATAS}} atas registradas.', campos: ['NUMERO_LIVRO', 'TITULAR', 'FOLHAS_UTILIZADAS', 'TOTAL_ATAS'] },
] as const
const tipos: Record<TipoCampo, string> = { TEXTO: 'Texto', DATA: 'Data', NUMERO: 'Número', SIM_NAO: 'Sim ou não' }
const tiposBiblioteca: Record<string, TipoCampo> = { DATA_REUNIAO: 'DATA', CAPACIDADE_FOLHAS: 'NUMERO', FOLHAS_UTILIZADAS: 'NUMERO', TOTAL_ATAS: 'NUMERO' }

export function ModeloForm({ contexto, modelo, cargos, pronto }: { contexto: ContextoSecretaria; modelo?: ModeloDocumento; cargos: { id: string; nome: string }[]; pronto: () => void }) {
  const anterior = modelo?.versoes[0]
  const [nome, setNome] = useState(modelo?.nome ?? '')
  const [tipo, setTipo] = useState<'ATA' | 'OUTRO'>(anterior?.tipo ?? 'ATA')
  const [finalidade, setFinalidade] = useState(anterior?.finalidade ?? 'ATA_REUNIAO')
  const [perfil, setPerfil] = useState(anterior?.configuracao.perfil ?? 'ATA_PADRAO')
  const [motivador, setMotivador] = useState<PoliticaDocumento>(anterior?.configuracao.motivador ?? 'OPCIONAL')
  const [resolucoes, setResolucoes] = useState<PoliticaDocumento>(anterior?.configuracao.resolucoes ?? 'OPCIONAL')
  const [livro, setLivro] = useState<PoliticaDocumento>(anterior ? politicaLivro(anterior.configuracao) : 'NAO_PERMITE')
  const [campos, setCampos] = useState(anterior?.configuracao.campos_obrigatorios.join(', ') ?? '')
  const [papeis, setPapeis] = useState(anterior?.configuracao.papeis_obrigatorios.join(', ') ?? 'PRESIDENTE, SECRETARIO')
  const [exigidos, setExigidos] = useState(anterior?.configuracao.cargos_obrigatorios ?? [])
  const [estrutura, setEstrutura] = useState<EstruturaDocumento | undefined>(anterior?.configuracao.estrutura_padrao)
  const [anexos, setAnexos] = useState(() => {
    const imagens = Object.values(anterior?.configuracao.estrutura_padrao ?? {}).flat().filter(b => b.tipo === 'IMAGEM')
    return [...new Map(imagens.map(b => [b.arquivo_id, { arquivo_id: b.arquivo_id, nome: b.descricao || 'Imagem do modelo' }])).values()]
  })
  const [enviandoImagem, setEnviandoImagem] = useState(false)
  const [erroImagem, setErroImagem] = useState('')
  async function anexarImagem(file: File) {
    setErroImagem('')
    if (file.size > 2 * 1024 * 1024) {
      setErroImagem('Cada imagem deve ter até 2 MB.')
      return
    }
    setEnviandoImagem(true)
    try {
      const arquivo = await secretariaApi.upload(file)
      setAnexos(atuais => [...atuais, { arquivo_id: arquivo.id, nome: file.name }])
    } catch (erro) {
      setErroImagem(erro instanceof Error ? erro.message : 'Não foi possível enviar a imagem.')
    } finally { setEnviandoImagem(false) }
  }
  const [tiposCampos, setTiposCampos] = useState<Record<string, TipoCampo>>(anterior?.configuracao.tipos_campos ?? {})
  const [campoNovo, setCampoNovo] = useState('')
  function adicionarCampo() {
    const chave = codigos(campoNovo)[0]
    if (!chave || !/^[A-Z][A-Z0-9_]{0,79}$/.test(chave)) return
    setTiposCampos(atual => ({ ...atual, [chave]: atual[chave] ?? 'TEXTO' }))
    setCampoNovo('')
  }
  const enviar = useComando((dados: { tipo: 'ATA' | 'OUTRO'; finalidade: string; configuracao: NonNullable<typeof anterior>['configuracao'] }) => modelo ? secretariaApi.versionarModelo(modelo.id, { ...dados, revisao: modelo.revisao }) : secretariaApi.criarModelo({ ...dados, contexto_id: contexto.id, nome }), pronto, `${modelo?.id}:${modelo?.revisao}:${contexto.id}:${nome}`)
  return <form className="space-y-4 rounded border p-4" onSubmit={e => { e.preventDefault(); enviar.mutate({ tipo, finalidade: codigos(finalidade)[0], configuracao: { perfil: codigos(perfil)[0], contexto: contexto.tipo, tipos_orgao: contexto.orgao ? [contexto.orgao.tipo] : [], constituicoes: contexto.orgao ? [contexto.orgao.constituicao] : [], motivador, resolucoes, registro_livro: !finalidadeTermo(finalidade) && livro === 'OBRIGATORIO', ...(livrosHabilitados() ? { registro_em_livro: finalidadeTermo(finalidade) ? 'NAO_PERMITE' : livro } : {}), campos_obrigatorios: codigos(campos), papeis_obrigatorios: codigos(papeis), cargos_obrigatorios: exigidos, tipos_campos: tiposCampos, ...(estrutura ? { estrutura_padrao: estrutura } : {}) } }) }}>
    <h3 className="font-semibold">{modelo ? `Nova versão de ${modelo.nome}` : 'Novo modelo'}</h3>
    {!modelo && <><Escolha label="Sugestão da biblioteca" value="" required={false} onChange={valor => {
      const sugestao = biblioteca.find(item => item.finalidade === valor)
      if (!sugestao) return
      setNome(sugestao.nome)
      setTipo(sugestao.tipo)
      setFinalidade(sugestao.finalidade)
      setPerfil(sugestao.perfil)
      setLivro(sugestao.livro ? 'OBRIGATORIO' : sugestao.finalidade === 'TERMO_EXAME' ? 'OPCIONAL' : 'NAO_PERMITE')
      setPapeis('')
      setExigidos([])
      setCampos(sugestao.campos.join(', '))
      setTiposCampos(Object.fromEntries(sugestao.campos.map(chave => [chave, tiposBiblioteca[chave] ?? 'TEXTO'])))
      setEstrutura({ cabecalho: [], corpo: [{ tipo: 'TEXTO', texto: sugestao.corpo, alinhamento: 'JUSTIFICADO', estilo: 'NORMAL' }, { tipo: 'ASSINATURAS' }], rodape: [] })
    }}><option value="">Escolher uma sugestão</option>{biblioteca.filter(item => item.finalidade === 'ATA_REUNIAO' ? contexto.tipo === 'ORGAO' : item.tipo !== 'ATA' || contexto.tipo === 'ASSEMBLEIA_GERAL').map(item => <option key={item.finalidade} value={item.finalidade}>{item.nome}</option>)}</Escolha><p className="text-sm">A sugestão preenche dados iniciais; confira a aplicabilidade e as regras de assinatura antes de salvar.</p></>}
    {!modelo && <Campo label="Nome do modelo" value={nome} onChange={setNome} />}
    <div className="grid gap-4 md:grid-cols-2"><Escolha label="Tipo documental" value={tipo} onChange={v => setTipo(v as typeof tipo)}><option value="ATA">Ata</option><option value="OUTRO">Outro</option></Escolha><Campo label="Finalidade" value={finalidade} onChange={setFinalidade} />
      <Campo label="Perfil de apresentação e série de atas" value={perfil} onChange={setPerfil} />
      <Campo label="Campos obrigatórios (separados por vírgula)" required={false} value={campos} onChange={setCampos} />
      <Campo label="Papéis de assinatura obrigatórios (separados por vírgula)" required={false} value={papeis} onChange={setPapeis} />
      {([['Política de motivador', motivador, setMotivador], ['Política de resoluções', resolucoes, setResolucoes]] as const).map(([label, value, set]) => <Escolha key={label} label={label} value={value} onChange={v => set(v as PoliticaDocumento)}><option value="NAO_PERMITE">Não permite</option><option value="OPCIONAL">Opcional</option><option value="OBRIGATORIO">Obrigatório</option></Escolha>)}
    </div>
    {resolucoes === 'OBRIGATORIO' && <p>Modelos que exigem resoluções poderão ser formalizados quando o módulo de resoluções estiver disponível.</p>}
    <fieldset className="space-y-2"><legend>Tipos dos campos</legend>
      {Object.entries(tiposCampos).map(([chave, tipo]) => <div className="flex items-end gap-2" key={chave}>
        <Escolha label={chave} value={tipo} onChange={v => setTiposCampos(t => ({ ...t, [chave]: v as TipoCampo }))}>
          {Object.entries(tipos).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
        </Escolha>
        <Button type="button" variant="outline" onClick={() => setTiposCampos(t => Object.fromEntries(Object.entries(t).filter(([id]) => id !== chave)))}>Remover tipo de {chave}</Button>
      </div>)}
      <div className="flex items-end gap-2">
        <Campo label="Código do campo" value={campoNovo} onChange={setCampoNovo} required={false} />
        <Button type="button" variant="outline" disabled={Object.keys(tiposCampos).length >= 50 || !/^[A-Z][A-Z0-9_]{0,79}$/.test(codigos(campoNovo)[0] ?? '')} onClick={adicionarCampo}>Adicionar campo</Button>
      </div>
    </fieldset>
    {livrosHabilitados()
      ? finalidadeTermo(finalidade) ? <p>O termo será vinculado ao livro na aba Livros.</p>
        : <Escolha label="Registro em livro" value={livro} onChange={valor => setLivro(valor as PoliticaDocumento)}>
          <option value="NAO_PERMITE">Não permite</option><option value="OPCIONAL">Opcional</option><option value="OBRIGATORIO">Obrigatório</option>
        </Escolha>
      : <Check label="Exige registro em livro" checked={livro === 'OBRIGATORIO'} onChange={valor => setLivro(valor ? 'OBRIGATORIO' : 'NAO_PERMITE')} />}
    {!estrutura && <Button type="button" variant="outline" onClick={() => setEstrutura({ cabecalho: [], corpo: [], rodape: [] })}>Definir estrutura do modelo</Button>}
    {estrutura && <>
      <label className="grid gap-1 text-sm">Enviar imagem para o modelo (PNG, JPEG ou WebP)
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={enviandoImagem} onChange={e => {
          const arquivo = e.target.files?.[0]
          if (arquivo) void anexarImagem(arquivo)
          e.target.value = ''
        }} />
      </label>
      {erroImagem && <p role="alert">{erroImagem}</p>}
      <Compositor valor={estrutura} alterar={setEstrutura} anexos={anexos} />
    </>}
    <fieldset className="space-y-2"><legend>Cargos obrigatórios neste órgão</legend>{!cargos.length && <p className="text-sm">Nenhum cargo configurado neste contexto.</p>}{cargos.map(c => <Check key={c.id} label={c.nome} checked={exigidos.includes(c.id)} onChange={v => setExigidos(x => v ? [...x, c.id] : x.filter(id => id !== c.id))} />)}</fieldset>
    <p className="text-sm text-muted-foreground">Aplicável a {contexto.nome}{contexto.orgao ? ` (${contexto.orgao.constituicao.toLowerCase()})` : ''}. Cada alteração cria uma versão e preserva os documentos anteriores.</p>
    <Salvar pending={enviar.isPending || enviandoImagem} error={enviar.error} success={enviar.isSuccess} label="Salvar versão do modelo" />
  </form>
}
