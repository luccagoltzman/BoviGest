import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { Button, Card, Input } from '@/components/ui'
import { canAccessSettings, currentUserRole } from '@/config/access'
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
  const [form, setForm] = useState<SystemCustomizationPayload>({
    ...defaultCustomization,
    logoFile: null,
  })
  const [saved, setSaved] = useState(false)

  const hasAccess = canAccessSettings(currentUserRole)

  const previewStyle = useMemo(
    () => ({
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
    ]
  )

  const handleLogoChange = (file?: File) => {
    if (!file) return
    setForm((prev) => ({
      ...prev,
      logoFile: file,
      logoPreviewUrl: URL.createObjectURL(file),
    }))
  }

  const handleSave = () => {
    const payload = {
      empresaId: form.empresaId,
      logoFile: form.logoFile,
      primaryColor: form.primaryColor,
      secondaryColor: form.secondaryColor,
      sidebarColor: form.sidebarColor,
      sidebarEndColor: form.sidebarEndColor,
      buttonGradientEndColor: form.buttonGradientEndColor,
      backgroundGlowColor: form.backgroundGlowColor,
    }

    document.documentElement.style.setProperty('--theme-primary', form.primaryColor)
    document.documentElement.style.setProperty('--theme-primary-dark', form.sidebarColor)
    document.documentElement.style.setProperty('--theme-secondary', form.secondaryColor)
    document.documentElement.style.setProperty('--theme-sidebar-start', form.sidebarColor)
    document.documentElement.style.setProperty('--theme-sidebar-end', form.sidebarEndColor)
    document.documentElement.style.setProperty('--theme-button-gradient-end', form.buttonGradientEndColor)
    document.documentElement.style.setProperty('--theme-background-glow', form.backgroundGlowColor)

    console.log('system_customization_payload', payload)
    setSaved(true)
  }

  if (!hasAccess) {
    return (
      <div className={styles.page}>
        <h1 className="page-title">Configurações</h1>
        <Card title="Acesso restrito">
          <p className={styles.muted}>Somente usuários master podem acessar as customizações do sistema.</p>
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
              <span className={styles.fieldLabel}>Logo do sistema</span>
              <label className={styles.logoUpload}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => handleLogoChange(e.target.files?.[0])}
                />
                {form.logoPreviewUrl ? (
                  <img src={form.logoPreviewUrl} alt="Logo selecionada" />
                ) : (
                  <span>Selecionar logo</span>
                )}
              </label>
              <small>Formatos sugeridos: PNG, JPG, WEBP ou SVG.</small>
            </div>

            <ColorField
              label="Cor principal"
              value={form.primaryColor}
              onChange={(value) => setForm((prev) => ({ ...prev, primaryColor: value }))}
            />
            <ColorField
              label="Cor secundária"
              value={form.secondaryColor}
              onChange={(value) => setForm((prev) => ({ ...prev, secondaryColor: value }))}
            />
            <ColorField
              label="Cor da sidebar"
              value={form.sidebarColor}
              onChange={(value) => setForm((prev) => ({ ...prev, sidebarColor: value }))}
            />
            <ColorField
              label="Final do gradiente da sidebar"
              value={form.sidebarEndColor}
              onChange={(value) => setForm((prev) => ({ ...prev, sidebarEndColor: value }))}
            />
            <ColorField
              label="Final do gradiente dos botões"
              value={form.buttonGradientEndColor}
              onChange={(value) => setForm((prev) => ({ ...prev, buttonGradientEndColor: value }))}
            />
            <ColorField
              label="Brilho do fundo"
              value={form.backgroundGlowColor}
              onChange={(value) => setForm((prev) => ({ ...prev, backgroundGlowColor: value }))}
            />

            <div className={styles.actions}>
              <Button onClick={handleSave}>Salvar customização</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setForm({ ...defaultCustomization, logoFile: null })
                  setSaved(false)
                }}
              >
                Restaurar padrão
              </Button>
            </div>

            {saved && (
              <p className={styles.success}>
                Configuração pronta para persistência no backend.
              </p>
            )}
          </div>
        </Card>

        <Card title="Prévia do sistema">
          <div className={styles.preview} style={previewStyle}>
            <aside>
              <div className={styles.previewLogo}>
                {form.logoPreviewUrl ? <img src={form.logoPreviewUrl} alt="" /> : 'BG'}
              </div>
              <span>Dashboard</span>
              <span>Compras</span>
              <span>Vendas</span>
            </aside>
            <main>
              <div className={styles.previewHeader}>BoviGest</div>
              <div className={styles.previewCard}>
                <strong>Card de exemplo</strong>
                <p>Botões, destaques e menu usam as cores configuradas.</p>
                <button type="button">Ação principal</button>
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
      <Input label={label} value={value} onChange={(e) => onChange(e.target.value)} />
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
