import * as React from "react"
import { cn } from "../../lib/utils"
import { formatCpf, formatCnpj, formatCep, unformat } from "../../lib/formatters"

type Mask = "cpf" | "cnpj" | "cep"

const maskFns: Record<Mask, (v: string) => string> = {
  cpf: formatCpf,
  cnpj: formatCnpj,
  cep: formatCep,
}

const maxLengths: Record<Mask, number> = {
  cpf: 14,
  cnpj: 18,
  cep: 9,
}

const placeholders: Record<Mask, string> = {
  cpf: "000.000.000-00",
  cnpj: "00.000.000/0000-00",
  cep: "00000-000",
}

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  mask: Mask
  value: string
  onValueChange: (raw: string, formatted: string) => void
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value, onValueChange, className, ...props }, ref) => {
    const format = maskFns[mask]
    const displayed = format(value)

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = unformat(e.target.value)
      onValueChange(raw, format(raw))
    }

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        maxLength={maxLengths[mask]}
        placeholder={placeholders[mask]}
        value={displayed}
        onChange={handleChange}
        className={cn(
          "flex h-10 w-full rounded-[var(--radius)] border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground font-mono",
          className,
        )}
        {...props}
      />
    )
  },
)
MaskedInput.displayName = "MaskedInput"

export { MaskedInput }
