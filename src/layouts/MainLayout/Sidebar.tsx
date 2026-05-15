import { NavLink } from 'react-router-dom'
import { canAccessSettings, currentUserRole } from '@/config/access'
import styles from './Sidebar.module.scss'

type MenuItem =
  | { to: string; label: string; children?: never; requiresMaster?: boolean }
  | { label: string; children: { to: string; label: string }[]; to?: never; requiresMaster?: boolean }

const menu: MenuItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/compras', label: 'Compras de Gado (Ok)' },
  { to: '/fornecedores', label: 'Fornecedores (Ok)' },
  { to: '/processamento', label: 'Processamento / Estoque' },
  { to: '/visceras', label: 'Vísceras' },
  { to: '/clientes', label: 'Clientes (Ok)' },
  { to: '/vendas', label: 'Vendas' },
  { to: '/financeiro', label: 'Financeiro' },
  {
    label: 'Custos',
    children: [
      { to: '/custos/veiculos', label: 'Veículos' },
      { to: '/custos/viagens', label: 'Viagens (Ok)' },
      { to: '/custos/abate', label: 'Abate' },
      { to: '/custos/operacionais', label: 'Operacionais (Ok)' },
    ],
  },
  { to: '/relatorios', label: 'Relatórios' },
  { to: '/usuarios', label: 'Usuários' },
  { to: '/configuracoes', label: 'Configurações', requiresMaster: true },
]

function hasChildren(item: MenuItem): item is Extract<MenuItem, { children: { to: string; label: string }[] }> {
  return Array.isArray(item.children)
}

export function Sidebar() {
  const visibleMenu = menu.filter((item) => !item.requiresMaster || canAccessSettings(currentUserRole))

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>BoviGest</div>
      <nav className={styles.nav}>
        {visibleMenu.map((item) =>
          hasChildren(item) ? (
            <div key={item.label} className={styles.group}>
              <span className={styles.groupLabel}>{item.label}</span>
              {item.children.map((child) => (
                <NavLink
                  key={child.to}
                  to={child.to}
                  className={({ isActive }) =>
                    [styles.link, styles.sublink, isActive && styles.active].filter(Boolean).join(' ')
                  }
                >
                  {child.label}
                </NavLink>
              ))}
            </div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [styles.link, isActive && styles.active].filter(Boolean).join(' ')
              }
            >
              {item.label}
            </NavLink>
          )
        )}
      </nav>
    </aside>
  )
}
