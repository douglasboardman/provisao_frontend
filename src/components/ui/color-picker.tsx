import { useState } from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cn } from "../../lib/utils"

const PASTEL_PALETTE = [
  "#F8B4B4", "#F9C6A8", "#FDE68A", "#D9F99D", "#A7F3D0",
  "#99F6E4", "#A5F3FC", "#BAE6FD", "#C4B5FD", "#DDD6FE",
  "#F0ABFC", "#FBCFE8", "#FCA5A5", "#FDBA74", "#FCD34D",
  "#BEF264", "#6EE7B7", "#5EEAD4", "#67E8F9", "#7DD3FC",
  "#A78BFA", "#C084FC", "#E879F9", "#F472B6", "#E5E7EB",
  "#D1D5DB", "#9CA3AF", "#6B7280",
]

const STORAGE_KEY = "provisao:recent-colors"
const MAX_RECENT = 8

function getRecentColors(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function addRecentColor(color: string) {
  const recent = getRecentColors().filter((c) => c !== color)
  recent.unshift(color)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

interface ColorPickerProps {
  value?: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [recentColors, setRecentColors] = useState<string[]>(getRecentColors)

  function select(color: string) {
    onChange(color)
    addRecentColor(color)
    setRecentColors(getRecentColors())
    setOpen(false)
  }

  function clear() {
    onChange("")
    setOpen(false)
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 h-10 w-full rounded-[var(--radius)] border border-input bg-transparent px-3 py-2 text-sm",
            "hover:bg-muted transition-colors",
          )}
        >
          <div
            className="w-6 h-6 rounded-md border border-border shrink-0"
            style={{ backgroundColor: value || "transparent" }}
          />
          <span className={value ? "font-mono text-foreground" : "text-muted-foreground"}>
            {value || "Selecionar cor"}
          </span>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="top"
          align="start"
          sideOffset={4}
          className="z-[100] p-3 bg-popover border border-border rounded-[var(--radius)] shadow-lg w-[280px] space-y-3 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {recentColors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Recentes</p>
              <div className="flex gap-1.5 flex-wrap">
                {recentColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => select(c)}
                    className={cn(
                      "w-7 h-7 rounded-md border-2 transition-transform hover:scale-110",
                      value === c ? "border-ring ring-1 ring-ring" : "border-border",
                    )}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Paleta</p>
            <div className="grid grid-cols-7 gap-1.5">
              {PASTEL_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => select(c)}
                  className={cn(
                    "w-7 h-7 rounded-md border-2 transition-transform hover:scale-110",
                    value === c ? "border-ring ring-1 ring-ring" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-border">
            <span className="text-xs text-muted-foreground font-mono">{value || "nenhuma"}</span>
            <button
              type="button"
              onClick={clear}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpar
            </button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
