import { useEffect, useId, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '../ui/input'
import { normalizarBusca } from '../../lib/busca'

type Opcao = { id: string; nome: string }
type Props = {
  opcoes?: Opcao[]
  value?: string
  onChange?: (id: string) => void
  onBusca?: (texto: string) => void
  id?: string
  name?: string
  rotulo?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  carregando?: boolean
}

export function SeletorPessoa({
  opcoes = [],
  value,
  onChange,
  onBusca,
  id,
  name,
  rotulo,
  placeholder = 'Digite parte do nome',
  required,
  disabled,
  carregando,
}: Props) {
  const lista = useId()
  const [escolhida, setEscolhida] = useState<Opcao | null>(null)
  const [consulta, setConsulta] = useState<string | null>(null)
  const [aberta, setAberta] = useState(false)
  const [indice, setIndice] = useState(-1)
  const input = useRef<HTMLInputElement>(null)
  const selecionado = value ?? escolhida?.id ?? ''
  const nome =
    opcoes.find((o) => o.id === selecionado)?.nome ??
    (onBusca && escolhida && escolhida.id === selecionado ? escolhida.nome : '')
  const filtro = normalizarBusca(consulta ?? '')
  const visiveis = opcoes.filter((o) => normalizarBusca(o.nome).includes(filtro))
  const ativo = indice >= 0 && indice < visiveis.length ? indice : -1
  useEffect(() => {
    if (aberta && ativo >= 0) document.getElementById(`${lista}-${ativo}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [aberta, ativo, lista])
  useEffect(() => {
    input.current?.setCustomValidity(consulta ? 'Selecione um nome da lista.' : '')
  }, [consulta])
  function fechar() {
    setConsulta(null)
    setAberta(false)
    setIndice(-1)
  }
  function escolher(opcao: Opcao) {
    setEscolhida(opcao)
    onChange?.(opcao.id)
    fechar()
  }
  return (
    <div className="min-w-0 flex-1">
      {name && <input type="hidden" name={name} value={selecionado} disabled={disabled} />}
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
        <Input
          ref={input}
          id={id}
          aria-label={rotulo}
          className="pl-9"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={aberta}
          aria-controls={aberta ? lista : undefined}
          aria-activedescendant={aberta && ativo >= 0 ? `${lista}-${ativo}` : undefined}
          autoComplete="off"
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          value={consulta ?? nome}
          onFocus={(e) => {
            setAberta(true)
            e.target.select()
          }}
          onClick={() => setAberta(true)}
          onBlur={fechar}
          onChange={(e) => {
            const texto = e.target.value
            if (!texto && selecionado) {
              setEscolhida(null)
              onChange?.('')
            }
            setConsulta(texto)
            setAberta(true)
            setIndice(-1)
            onBusca?.(texto)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              setAberta(true)
              setIndice(e.key === 'ArrowDown' ? Math.min(ativo + 1, visiveis.length - 1) : Math.max(ativo - 1, 0))
            } else if (aberta && e.key === 'Enter') {
              e.preventDefault()
              const opcao = visiveis[ativo] ?? (visiveis.length === 1 ? visiveis[0] : undefined)
              if (opcao) escolher(opcao)
            } else if (aberta && e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              fechar()
            }
          }}
        />
      </div>
      {aberta && (
        <div className="mt-1 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-sm">
          <ul role="listbox" id={lista} aria-label="Sugestões" className="max-h-44 overflow-y-auto">
            {visiveis.map((o, i) => (
              <li
                role="option"
                aria-selected={o.id === selecionado}
                key={o.id}
                id={`${lista}-${i}`}
                className={`cursor-pointer break-words px-3 py-2 text-sm hover:bg-accent ${i === ativo ? 'bg-accent' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault()
                  escolher(o)
                }}
              >
                {o.nome}
              </li>
            ))}
          </ul>
          {!visiveis.length && (
            <p role="status" className="px-3 py-2 text-sm text-muted-foreground">
              {carregando ? 'Buscando…' : 'Nenhum resultado encontrado.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
