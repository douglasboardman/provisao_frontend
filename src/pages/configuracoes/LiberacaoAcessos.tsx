import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { autorizacaoApi, type Liberacao } from '../../api/autorizacao'
import { ApiRequestError } from '../../api/client'
import { Button } from '../../components/ui/button'
import { useAuthStore } from '../../stores/auth'

const estados = { LEGADO: 'Perfis existentes', ATRIBUICAO: 'Por atribuição', PAUSADO: 'Suspensa' }

function mensagem(erro: unknown) {
  return erro instanceof ApiRequestError ? erro.messages.join(' ') : 'Não foi possível concluir a operação.'
}

function Operacao({ liberacao }: { liberacao: Liberacao }) {
  const client = useQueryClient()
  const [fundamento, setFundamento] = useState('')
  const previa = useMutation({ mutationFn: () => autorizacaoApi.previaLiberacao(liberacao.acao) })
  const alterar = useMutation({
    mutationFn: (estado: 'ATRIBUICAO' | 'PAUSADO') => autorizacaoApi.atualizarLiberacao(liberacao.acao, {
      estado, fundamento: fundamento.trim(), revisao: liberacao.revisao,
      ...(estado === 'ATRIBUICAO' ? { previa: previa.data?.previa } : {}),
    }),
    onSuccess: () => {
      previa.reset()
      setFundamento('')
    },
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['liberacoes'] }),
        client.invalidateQueries({ queryKey: ['navegacao'] }),
      ])
    },
  })
  const comparacao = previa.data?.revisao === liberacao.revisao ? previa.data : undefined
  const pronto = !!fundamento.trim() && !alterar.isPending && !previa.isPending

  return <section className="space-y-3" aria-label={liberacao.rotulo}>
    <p>Situação atual · <strong>{estados[liberacao.estado]}</strong></p>
    <Button type="button" variant="outline" disabled={previa.isPending || alterar.isPending} onClick={() => {
      alterar.reset()
      previa.mutate()
    }}>Conferir acessos</Button>
    {previa.isError && <p role="alert">{mensagem(previa.error)}</p>}
    {comparacao && <div className="space-y-2">
      <p role="status">{comparacao.contas_ativas} contas ativas avaliadas. {comparacao.diferencas.length} diferenças por rota.</p>
      {comparacao.diferencas.length > 0 && <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left text-sm">
          <caption className="sr-only">Diferenças de acesso por conta e rota</caption>
          <thead><tr>{['Conta', 'Perfil', 'Rota', 'Atual', 'Por atribuição'].map(t =>
            <th key={t} scope="col" className="border-b p-2">{t}</th>)}</tr></thead>
          <tbody>{comparacao.diferencas.map(d => <tr key={d.usuario_id + d.rota}>
            <td className="border-b p-2">{d.nome}</td>
            <td className="border-b p-2">{d.perfil}</td>
            <td className="border-b p-2">{d.rota}
              {d.escopo && <span className="block text-muted-foreground">{d.escopo}</span>}
            </td>
            <td className="border-b p-2">{d.antes ? 'Permitido' : 'Bloqueado'}</td>
            <td className="border-b p-2">{d.depois ? 'Permitido' : 'Bloqueado'}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </div>}
    {(liberacao.estado !== 'ATRIBUICAO' || liberacao.permite_pausar) && <label className="block space-y-1">
      <span>Fundamento da alteração</span>
      <textarea value={fundamento} maxLength={1000} rows={2} onChange={e => setFundamento(e.target.value)}
        className="block w-full rounded border bg-background p-2" />
    </label>}
    {liberacao.estado === 'LEGADO' && liberacao.permite_pausar &&
      <p className="text-sm text-muted-foreground">Após a suspensão, a retomada exige uma nova prévia e atribuições vigentes.</p>}
    <div className="flex flex-wrap gap-2">
      {liberacao.estado !== 'ATRIBUICAO' && <Button type="button" disabled={!pronto || !comparacao}
        onClick={() => alterar.mutate('ATRIBUICAO')}>Ativar por atribuição</Button>}
      {liberacao.permite_pausar && liberacao.estado !== 'PAUSADO' && <Button type="button" variant="outline"
        disabled={!pronto} onClick={() => alterar.mutate('PAUSADO')}>Suspender escrita</Button>}
    </div>
    {alterar.isError && <p role="alert">{mensagem(alterar.error)}</p>}
    {alterar.isSuccess && <p role="status">Situação atualizada.</p>}
  </section>
}

export function LiberacaoAcessos() {
  const user = useAuthStore(s => s.user)
  const [acao, setAcao] = useState('')
  const consulta = useQuery({
    queryKey: ['liberacoes', user?.igreja_id, user?.sub],
    queryFn: autorizacaoApi.liberacoes,
    enabled: user?.perfil === 'ADMINISTRADOR',
  })
  const selecionada = consulta.data?.find(r => r.acao === acao)

  return <div className="space-y-4 rounded border p-4">
    <h2 className="text-lg font-semibold">Liberação de acessos</h2>
    {consulta.isPending && <p>Consultando operações…</p>}
    {consulta.isError && <p role="alert">{mensagem(consulta.error)}</p>}
    {consulta.isSuccess && <label className="block space-y-1">
      <span>Operação nesta igreja</span>
      <select value={acao} onChange={e => setAcao(e.target.value)} className="block w-full rounded border bg-background p-2 sm:max-w-md">
        <option value="">Selecione a operação</option>
        {consulta.data.map(r => <option key={r.acao} value={r.acao}>{r.rotulo}</option>)}
      </select>
    </label>}
    {selecionada && <Operacao key={selecionada.acao} liberacao={selecionada} />}
  </div>
}
