import { apresentar } from '../../api/campos'
import { distinguirHomonimos, origensDoDocumento } from './procedenciaCampos'
import { Button } from '../../components/ui/button'
import { PautaReuniao } from './PautaReuniao'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogTitle } from '../../components/ui/dialog'
import { dataCivil } from '../../components/shared/Workspace'
import {
  secretariaApi,
  estadosDocumento,
  numeroDocumento,
  resultadosResolucao,
  type DocumentoDetalhe,
} from '../../api/secretaria'

export function FichaDocumento({
  id,
  identidade,
  fechar,
  origem, contextoId, abrirPrevia,
}: {
  contextoId: string
  abrirPrevia: (versao: string) => void
  id: string
  identidade: string
  fechar: () => void
  origem: HTMLElement | null
}) {
  const q = useQuery({
    queryKey: ['secretaria', identidade, 'ficha', id],
    queryFn: () => secretariaApi.documento(id),
    gcTime: 0,
  })
  const versao = q.data?.versoes.find(v => v.numero === q.data?.versao_atual)
  return (
    <Dialog
      open
      onOpenChange={(aberto) => {
        if (!aberto) fechar()
      }}
    >
      <DialogContent
        className="max-w-2xl"
        aria-describedby={undefined}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          origem?.focus()
        }}
      >
        <DialogTitle>Ficha do documento</DialogTitle>
        {q.isPending ? (
          <p role="status">Carregando ficha…</p>
        ) : q.isError || q.data?.contexto_id !== contextoId ? (
          <p role="alert">Não foi possível abrir a ficha.</p>
        ) : (
          <><Metadados documento={q.data} identidade={identidade} />
          {versao && <Button variant="outline" onClick={() => abrirPrevia(versao.id)}>Abrir prévia</Button>}</>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function Metadados({
  documento,
  identidade,
  versaoId,
  camposAdicionais = false,
}: {
  documento: DocumentoDetalhe
  identidade: string
  camposAdicionais?: boolean
  versaoId?: string
}) {
  const v =
    documento.versoes.find((i) => i.id === versaoId) ??
    documento.versoes.find((i) => i.numero === documento.versao_atual)
  const historica = v?.fonte_congelada?.legado?.reuniao
  const congelada = v?.fonte_congelada?.reuniao
  const reuniao = useQuery({
    queryKey: ['secretaria', identidade, 'reuniao-ficha', v?.reuniao_id],
    queryFn: () => secretariaApi.reuniao(v!.reuniao_id!),
    enabled: !!v?.reuniao_id && !historica && !congelada,
    gcTime: 0,
  })
  if (!v) return <p>Nenhuma versão disponível.</p>
  const valores = v.conteudo.valores ?? {}
  const definicoes = v.modelo?.configuracao.definicoes ?? {}
  const origens = distinguirHomonimos(origensDoDocumento({}, valores, v.conteudo.antecedente, !!v.motivador_id, false), definicoes)
  const encontro = historica ?? congelada?.dados ?? reuniao.data?.dados
  return (
    <div className="space-y-4 text-sm">
      <div>
        <span className="pill">{estadosDocumento[documento.estado]}</span>
        <h3 className="mt-2 text-lg font-semibold">{v.assunto}</h3>
        <p>
          {v.fonte_congelada?.numero || numeroDocumento({ ...documento, versao_atual: v.numero })} · v{v.numero}
        </p>
      </div>
      <dl className="grid gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
        {Object.entries({
          ...(v.conteudo?.redator_ata?.nome && { 'Redator da ata': v.conteudo.redator_ata.nome }),
          'Data do documento': dataCivil(v.data_documento),
          'Data da reunião': dataCivil(encontro?.data),
          Local: encontro?.local,
          Acesso: documento.restrito ? 'Restrito' : 'Institucional',
        }).map(([k, val]) => (
          <div key={k}>
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd>{val || 'Não informado'}</dd>
          </div>
        ))}
      </dl>
      {reuniao.isFetching && <p role="status">Carregando reunião…</p>}
      {reuniao.isError && <p role="alert">Dados da reunião indisponíveis.</p>}
      {v.modelo && (
        <p>
          Modelo v{v.modelo.numero} · {v.modelo.finalidade}
        </p>
      )}
      {v.fonte_congelada?.registro_livro && (
        <p>
          Livro nº {v.fonte_congelada.registro_livro.numero_livro} ·{' '}
          {v.fonte_congelada.registro_livro.serie_livro} · ordem {v.fonte_congelada.registro_livro.ordem}{' '}
          · posições {v.fonte_congelada.registro_livro.posicao_inicio} a{' '}
          {v.fonte_congelada.registro_livro.posicao_fim}
        </p>
      )}
      {camposAdicionais && Object.keys(origens).length > 0 && <section><h4 className="font-semibold">Origem dos campos</h4>
        <dl>{Object.entries(origens).map(([id, indicacao]) => <div key={id} className="mt-2">
          <dt>{definicoes[id]?.nome ?? 'Campo da versão'} · {indicacao.detalhe}</dt>
          <dd>{apresentar({ tipo: 'campo', campo_id: id, apresentacao: 'em_linha' }, valores[id]) || 'A preencher'}</dd>
        </div>)}</dl>
      </section>}
      {camposAdicionais &&
        Object.entries(v.conteudo.campos ?? {}).map(([campo, valor]) => (
          <p key={campo}>
            {campo}: {valor}
          </p>
        ))}
      <section>
        <h4 className="font-semibold">Pauta</h4>
        <PautaReuniao itens={historica ? undefined : (congelada ?? reuniao.data)?.itens_pauta} texto={encontro?.pauta} />
      </section>
      <section>
        <h4 className="font-semibold">Decisões e deliberações</h4>
        {!v.resolucoes?.length && !v.deliberacoes.length && <p>Nenhuma decisão registrada.</p>}
        <ul>
          {v.resolucoes?.map((r) => (
            <li key={r.id}>
              {r.ordem}. {r.assunto} · {resultadosResolucao[r.resultado]}
            </li>
          ))}
          {v.deliberacoes.map((r, i) => (
            <li key={i}>
              {dataCivil(r.data)} · {r.resultado} · {r.autoridade} · {r.evidencia}
              {r.mesa && <span> · Mesa {r.mesa.ordem}: {r.mesa.presidente_nome} (presidente) e {r.mesa.secretario_nome} (secretário)</span>}
              {r.revisao_conteudo !== v.revisao_conteudo && ' · Refere-se a conteúdo anterior'}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h4 className="font-semibold">Pessoas arroladas</h4>
        {v.arrolados.length ? (
          <ul>
            {v.arrolados.map((p) => (
              <li key={p.pessoa_id}>
                {p.retrato.nome} · {p.papeis.join(', ')}
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhuma pessoa arrolada.</p>
        )}
      </section>
    </div>
  )
}

export function TeorDocumento({ texto }: { texto?: string | null }) {
  if (!texto?.trim()) return null
  return (
    <div className="space-y-3 text-justify leading-[1.85]">
      {texto
        .split(/\n\s*\n|\r?\n/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </div>
  )
}
