import { PainelLocal, SecaoPainel } from '../../components/shared/Painel'
import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { gestaoOrgaosApi, type DetalheOrgao } from '../../api/orgaos'
import { pessoasApi } from '../../api/pessoas'
import { ApiRequestError } from '../../api/client'
import { Button } from '../../components/ui/button'
import { useIdempotencia } from './useIdempotencia'
import { useHojeIgreja } from './RelogioIgreja'

const classe = 'block w-full rounded border bg-background p-2'
export function ManutencaoOrgao({ orgao, identidade }: { orgao: DetalheOrgao['orgao']; identidade: string }) {
  const [modo, setModo] = useState<'cadastro' | 'conducao' | null>(null)
  const hoje = useHojeIgreja(), chave = useIdempotencia(), client = useQueryClient()
  const pessoas = useQuery({ queryKey: ['orgaos', identidade, 'pessoas'], queryFn: pessoasApi.list, enabled: modo === 'conducao', gcTime: 0 })
  const salvar = useMutation({ mutationFn: (form: HTMLFormElement) => {
    const dados = new FormData(form), texto = (nome: string) => String(dados.get(nome) ?? '').trim()
    const ato = { autoridade: texto('autoridade'), evidencia: texto('evidencia') }
    if (modo === 'cadastro') {
      const corpo = { ...ato, nome: texto('nome'), sigla: texto('sigla') || null, finalidade: texto('finalidade') }
      return gestaoOrgaosApi.manter(orgao.id, { ...corpo, idempotencia: chave.obter({ orgao: orgao.id, modo, corpo }) })
    }
    const corpo = { ...ato, pessoa_id: texto('pessoa'), referencia: texto('referencia'), data_reuniao: texto('data'), motivo: texto('motivo'), modalidade: texto('modalidade') as 'MEMBRO_CONSELHO' | 'CONVIDADO', fundamento: texto('fundamento'), limites_pauta: texto('limites'), ratificacao_pendente: dados.has('ratificacao') }
    return gestaoOrgaosApi.conducao(orgao.id, { ...corpo, idempotencia: chave.obter({ orgao: orgao.id, modo, corpo }) })
  }, onSuccess: async () => { chave.limpar(); setModo(null); await client.invalidateQueries({ queryKey: ['orgaos', identidade] }) } })
  return <PainelLocal><div className="space-y-3">
    <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => { salvar.reset(); setModo('cadastro') }}>Editar cadastro do órgão</Button>{orgao.tipo === 'CONSELHO' && <Button type="button" variant="outline" onClick={() => { salvar.reset(); setModo('conducao') }}>Registrar condução excepcional</Button>}</div>
    {salvar.isSuccess && <p role="status">Ato registrado com histórico e responsáveis.</p>}
    {modo && <SecaoPainel titulo={modo === 'cadastro' ? 'Manutenção do cadastro' : 'Condução excepcional de reunião'} voltar={() => setModo(null)} ocupado={salvar.isPending}>
      <form key={modo} className="max-w-xl space-y-3" onSubmit={e => { e.preventDefault(); salvar.mutate(e.currentTarget) }}>
      {modo === 'cadastro' ? <><label className="block">Nome do órgão<input className={classe} name="nome" defaultValue={orgao.nome} maxLength={255} required /></label><label className="block">Sigla<input className={classe} name="sigla" defaultValue={orgao.sigla ?? ''} maxLength={40} /></label><label className="block">Finalidade<textarea className={classe} name="finalidade" defaultValue={orgao.finalidade} maxLength={1000} required /></label><p>O criador, o instituidor e os atos anteriores permanecem no histórico.</p></> : <><p>A condução vale apenas para a reunião identificada. Registre a substituição por membro do Conselho ou o convidado externo representado por cadastro local. O ato não concede presidência institucional ou gestão de unidades.</p><label className="block">Modalidade<select className={classe} name="modalidade"><option value="MEMBRO_CONSELHO">Membro do Conselho em exercício</option><option value="CONVIDADO">Convidado externo autorizado</option></select></label><label className="block">Fundamento da substituição<input className={classe} name="fundamento" required maxLength={1000} /></label><label className="block">Limitações de pauta<input className={classe} name="limites" required maxLength={1000} /></label><label className="block"><input type="checkbox" name="ratificacao" /> Ratificação pendente</label><label className="block">Quem conduziu a reunião<SeletorPessoa rotulo="Quem conduziu a reunião" name="pessoa" required opcoes={pessoas.data?.map(p => ({ id: p.id, nome: p.nome_completo }))} /></label>{pessoas.isError && <p role="alert">Não foi possível consultar as pessoas.</p>}<label className="block">Identificação da reunião<input className={classe} name="referencia" maxLength={255} required /></label><label className="block">Data da reunião<input className={classe} name="data" type="date" defaultValue={hoje} max={hoje} required /></label><label className="block">Motivo da condução excepcional<textarea className={classe} name="motivo" maxLength={1000} required /></label></>}
      <label className="block">Autoridade do ato<input className={classe} name="autoridade" maxLength={255} required /></label><label className="block">Evidência do ato<input className={classe} name="evidencia" maxLength={1000} required /></label>
      {salvar.isError && <p role="alert">{salvar.error instanceof ApiRequestError ? salvar.error.messages.join(' ') : 'Não foi possível registrar o ato.'}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={salvar.isPending || (modo === 'conducao' && (pessoas.isPending || pessoas.isError))}>Registrar manutenção</Button></div>
    </form>
    </SecaoPainel>}
  </div></PainelLocal>
}
