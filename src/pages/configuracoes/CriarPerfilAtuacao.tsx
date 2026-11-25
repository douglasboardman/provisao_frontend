import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { autorizacaoApi, type RequisitoPerfil, type Servico } from '../../api/autorizacao'
import { ApiRequestError } from '../../api/client'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { useAuthStore } from '../../stores/auth'

export function CriarPerfilAtuacao({ iniciais = [], criado }: {
  iniciais?: Servico[]; criado?: (id: string) => void
}) {
  const [nome, nomear] = useState('')
  const [requisito, definirRequisito] = useState('')
  const [busca, buscar] = useState('')
  const [acoes, selecionar] = useState(iniciais)
  const [fundamento, justificar] = useState('')
  const ator = useAuthStore(s => s.user)
  const cache = useQueryClient()
  const opcoes = useQuery({ queryKey: ['autorizacao', ator?.igreja_id, ator?.sub, 'opcoes-perfis'], queryFn: autorizacaoApi.opcoesPerfisAtuacao })
  const salvar = useMutation({
    mutationFn: ({ criterio, selecionadas }: { criterio: RequisitoPerfil; selecionadas: Servico[] }) =>
      autorizacaoApi.salvarPerfilAtuacao(nome, criterio, selecionadas, fundamento),
    onSuccess: async modelo => {
      nomear('')
      definirRequisito('')
      buscar('')
      selecionar([])
      justificar('')
      await cache.invalidateQueries({ queryKey: ['autorizacao'] })
      criado?.(modelo.id)
    },
  })
  if (opcoes.isPending) return <p role="status">Carregando cargos e permissões…</p>
  if (opcoes.isError) return <p role="alert">Não foi possível carregar cargos e permissões.</p>
  const { cargos, oficios, catalogo } = opcoes.data
  const [tipo, id] = requisito.split(':')
  const selecionadas = acoes.filter(acao => catalogo.some(s => s.acao === acao))
  const visiveis = catalogo.filter(s => s.rotulo.toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR')))
  const pronto = nome.trim() && requisito && selecionadas.length > 0 && fundamento.trim() && !salvar.isPending

  return <form onSubmit={e => {
    e.preventDefault()
    if (!pronto) return
    const criterio: RequisitoPerfil = tipo === 'cargo' ? { tipo, id } : { tipo: 'oficio', oficio: id }
    salvar.mutate({ criterio, selecionadas })
  }}>
    <fieldset disabled={salvar.isPending} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block min-w-0 space-y-1 text-sm font-medium">
          <span>Nome do perfil</span>
          <Input value={nome} maxLength={100} placeholder="Ex.: Perfil Secretário" onChange={e => nomear(e.target.value)}/>
        </label>
        <label className="block min-w-0 space-y-1 text-sm font-medium">
          <span>Mandato ou cargo exigido</span>
          <select className="h-10 w-full rounded-md border border-input bg-card px-3" value={requisito} onChange={e => definirRequisito(e.target.value)}>
            <option value="">Selecione o requisito</option>
            <optgroup label="Cargos do Conselho e da Junta">
              {cargos.map(c => <option key={c.id} value={'cargo:' + c.id}>{c.nome}</option>)}
            </optgroup>
            <optgroup label="Mandatos e vínculo pastoral">
              {oficios.map(o => <option key={o.oficio} value={'oficio:' + o.oficio}>{o.nome}</option>)}
            </optgroup>
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-sm font-medium">
        <span>Buscar permissões</span><Input type="search" value={busca} onChange={e => buscar(e.target.value)}/>
      </label>
      <p className="text-sm text-muted-foreground" role="status">{selecionadas.length} {selecionadas.length === 1 ? 'permissão selecionada' : 'permissões selecionadas'}</p>
      <div className="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2" role="group" aria-label="Permissões do perfil">
        {visiveis.map(s => <label key={s.acao} className="flex items-start gap-2">
          <input className="mt-1 accent-purple" type="checkbox" checked={acoes.includes(s.acao)} onChange={e =>
            selecionar(e.target.checked ? [...acoes, s.acao] : acoes.filter(acao => acao !== s.acao))}/>{s.rotulo}
        </label>)}
        {!visiveis.length && <p className="text-muted-foreground">Nenhuma permissão encontrada.</p>}
      </div>
      <label className="block space-y-1 text-sm font-medium">
        <span>Fundamento do perfil</span><Input value={fundamento} maxLength={1000} onChange={e => justificar(e.target.value)}/>
      </label>
      {salvar.data && <p className="text-sm" role="status">Perfil “{salvar.data.nome}” salvo.</p>}
      {salvar.isError && <p role="alert" className="text-sm text-destructive">
        {salvar.error instanceof ApiRequestError ? salvar.error.messages.join(' ') : 'Não foi possível salvar o perfil.'}
      </p>}
      <Button disabled={!pronto}>{salvar.isPending ? 'Salvando…' : 'Salvar perfil'}</Button>
    </fieldset>
  </form>
}
