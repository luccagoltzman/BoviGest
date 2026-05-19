import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { LogoImage } from '@/components/AppLogo'
import { Button, Card, Input } from '@/components/ui'
import { canAccessSettings, currentUserRole } from '@/config/access'
import { configuracoesService } from '@/services/configuracoes.service'
import { sanitizeLogoUrl, uploadLogo } from '@/services/logo.service'
import { persistThemeConfig } from '@/services/theme.service'
import styles from './Configuracoes.module.scss'

interface SystemCustomizationPayload {
  empresaId: number
  logoFile: File | null
  logoPreviewUrl: string
  primaryColor: string
  secondaryColor: string
  sidebarColor: string
  sidebarEndColor: string
  buttonGradientEndColor: string
  backgroundGlowColor: string
}

const defaultCustomization: Omit<SystemCustomizationPayload, 'logoFile'> = {
  empresaId: 1,
  logoPreviewUrl: '',
  primaryColor: '#256f3e',
  secondaryColor: '#d69e2e',
  sidebarColor: '#11351f',
  sidebarEndColor: '#092012',
  buttonGradientEndColor: '#38a169',
  backgroundGlowColor: '#38a169',
}

export function Configuracoes() {
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState<SystemCustomizationPayload>({
    ...defaultCustomization,
    logoFile: null,
  })

  const [saved, setSaved] = useState(false)

  const hasAccess = canAccessSettings(currentUserRole)

  const previewStyle = useMemo(
    () =>
      ({
        '--preview-primary': form.primaryColor,
        '--preview-secondary': form.secondaryColor,
        '--preview-sidebar': form.sidebarColor,
        '--preview-sidebar-end': form.sidebarEndColor,
        '--preview-button-end': form.buttonGradientEndColor,
        '--preview-background-glow': form.backgroundGlowColor,
      }) as CSSProperties,
    [
      form.primaryColor,
      form.secondaryColor,
      form.sidebarColor,
      form.sidebarEndColor,
      form.buttonGradientEndColor,
      form.backgroundGlowColor,
    ],
  )

  const loadConfiguracoes = async () => {
    try {
      setLoading(true)

      const data = await configuracoesService.get()

      if (!data) return

      setForm({
        empresaId: data.empresa_id ?? 1,
        logoFile: null,
        logoPreviewUrl: sanitizeLogoUrl(data.logo_file),
        primaryColor: data.primary_color ?? '#256f3e',
        secondaryColor: data.secondary_color ?? '#d69e2e',
        sidebarColor: data.sidebar_color ?? '#11351f',
        sidebarEndColor: data.sidebar_end_color ?? '#092012',
        buttonGradientEndColor:
          data.button_gradient_end_color ?? '#38a169',
        backgroundGlowColor:
          data.background_glow_color ?? '#38a169',
      })

      persistThemeConfig({
        ...data,
        logo_file: sanitizeLogoUrl(data.logo_file),
      })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoChange = (file?: File) => {
    if (!file) return

    setForm((prev) => ({
      ...prev,
      logoFile: file,
      logoPreviewUrl: URL.createObjectURL(file),
    }))
  }

  const handleSave = async () => {
    try {
      setLoading(true)

      let logoUrl = sanitizeLogoUrl(form.logoPreviewUrl)

      if (form.logoFile) {
        logoUrl = await uploadLogo(form.logoFile)
      }

      const payload = {
        empresa_id: form.empresaId,
        logo_file: logoUrl || null,
        primary_color: form.primaryColor,
        secondary_color: form.secondaryColor,
        sidebar_color: form.sidebarColor,
        sidebar_end_color: form.sidebarEndColor,
        button_gradient_end_color:
          form.buttonGradientEndColor,
        background_glow_color:
          form.backgroundGlowColor,
      }

      const savedConfig = await configuracoesService.upsert(payload)

      if (form.logoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(form.logoPreviewUrl)
      }

      const persisted = savedConfig ?? payload

      persistThemeConfig(persisted)

      setForm((prev) => ({
        ...prev,
        logoFile: null,
        logoPreviewUrl: sanitizeLogoUrl(persisted.logo_file),
      }))

      setSaved(true)
      toast.success('Configurações salvas com sucesso.')
    } catch (error: unknown) {
      console.error(error)
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao salvar configurações'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfiguracoes()
  }, [])

  if (!hasAccess) {
    return (
      <div className={styles.page}>
        <h1 className="page-title">Configurações</h1>

        <Card title="Acesso restrito">
          <p className={styles.muted}>
            Somente usuários master podem acessar as customizações do sistema.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className="page-title">Configurações</h1>

      <div className={styles.grid}>
        <Card title="Identidade visual">
          <div className={styles.form}>
            <div className={styles.logoField}>
              <span className={styles.fieldLabel}>
                Logo do sistema
              </span>

              <label className={styles.logoUpload}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) =>
                    handleLogoChange(e.target.files?.[0])
                  }
                />

                {form.logoPreviewUrl ? (
                  <LogoImage
                    src={form.logoPreviewUrl}
                    onInvalid={() =>
                      setForm((prev) => ({
                        ...prev,
                        logoPreviewUrl: '',
                        logoFile: null,
                      }))
                    }
                  />
                ) : (
                  <span>Selecionar logo</span>
                )}
              </label>

              <small>
                Formatos sugeridos: PNG, JPG, WEBP ou SVG.
              </small>
            </div>

            <ColorField
              label="Cor principal"
              value={form.primaryColor}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  primaryColor: value,
                }))
              }
            />

            <ColorField
              label="Cor secundária"
              value={form.secondaryColor}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  secondaryColor: value,
                }))
              }
            />

            <ColorField
              label="Cor da sidebar"
              value={form.sidebarColor}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  sidebarColor: value,
                }))
              }
            />

            <ColorField
              label="Final do gradiente da sidebar"
              value={form.sidebarEndColor}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  sidebarEndColor: value,
                }))
              }
            />

            <ColorField
              label="Final do gradiente dos botões"
              value={form.buttonGradientEndColor}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  buttonGradientEndColor: value,
                }))
              }
            />

            <ColorField
              label="Brilho do fundo"
              value={form.backgroundGlowColor}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  backgroundGlowColor: value,
                }))
              }
            />

            <div className={styles.actions}>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar customização'}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setForm({
                    ...defaultCustomization,
                    logoFile: null,
                  })

                  setSaved(false)
                }}
              >
                Restaurar padrão
              </Button>
            </div>

            {saved && (
              <p className={styles.success}>
                Configurações salvas com sucesso.
              </p>
            )}
          </div>
        </Card>

        <Card title="Prévia do sistema">
          <div className={styles.preview} style={previewStyle}>
            <aside>
              <div className={styles.previewLogo}>
                {form.logoPreviewUrl ? (
                  <LogoImage src={form.logoPreviewUrl} />
                ) : (
                  'BG'
                )}
              </div>

              <span>Dashboard</span>
              <span>Compras</span>
              <span>Vendas</span>
            </aside>

            <main>
              <div className={styles.previewHeader}>
                {form.logoPreviewUrl ? (
                  <LogoImage src={form.logoPreviewUrl} />
                ) : (
                  'BoviGest'
                )}
              </div>

              <div className={styles.previewCard}>
                <strong>Card de exemplo</strong>

                <p>
                  Botões, destaques e menu usam as cores
                  configuradas.
                </p>

                <button type="button">
                  Ação principal
                </button>
              </div>
            </main>
          </div>
        </Card>
      </div>
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className={styles.colorField}>
      <Input
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      <input
        className={styles.colorInput}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      />
    </div>
  )
}