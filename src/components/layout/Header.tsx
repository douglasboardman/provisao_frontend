import { useNavigate } from "react-router"
import { Search, Bell, Menu, LogOut, User } from "lucide-react"
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
    <header className="h-20 px-8 flex items-center justify-between border-b border-border bg-white z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-muted-foreground hover:text-foreground transition-colors">
          <Menu size={24} />
        </button>
        <div className="hidden md:flex flex-col">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-sans">Bem Vindo</span>
          <h2 className="font-heading font-medium text-lg">{user?.username ?? "Usuário"}</h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative group hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-purple transition-colors" size={18} />
          <input
            type="text"
            placeholder="Buscar lançamentos, pessoas..."
            className="h-10 pl-10 pr-4 rounded-xl bg-background border-transparent focus:bg-card focus:border-purple focus:ring-4 focus:ring-purple/10 outline-none transition-all w-[300px] text-sm font-sans"
          />
        </div>

        <button className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-purple">
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-destructive ring-2 ring-card"></span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-purple/20 transition-all">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-purple text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user?.username}</p>
              <p className="text-xs text-muted-foreground">{user?.login}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
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
