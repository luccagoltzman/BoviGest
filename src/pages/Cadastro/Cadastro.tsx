import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AppLogo } from '@/components/AppLogo'
import { Button, Input } from '@/components/ui'
import { AuthService } from '@/services/auth.service'
import { formatPerfil, usuariosService } from '@/services/usuarios.service'
import { loadTheme } from '@/services/theme.service'
import styles from '../Login/Login.module.scss'

export function Cadastro() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [perfilAutorizado, setPerfilAutorizado] = useState<string | null>(null)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()

  async function handleEmailBlur() {
    const normalized = email.trim().toLowerCase()
    if (!normalized || !normalized.includes('@')) {
      setPerfilAutorizado(null)
      return
    }

    try {
      setCheckingEmail(true)
      const result = await usuariosService.verificarEmailCadastro(normalized)
      if (result.autorizado && result.perfil) {
        setPerfilAutorizado(formatPerfil(result.perfil))
      } else {
        setPerfilAutorizado(null)
      }
    } catch {
      setPerfilAutorizado(null)
    } finally {
      setCheckingEmail(false)
    }
  }

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

    try {
      setLoading(true)

      await AuthService.registerAuthorizedUser({
        nome,
        email,
        password,
      })

      await loadTheme()
      toast.success('Cadastro concluído com sucesso!')
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao concluir cadastro'
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
        <h1>Crie sua conta</h1>
        <p>
          Use o e-mail autorizado pelo administrador da sua empresa para criar
          sua senha e acessar o BoviGest imediatamente.
        </p>
      </section>

      <section className={styles.panel}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formHeader}>
            <span>Novo usuário</span>
            <h2>Cadastro</h2>
            <p>Preencha seus dados para criar a senha de acesso.</p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <Input
            label="Nome completo"
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="name"
            required
          />

          <Input
            label="E-mail autorizado"
            type="email"
            placeholder="seuemail@empresa.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setPerfilAutorizado(null)
            }}
            onBlur={handleEmailBlur}
            autoComplete="email"
            required
          />

          {checkingEmail && (
            <p className={styles.footerText}>Verificando autorização...</p>
          )}

          {perfilAutorizado && !checkingEmail && (
            <div className={styles.info}>
              E-mail autorizado · Perfil: <strong>{perfilAutorizado}</strong>
            </div>
          )}

          <Input
            label="Senha"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          <Input
            label="Confirmar senha"
            type="password"
            placeholder="Repita a senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          <Button type="submit" disabled={loading} fullWidth>
            {loading ? 'Cadastrando...' : 'Criar conta'}
          </Button>

          <p className={styles.footerText}>
            Já tem conta?{' '}
            <Link to="/login" className={styles.footerLink}>
              Fazer login
            </Link>
          </p>
        </form>
      </section>
    </main>
  )
}
