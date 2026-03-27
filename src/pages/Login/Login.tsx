import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthService } from '@/services/auth.service'
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
      navigate('/dashboard')
      alert('Seja bem vindo!')
    } catch (err: any) {
      setError(err.message || 'Erro ao logar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2>Entrar</h2>

        {error && <div className={styles.error}>{error}</div>}

        <p>senha e login -- joao@gmail.com</p>
        <p>remove depois</p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}