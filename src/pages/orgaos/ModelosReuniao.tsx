import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { secretariaApi, type ConfigModeloReuniao, type ModeloReuniao } from '../../api/secretaria'
import { Button } from '../../components/ui/button'
import { Area, Campo, Check, Escolha, Salvar, useComando } from '../secretaria/formulario'

const regras = [
  'Qualquer número',
  'Maioria absoluta',
  '1/3',
  '1/5',
  '2/3',
  'Composição do Conselho',
  'Composição e maioria absoluta',
  'Por matéria',
  'Não prevista',
  'Pendente',
]
const conjunta = 'Integrantes de vários órgãos/unidades'
const opcoes = {
  tipo: ['Ordinária', 'Extraordinária'],
  natureza: ['Eclesiástica', 'Administrativa', 'Eleitoral', 'Judicial', 'Mista'],
  periodicidade: ['Conforme a necessidade', 'Semanal', 'Mensal', 'Trimestral', 'Semestral', 'Anual'],
  referencia: [
    'Membros comungantes',
    'Membros comungantes e não comungantes',
    'Integrantes do órgão/unidade',
    conjunta,
  ],
  primeira: regras.filter((r) => r !== 'Não prevista'),
  segunda: regras,
}
const rotulos = {
  tipo: 'Tipo',
  natureza: 'Natureza',
  periodicidade: 'Periodicidade',
  referencia: 'Referência do quórum',
  primeira: 'Quórum mínimo na primeira convocação',
  segunda: 'Quórum mínimo na segunda convocação',
}
const inicial: ConfigModeloReuniao = {
  tipo: 'Ordinária',
  natureza: 'Eclesiástica',
  obrigatoria: false,
  periodicidade: 'Conforme a necessidade',
  referencia: 'Integrantes do órgão/unidade',
  orgaos_participantes: [],
  primeira: 'Pendente',
  segunda: 'Não prevista',
  antecedencia_dias: null,
  intervalo_minutos: null,
  minimo_anual: null,
  colegiado: 'Órgão promotor',
  fundamentacao: '',
  observacao: '',
}
type Props = { contexto: string; orgao: string; identidade: string; editar: boolean }

export function ModelosReuniao(props: Props) {
  const { contexto, identidade, editar } = props
  const modelos = useQuery({
    queryKey: ['secretaria', contexto, 'modelos-reuniao', identidade],
    queryFn: () => secretariaApi.modelosReuniao(contexto),
  })
  const [selecionado, selecionar] = useState('')
  const atual = modelos.data?.find((m) => m.id === selecionado)
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Modelos de reunião</h3>
      {editar && <Button type="button" variant="outline" onClick={() => selecionar('novo')}>Criar modelo de reunião</Button>}</div>
      {modelos.isPending && <p className="text-sm text-muted-foreground">Carregando modelos…</p>}
      {modelos.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum modelo cadastrado para este órgão.</p>}
      {modelos.isError && <p role="alert">{modelos.error.message}</p>}
      <Escolha label="Finalidade do modelo" required={false} value={selecionado} onChange={selecionar}>
        <option value="">Selecione</option>
        {modelos.data?.map((m) => (
          <option key={m.id} value={m.id}>
            {m.finalidade}
          </option>
        ))}
        {selecionado === 'novo' && <option value="novo">Novo modelo</option>}
      </Escolha>
      {(atual || selecionado === 'novo') && (
        <Formulario key={selecionado + ':' + (atual?.revisao ?? 0)} {...props} modelo={atual} concluir={selecionar} />
      )}
    </section>
  )
}

function Formulario({
  contexto,
  orgao,
  identidade,
  editar,
  modelo,
  concluir,
}: Props & { modelo?: ModeloReuniao; concluir: (id: string) => void }) {
  const [nome, definirNome] = useState(modelo?.finalidade ?? '')
  const [config, set] = useState(modelo?.configuracao ?? inicial)
  const orgaos = useQuery({
    queryKey: ['secretaria', 'orgaos-configuracao', identidade],
    queryFn: secretariaApi.opcoesOrgaos,
    enabled: editar && config.referencia === conjunta,
  })
  const mudar = <K extends keyof ConfigModeloReuniao>(k: K, v: ConfigModeloReuniao[K]) =>
    set((c) => ({ ...c, [k]: v, ...(k === 'referencia' && v !== conjunta && { orgaos_participantes: [] }) }))
  const salvar = useComando<{ finalidade: string; configuracao: ConfigModeloReuniao }>(
    (v) => secretariaApi.salvarModeloReuniao(contexto, { ...v, id: modelo?.id, revisao: modelo?.revisao }),
    (r) => concluir(r.id),
  )
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        salvar.mutate({ finalidade: nome, configuracao: config })
      }}
    >
      <fieldset disabled={!editar || salvar.isPending} className="grid gap-3 md:grid-cols-2">
        <Campo label="Finalidade" value={nome} onChange={definirNome} />
        <Campo label="Colegiado" value={config.colegiado} onChange={(v) => mudar('colegiado', v)} />
        {(Object.keys(opcoes) as (keyof typeof opcoes)[]).map((k) => (
          <Escolha key={k} label={rotulos[k]} value={config[k]} onChange={(v) => mudar(k, v)}>
            {!opcoes[k].includes(config[k]) && <option>{config[k]}</option>}
            {opcoes[k].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </Escolha>
        ))}
        {config.referencia === conjunta && (
          <fieldset>
            <legend>Demais órgãos e unidades participantes</legend>
            {orgaos.isError && <p role="alert">{orgaos.error.message}</p>}
            {orgaos.data
              ?.filter((o) => o.id !== orgao)
              .map((o) => (
                <Check
                  key={o.id}
                  label={o.nome}
                  checked={config.orgaos_participantes.includes(o.id)}
                  onChange={(sim) =>
                    mudar(
                      'orgaos_participantes',
                      sim
                        ? [...config.orgaos_participantes, o.id]
                        : config.orgaos_participantes.filter((id) => id !== o.id),
                    )
                  }
                />
              ))}
          </fieldset>
        )}
        <Check label="Obrigatória" checked={config.obrigatoria} onChange={(v) => mudar('obrigatoria', v)} />
        {(
          [
            ['antecedencia_dias', 'Prazo mínimo da primeira convocação (dias)'],
            ['intervalo_minutos', 'Intervalo mínimo entre convocações (minutos)'],
            ['minimo_anual', 'Número mínimo de reuniões por ano'],
          ] as const
        ).map(([k, label]) => (
          <Campo
            key={k}
            label={label}
            type="number"
            required={false}
            value={config[k] ?? ''}
            onChange={(v) => mudar(k, v === '' ? null : Number(v))}
          />
        ))}
        <Area
          label="Fundamentação referente ao quórum"
          value={config.fundamentacao}
          onChange={(v) => mudar('fundamentacao', v)}
        />
        <Area label="Observações" required={false} value={config.observacao} onChange={(v) => mudar('observacao', v)} />
      </fieldset>
      {editar && (
        <Salvar label="Salvar modelo" pending={salvar.isPending} error={salvar.error} success={salvar.isSuccess} />
      )}
    </form>
  )
}
