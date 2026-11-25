import { useState } from 'react'
import type { ImagemPaginaV2 } from '../../../api/pagina-v2'
import type { Regiao } from '../../../api/pagina'
import { rotulos } from './Margens'

type Imagem = ImagemPaginaV2
export interface Ocorrencia { imagem: Imagem; regiao: Regiao }
const modos = { em_linha: 'Em linha', acima_abaixo: 'Acima e abaixo', ao_redor: 'Texto ao redor', atraves: 'Através', atras: 'Atrás do texto', a_frente: 'À frente do texto' }
const ajustes = { ajustar: 'Ajustar à área', preencher: 'Preencher a área', original: 'Tamanho original', personalizado: 'Personalizado' }

export function redimensionar(i: Imagem, eixo: 'largura_cm' | 'altura_cm', medida: number) {
  const outro = eixo === 'largura_cm' ? 'altura_cm' : 'largura_cm'
  const razao = i[outro] / i[eixo]
  const valor = Math.max(0.01, Math.min(medida, 29.7, i.manter_proporcao ? 29.7 / razao : 29.7))
  return { ...i, [eixo]: valor, [outro]: i.manter_proporcao ? valor * razao : i[outro], ajuste: i.ajuste === 'original' ? 'personalizado' as const : i.ajuste }
}
function Medida({ nome, valor, min = 0, max = 29.7, mudar }: {nome: string; valor: number; min?: number; max?: number; mudar: (n: number) => void}) {
  const [entrada, escrever] = useState<string | null>(null)
  return <label>{nome}<input type="number" step="any" min={min} max={max} value={entrada ?? Number(valor.toFixed(3))}
    onChange={e => escrever(e.target.value)} onBlur={e => {
      const n = e.currentTarget.valueAsNumber
      if (entrada !== null && Number.isFinite(n) && n >= min && n <= max && n !== valor) mudar(n)
      escrever(null)
    }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}/></label>
}
export function PropriedadesImagem({ lista, id, selecionar, mudar, editar, original }: {
  lista: Ocorrencia[]; id: string; selecionar: (id: string) => void
  mudar: (i: Imagem) => void; editar: () => void; original: () => { largura_cm: number; altura_cm: number } | undefined
}) {
  const item = lista.find(o => o.imagem.ocorrencia_id === id)
  const i = item?.imagem
  const [aviso, avisar] = useState('')
  return <details className="espaco-grupo propriedades-imagem"><summary>Imagens da página</summary><div>
    <label>Imagem<select value={i?.ocorrencia_id ?? ''} onChange={e => { avisar(''); selecionar(e.target.value) }}>
      <option value="">Selecionar imagem</option>{lista.map(({imagem,regiao}, n) => <option key={imagem.ocorrencia_id} value={imagem.ocorrencia_id}>
        {rotulos[regiao]} · {imagem.descricao || 'Imagem ' + (n + 1)}</option>)}</select></label>
    {i && <><label>Relação com o texto<select value={i.relacao} onChange={e => mudar({ ...i, relacao: e.target.value as Imagem['relacao'] })}>
      {Object.entries(modos).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label>Ajuste<select value={i.ajuste} onChange={e => {
        const ajuste = e.target.value as Imagem['ajuste']
        avisar('')
        if (ajuste !== 'original') { mudar({ ...i, ajuste }); return }
        const tamanho = original()
        if (!tamanho) { avisar('Aguarde a imagem carregar para usar o tamanho original.'); return }
        if (Math.max(tamanho.altura_cm, tamanho.largura_cm) > 29.7) avisar('A imagem será exibida em escala original, recortada na caixa de até 29,7 cm.')
        mudar({ ...i, ajuste, largura_cm: Math.min(29.7, tamanho.largura_cm), altura_cm: Math.min(29.7, tamanho.altura_cm) })
      }}>{Object.entries(ajustes).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <div className="medidas-imagem"><Medida nome="Largura (cm)" min={0.01} valor={i.largura_cm} mudar={n => mudar(redimensionar(i, 'largura_cm', n))}/>
        <Medida nome="Altura (cm)" min={0.01} valor={i.altura_cm} mudar={n => mudar(redimensionar(i, 'altura_cm', n))}/></div>
      <label className="imagem-check"><input type="checkbox" checked={i.manter_proporcao} onChange={e => mudar({...i, manter_proporcao:e.target.checked})}/> Manter proporção</label>
      {i.relacao !== 'em_linha' && <><div className="medidas-imagem">
        <label>Horizontal<select value={i.horizontal} onChange={e => mudar({...i, horizontal:e.target.value as Imagem['horizontal']})}>
          <option value="esquerda">Esquerda</option><option value="centro">Centro</option><option value="direita">Direita</option></select></label>
        <label>Vertical<select value={i.vertical} onChange={e => mudar({...i, vertical:e.target.value as Imagem['vertical']})}>
          <option value="topo">Topo</option><option value="centro">Centro</option><option value="base">Base</option></select></label></div>
        <div className="medidas-imagem"><Medida nome="Deslocamento X (cm)" min={-21} max={21} valor={i.x_cm} mudar={n => mudar({...i,x_cm:n})}/>
          <Medida nome="Deslocamento Y (cm)" min={-29.7} valor={i.y_cm} mudar={n => mudar({...i,y_cm:n})}/></div></>}
      <div className="medidas-imagem"><Medida nome="Opacidade (%)" max={100} valor={i.opacidade * 100} mudar={n => mudar({...i,opacidade:n/100})}/>
        {!['atras','a_frente'].includes(i.relacao) && <Medida nome="Distância do texto (cm)" valor={i.distancia_texto_cm} mudar={n => mudar({...i,distancia_texto_cm:n})}/>}</div>
      {item.regiao !== 'corpo' && <label>Exibir em<select value={i.repeticao ?? 'todas'} onChange={e => mudar({...i,repeticao:e.target.value as Imagem['repeticao']})}>
        <option value="todas">Todas as páginas</option><option value="primeira">Somente a primeira página</option></select></label>}
      <button type="button" className="imagem-editar" onClick={editar}>Editar arquivo, descrição e legenda</button>
      {aviso && <p role="status">{aviso}</p>}
    </>}
  </div></details>
}
