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
  origem,
}: {
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
        ) : q.isError ? (
          <p role="alert">Não foi possível abrir a ficha.</p>
        ) : (
          <Metadados documento={q.data} identidade={identidade} />
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
  const encontro = historica ?? congelada?.dados ?? reuniao.data?.dados
  return (
    <div className="space-y-4 text-sm">
      <div>
        <span className="pill">{estadosDocumento[documento.estado]}</span>
        <h3 className="mt-2 text-lg font-semibold">{v.assunto}</h3>
        <p>
          {numeroDocumento(documento)} · v{v.numero}
        </p>
      </div>
      <dl className="grid gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
        {Object.entries({
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
      {camposAdicionais &&
        Object.entries(v.conteudo.campos).map(([campo, valor]) => (
          <p key={campo}>
            {campo}: {valor}
          </p>
        ))}
      <section>
        <h4 className="font-semibold">Pauta</h4>
        <p className="whitespace-pre-line">{encontro?.pauta || 'Sem pauta informada.'}</p>
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

export function TeorDocumento({ texto }: { texto: string }) {
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
