import { useNavigate } from 'react-router-dom'
import { AuthService } from '@/services/auth.service'
import styles from './Header.module.scss'

export function Header() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await AuthService.logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className={styles.header}>
      <div>
        <span className={styles.eyebrow}>Sistema de Gestão</span>
        <h1 className={styles.title}>Compra de Gado & Distribuição de Carne</h1>
      </div>
      <div className={styles.actions}>
        <div className={styles.userBox}>
          <span className={styles.userInitials}>BG</span>
          <div>
            <strong>Administrador</strong>
            <small>Operação ativa</small>
          </div>
        </div>
        <button type="button" className={styles.logoutButton} onClick={handleLogout}>
          Sair
        </button>
      </div>
    </header>
  )
}
