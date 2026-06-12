import { Button } from '../Button'

interface AddNewButtonProps {
  open: boolean
  onClick: () => void
  label?: string
  openLabel?: string
}

export function AddNewButton({
  open,
  onClick,
  label = 'Adicionar novo',
  openLabel = 'Cancelar',
}: AddNewButtonProps) {
  return (
    <Button variant={open ? 'outline' : 'primary'} onClick={onClick}>
      {open ? openLabel : label}
    </Button>
  )
}
