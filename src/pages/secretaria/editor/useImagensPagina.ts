import { useEffect, useRef, useState } from 'react'
import { secretariaApi } from '../../../api/secretaria'

export function useImagensPagina(resolver?: (id: string) => string) {
  const chaves = useRef(new WeakMap<File, string>())
  const urls = useRef(new Map<string, string>())
  const [enviando, setEnviando] = useState(false)
  useEffect(() => {
    const temporarias = urls.current
    return () => {
      temporarias.forEach(url => URL.revokeObjectURL(url))
      temporarias.clear()
    }
  }, [])
  async function enviar(file: File, signal: AbortSignal) {
    setEnviando(true)
    try {
      const chave = chaves.current.get(file) ?? crypto.randomUUID()
      chaves.current.set(file, chave)
      const arquivo = await secretariaApi.enviarImagem(file, chave, signal)
      signal.throwIfAborted()
      urls.current.set(arquivo.id, URL.createObjectURL(file))
      return arquivo.id
    } finally { setEnviando(false) }
  }
  return { enviando, enviar, url: (id: string) => urls.current.get(id) ?? resolver?.(id) }
}
