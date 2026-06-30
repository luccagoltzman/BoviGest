import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Button, Input, Modal } from '@/components/ui'
import type { CompraRomaneioRef } from '@/pages/custos/Abate/RomaneioModal'
import { romaneiosService } from '@/services/romaneios.service'
import { estoqueService } from '@/services/estoque.service'
import {
  criarEntradaEstoqueCompra,
  pesosSimplesParaEstoque,
  romaneioItensParaEstoque,
  somarPesoItensEstoque,
} from '@/utils/compraEstoque'
import { pecasPrevistasPorAnimais } from '@/constants/cortes'
import { parseDecimalInput } from '@/utils/masks'
import styles from './CompraEntradaEstoqueModal.module.scss'

type ModoEntrada = 'escolha' | 'romaneio' | 'simples'

type Props = {
  open: boolean
  compra: CompraRomaneioRef | null
  onClose: () => void
  onSaved?: () => void
}

function loteCompra(compra: CompraRomaneioRef) {
  const obs = compra.observacoes?.trim()
  return obs || `compra-${compra.id}`
}

export function CompraEntradaEstoqueModal({
  open,
  compra,
  onClose,
  onSaved,
}: Props) {
  const [modo, setModo] = useState<ModoEntrada>('escolha')
  const [loading, setLoading] = useState(false)
  const [loadingRomaneio, setLoadingRomaneio] = useState(false)
  const [temRomaneioSalvo, setTemRomaneioSalvo] = useState(false)
  const [pesoDianteiro, setPesoDianteiro] = useState('')
  const [pesoTraseiro, setPesoTraseiro] = useState('')
  const [itensRomaneio, setItensRomaneio] = useState<
    ReturnType<typeof romaneioItensParaEstoque>
  >([])
  const [jaRegistrado, setJaRegistrado] = useState(false)

  useEffect(() => {
    if (!open || !compra) return

    setModo('escolha')
    setPesoDianteiro('')
    setPesoTraseiro('')
    setItensRomaneio([])
    setJaRegistrado(false)
    setTemRomaneioSalvo(false)

    let cancelled = false

    async function carregar() {
      setLoadingRomaneio(true)
      try {
        const [romaneio, existente] = await Promise.all([
          romaneiosService.getByCompraId(compra!.id),
          estoqueService.getByReferenciaCompra(compra!.id),
        ])

        if (cancelled) return

        setJaRegistrado(!!existente)

        if (romaneio?.itens?.length) {
          const itens = romaneioItensParaEstoque(romaneio.itens)
          setItensRomaneio(itens)
          setTemRomaneioSalvo(itens.length > 0)
        }
      } catch {
        if (!cancelled) toast.error('Erro ao carregar dados da compra')
      } finally {
        if (!cancelled) setLoadingRomaneio(false)
      }
    }

    carregar()

    return () => {
      cancelled = true
    }
  }, [open, compra?.id])

  const pesoRomaneio = useMemo(
    () => somarPesoItensEstoque(itensRomaneio),
    [itensRomaneio],
  )

  const qtdPecasRomaneio = itensRomaneio.length

  async function registrar(itens: ReturnType<typeof romaneioItensParaEstoque>) {
    if (!compra) return

    try {
      setLoading(true)
      await criarEntradaEstoqueCompra({
        compraId: compra.id,
        lote: loteCompra(compra),
        dataMovimentacao:
          compra.data?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        itens,
        observacao: jaRegistrado
          ? `Entrada atualizada — compra #${compra.id}`
          : undefined,
      })
      toast.success(
        jaRegistrado
          ? 'Entrada de estoque atualizada'
          : 'Entrada de estoque registrada',
      )
      onSaved?.()
      onClose()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao registrar entrada',
      )
    } finally {
      setLoading(false)
    }
  }

  async function confirmarRomaneio() {
    if (!itensRomaneio.length) {
      toast.error('O romaneio não possui pesos informados para gerar a entrada')
      return
    }
    await registrar(itensRomaneio)
  }

  async function confirmarSimples() {
    const dianteiro = parseDecimalInput(pesoDianteiro)
    const traseiro = parseDecimalInput(pesoTraseiro)

    if (dianteiro <= 0 && traseiro <= 0) {
      toast.error('Informe o peso bruto de dianteiro e/ou traseiro')
      return
    }

    const itens = pesosSimplesParaEstoque(dianteiro, traseiro)
    await registrar(itens)
  }

  if (!compra) return null

  const pecasPrevistas = pecasPrevistasPorAnimais(compra.quantidade_animais)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Entrada no estoque"
      width="560px"
    >
      <div className={styles.wrap}>
        <p className={styles.intro}>
          Compra #{compra.id}
          {compra.fornecedor?.nome ? ` · ${compra.fornecedor.nome}` : ''}
          {pecasPrevistas.qtd_dianteiro > 0 && (
            <span className={styles.previsto}>
              {' '}
              · Previsto: {pecasPrevistas.qtd_dianteiro} dianteiro
              {pecasPrevistas.qtd_dianteiro !== 1 ? 's' : ''} +{' '}
              {pecasPrevistas.qtd_traseiro} traseiro
              {pecasPrevistas.qtd_traseiro !== 1 ? 's' : ''}
              {' '}
              ({compra.quantidade_animais}{' '}
              {compra.quantidade_animais === 1 ? 'animal' : 'animais'} × 2 de
              cada)
            </span>
          )}
          {jaRegistrado && (
            <span className={styles.aviso}>
              {' '}
              — já existe entrada vinculada; ao confirmar, ela será substituída.
            </span>
          )}
        </p>

        {loadingRomaneio ? (
          <p className={styles.loading}>Carregando…</p>
        ) : modo === 'escolha' ? (
          <div className={styles.opcoes}>
            <button
              type="button"
              className={styles.opcaoCard}
              disabled={!temRomaneioSalvo}
              onClick={() => setModo('romaneio')}
            >
              <strong>Via romaneio</strong>
              <span>
                Usa os pesos de cada peça já discriminados no romaneio da compra.
              </span>
              {!temRomaneioSalvo && (
                <em className={styles.opcaoDisabled}>
                  Salve o romaneio com os pesos antes de usar esta opção.
                </em>
              )}
              {temRomaneioSalvo && (
                <em>
                  {qtdPecasRomaneio} peça{qtdPecasRomaneio !== 1 ? 's' : ''} ·{' '}
                  {pesoRomaneio.toFixed(2)} kg
                </em>
              )}
            </button>

            <button
              type="button"
              className={styles.opcaoCard}
              onClick={() => setModo('simples')}
            >
              <strong>Sem romaneio</strong>
              <span>
                Informe apenas o peso bruto total de dianteiro e traseiro
                (estoque não detalhado por peça).
              </span>
            </button>
          </div>
        ) : modo === 'romaneio' ? (
          <div className={styles.form}>
            <p className={styles.resumo}>
              Serão registradas <strong>{qtdPecasRomaneio}</strong> peças
              totalizando <strong>{pesoRomaneio.toFixed(2)} kg</strong>, conforme
              o romaneio salvo.
            </p>
            <div className={styles.actions}>
              <Button variant="ghost" onClick={() => setModo('escolha')}>
                Voltar
              </Button>
              <Button loading={loading} onClick={confirmarRomaneio}>
                Registrar entrada
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.form}>
            <Input
              label="Peso bruto dianteiro (kg)"
              mask="decimal"
              value={pesoDianteiro}
              onChange={(e) => setPesoDianteiro(e.target.value)}
            />
            <Input
              label="Peso bruto traseiro (kg)"
              mask="decimal"
              value={pesoTraseiro}
              onChange={(e) => setPesoTraseiro(e.target.value)}
            />
            <div className={styles.actions}>
              <Button variant="ghost" onClick={() => setModo('escolha')}>
                Voltar
              </Button>
              <Button loading={loading} onClick={confirmarSimples}>
                Registrar entrada
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
