import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { minhaAssembleia, type Presidencia } from '../../api/minha-assembleia'
import { Button } from '../../components/ui/button'
import { Campo, Check, Escolha } from './formulario'

export default function PresidenciaAssembleia() {
  const { reuniao = '' } = useParams()
  const q = useQuery({
    queryKey: ['presidencia-assembleia', reuniao],
    queryFn: () => minhaAssembleia.presidencia(reuniao),
    retry: false,
    gcTime: 0,
  })
  return (
    <main className="mx-auto max-w-2xl space-y-5 p-5">
      <p className="font-semibold text-primary">ProVisão · Assembleia Geral</p>
      <h1 className="text-2xl font-semibold">Acesso do secretário eleito</h1>
      {q.isPending ? (
        <p role="status">Consultando a mesa…</p>
      ) : q.isError ? (
        <p role="alert">{q.error.message}</p>
      ) : (
        <Concessao key={q.data.mesa_id} ficha={q.data} reuniao={reuniao} atualizar={() => void q.refetch()} />
      )}
      <Link className="underline" to="/dashboard">
        Voltar ao sistema
      </Link>
    </main>
  )
}

function Concessao({ ficha, reuniao, atualizar }: { ficha: Presidencia; reuniao: string; atualizar: () => void }) {
  const [versao, selecionar] = useState(ficha.atas[0]?.id ?? '')
  const [prazo, definir] = useState(() => {
    const d = new Date(Date.now() + 24 * 3600000)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  })
  const ata = ficha.atas.find((a) => a.id === versao)
  const [reabrir, reabrirAta] = useState(false)
  const [chave, chaveNova] = useState(() => crypto.randomUUID())
  const comando = useMutation({
    mutationFn: async (acao: 'conceder' | 'revogar') => {
      if (!ata) return
      if (acao === 'revogar' && ata.acesso) return minhaAssembleia.revogar(reuniao, ata.acesso.id)
      return minhaAssembleia.conceder(reuniao, {
        mesa_id: ficha.mesa_id,
        versao_id: ata.id,
        expira_em: new Date(prazo).toISOString(),
        idempotencia: chave,
        ...(reabrir && { reabrir_revisao: ata.revisao }),
      })
    },
    onSuccess: () => {
      chaveNova(crypto.randomUUID())
      reabrirAta(false)
      atualizar()
    },
  })
  if (!ficha.atas.length)
    return <p>Prepare uma minuta de ata cujo modelo permita a redação pelo secretário da mesa.</p>
  return (
    <form
      className="surface space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        comando.mutate('conceder')
      }}
    >
      <p>
        Secretário eleito · <strong>{ficha.secretario}</strong>
      </p>
      <Escolha
        label="Minuta da assembleia"
        value={versao}
        onChange={(v) => {
          selecionar(v)
          reabrirAta(false)
        }}
      >
        {ficha.atas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.assunto}
          </option>
        ))}
      </Escolha>
      <Campo label="Acesso válido até (hora local)" type="datetime-local" value={prazo} onChange={definir} />
      {ata?.acesso && (
        <p>
          {ata.acesso.consumido_em ? 'Convite aceito' : 'Convite emitido'} · vence em{' '}
          {new Date(ata.acesso.expira_em).toLocaleString('pt-BR')}
        </p>
      )}
      {ata?.encaminhada && (
        <Check label="Autorizar nova revisão da redação" checked={reabrir} onChange={reabrirAta} />
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={comando.isPending}>
          {ata?.acesso ? 'Reenviar convite' : 'Conceder acesso e enviar convite'}
        </Button>
        {ata?.acesso && (
          <Button
            type="button"
            variant="outline"
            disabled={comando.isPending}
            onClick={() => comando.mutate('revogar')}
          >
            Revogar acesso
          </Button>
        )}
      </div>
      {comando.isError && <p role="alert">{comando.error.message}</p>}
      {comando.isSuccess && (
        <p role="status">
          {comando.variables === 'revogar'
            ? 'Acesso revogado.'
            : 'Convite registrado para envio ao e-mail do secretário.'}
        </p>
      )}
    </form>
  )
}
