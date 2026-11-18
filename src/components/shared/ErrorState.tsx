import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "../ui/button"

interface ErrorStateProps {
  error: Error | null
  onRetry?: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle size={48} className="text-destructive/60 mb-4" />
      <h3 className="text-lg font-medium mb-1">Erro ao carregar dados</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-1">
        {error?.message || "Erro desconhecido"}
      </p>
      {error && "statusCode" in error && (
        <p className="text-xs text-muted-foreground/70 font-mono mb-4">
          HTTP {(error as { statusCode: number }).statusCode}
        </p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          <RefreshCw size={14} className="mr-2" />
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
