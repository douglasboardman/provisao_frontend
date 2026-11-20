import * as Drawer from "@radix-ui/react-dialog"
import { useNavigate } from "react-router"
import { Menu, LogOut, User } from "lucide-react"
import { useAuthStore } from "../../stores/auth"
import { Avatar, AvatarFallback } from "../ui/avatar"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "../ui/dropdown-menu"

export function Header() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  async function handleLogout() {
    try { await logout() } catch { window.alert("Não foi possível encerrar a sessão. Tente novamente."); return }
    navigate("/login", { replace: true })
  }

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "?"

  return (
    <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b bg-white px-4 sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Drawer.Trigger asChild><button aria-label="Abrir menu" className="rounded-lg border p-2 text-purple lg:hidden"><Menu size={20} /></button></Drawer.Trigger>
        <span className="font-heading text-lg font-semibold">ProVisão</span>
        <span className="hidden border-l pl-3 text-sm text-muted-foreground sm:block">Gestão eclesiástica</span>
      </div>
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button aria-label="Menu da conta" className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-purple/20 transition-all">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-purple text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar><span className="hidden max-w-44 truncate pr-2 text-sm font-medium sm:inline">{user?.username}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user?.username}</p>
              <p className="text-xs text-muted-foreground">{user?.login}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/perfil")}>
              <User className="mr-2 h-4 w-4" />
              Meu perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
