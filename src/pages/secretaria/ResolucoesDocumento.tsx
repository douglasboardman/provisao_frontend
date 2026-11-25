import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { Button } from '../../components/ui/button'
import { resultadosResolucao, rotulosApuracao, type ResolucaoDocumento, type ResolucaoInput } from '../../api/secretaria'
import { Area, Campo, Check, Escolha } from './formulario'

const apuracaoCampos = Object.keys(rotulosApuracao) as (keyof typeof rotulosApuracao)[]
const aprovada = (r: ResolucaoInput['resultado']) => r === 'APROVADA' || r === 'APROVADA_COM_ALTERACOES'

export function prepararResolucoes(resolucoes: ResolucaoDocumento[] = []): ResolucaoInput[] {
  return resolucoes.map(r => ({
    item_pauta_id: r.item_pauta_id, ordem: r.ordem, assunto: r.assunto, resultado: r.resultado,
    texto_proposta: r.texto_proposta, texto_deliberado: r.texto_deliberado,
    eficaz: r.eficaz, data_efeito: r.data_efeito?.slice(0, 10) ?? null,
    votacao_secreta: r.votacao_secreta, apuracao: r.apuracao,
    proponentes_pessoas_ids: r.proponentes.map(p => p.arrolado.pessoa_id),
    dissidentes_pessoas_ids: r.dissidentes.map(p => p.arrolado.pessoa_id),
  }))
}

type Pessoa = { id: string; nome: string; podePropor: boolean }

export function EditarResolucoes({ valor, pauta, pessoas, obrigatorio, permitido, alterar }: {
  pauta?: { id?: string; descricao: string; ordem: number }[]; valor: ResolucaoInput[]; pessoas: Pessoa[]; obrigatorio: boolean; permitido: boolean; alterar: (v: ResolucaoInput[]) => void
}) {
  function mover(indice: number, deslocamento: number) {
    const ordenadas = [...valor].sort((a,b) => a.ordem - b.ordem)
    const posicao = ordenadas.indexOf(valor[indice])
    const vizinha = posicao + deslocamento
    if (!ordenadas[vizinha]) return
    ;[ordenadas[posicao], ordenadas[vizinha]] = [ordenadas[vizinha], ordenadas[posicao]]
    alterar(ordenadas.map((item,n) => ({ ...item, ordem: n + 1 })))
  }
  function acrescentar() {
    const ordem = Math.max(0, ...valor.map(r => r.ordem)) + 1
    alterar([...valor, {
      ordem, assunto: '', texto_proposta: null, texto_deliberado: null,
      resultado: 'APROVADA', eficaz: false, data_efeito: null,
      votacao_secreta: false, apuracao: null, proponentes_pessoas_ids: [], dissidentes_pessoas_ids: [],
    }])
  }

  return <fieldset className="space-y-3">
    <legend className="font-semibold">Resoluções</legend>
    {!permitido && <p role="alert">O modelo selecionado veda resoluções. Retire os itens ou selecione um modelo compatível.</p>}
    {obrigatorio && !valor.length && <p>Este modelo exige uma resolução para encaminhar.</p>}
    {valor.map((r, i) => {
      const atualizar = (patch: Partial<ResolucaoInput>) => alterar(valor.map((item, n) => n === i ? { ...item, ...patch } : item))
      const marcar = (campo: 'proponentes_pessoas_ids' | 'dissidentes_pessoas_ids', id: string, checked: boolean) =>
        atualizar({ [campo]: checked ? [...r[campo], id] : r[campo].filter(p => p !== id) })
      const contar = (campo: keyof typeof rotulosApuracao, value: string) => {
        const apuracao = { ...r.apuracao }
        if (value === '') delete apuracao[campo]
        else apuracao[campo] = Number(value)
        atualizar({ apuracao: Object.keys(apuracao).length ? apuracao : null })
      }
      const candidatos = pessoas.filter(p => p.podePropor || r.proponentes_pessoas_ids.includes(p.id))
      return <fieldset className="space-y-3 rounded border p-3" key={i}>
        <legend className="px-1 font-medium">Resolução {r.ordem || i + 1}</legend>
        <div className="grid gap-3 md:grid-cols-3">
          <Campo label="Ordem da resolução" type="number" value={r.ordem || ''} onChange={s => atualizar({ ordem: Number(s) })} />
          <Campo label="Assunto da resolução" value={r.assunto} onChange={s => atualizar({ assunto: s })} />
          <Escolha label="Resultado da resolução" value={r.resultado} onChange={s => {
            const resultado = s as ResolucaoInput['resultado']
            atualizar(aprovada(resultado) ? { resultado } : { resultado, eficaz: false, data_efeito: null })
          }}>{Object.entries(resultadosResolucao).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</Escolha>
        </div>
        {pauta && <Escolha required={false} label="Item de pauta" value={r.item_pauta_id ?? ''} onChange={id => atualizar({ item_pauta_id: id || null })}>
          <option value="">Sem vínculo com item</option>{pauta.filter(item => item.id).map(item => <option key={item.id} value={item.id}>{item.ordem}. {item.descricao}</option>)}
        </Escolha>}
        <Area label="Texto proposto" value={r.texto_proposta ?? ''} onChange={s => atualizar({ texto_proposta: s || null })}
          required={!aprovada(r.resultado) && !r.texto_deliberado || r.resultado === 'APROVADA_COM_ALTERACOES'} />
        <Area label="Texto deliberado" value={r.texto_deliberado ?? ''} onChange={s => atualizar({ texto_deliberado: s || null })} required={aprovada(r.resultado)} />
        {aprovada(r.resultado) && <Check label="Registrar eficácia da decisão" checked={r.eficaz}
          onChange={eficaz => atualizar(eficaz ? { eficaz } : { eficaz, data_efeito: null })} />}
        {r.eficaz && <Campo label="Data de efeito" type="date" required={false} value={r.data_efeito ?? ''} onChange={s => atualizar({ data_efeito: s || null })} />}
        <fieldset className="space-y-1"><legend>Proponentes</legend>
          {!r.proponentes_pessoas_ids.length && <p className="text-sm text-muted-foreground">Sem proponente informado</p>}
          {!candidatos.length && <p className="text-sm text-muted-foreground">Para indicar autoria, arrole a pessoa e registre sua competência para propor.</p>}
          <SeletorPessoa rotulo="Adicionar proponente" value="" opcoes={candidatos.filter(p => !r.proponentes_pessoas_ids.includes(p.id))}
            onChange={id => marcar('proponentes_pessoas_ids', id, true)} />
          {candidatos.filter(p => r.proponentes_pessoas_ids.includes(p.id)).map(p =>
            <Button key={p.id} type="button" variant="outline" size="sm" onClick={() => marcar('proponentes_pessoas_ids', p.id, false)}>Retirar {p.nome}{!p.podePropor && ' (competência pendente)'}</Button>)}
        </fieldset>
        <Check label="Votação secreta" checked={r.votacao_secreta} disabled={r.dissidentes_pessoas_ids.length > 0}
          onChange={votacao_secreta => atualizar({ votacao_secreta })} />
        {r.dissidentes_pessoas_ids.length > 0 && <p className="text-sm text-muted-foreground">Retire os dissidentes nominais para registrar votação secreta.</p>}
        {!r.votacao_secreta && <fieldset className="space-y-1"><legend>Dissidentes (opcional)</legend>
          <SeletorPessoa rotulo="Adicionar dissidente" value="" opcoes={pessoas.filter(p => !r.dissidentes_pessoas_ids.includes(p.id))}
            onChange={id => marcar('dissidentes_pessoas_ids', id, true)} />
          {pessoas.filter(p => r.dissidentes_pessoas_ids.includes(p.id)).map(p =>
            <Button key={p.id} type="button" variant="outline" size="sm" onClick={() => marcar('dissidentes_pessoas_ids', p.id, false)}>Retirar {p.nome}</Button>)}
        </fieldset>}
        <fieldset className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5"><legend>Apuração (opcional)</legend>
          {apuracaoCampos.map(k => <label className="grid gap-1 text-sm" key={k}>{rotulosApuracao[k]}
            <input className="rounded border bg-background p-2" type="number" min={0} max={1000000} value={r.apuracao?.[k] ?? ''} onChange={e => contar(k, e.target.value)} />
          </label>)}
        </fieldset>
        <Button type="button" variant="outline" disabled={!valor.some(item => item.ordem < r.ordem)} onClick={() => mover(i,-1)}>Mover para cima</Button>
        <Button type="button" variant="outline" disabled={!valor.some(item => item.ordem > r.ordem)} onClick={() => mover(i,1)}>Mover para baixo</Button>
        <Button type="button" variant="outline" onClick={() => alterar(valor.filter((_, n) => n !== i))}>Retirar resolução</Button>
      </fieldset>
    })}
    {permitido && <Button type="button" variant="outline" disabled={valor.length >= 100} onClick={acrescentar}>Adicionar resolução</Button>}
  </fieldset>
}

function nomes(vinculos: ResolucaoDocumento['proponentes']) {
  return vinculos.map(({ arrolado: { retrato } }) => {
    const cargos = retrato.cargos?.length ? retrato.cargos : retrato.cargo ? [retrato.cargo] : []
    return cargos.length ? `${retrato.nome} (${cargos.map(c => c.nome).join(', ')})` : retrato.nome
  }).sort((a, b) => a.localeCompare(b, 'pt-BR')).join('; ')
}

export function LerResolucoes({ resolucoes }: { resolucoes: ResolucaoDocumento[] }) {
  if (!resolucoes.length) return null
  return <section className="space-y-2">
    <h4 className="font-semibold">Resoluções</h4>
    {resolucoes.map(r => <article key={r.id} className="space-y-1 rounded border p-3">
      <h5 className="font-medium">{r.ordem}. {r.assunto} · {resultadosResolucao[r.resultado]}</h5>
      {r.texto_proposta && <p className="whitespace-pre-wrap"><strong>Texto proposto</strong> {r.texto_proposta}</p>}
      {r.texto_deliberado && <p className="whitespace-pre-wrap"><strong>Texto deliberado</strong> {r.texto_deliberado}</p>}
      <p>{r.eficaz ? `Eficácia registrada${r.data_efeito ? ' · ' + r.data_efeito.slice(0, 10).split('-').reverse().join('/') : ''}` : 'Sem efeito registrado'}</p>
      <p>{r.proponentes.length ? <><strong>Proponentes</strong> {nomes(r.proponentes)}</> : 'Sem proponente informado'}</p>
      {r.dissidentes.length > 0 && <p><strong>Dissidentes registrados</strong> {nomes(r.dissidentes)}</p>}
      {r.votacao_secreta && <p>Votação secreta</p>}
      {r.apuracao && <p>{apuracaoCampos.filter(k => r.apuracao?.[k] !== undefined).map(k => `${rotulosApuracao[k]} ${r.apuracao?.[k]}`).join(' · ')}</p>}
    </article>)}
  </section>
}
