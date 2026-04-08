import { SelectHTMLAttributes } from 'react';

interface Option {
  value: string | number;
  label: string;
}

interface AsyncSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: Option[];
  loading?: boolean;
  error?: string;
  label?: string;
}

export function AsyncSelect({
  options,
  loading = false,
  error,
  label,
  className = '',
  ...props
}: AsyncSelectProps) {
  return (
    <div className="flex flex-col space-y-1.5 w-full">
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <select
        className={`flex h-10 w-full items-center justify-between rounded-md border ${error ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${className}`}
        disabled={loading || props.disabled}
        {...props}
      >
        {/* Opção vazia SELECCIONÁVEL — permite o utilizador escolher "nenhum" */}
        <option value="">
          {loading ? 'Carregando...' : 'Selecione uma opção'}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-destructive mt-1">{error}</span>}
    </div>
  );
}
