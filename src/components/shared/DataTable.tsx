import { useState, useMemo, type ReactNode } from "react"
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

export interface Column<T> {
  key: string
  header: string
  render?: (item: T) => ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (item: T) => void
  actions?: (item: T) => ReactNode
  keyExtractor: (item: T) => string | number
  pageSize?: number
  pageResetKey?: string
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  actions,
  keyExtractor,
  pageSize: initialPageSize = 10,
  pageResetKey,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [previousPageResetKey, setPreviousPageResetKey] = useState(pageResetKey)
  const [pageSize, setPageSize] = useState(initialPageSize)

  if (previousPageResetKey !== pageResetKey) {
    setPreviousPageResetKey(pageResetKey)
    setCurrentPage(1)
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortKey]
        const bVal = (b as Record<string, unknown>)[sortKey]
        const cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""), "pt-BR")
        return sortDir === "asc" ? cmp : -cmp
      })
    : data

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, safePage, pageSize])

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left font-medium text-muted-foreground ${col.sortable ? "cursor-pointer select-none hover:text-foreground" : ""}`}
                  scope="col" aria-sort={col.sortable ? (sortKey !== col.key ? 'none' : sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {col.sortable ? <button className="flex items-center gap-1" onClick={() => handleSort(col.key)}>{col.header}
                    {sortKey === col.key && (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </button> : col.header}
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={`border-b border-border last:border-0 transition-colors ${onRowClick ? "cursor-pointer hover:bg-muted/30" : ""}`}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={e => { if (onRowClick && e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onRowClick(item) } }}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {col.render
                      ? col.render(item)
                      : String((item as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">{actions(item)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center justify-between px-1 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <span>Registros por página:</span>
            <select
              aria-label="Registros por página"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="tabular-nums">
              {Math.min((safePage - 1) * pageSize + 1, sorted.length)}–{Math.min(safePage * pageSize, sorted.length)} de {sorted.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              aria-label="Primeira página"
              onClick={() => setCurrentPage(1)}
              disabled={safePage <= 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              aria-label="Página anterior"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 tabular-nums">
              {safePage} / {totalPages}
            </span>
            <button
              aria-label="Próxima página"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight size={16} />
            </button>
            <button
              aria-label="Última página"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage >= totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
