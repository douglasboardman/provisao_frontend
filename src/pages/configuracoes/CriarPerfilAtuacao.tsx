import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { autorizacaoApi, type RequisitoPerfil, type Servico } from '../../api/autorizacao'
import { ApiRequestError } from '../../api/client'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { useAuthStore } from '../../stores/auth'

type OpcaoRequisito = { chave: string; nome: string; requisito: RequisitoPerfil }

export function CriarPerfilAtuacao({ iniciais = [], criado }: {
  iniciais?: Servico[]; criado?: (id: string) => void
}) {
  const [nome, nomear] = useState('')
  const [escolha, escolher] = useState('')
  const [atribuicoes, definirAtribuicoes] = useState<OpcaoRequisito[]>([])
  const seletor = useRef<HTMLSelectElement>(null)
  const [busca, buscar] = useState('')
  const [acoes, selecionar] = useState(iniciais)
  const [fundamento, justificar] = useState('')
  const ator = useAuthStore(s => s.user)
  const cache = useQueryClient()
  const opcoes = useQuery({ queryKey: ['autorizacao', ator?.igreja_id, ator?.sub, 'opcoes-perfis'], queryFn: autorizacaoApi.opcoesPerfisAtuacao })
  const salvar = useMutation({
    mutationFn: (selecionadas: Servico[]) =>
      autorizacaoApi.salvarPerfilAtuacao(nome, atribuicoes.map(a => a.requisito), selecionadas, fundamento),
    onSuccess: async modelo => {
      nomear('')
      escolher('')
      definirAtribuicoes([])
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
  const opcoesCargos: OpcaoRequisito[] = cargos.map(({ id, nome }) => ({ chave: 'cargo:' + id, nome, requisito: { tipo: 'cargo', id } }))
  const opcoesOficios: OpcaoRequisito[] = oficios.map(({ oficio, nome }) => ({ chave: 'oficio:' + oficio, nome, requisito: { tipo: 'oficio', oficio } }))
  const adicionados = new Set(atribuicoes.map(a => a.chave))
  const opcao = [...opcoesCargos, ...opcoesOficios].find(a => a.chave === escolha && !adicionados.has(a.chave))
  const selecionadas = acoes.filter(acao => catalogo.some(s => s.acao === acao))
  const visiveis = catalogo.filter(s => s.rotulo.toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR')))
  const pronto = nome.trim() && atribuicoes.length > 0 && selecionadas.length > 0 && fundamento.trim() && !salvar.isPending

  return <form onSubmit={e => {
    e.preventDefault()
    if (!pronto) return
    salvar.mutate(selecionadas)
  }}>
    <fieldset disabled={salvar.isPending} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block min-w-0 space-y-1 text-sm font-medium">
          <span>Nome do perfil</span>
          <Input value={nome} maxLength={100} placeholder="Ex.: Perfil Secretário" onChange={e => nomear(e.target.value)}/>
        </label>
        <div className="flex min-w-0 items-end gap-2">
          <label className="block min-w-0 flex-1 space-y-1 text-sm font-medium">
            <span>Mandato ou cargo exigido</span>
            <select ref={seletor} className="h-10 w-full rounded-md border border-input bg-card px-3" value={escolha} onChange={e => escolher(e.target.value)}>
              <option value="">Selecione o requisito</option>
              <optgroup label="Cargos do Conselho e da Junta">
                {opcoesCargos.map(o => <option key={o.chave} value={o.chave} disabled={adicionados.has(o.chave)}>{o.nome}</option>)}
              </optgroup>
              <optgroup label="Mandatos e vínculo pastoral">
                {opcoesOficios.map(o => <option key={o.chave} value={o.chave} disabled={adicionados.has(o.chave)}>{o.nome}</option>)}
              </optgroup>
            </select>
          </label>
          <Button type="button" variant="outline" disabled={!opcao} onClick={() => {
            if (!opcao) return
            definirAtribuicoes([...atribuicoes, opcao])
            escolher('')
            seletor.current?.focus()
          }}>Adicionar</Button>
        </div>
      </div>
      <div className="flex items-start gap-3 text-sm">
        <span className="shrink-0 font-medium">Atribuições:</span>
        <div className="min-w-0 flex-1" aria-live="polite">
          {atribuicoes.length ? <ul className="flex flex-wrap items-start gap-2">
            {atribuicoes.map(a => <li key={a.chave} className="max-w-full">
              <Badge variant="secondary" className="gap-1.5 py-1 pr-1.5">
                <span className="min-w-0 break-words">{a.nome}</span>
                <button type="button" className="inline-grid size-6 shrink-0 place-items-center rounded-full hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={'Remover ' + a.nome} onClick={() => {
                    definirAtribuicoes(atribuicoes.filter(r => r.chave !== a.chave))
                    seletor.current?.focus()
                  }}><X size={14} aria-hidden="true"/></button>
              </Badge>
            </li>)}
          </ul> : <span className="text-muted-foreground">Nenhuma atribuição adicionada.</span>}
        </div>
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
