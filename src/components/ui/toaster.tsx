import { useToast } from "./use-toast"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "rounded-[var(--radius)] border bg-card p-4 shadow-lg animate-in slide-in-from-bottom-5 fade-in-0",
            t.variant === "destructive" && "border-destructive bg-destructive/5",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className={cn(
                "text-sm font-semibold",
                t.variant === "destructive" && "text-destructive",
              )}>
                {t.title}
              </p>
              {t.description && (
                <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-sm opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
