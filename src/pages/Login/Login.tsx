import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AppLogo } from '@/components/AppLogo'
import { Button, Input } from '@/components/ui'
import { AuthService } from '@/services/auth.service'
import { loadTheme } from '@/services/theme.service'
import styles from './Login.module.scss'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await AuthService.login(email, password)
      await loadTheme()
      navigate('/dashboard')
      toast.success('Seja bem-vindo!')
    } catch (err: any) {
      setError(err.message || 'Erro ao logar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.logo}>
          <AppLogo variant="login" />
        </div>
        <h1>Gestão moderna para marchantes</h1>
        <p>
          Controle compras de gado, abate, estoque, vendas e financeiro em uma única operação.
        </p>

        <div className={styles.highlights}>
          <span>Compras</span>
          <span>Estoque</span>
          <span>Vendas</span>
          <span>Financeiro</span>
        </div>
      </section>

      <section className={styles.panel}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formHeader}>
            <span>Acesso seguro</span>
            <h2>Entrar no sistema</h2>
            <p>Informe suas credenciais para continuar.</p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <Input
            label="E-mail"
            type="email"
            placeholder="seuemail@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <Input
            label="Senha"
            type="password"
            placeholder="Digite sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <Button type="submit" disabled={loading} fullWidth>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>

          <p className={styles.footerText}>
            Acesso restrito aos usuários autorizados pela empresa.
          </p>
        </form>
      </section>
    </main>
  )
}