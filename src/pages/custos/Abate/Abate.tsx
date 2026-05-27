import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  Input,
  Table,
  Modal,
  ModalDetails,
  Select,
} from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import { abatesService } from '@/services/abates.service'
import styles from './Abate.module.scss'

interface AbateRow {
  id: number
  data_abate: string
  lote: string
  tipo_animal: string
  qtd_animais: number
  peso_bruto_kg: number
  peso_liquido_kg: number
  valor_unitario: number
  valor_total: number
  couro_deixado: number
  desconto_por_couro: number
  desconto_total: number
  taxas: number
  tipo_cobranca: number
}

export function Abate() {
  const [loading, setLoading] = useState(false)

  const [abates, setAbates] = useState<AbateRow[]>([])
  const [detalhe, setDetalhe] = useState<AbateRow | null>(
    null
  )
  const [editar, setEditar] = useState<AbateRow | null>(
    null
  )

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [data, setData] = useState('')
  const [lote, setLote] = useState('')
  const [tipoAnimal, setTipoAnimal] = useState('')
  const [qtdAnimais, setQtdAnimais] = useState('')
  const [pesoBruto, setPesoBruto] = useState('')
  const [pesoLiquido, setPesoLiquido] = useState('')
  const [valorBruto, setValorBruto] = useState('')
  const [couroDeixado, setCouroDeixado] = useState('')
  const [descontoPorCouro, setDescontoPorCouro] =
    useState('')
  const [taxas, setTaxas] = useState('')
  const [tipoCobranca, setTipoCobranca] =
    useState('Por Kg')

  const qtdCouro = Number(couroDeixado) || 0
  const descPorCouro =
    Number(descontoPorCouro) || 0

  const descontoTotalCalc =
    qtdCouro * descPorCouro

  const valorBrutoNum = Number(valorBruto) || 0
  const taxasNum = Number(taxas) || 0

  const pesoBrutoNum = Number(pesoBruto) || 0
  const pesoLiquidoNum = Number(pesoLiquido) || 0
  const qtdAnimaisNum = Number(qtdAnimais) || 0

  const rendimento =
    pesoBrutoNum > 0
      ? (
        (pesoLiquidoNum / pesoBrutoNum) *
        100
      ).toFixed(2)
      : '0'

  const valorBase =
    tipoCobranca === 'Por Kg'
      ? pesoBrutoNum * valorBrutoNum
      : qtdAnimaisNum * valorBrutoNum

  const valorFinalCalc =
    valorBase + taxasNum - descontoTotalCalc

  async function loadAbates() {
    try {
      setLoading(true)

      const response = await abatesService.getAll(
        page,
        10
      )

      setAbates(response.data || [])
      setTotal(response.total)
      setTotalPages(response.totalPages)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAbates()
  }, [page])

  async function handleCreate() {
    try {
      setLoading(true)

      await abatesService.create({
        data_abate: data,
        lote,
        tipo_animal: tipoAnimal,
        qtd_animais: qtdAnimaisNum,
        peso_bruto_kg: pesoBrutoNum,
        peso_liquido_kg: pesoLiquidoNum,
        valor_unitario: valorBrutoNum,
        valor_total: valorFinalCalc,
        couro_deixado: qtdCouro,
        desconto_por_couro: descPorCouro,
        desconto_total: descontoTotalCalc,
        taxas: taxasNum,
        tipo_cobranca:
          tipoCobranca === 'Por Kg' ? 0 : 1,
      })

      setData('')
      setLote('')
      setTipoAnimal('')
      setQtdAnimais('')
      setPesoBruto('')
      setPesoLiquido('')
      setValorBruto('')
      setCouroDeixado('')
      setDescontoPorCouro('')
      setTaxas('')
      setTipoCobranca('Por Kg')

      await loadAbates()
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveEdit() {
    if (!editar) return

    try {
      setLoading(true)

      await abatesService.update(editar.id, editar)

      setEditar(null)

      await loadAbates()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    const confirmDelete = window.confirm(
      'Deseja excluir este abate?'
    )

    if (!confirmDelete) return

    try {
      setLoading(true)

      await abatesService.delete(id)

      setEditar(null)

      await loadAbates()
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      key: 'data_abate',
      header: 'Data',
    },
    {
      key: 'lote',
      header: 'Lote',
    },
    {
      key: 'tipo_animal',
      header: 'Animal',
    },
    {
      key: 'qtd_animais',
      header: 'Qtd.',
    },
    {
      key: 'peso_bruto_kg',
      header: 'Peso bruto',
    },
    {
      key: 'peso_liquido_kg',
      header: 'Peso líquido',
    },
    {
      key: 'valor_total',
      header: 'Valor total',
      render: (r: AbateRow) =>
        `R$ ${Number(
          r.valor_total
        ).toLocaleString('pt-BR')}`,
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: AbateRow) => (
        <div className={styles.tableActions}>
          <Button
            variant="ghost"
            onClick={() => setDetalhe(r)}
          >
            Ver
          </Button>

          <Button
            variant="ghost"
            onClick={() => setEditar(r)}
          >
            Editar
          </Button>
        </div>
      ),
    },
  ]

  const detalheItems = (
    r: AbateRow
  ): DetailItem[] => {
    const rendimento =
      Number(r.peso_bruto_kg) > 0
        ? (
          (Number(r.peso_liquido_kg) /
            Number(r.peso_bruto_kg)) *
          100
        ).toFixed(2)
        : '0'

    return [
      {
        label: 'Data',
        value: r.data_abate,
      },
      {
        label: 'Lote',
        value: r.lote,
      },
      {
        label: 'Tipo animal',
        value: r.tipo_animal,
      },
      {
        label: 'Qtd. animais',
        value: r.qtd_animais,
      },
      {
        label: 'Peso bruto',
        value: `${r.peso_bruto_kg} kg`,
      },
      {
        label: 'Peso líquido',
        value: `${r.peso_liquido_kg} kg`,
      },
      {
        label: 'Rendimento',
        value: `${rendimento}%`,
      },
      {
        label: 'Tipo cobrança',
        value:
          r.tipo_cobranca === 0
            ? 'Por Kg'
            : 'Animal',
      },
      {
        label: 'Valor unitário',
        value: `R$ ${Number(
          r.valor_unitario
        ).toLocaleString('pt-BR')}`,
      },
      {
        label: 'Couro deixado',
        value: r.couro_deixado,
      },
      {
        label: 'Desconto por couro',
        value: `R$ ${Number(
          r.desconto_por_couro
        ).toLocaleString('pt-BR')}`,
      },
      {
        label: 'Desconto total',
        value: `R$ ${Number(
          r.desconto_total
        ).toLocaleString('pt-BR')}`,
      },
      {
        label: 'Taxas',
        value: `R$ ${Number(
          r.taxas
        ).toLocaleString('pt-BR')}`,
      },
      {
        label: 'Valor total',
        value: `R$ ${Number(
          r.valor_total
        ).toLocaleString('pt-BR')}`,
      },
    ]
  }

  return (
    <div className={styles.page}>
      <h1 className="page-title">
        Custos de abate
      </h1>

      <Card title="Registro de abate">
        <div className={styles.form}>
          <div>
            <Input
              label="Data"
              type="date"
              value={data}
              onChange={(e) =>
                setData(e.target.value)
              }
            />

            <Input
              label="Tipo animal"
              value={tipoAnimal}
              onChange={(e) =>
                setTipoAnimal(e.target.value)
              }
            />
          </div>

          <div>
            <Input
              label="Lote"
              value={lote}
              onChange={(e) =>
                setLote(e.target.value)
              }
            />

            <Input
              label="Quantidade de animais"
              type="number"
              value={qtdAnimais}
              onChange={(e) =>
                setQtdAnimais(e.target.value)
              }
            />
          </div>

          <div>
            <Input
              label="Peso bruto (kg)"
              type="number"
              value={pesoBruto}
              onChange={(e) =>
                setPesoBruto(e.target.value)
              }
            />

            <Input
              label="Peso líquido (kg)"
              type="number"
              value={pesoLiquido}
              onChange={(e) =>
                setPesoLiquido(e.target.value)
              }
            />
          </div>

          <div>
            <Select
              label="Tipo de cobrança"
              options={['Por Kg', 'Animal']}
              value={tipoCobranca}
              onChange={(e) =>
                setTipoCobranca(e.target.value)
              }
            />

            <Input
              label={
                tipoCobranca === 'Por Kg'
                  ? 'Valor por (Kg bruto)'
                  : 'Valor por animal'
              }
              type="number"
              value={valorBruto}
              onChange={(e) =>
                setValorBruto(e.target.value)
              }
            />
          </div>

          <div>
            <Input
              label="Couro deixado"
              type="number"
              value={couroDeixado}
              onChange={(e) =>
                setCouroDeixado(
                  e.target.value
                )
              }
            />

            <Input
              label="Desconto por couro"
              type="number"
              value={descontoPorCouro}
              onChange={(e) =>
                setDescontoPorCouro(
                  e.target.value
                )
              }
            />
          </div>

          <Input
            label="Taxas"
            type="number"
            value={taxas}
            onChange={(e) =>
              setTaxas(e.target.value)
            }
          />

          <div className={styles.calcDesconto}>
            <span>Rendimento</span>
            <strong>{rendimento}%</strong>
          </div>

          <div className={styles.calcDesconto}>
            <span>Desconto total</span>
            <strong>
              R${' '}
              {descontoTotalCalc.toLocaleString(
                'pt-BR'
              )}
            </strong>
          </div>

          <div className={styles.valorFinal}>
            <span>Valor final</span>
            <span>
              Valor final ({' '}
              {tipoCobranca === 'Por Kg'
                ? `${pesoLiquidoNum}kg × R$ ${valorBrutoNum.toLocaleString('pt-BR')}`
                : `${qtdAnimaisNum} animais × R$ ${valorBrutoNum.toLocaleString('pt-BR')}`}
              {' + '}
              Taxas R$ {taxasNum.toLocaleString('pt-BR')}
              {' - '}
              Desconto couro R$ {descontoTotalCalc.toLocaleString('pt-BR')}
              )
            </span>

            <strong>
              R$ {valorFinalCalc.toLocaleString('pt-BR')}
            </strong>

          </div>

          <div className={styles.actions}>
            <Button
              loading={loading}
              onClick={handleCreate}
              disabled={
                !data ||
                !qtdAnimais ||
                !pesoBruto ||
                !pesoLiquido ||
                !valorBruto
              }
            >
              Registrar abate
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Histórico de abates">
        <Table
          columns={columns}
          data={abates}
          keyExtractor={(r) => String(r.id)}
          loading={loading}
          page={page}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Card>

      <Modal
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        title="Detalhes do abate"
      >
        {detalhe && (
          <ModalDetails
            items={detalheItems(detalhe)}
          />
        )}
      </Modal>

      <Modal
      width='900px'
        open={!!editar}
        onClose={() => setEditar(null)}
        title="Editar abate"
      >
        {editar && (
          <div className={styles.form}>
            <Input
              label="Data"
              type="date"
              value={editar.data_abate}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  data_abate: e.target.value,
                })
              }
            />

            <Input
              label="Lote"
              value={editar.lote}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  lote: e.target.value,
                })
              }
            />

            <Input
              label="Tipo animal"
              value={editar.tipo_animal}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  tipo_animal: e.target.value,
                })
              }
            />

            <Select
              label="Tipo cobrança"
              options={['Por Kg', 'Animal']}
              value={
                editar.tipo_cobranca === 0
                  ? 'Por Kg'
                  : 'Animal'
              }
              onChange={(e) =>
                setEditar({
                  ...editar,
                  tipo_cobranca:
                    e.target.value === 'Por Kg'
                      ? 0
                      : 1,
                })
              }
            />

            <Input
              label="Qtd. animais"
              type="number"
              value={editar.qtd_animais}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  qtd_animais: Number(
                    e.target.value
                  ),
                })
              }
            />

            <Input
              label="Peso bruto"
              type="number"
              value={editar.peso_bruto_kg}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  peso_bruto_kg: Number(
                    e.target.value
                  ),
                })
              }
            />

            <Input
              label="Peso líquido"
              type="number"
              value={editar.peso_liquido_kg}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  peso_liquido_kg: Number(
                    e.target.value
                  ),
                })
              }
            />

            <Input
              label={
                editar.tipo_cobranca === 0
                  ? 'Valor por Kg'
                  : 'Valor por animal'
              }
              type="number"
              value={editar.valor_unitario}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  valor_unitario: Number(
                    e.target.value
                  ),
                })
              }
            />

            <Input
              label="Couro deixado"
              type="number"
              value={editar.couro_deixado}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  couro_deixado: Number(
                    e.target.value
                  ),
                })
              }
            />

            <Input
              label="Desconto por couro"
              type="number"
              value={editar.desconto_por_couro}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  desconto_por_couro: Number(
                    e.target.value
                  ),
                })
              }
            />

            <Input
              label="Desconto total"
              type="number"
              value={editar.desconto_total}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  desconto_total: Number(
                    e.target.value
                  ),
                })
              }
            />

            <Input
              label="Taxas"
              type="number"
              value={editar.taxas}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  taxas: Number(
                    e.target.value
                  ),
                })
              }
            />

            <Input
              label="Valor total"
              type="number"
              value={editar.valor_total}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  valor_total: Number(
                    e.target.value
                  ),
                })
              }
            />

            <div className={styles.calcDesconto}>
              <span>Rendimento</span>

              <strong>
                {editar.peso_bruto_kg > 0
                  ? (
                    (editar.peso_liquido_kg /
                      editar.peso_bruto_kg) *
                    100
                  ).toFixed(2)
                  : '0'}
                %
              </strong>
            </div>

            <div className={styles.actions}>
              <Button onClick={handleSaveEdit}>
                Salvar alterações
              </Button>

              <Button
                variant="danger"
                onClick={() =>
                  handleDelete(editar.id)
                }
              >
                Excluir
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}