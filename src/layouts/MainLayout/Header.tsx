import styles from './Header.module.scss'

export function Header() {
  return (
    <header className={styles.header}>
      <span className={styles.title}>BoviGest</span>
    </header>
  )
}
