import { ReactNode } from 'react';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  /** Número de linhas skeleton a exibir durante carregamento */
  skeletonRows?: number;
}

/** Linha de skeleton para estado de carregamento */
function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4 align-middle">
          <Skeleton className="h-4 w-full max-w-[240px]" />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  skeletonRows = 5,
}: DataTableProps<T>) {

  if (!loading && data.length === 0) {
    return (
      <Card className="w-full text-center p-8 text-muted-foreground text-sm">
        {emptyMessage}
      </Card>
    );
  }

  return (
    <div className="w-full overflow-auto rounded-md border border-border">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ textAlign: col.align || 'left' }}
                className="h-12 px-4 align-middle font-medium text-muted-foreground"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {loading
            ? Array.from({ length: skeletonRows }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            : data.map((row) => (
                <tr key={keyExtractor(row)} className="border-b transition-colors hover:bg-muted/50">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{ textAlign: col.align || 'left' }}
                      className="p-4 align-middle"
                    >
                      {col.render ? col.render(row) : String((row as any)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
