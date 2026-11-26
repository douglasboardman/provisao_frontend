export function normalizarBusca(texto: string) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g, ' ')
}

export function correspondeBusca(termo: string, ...campos: (string | null | undefined)[]) {
  return termo.split(' ').every(parte => campos.some(campo => normalizarBusca(campo ?? '').includes(parte)))
}

export function correspondeCpf(termo: string, cpf?: string | null) {
  return /\d/.test(termo) && /^[\d.\s-]+$/.test(termo) && !!cpf &&
    cpf.replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
}
