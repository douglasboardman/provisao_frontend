import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import * as Drawer from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function AppLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const close = () => { if (desktop.matches) setOpen(false) }
    desktop.addEventListener('change', close)
    return () => desktop.removeEventListener('change', close)
  }, [])
  return <Drawer.Root open={open} onOpenChange={setOpen}>
    <div className="app-shell flex h-dvh overflow-hidden bg-background">
      <a className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3" href="#conteudo">Ir para o conteúdo</a>
      <div className="hidden lg:block"><Sidebar /></div>
      <div className="app-shell-body flex min-w-0 flex-1 flex-col">
        <Header />
        <main key={pathname} id="conteudo" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto">
          <div className="app-content"><Suspense fallback={<p role="status">Carregando página…</p>}><Outlet /></Suspense></div>
        </main>
      </div>
    </div>
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-40 bg-black/45" />
      <Drawer.Content aria-describedby={undefined} className="fixed inset-y-0 left-0 z-50 max-w-[90vw]">
        <Drawer.Title className="sr-only">Navegação principal</Drawer.Title>
        <Sidebar onNavigate={() => setOpen(false)} />
        <Drawer.Close aria-label="Fechar menu" className="absolute top-6 right-3 rounded-lg p-2 text-white hover:bg-white/15"><X size={18} /></Drawer.Close>
      </Drawer.Content>
    </Drawer.Portal>
  </Drawer.Root>
}
