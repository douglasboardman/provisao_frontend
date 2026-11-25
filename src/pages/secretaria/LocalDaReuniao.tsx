import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { secretariaApi, type LocalReuniao, type ReuniaoSecretaria } from '../../api/secretaria'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { EstadoBrasil } from '../../types/enums'
import { useAuthStore } from '../../stores/auth'
import { Area, Campo, Escolha, Salvar, useComando } from './formulario'

const campos = {
  descritivo: 'Nome ou descritivo', endereco_logradouro: 'Logradouro', endereco_numero: 'Número',
  endereco_complemento: 'Complemento', endereco_bairro: 'Bairro', endereco_cep: 'CEP', endereco_cidade: 'Cidade',
} as const
type DadosLocal = Omit<LocalReuniao, 'id' | 'revisao' | 'endereco_extenso' | 'endereco_declarativo'>

function CadastroLocal({ local, concluir }: { local?: LocalReuniao; concluir: (id: string) => void }) {
  const [dados, setDados] = useState<DadosLocal>(() => ({
    descritivo: local?.descritivo ?? '', endereco_logradouro: local?.endereco_logradouro ?? '',
    endereco_numero: local?.endereco_numero ?? '', endereco_complemento: local?.endereco_complemento ?? '',
    endereco_bairro: local?.endereco_bairro ?? '', endereco_cep: local?.endereco_cep ?? '',
    endereco_cidade: local?.endereco_cidade ?? '', endereco_uf: local?.endereco_uf ?? '',
    extenso_personalizado: local?.extenso_personalizado ?? '', declarativo_personalizado: local?.declarativo_personalizado ?? '',
  }))
  const alterar = (k: keyof DadosLocal, v: string) => setDados(d => ({ ...d, [k]: v }))
  const salvar = useComando((v: {local: DadosLocal}) => local
    ? secretariaApi.editarLocal(local.id, { ...v, revisao: local.revisao }) : secretariaApi.criarLocal(v), r => concluir(r.id))
  return <form className="space-y-4" inert={salvar.isPending} onSubmit={e => { e.preventDefault(); e.stopPropagation(); salvar.mutate({ local: dados }) }}>
    <div className="grid gap-3 sm:grid-cols-2">
      {(Object.keys(campos) as (keyof typeof campos)[]).map(k => <Campo key={k} label={campos[k]} value={dados[k]} required={k === 'descritivo'} onChange={s => alterar(k, s)} />)}
      <Escolha label="UF" required={false} value={dados.endereco_uf} onChange={s => alterar('endereco_uf', s)}>
        <option value="">Selecionar</option>{Object.values(EstadoBrasil).map(uf => <option key={uf}>{uf}</option>)}
      </Escolha>
    </div>
    <details className="space-y-2"><summary>Personalizar a redação do endereço</summary>
      <p className="text-sm">Deixe em branco para gerar os textos a partir do endereço cadastrado.</p>
      <Area label="Endereço por extenso" required={false} value={dados.extenso_personalizado} onChange={s => alterar('extenso_personalizado', s)} />
      <Area label="Endereço declarativo" required={false} value={dados.declarativo_personalizado} onChange={s => alterar('declarativo_personalizado', s)} />
    </details>
    <Salvar pending={salvar.isPending} error={salvar.error} success={false} label="Salvar local"/>
  </form>
}

export function LocalDaReuniao({ reuniao, valor, alterar, efetivo = false }: { efetivo?: boolean; reuniao?: ReuniaoSecretaria; valor: string; alterar: (id: string) => void }) {
  const user = useAuthStore(s => s.user)
  const consulta = useQuery({ queryKey: ['secretaria', user?.igreja_id, user?.sub, 'locais'], queryFn: secretariaApi.locais })
  const [modal, setModal] = useState<'novo' | 'editar' | null>(null)
  const locais = consulta.data ?? []
  const local = locais.find(l => l.id === valor)
  const idRegistrado = efetivo ? reuniao?.local_efetivo_id : reuniao?.local_id
  const registrado = idRegistrado === valor ? (efetivo ? reuniao?.local_efetivo_retrato : reuniao?.local_retrato) : null
  const endereco = registrado ?? local
  return <div className="space-y-2">
    <Escolha label={efetivo ? "Local efetivo" : "Local da reunião"} required={!efetivo} value={valor} onChange={alterar}>
      <option value="">{efetivo ? 'Mesmo local do agendamento' : 'Selecione um local'}</option>
      {!efetivo && reuniao && !reuniao.local_id && <option value="historico">{reuniao.dados.local} (registrado na reunião)</option>}
      {registrado && !local && <option value={valor}>{registrado.descritivo}</option>}
      {locais.map(l => <option key={l.id} value={l.id}>{l.id === valor && registrado ? registrado.descritivo : l.descritivo}{locais.some(outro => outro.id !== l.id && outro.descritivo === l.descritivo) && l.endereco_extenso ? ' — ' + l.endereco_extenso : ''}</option>)}
    </Escolha>
    {endereco?.endereco_extenso && <p className="text-sm">{endereco.endereco_extenso}</p>}
    {endereco?.endereco_declarativo && <details className="text-sm"><summary>Redação declarativa</summary>{endereco.endereco_declarativo}</details>}
    {consulta.isError && <p role="alert">Falha ao carregar os locais. <button type="button" onClick={() => void consulta.refetch()}>Tentar novamente</button></p>}
    <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setModal('novo')}>Cadastrar local</Button>
      {local && <Button type="button" variant="outline" onClick={() => setModal('editar')}>Editar cadastro do local</Button>}</div>
    <Dialog open={modal !== null} onOpenChange={aberto => { if (!aberto) setModal(null) }}>
      {modal && <DialogContent><DialogTitle>{modal === 'novo' ? 'Cadastrar local de reunião' : 'Editar local de reunião'}</DialogTitle>
        <DialogDescription>Este cadastro pode ser usado nas reuniões da igreja.</DialogDescription>
        <CadastroLocal local={modal === 'editar' ? local : undefined} concluir={id => { alterar(id); setModal(null) }}/>
      </DialogContent>}
    </Dialog>
  </div>
}
