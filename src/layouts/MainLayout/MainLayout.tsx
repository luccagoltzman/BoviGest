import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PageReveal } from '@/components/ui'
import { WelcomeModal } from '@/components/WelcomeModal'
import { AuthService } from '@/services/auth.service'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import styles from './MainLayout.module.scss'

export function MainLayout() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen)

    return () => {
      document.body.classList.remove('menu-open')
    }
  }, [menuOpen])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 992) {
        setMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (AuthService.shouldShowWelcomeModal()) {
      setWelcomeOpen(true)
    }
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      if (!AuthService.isSessionExpired()) return

      await AuthService.logout()
      toast.error('Sua sessão expirou. Faça login novamente.')
      navigate('/login', { replace: true })
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [navigate])

  function fecharBoasVindas() {
    AuthService.clearWelcomeModalPending()
    setWelcomeOpen(false)
  }

  const userName = AuthService.getDisplayName()

  return (
    <div className={styles.layout}>
      {menuOpen && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <Sidebar isOpen={menuOpen} onNavigate={() => setMenuOpen(false)} />

      <div className={styles.main}>
        <Header
          menuOpen={menuOpen}
          onMenuToggle={() => setMenuOpen((open) => !open)}
        />
        <main className={styles.content}>
          <PageReveal>
            <Outlet />
          </PageReveal>
        </main>
      </div>

      <WelcomeModal
        open={welcomeOpen}
        userName={userName}
        onClose={fecharBoasVindas}
      />
    </div>
  )
}
