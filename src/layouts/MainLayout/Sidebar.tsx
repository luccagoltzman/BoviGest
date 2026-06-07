import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Beef,
  Calculator,
  ChevronDown,
  Layers,
  LayoutDashboard,
  Package,
  Receipt,
  Route,
  Scissors,
  Settings,
  Truck,
  UserCog,
  Users,
  Wallet,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import { AppLogo } from '@/components/AppLogo'
import { canAccessSettings, currentUserRole } from '@/config/access'
import styles from './Sidebar.module.scss'

type SidebarLink = {
  type: 'link'
  to: string
  label: string
  icon: LucideIcon
  requiresMaster?: boolean
}

type SidebarGroup = {
  type: 'group'
  label: string
  icon: LucideIcon
  children: { to: string; label: string; icon: LucideIcon }[]
}

type SidebarSection = {
  title: string
  entries: (SidebarLink | SidebarGroup)[]
}

type SidebarProps = {
  isOpen: boolean
  onNavigate: () => void
}

const sections: SidebarSection[] = [
  {
    title: 'Início',
    entries: [
      {
        type: 'link',
        to: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Operação',
    entries: [
      {
        type: 'link',
        to: '/compras',
        label: 'Compras de Gado',
        icon: Beef,
      },
      {
        type: 'link',
        to: '/fornecedores',
        label: 'Fornecedores',
        icon: Truck,
      },
      {
        type: 'link',
        to: '/processamento',
        label: 'Processamento / Estoque',
        icon: Package,
      },
      {
        type: 'link',
        to: '/visceras',
        label: 'Vísceras',
        icon: Layers,
      },
      {
        type: 'link',
        to: '/clientes',
        label: 'Clientes',
        icon: Users,
      },
      {
        type: 'link',
        to: '/vendas',
        label: 'Vendas',
        icon: Receipt,
      },
      {
        type: 'link',
        to: '/financeiro',
        label: 'Financeiro',
        icon: Wallet,
      },
      {
        type: 'group',
        label: 'Custos',
        icon: Calculator,
        children: [
          { to: '/custos/viagens', label: 'Viagens', icon: Route },
          { to: '/custos/abate', label: 'Abate', icon: Scissors },
          {
            to: '/custos/operacionais',
            label: 'Operacionais',
            icon: Wrench,
          },
        ],
      },
    ],
  },
  {
    title: 'Sistema',
    entries: [
      {
        type: 'link',
        to: '/relatorios',
        label: 'Relatórios',
        icon: BarChart3,
      },
      {
        type: 'link',
        to: '/usuarios',
        label: 'Usuários',
        icon: UserCog,
      },
      {
        type: 'link',
        to: '/configuracoes',
        label: 'Configurações',
        icon: Settings,
        requiresMaster: true,
      },
    ],
  },
]

function isGroup(entry: SidebarLink | SidebarGroup): entry is SidebarGroup {
  return entry.type === 'group'
}

function NavItemLink({
  to,
  label,
  icon: Icon,
  onNavigate,
}: {
  to: string
  label: string
  icon: LucideIcon
  onNavigate: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        [styles.link, isActive && styles.active].filter(Boolean).join(' ')
      }
      title={label}
    >
      <Icon className={styles.linkIcon} aria-hidden />
      <span className={styles.linkLabel}>{label}</span>
    </NavLink>
  )
}

function NavItemGroup({
  item,
  onNavigate,
}: {
  item: SidebarGroup
  onNavigate: () => void
}) {
  const location = useLocation()
  const childActive = item.children.some((child) =>
    location.pathname.startsWith(child.to),
  )
  const [open, setOpen] = useState(childActive)

  useEffect(() => {
    if (childActive) setOpen(true)
  }, [childActive])

  const GroupIcon = item.icon

  return (
    <div className={[styles.group, open && styles.groupOpen].join(' ')}>
      <button
        type="button"
        className={[
          styles.link,
          styles.groupToggle,
          childActive && styles.groupActive,
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <GroupIcon className={styles.linkIcon} aria-hidden />
        <span className={styles.linkLabel}>{item.label}</span>
        <ChevronDown className={styles.chevron} aria-hidden />
      </button>

      <div className={styles.groupItems}>
        <div className={styles.groupItemsInner}>
          {item.children.map((child) => {
            const ChildIcon = child.icon

            return (
              <NavLink
                key={child.to}
                to={child.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  [styles.link, styles.sublink, isActive && styles.active]
                    .filter(Boolean)
                    .join(' ')
                }
                title={child.label}
              >
                <ChildIcon className={styles.linkIcon} aria-hidden />
                <span className={styles.linkLabel}>{child.label}</span>
              </NavLink>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ isOpen, onNavigate }: SidebarProps) {
  const visibleSections = sections
    .map((section) => ({
      ...section,
      entries: section.entries.filter(
        (entry) =>
          entry.type !== 'link' ||
          !entry.requiresMaster ||
          canAccessSettings(currentUserRole),
      ),
    }))
    .filter((section) => section.entries.length > 0)

  return (
    <aside
      className={[styles.sidebar, isOpen && styles.open]
        .filter(Boolean)
        .join(' ')}
      aria-label="Menu principal"
    >
      <div className={styles.logoRow}>
        <div className={styles.logo}>
          <AppLogo variant="sidebar" />
        </div>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onNavigate}
          aria-label="Fechar menu"
        >
          <X aria-hidden />
        </button>
      </div>

      <nav className={styles.nav}>
        {visibleSections.map((section) => (
          <div key={section.title} className={styles.section}>
            <span className={styles.sectionTitle}>{section.title}</span>
            <div className={styles.sectionLinks}>
              {section.entries.map((entry) =>
                isGroup(entry) ? (
                  <NavItemGroup
                    key={entry.label}
                    item={entry}
                    onNavigate={onNavigate}
                  />
                ) : (
                  <NavItemLink
                    key={entry.to}
                    to={entry.to}
                    label={entry.label}
                    icon={entry.icon}
                    onNavigate={onNavigate}
                  />
                ),
              )}
            </div>
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <span className={styles.footerLabel}>BoviGest</span>
        <span className={styles.footerHint}>Gestão de gado e carne</span>
      </div>
    </aside>
  )
}
