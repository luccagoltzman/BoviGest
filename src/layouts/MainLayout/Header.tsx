import styles from './Header.module.scss'

export function Header() {
  return (
    <header className={styles.header}>
      <div>
        <span className={styles.eyebrow}>Sistema de Gestão</span>
        <h1 className={styles.title}>Compra de Gado & Distribuição de Carne</h1>
      </div>
      <div className={styles.userBox}>
        <span className={styles.userInitials}>BG</span>
        <div>
          <strong>Administrador</strong>
          <small>Operação ativa</small>
        </div>
      </div>
    </header>
  )
}
