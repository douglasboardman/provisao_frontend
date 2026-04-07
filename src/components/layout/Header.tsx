import { Search, Bell, Menu } from "lucide-react"

export function Header() {
  return (
    <header className="h-20 px-8 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-text-sub hover:text-text-main transition-colors">
          <Menu size={24} />
        </button>
        {/* Placeholder breadcrumb ou page title sync */}
        <div className="hidden md:flex flex-col">
          <span className="text-xs font-semibold text-text-sub uppercase tracking-wider font-sans">Bem Vindo</span>
          <h2 className="font-heading font-medium text-lg text-text-main">Acesso de Gestão</h2>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub group-focus-within:text-purple transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Buscar lançamentos, pessoas..."
            className="h-10 pl-10 pr-4 rounded-xl bg-page border-transparent focus:bg-white focus:border-purple focus:ring-4 focus:ring-purple/10 outline-none transition-all w-[300px] text-sm font-sans"
          />
        </div>

        <button className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-page transition-colors text-text-sub hover:text-purple">
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-despesa ring-2 ring-card"></span>
        </button>
      </div>
    </header>
  )
}
