import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AppLogo } from '@/components/AppLogo'
import { Button, Input } from '@/components/ui'
import { AuthService } from '@/services/auth.service'
import { loadTheme } from '@/services/theme.service'
import { supabase } from '@/services/supabase'
import styles from '../Login/Login.module.scss'

export function RedefinirSenha() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [preparing, setPreparing] = useState(true)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    async function prepareSession() {
      setPreparing(true)
      setError('')

      try {
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
        }

        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        if (!data.session) {
          setError(
            'Link inválido ou expirado. Peça ao administrador para reenviar o convite.',
          )
          return
        }

        setReady(true)
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Não foi possível validar o link de acesso.'
        setError(message)
      } finally {
        window.history.replaceState({}, '', '/redefinir-senha')
        setPreparing(false)
      }
    }

    prepareSession()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })
      if (updateError) throw updateError

      await AuthService.me()
      await loadTheme()
      toast.success('Senha definida com sucesso!')
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao definir a senha'
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
        <h1>Defina sua senha de acesso</h1>
        <p>
          Escolha uma senha pessoal para entrar no BoviGest. Você usará este
          e-mail e a senha definida aqui nos próximos acessos.
        </p>
      </section>

      <section className={styles.panel}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formHeader}>
            <span>Primeiro acesso</span>
            <h2>Criar senha</h2>
            <p>Use pelo menos 6 caracteres.</p>
          </div>

          {preparing && (
            <div className={styles.info}>Validando convite de acesso...</div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <Input
            label="Nova senha"
            type="password"
            placeholder="Digite sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={!ready || loading || preparing}
          />

          <Input
            label="Confirmar senha"
            type="password"
            placeholder="Repita a senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            disabled={!ready || loading || preparing}
          />

          <Button
            type="submit"
            disabled={!ready || loading || preparing}
            fullWidth
          >
            {loading ? 'Salvando...' : 'Salvar senha e entrar'}
          </Button>

          <p className={styles.footerText}>
            Já definiu sua senha?{' '}
            <Link to="/login" className={styles.footerLink}>
              Ir para o login
            </Link>
          </p>
        </form>
      </section>
    </main>
  )
}
