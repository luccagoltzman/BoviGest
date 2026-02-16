import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.scss'

const menu = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/compras', label: 'Compras de Gado' },
  { to: '/fornecedores', label: 'Fornecedores' },
  { to: '/processamento', label: 'Processamento / Estoque' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/vendas', label: 'Vendas' },
  { to: '/financeiro', label: 'Financeiro' },
  {
    label: 'Custos',
    children: [
      { to: '/custos/veiculos', label: 'Veículos' },
      { to: '/custos/viagens', label: 'Viagens' },
      { to: '/custos/abate', label: 'Abate' },
      { to: '/custos/operacionais', label: 'Operacionais' },
    ],
  },
  { to: '/relatorios', label: 'Relatórios' },
  { to: '/usuarios', label: 'Usuários' },
]

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>BoviGest</div>
      <nav className={styles.nav}>
        {menu.map((item) =>
          'children' in item ? (
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
