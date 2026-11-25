import { deliberacoesNaPagina } from './deliberacoes'
import { dadosLeitura } from './editor/dadosLeitura'
import { LerResolucoes, prepararResolucoes } from './ResolucoesDocumento'
import { preencherPagina } from '../../api/pagina'
import { EditorPagina } from './editor/EditorPagina'
import { dataCivil } from '../../components/shared/Workspace'
import { TeorDocumento } from './FichaDocumento'
import { secretariaApi, numeroDocumento, type DocumentoDetalhe } from '../../api/secretaria'
import { LeituraEstrutura } from './Compositor'

export function DocumentoLeitura({ documento: d, versaoAberta, mudarVersao, menuAtivo }: { menuAtivo: boolean; documento: DocumentoDetalhe; versaoAberta?: string; mudarVersao: (id: string) => void }) {
  const selecionada = d.versoes.find(v => v.id === versaoAberta) ?? d.versoes.find(v => v.numero === d.versao_atual)
  const retratos = new Map(selecionada?.arrolados.map(p => [p.pessoa_id, p.retrato]))
  function cargosDaPessoa(id: string) {
    const retrato = retratos.get(id)
    return retrato?.cargos?.length ? retrato.cargos.map(c => c.nome) : retrato?.cargo ? [retrato.cargo.nome] : []
  }
  return <div className="space-y-3">{d.versoes.map(v => <details key={v.id} open={v.id === selecionada?.id} className="doc-version">
    <summary onClick={e => { e.preventDefault(); mudarVersao(v.id) }} className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold">Versão {v.numero}: {v.assunto}{v.congelado_em ? ' · Conteúdo congelado' : ''}</summary>
    {v.id === selecionada?.id && <article className="doc-sheet mt-3">
      <header className="doc-heading"><div className="mx-auto mb-3 h-1 w-10 bg-purple" />{v.fonte_congelada?.igreja?.nome && <p className="font-semibold">{v.fonte_congelada.igreja.nome}</p>}
        <p className="text-sm">{v.fonte_congelada?.contexto?.nome}</p><p className="mt-3 text-sm">{v.fonte_congelada?.numero || numeroDocumento(d)}</p>
        <h3 className="my-2 text-2xl font-bold">{v.assunto}</h3><time className="text-sm">{dataCivil(v.data_documento)}</time>
      </header>
      {v.conteudo.estrutura && <LeituraEstrutura documentoId={d.id} versao={v} secaoUnica="cabecalho" valor={v.conteudo.estrutura} campos={v.conteudo.campos} tipos={v.modelo?.configuracao.tipos_campos} />}
      {v.conteudo.antecedente && <p>Documento anterior · {v.conteudo.antecedente.identificacao}</p>}
      {v.conteudo.composicao ? <EditorPagina dadosLeitura={dadosLeitura(v.arrolados,prepararResolucoes(v.resolucoes),
        id => retratos.get(id)?.nome ?? '', cargosDaPessoa,
        v.modelo?.finalidade,v.conteudo.campos,v.fonte_congelada?.registro_livro?.numero_visivel_inicio)} imagemUrl={id => secretariaApi.anexoUrl(d.id, v.id, id) + '?visualizacao=imagem'} acoesDocumento={menuAtivo && <button type="button" onClick={() => document.getElementById('tramitacao-documento')?.focus()}>Tramitação</button>} margensConcilio={v.livro?.perfil === 'CONCILIO_IPB_2025'} valor={preencherPagina(v.conteudo.composicao, v.conteudo.campos, v.modelo?.configuracao.tipos_campos)} valores={v.conteudo.valores ?? {}} /> : <TeorDocumento texto={v.conteudo.teor} />}
      {!v.conteudo.teor && !v.conteudo.composicao && !v.conteudo.estrutura && <p>Esta versão não contém texto transcrito.</p>}
      {v.conteudo.estrutura && <LeituraEstrutura documentoId={d.id} versao={v} secaoUnica="corpo" valor={v.conteudo.estrutura} campos={v.conteudo.campos} tipos={v.modelo?.configuracao.tipos_campos} />}
      {v.conteudo.composicao?.versao_formato !== 2 && !deliberacoesNaPagina(v.conteudo.composicao, v.conteudo.valores) && <LerResolucoes resolucoes={v.resolucoes ?? []} />}
      {v.conteudo.estrutura && <LeituraEstrutura documentoId={d.id} versao={v} secaoUnica="rodape" valor={v.conteudo.estrutura} campos={v.conteudo.campos} tipos={v.modelo?.configuracao.tipos_campos} />}
      {v.arrolados.length > 0 && <footer className="border-t pt-4"><h4 className="font-semibold">Pessoas e responsabilidades</h4>{v.arrolados.map(p => <p key={p.pessoa_id}>{p.retrato.nome}{p.retrato.cargos?.length ? ' (' + p.retrato.cargos.map(c => c.nome).join(', ') + ')' : p.retrato.cargo ? ' (' + p.retrato.cargo.nome + ')' : ''} · {p.papeis.join(', ')}{p.responsavel && ' · Responsável'}{p.assina ? p.obrigatorio ? ' · Signatário obrigatório' : ' · Signatário' : ' · Sem assinatura'}</p>)}</footer>}
      {v.anexos.map(f => <p key={f.arquivo_id}><a className="underline" href={secretariaApi.anexoUrl(d.id, v.id, f.arquivo_id)}>{f.nome}</a> · {f.arquivo.tamanho} bytes</p>)}
    </article>}
  </details>)}</div>
}
