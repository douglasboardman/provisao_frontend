import { Outlet } from "react-router"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

export function AppLayout() {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
