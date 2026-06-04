import { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Building2, Package, FolderOpen, Key, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const nav = [
  { to: '/',            label: 'Dashboard',     icon: LayoutDashboard, end: true },
  { to: '/orgs',        label: 'Organizations', icon: Building2 },
  { to: '/products',    label: 'Products',      icon: Package },
  { to: '/projects',    label: 'Projects',      icon: FolderOpen },
  { to: '/keys',        label: 'API Keys',      icon: Key },
  { to: '/settings',    label: 'Settings',      icon: Settings },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { logout } = useAuth()
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-gray-200">
          <span className="font-semibold text-gray-900 text-sm tracking-tight">API Key Platform</span>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 px-5 py-4 text-sm text-gray-500 hover:text-gray-900 border-t border-gray-200 transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
