import { useState, useCallback } from "react"

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: "default" | "destructive"
}

let toastCount = 0
let addToastFn: ((toast: Omit<Toast, "id">) => void) | null = null

export function toast(props: Omit<Toast, "id">) {
  addToastFn?.(props)
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((props: Omit<Toast, "id">) => {
    const id = String(++toastCount)
    setToasts((prev) => [...prev, { ...props, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  addToastFn = addToast

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, toast: addToast, dismiss }
}
