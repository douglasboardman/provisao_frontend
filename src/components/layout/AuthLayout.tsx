import { NavLink, Outlet } from 'react-router'
import fundo from '../../assets/fundo.png'

const linkBase =
  'text-xs font-semibold uppercase tracking-widest transition-colors pb-1'
const linkActive = `${linkBase} border-b-2 border-[#6a489b] text-[#6a489b]`
const linkInactive = `${linkBase} text-gray-400 hover:text-gray-600 border-b-2 border-transparent`

export function AuthLayout() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        backgroundImage: `url(${fundo})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Nav superior */}
      <nav className="flex justify-center gap-6 sm:gap-16 pt-8">
        <NavLink
          to="/sobre"
          className={({ isActive }) => (isActive ? linkActive : linkInactive)}
        >
          Sobre
        </NavLink>
        <NavLink
          to="/register"
          className={({ isActive }) => (isActive ? linkActive : linkInactive)}
        >
          Registre-se
        </NavLink>
        <NavLink
          to="/login"
          className={({ isActive }) => (isActive ? linkActive : linkInactive)}
        >
          Log In
        </NavLink>
      </nav>

      {/* Conteúdo */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <Outlet />
      </div>
    </div>
  )
}
