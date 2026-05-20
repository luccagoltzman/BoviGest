import { useNavigate } from 'react-router-dom'
import { AuthService } from '@/services/auth.service'
import styles from './Header.module.scss'

type HeaderProps = {
  menuOpen: boolean
  onMenuToggle: () => void
}

export function Header({ menuOpen, onMenuToggle }: HeaderProps) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await AuthService.logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className={styles.header}>
      <div className={styles.leading}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={onMenuToggle}
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={styles.heading}>
          <span className={styles.eyebrow}>Sistema de Gestão</span>
          <h1 className={styles.title}>
            Compra de Gado & Distribuição de Carne
          </h1>
        </div>
      </div>

      <div className={styles.actions}>
        <div className={styles.userBox}>
          <span className={styles.userInitials}>BG</span>
          <div className={styles.userMeta}>
            <strong>Administrador</strong>
            <small>Operação ativa</small>
          </div>
        </div>
        <button
          type="button"
          className={styles.logoutButton}
          onClick={handleLogout}
        >
          Sair
        </button>
      </div>
    </header>
  )
}
