import { Outlet } from "react-router"

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-[1rem] bg-card p-8 shadow-sm ring-1 ring-border">
        <Outlet />
      </div>
    </div>
  )
}
