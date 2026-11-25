import { useState } from 'react'
import type { DefinicaoCampo } from '../../api/campos'
import type { ModeloDocumento, PoliticaDocumento, RegraAntecedente } from '../../api/secretaria'
import { Button } from '../../components/ui/button'
import { Check, Escolha } from './formulario'
import { nomesDeCadastro } from './procedenciaCampos'

interface Props {
  modelos: ModeloDocumento[]
  destinos: Record<string, DefinicaoCampo>
  regras: RegraAntecedente[]
  politica: PoliticaDocumento
  alterar: (regras: RegraAntecedente[]) => void
  definirPolitica: (p: PoliticaDocumento) => void
}

export function EncadeamentoModelo({ modelos, destinos, regras, politica, alterar, definirPolitica }: Props) {
  const [escolhido, escolher] = useState('')
  const nomesDestinos = nomesDeCadastro(destinos)
  const manuais = Object.entries(destinos).filter(([,d]) => d.origem === 'manual')
  const disponiveis = modelos.filter(m => m.versoes.length && !regras.some(r => r.modelo_id === m.id))
  function adicionar() {
    const m = disponiveis.find(m => m.id === escolhido)
    if (!m) return
    const fontes = m.versoes[0]?.configuracao.definicoes ?? {}
    const comuns = manuais.filter(([id,d]) => fontes[id]?.tipo === d.tipo && fontes[id].multiplo === d.multiplo)
    alterar([...regras, { modelo_id: m.id, campos: Object.fromEntries(comuns.map(([id]) => [id,id])) }])
    if (politica === 'NAO_PERMITE') definirPolitica('OPCIONAL')
    escolher('')
  }
  return <div className="space-y-3">
    <div className="flex items-end gap-2"><Escolha label="Modelo do documento anterior" required={false} value={escolhido} onChange={escolher}>
      <option value="">Selecionar modelo</option>{disponiveis.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</Escolha>
      <Button type="button" variant="outline" disabled={!escolhido} onClick={adicionar}>Adicionar antecedente</Button></div>
    {regras.length > 0 && <Check label="Exigir documento anterior" checked={politica === 'OBRIGATORIO'} onChange={s => definirPolitica(s ? 'OBRIGATORIO' : 'OPCIONAL')}/>}
    {regras.map(regra => {
      const modelo = modelos.find(m => m.id === regra.modelo_id)
      const fontes = Object.entries(modelo?.versoes[0]?.configuracao.definicoes ?? {})
      const nomesFontes = nomesDeCadastro(Object.fromEntries(fontes))
      const comuns = manuais.filter(([id,d]) => !regra.campos[id] && fontes.some(([k,c]) => k === id && c.tipo === d.tipo && c.multiplo === d.multiplo))
      return <fieldset className="space-y-2" key={regra.modelo_id}><legend>{modelo?.nome ?? 'Modelo indisponível'}</legend>
        {comuns.length > 0 && <Button type="button" variant="outline" onClick={() => alterar(regras.map(r => r === regra ? { ...r,
          campos: { ...r.campos, ...Object.fromEntries(comuns.map(([id]) => [id,id])) } } : r))}>Associar campos de mesmo cadastro</Button>}
        {manuais.length === 0 && <p>Insira campos manuais no editor para escolher os valores que o documento receberá.</p>}
        {manuais.map(([id,d]) => <Escolha key={id} label={'Preencher '+nomesDestinos[id]+' a partir de'} value={regra.campos[id] ?? ''} required={false} onChange={fonte => {
          const campos = { ...regra.campos }
          if (fonte) campos[id] = fonte
          else delete campos[id]
          alterar(regras.map(r => r === regra ? { ...r, campos } : r))
        }}><option value="">Preenchimento manual</option>{regra.campos[id] && !fontes.some(([k,c]) => k === regra.campos[id] && c.tipo === d.tipo && c.multiplo === d.multiplo) &&
          <option disabled value={regra.campos[id]}>Campo incompatível com a versão atual</option>}{fontes.filter(([,c]) => c.tipo === d.tipo && c.multiplo === d.multiplo).map(([k]) => <option key={k} value={k}>{nomesFontes[k]}</option>)}</Escolha>)}
        <Button type="button" variant="outline" onClick={() => alterar(regras.filter(r => r !== regra))}>Remover antecedente</Button>
      </fieldset>
    })}
  </div>
}
