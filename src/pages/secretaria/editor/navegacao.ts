import { useLocation, useNavigate } from 'react-router'

export function caminhoEditor(contexto: string, entidade: 'modelos' | 'documentos', id = 'novo', parametros?: Record<string, string>) {
  const busca = new URLSearchParams(parametros).toString()
  return '/secretaria/' + encodeURIComponent(contexto) + '/editor/' + entidade + '/' + encodeURIComponent(id) + (busca ? '?' + busca : '')
}

export function useAbrirEditor(contexto: string) {
  const navegar = useNavigate()
  const origem = useLocation()
  return (entidade: 'modelos' | 'documentos', id?: string, parametros?: Record<string, string>) =>
    navegar(caminhoEditor(contexto, entidade, id, parametros), {
      state: { origem: origem.pathname + origem.search, estadoOrigem: origem.state },
    })
}
