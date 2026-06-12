import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AppLogo } from '@/components/AppLogo'
import { Button, Input } from '@/components/ui'
import { AuthService } from '@/services/auth.service'
import { loadTheme } from '@/services/theme.service'
import { supabase } from '@/services/supabase'
import styles from './Login.module.scss'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingConfirmation, setCheckingConfirmation] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    async function handleEmailConfirmationRedirect() {
      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get('code')
      const hash = window.location.hash
      const hasHashTokens = hash.includes('access_token=')

      if (!code && !hasHashTokens) return

      setCheckingConfirmation(true)
      setError('')

      try {
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
        }

        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        if (data.session) {
          navigate('/redefinir-senha', { replace: true })
          return
        }

        setInfo(
          'E-mail confirmado. Verifique sua caixa de entrada para definir sua senha de acesso.',
        )
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Não foi possível validar a confirmação do e-mail.'
        setError(message)
      } finally {
        window.history.replaceState({}, '', '/login')
        setCheckingConfirmation(false)
      }
    }

    handleEmailConfirmationRedirect()
  }, [navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')

    try {
      await AuthService.login(email, password)
      await loadTheme()
      navigate('/dashboard')
      toast.success('Seja bem-vindo!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao logar'
      setError(message)
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
          Controle compras de gado, abate, estoque, vendas e financeiro em uma
          única operação.
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

          {checkingConfirmation && (
            <div className={styles.info}>Validando confirmação do e-mail...</div>
          )}

          {info && <div className={styles.info}>{info}</div>}
          {error && <div className={styles.error}>{error}</div>}

          <Input
            label="E-mail"
            type="email"
            placeholder="seuemail@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={checkingConfirmation}
          />

          <Input
            label="Senha"
            type="password"
            placeholder="Digite sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={checkingConfirmation}
          />

          <Button
            type="submit"
            disabled={loading || checkingConfirmation}
            fullWidth
          >
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
