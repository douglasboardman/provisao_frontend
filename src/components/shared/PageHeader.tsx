import { Plus } from "lucide-react"

interface PageHeaderProps {
  title: string
  subtitle?: string
  totalCount?: number
  onNew?: () => void
  newButtonLabel?: string
}

export function PageHeader({ title, subtitle, totalCount, onNew, newButtonLabel = "Novo" }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-heading font-bold text-3xl text-text-main tracking-tight">
            {title}
          </h1>
          {totalCount !== undefined && (
            <span className="bg-purple-muted text-purple text-xs font-bold px-2.5 py-1 rounded-full font-sans">
              {totalCount} registro{totalCount !== 1 && 's'}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-text-sub font-sans">{subtitle}</p>
        )}
      </div>

      {onNew && (
        <button 
          onClick={onNew}
          className="bg-lime hover:bg-[#b0c03c] text-black font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all focus:ring-4 focus:ring-lime/30 flex items-center gap-2 font-sans hover:-translate-y-0.5 cursor-pointer"
        >
          <Plus size={18} strokeWidth={2.5} />
          {newButtonLabel}
        </button>
      )}
    </div>
  )
}
