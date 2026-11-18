import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  secretariaApi, resultadosResolucao, rotulosAtuacao, estadosDocumento,
  type ContextoSecretaria, type FiltrosAtuacao, type ItemAtuacao,
} from '../../api/secretaria'
import { pessoasApi } from '../../api/pessoas'
import { Button } from '../../components/ui/button'
import { Campo, Escolha } from './formulario'

const indicadores = Object.keys(rotulosAtuacao) as (keyof typeof rotulosAtuacao)[]
const inicial: FiltrosAtuacao = { tipo: 'resolucoes' }

export function ConsultaAtuacao({ contextos, identidade, abrir }: {
  contextos: ContextoSecretaria[]; identidade: string; abrir: (item: ItemAtuacao) => void
}) {
  const [campos, setCampos] = useState(inicial)
  const [filtros, setFiltros] = useState(inicial)
  const [pagina, setPagina] = useState(0)
  const pessoas = useQuery({
    queryKey: ['secretaria', identidade, 'pessoas-opcoes'], queryFn: pessoasApi.list, gcTime: 0,
  })
  const relatorio = useQuery({
    queryKey: ['secretaria', identidade, 'atuacao', filtros, pagina],
    queryFn: () => secretariaApi.atuacao(filtros, pagina), gcTime: 0,
  })
  const exportacao = useMutation({
    mutationFn: secretariaApi.exportarAtuacao,
    onSuccess: csv => {
      const url = URL.createObjectURL(csv)
      const link = document.createElement('a')
      link.href = url
      link.download = 'atuacao-secretaria.csv'
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
  })
  const alterar = <K extends keyof FiltrosAtuacao>(campo: K, valor: FiltrosAtuacao[K]) => {
    setCampos(anteriores => {
      const proximo = { ...anteriores }
      if (valor) proximo[campo] = valor
      else delete proximo[campo]
      return proximo
    })
  }
  const dados = relatorio.data
  return <section className="space-y-4">
    <h2 className="text-xl font-semibold">Consulta de atuação</h2>
    <form className="space-y-3 rounded border p-4" onSubmit={e => {
      e.preventDefault()
      const consultados = { ...campos }
      if (!consultados.assunto?.trim()) delete consultados.assunto
      setFiltros(consultados)
      setPagina(0)
      exportacao.reset()
    }}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Escolha label="Consultar" value={campos.tipo} onChange={s => alterar('tipo', s as FiltrosAtuacao['tipo'])}>
          <option value="resolucoes">Resoluções</option><option value="registros">Registros documentais</option>
        </Escolha>
        <Escolha label="Órgão ou Assembleia Geral" required={false} value={campos.contexto ?? ''} onChange={s => alterar('contexto', s)}>
          <option value="">Todos os contextos</option>
          {contextos.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.sigla})</option>)}
        </Escolha>
        <Escolha label="Pessoa" required={false} value={campos.pessoa ?? ''} onChange={s => alterar('pessoa', s)}>
          <option value="">Todas as pessoas</option>
          {pessoas.data?.map(p => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}
        </Escolha>
        <Campo label="Data inicial do documento" type="date" required={false} value={campos.de ?? ''} onChange={s => alterar('de', s)} />
        <Campo label="Data final do documento" type="date" required={false} value={campos.ate ?? ''} onChange={s => alterar('ate', s)} />
        <Campo label={campos.tipo === 'resolucoes' ? 'Assunto da resolução' : 'Assunto do documento'}
          required={false} value={campos.assunto ?? ''} onChange={s => alterar('assunto', s)} />
        <Escolha label="Resultado da resolução" required={false} value={campos.resultado ?? ''}
          onChange={s => alterar('resultado', s as FiltrosAtuacao['resultado'])}>
          <option value="">Todos os resultados</option>
          {Object.entries(resultadosResolucao).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </Escolha>
      </div>
      {pessoas.isError && <p role="alert">Não foi possível carregar o filtro de pessoas.</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Pesquisar</Button>
        <Button type="button" variant="outline" disabled={!dados?.totais.total || exportacao.isPending}
          onClick={() => exportacao.mutate(filtros)}>{exportacao.isPending ? 'Exportando…' : 'Exportar resultados em CSV'}</Button>
      </div>
      {exportacao.isError && <p role="alert">{exportacao.error.message}</p>}
    </form>
    <p className="text-sm text-muted-foreground">A consulta inclui versões congeladas. Presença refere-se à reunião da ata e assinatura à versão do documento. Os indicadores se sobrepõem.</p>
    {relatorio.isPending && <p role="status">Carregando resultados…</p>}
    {relatorio.isError && <p role="alert">{relatorio.error.message}</p>}
    {dados && <>
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6" aria-label="Totais da consulta">
        <div className="rounded border p-2"><dt>Resultados</dt><dd className="text-lg font-semibold">{dados.totais.total}</dd></div>
        {indicadores.map(k => <div className="rounded border p-2" key={k}><dt>{rotulosAtuacao[k]}</dt><dd className="text-lg font-semibold">{dados.totais[k]}</dd></div>)}
      </dl>
      {!dados.totais.total && <p>Nenhum registro encontrado.</p>}
      {dados.itens.map(item => <article className="flex flex-wrap items-start justify-between gap-3 rounded border p-3" key={item.resolucao_id ?? item.versao_id}>
        <div className="space-y-1">
          <h3 className="font-semibold">{item.ordem ? `${item.ordem}. ` : ''}{item.assunto}</h3>
          <p>{item.contexto} · {item.numero} · {item.data.split('-').reverse().join('/')} · Versão {item.versao}{item.versao_atual ? '' : ' (histórica)'} · {estadosDocumento[item.estado]}</p>
          {item.resultado && <>
            <p>{resultadosResolucao[item.resultado]} · {item.eficaz ? 'Eficácia registrada' : 'Sem efeito registrado'}</p>
            <p>{item.proponentes ? <><strong>Proponentes</strong> {item.proponentes}</> : 'Sem proponente informado'}</p>
            {item.dissidentes && <p><strong>Dissidentes registrados</strong> {item.dissidentes}</p>}
          </>}
          <ul className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
            {indicadores.filter(k => item[k]).map(k => <li key={k}>{rotulosAtuacao[k]}</li>)}
          </ul>
        </div>
        <Button type="button" variant="outline" onClick={() => abrir(item)}>Abrir versão</Button>
      </article>)}
      {dados.totais.total > dados.tamanho && <div className="flex items-center gap-3">
        <Button variant="outline" disabled={!pagina} onClick={() => setPagina(pagina - 1)}>Anterior</Button>
        <span>Página {pagina + 1} de {Math.ceil(dados.totais.total / dados.tamanho)}</span>
        <Button variant="outline" disabled={(pagina + 1) * dados.tamanho >= dados.totais.total} onClick={() => setPagina(pagina + 1)}>Próxima</Button>
      </div>}
    </>}
  </section>
}
