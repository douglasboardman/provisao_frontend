import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { oficiaisApi } from '../../api/oficiais'
import { Button } from '../../components/ui/button'
import { formatarDataCivil } from '../../lib/membresia-temporal'

export function HistoricoIndicacoes({ identidade, oficial }: { identidade: string; oficial?: string }) {
  const [aberto, abrir] = useState(false)
  const [paginas, mudar] = useState<string[]>([])
  const cursor = paginas[paginas.length - 1]
  const q = useQuery({ queryKey: ['oficiais', identidade, 'indicacoes-historicas', oficial, cursor], queryFn: () => oficiaisApi.historicoIndicacoes(oficial, cursor), enabled: aberto, gcTime: 0 })
  return <section className="space-y-2"><Button type="button" variant="outline" aria-expanded={aberto} onClick={() => abrir(!aberto)}>Histórico de indicações</Button>
    {aberto && (q.isPending ? <p>Carregando indicações…</p> : q.isError ? <p role="alert">Falha ao consultar o histórico.</p> : <>
      {!q.data.itens.length && <p>Nenhuma indicação registrada.</p>}
      {q.data.itens.map(i => <p key={i.id}>{i.pessoa.nome_completo} · {i.oficio === 'DIACONO' ? 'Diácono' : 'Presbítero regente'} · Assembleia de {formatarDataCivil(i.data_assembleia)}
        {' · '}{i.mandato ? 'convertida em mandato' : 'indicação registrada'} · <a className="underline" href={`/secretaria/${i.ata_conselho.contexto_id}/documentos/${i.ata_conselho.documento_id}?versao=${i.ata_conselho.id}`}>Abrir ata da indicação</a></p>)}
      {!!paginas.length && <Button variant="outline" onClick={() => mudar(paginas.slice(0,-1))}>Indicações anteriores</Button>}
      {q.data.proximo_cursor && <Button variant="outline" onClick={() => mudar([...paginas, q.data.proximo_cursor!])}>Mais indicações</Button>}
    </>)}</section>
}
