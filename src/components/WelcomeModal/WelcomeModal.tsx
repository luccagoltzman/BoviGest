import { useEffect, useMemo, useState } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui'
import {
  pendenciasService,
  type PendenciasDashboard,
} from '@/services/pendencias.service'
import styles from './WelcomeModal.module.scss'

type Props = {
  open: boolean
  userName: string
  onClose: () => void
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(value: string) {
  if (!value) return '—'
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')
}

function primeiroNome(nome: string) {
  const parte = nome.trim().split(/\s+/)[0]
  return parte || nome || 'usuário'
}

function PendenciasLista({
  items,
  emptyLabel,
}: {
  items: PendenciasDashboard['aPagar']
  emptyLabel: string
}) {
  if (!items.length) {
    return <p className={styles.empty}>{emptyLabel}</p>
  }

  return (
    <div className={styles.list}>
      {items.map((item) => (
        <article
          key={item.id}
          className={[
            styles.item,
            item.status === 'Atrasado' && styles.itemAtrasado,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className={styles.itemDesc}>{item.descricao}</span>
          <span className={styles.itemMeta}>
            {formatDate(item.vencimento)}
            {' · '}
            {item.status}
          </span>
          <strong className={styles.itemValor}>{formatCurrency(item.valor)}</strong>
        </article>
      ))}
    </div>
  )
}

export function WelcomeModal({ open, userName, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [pendencias, setPendencias] = useState<PendenciasDashboard | null>(null)

  const nomeExibicao = useMemo(() => primeiroNome(userName), [userName])

  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function carregar() {
      try {
        setLoading(true)
        const dados = await pendenciasService.buscarDashboard()
        if (!cancelled) setPendencias(dados)
      } catch {
        if (!cancelled) {
          setPendencias({
            aPagar: [],
            aReceber: [],
            totalPagar: 0,
            totalReceber: 0,
            qtdAtrasadasPagar: 0,
            qtdAtrasadasReceber: 0,
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    carregar()

    return () => {
      cancelled = true
    }
  }, [open])

  if (!open) return null

  const totalPendencias =
    (pendencias?.aPagar.length || 0) + (pendencias?.aReceber.length || 0)

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      onClick={onClose}
    >
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>BoviGest</span>
          <h2 id="welcome-modal-title" className={styles.greeting}>
            Olá, {nomeExibicao}.
          </h2>
          <p className={styles.subtitle}>
            {loading
              ? 'Carregando suas pendências financeiras...'
              : totalPendencias > 0
                ? 'Aqui está o resumo do que você tem para receber e pagar.'
                : 'Você está em dia — nenhuma pendência financeira no momento.'}
          </p>
        </header>

        <div className={styles.body}>
          <div className={styles.kpiRow}>
            <article className={[styles.kpi, styles.kpiReceber].join(' ')}>
              <span>A receber</span>
              <strong>
                {loading ? '...' : formatCurrency(pendencias?.totalReceber || 0)}
              </strong>
            </article>
            <article className={[styles.kpi, styles.kpiPagar].join(' ')}>
              <span>A pagar</span>
              <strong>
                {loading ? '...' : formatCurrency(pendencias?.totalPagar || 0)}
              </strong>
            </article>
          </div>

          <div className={styles.columns}>
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h3>
                  <TrendingUp size={16} aria-hidden /> A receber
                </h3>
                {!loading && (pendencias?.qtdAtrasadasReceber || 0) > 0 && (
                  <span className={[styles.badge, styles.badgeWarning].join(' ')}>
                    {pendencias?.qtdAtrasadasReceber} atrasada(s)
                  </span>
                )}
                {!loading && (pendencias?.aReceber.length || 0) > 0 && (
                  <span className={[styles.badge, styles.badgeNeutral].join(' ')}>
                    {pendencias?.aReceber.length}
                  </span>
                )}
              </div>
              <PendenciasLista
                items={pendencias?.aReceber || []}
                emptyLabel="Nenhuma venda pendente de recebimento."
              />
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h3>
                  <TrendingDown size={16} aria-hidden /> A pagar
                </h3>
                {!loading && (pendencias?.qtdAtrasadasPagar || 0) > 0 && (
                  <span className={[styles.badge, styles.badgeWarning].join(' ')}>
                    {pendencias?.qtdAtrasadasPagar} atrasada(s)
                  </span>
                )}
                {!loading && (pendencias?.aPagar.length || 0) > 0 && (
                  <span className={[styles.badge, styles.badgeNeutral].join(' ')}>
                    {pendencias?.aPagar.length}
                  </span>
                )}
              </div>
              <PendenciasLista
                items={pendencias?.aPagar || []}
                emptyLabel="Nenhuma parcela de compra pendente."
              />
            </section>
          </div>
        </div>

        <footer className={styles.footer}>
          <Button onClick={onClose}>OK</Button>
        </footer>
      </div>
    </div>
  )
}
