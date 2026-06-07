import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const REVEAL_SELECTOR = '[data-reveal-target]'
const REVEAL_EXCLUDE = '[role="dialog"], [data-reveal-skip]'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isRevealCandidate(element: Element) {
  return (
    element.matches(REVEAL_SELECTOR) &&
    !element.closest(REVEAL_EXCLUDE)
  )
}

function clearRevealState(root: HTMLElement) {
  root.querySelectorAll(`${REVEAL_SELECTOR}[data-revealed]`).forEach((node) => {
    const element = node as HTMLElement
    element.classList.remove('revealItem')
    element.removeAttribute('data-revealed')
    element.style.removeProperty('--reveal-index')
  })
}

function applyReveal(root: HTMLElement, onlyNew = false) {
  if (prefersReducedMotion()) return

  const candidates = Array.from(root.querySelectorAll(REVEAL_SELECTOR)).filter(
    isRevealCandidate,
  ) as HTMLElement[]

  const items = onlyNew
    ? candidates.filter((element) => !element.hasAttribute('data-revealed'))
    : candidates

  if (items.length === 0) return

  const baseIndex = onlyNew
    ? root.querySelectorAll(`${REVEAL_SELECTOR}[data-revealed]`).length
    : 0

  items.forEach((element) => {
    element.classList.remove('revealItem')
    element.style.removeProperty('--reveal-index')
  })

  void root.offsetHeight

  items.forEach((element, offset) => {
    const index = baseIndex + offset
    element.style.setProperty('--reveal-index', String(index))
    element.classList.add('revealItem')
    element.setAttribute('data-revealed', 'true')
  })
}

type PageRevealProps = {
  children: React.ReactNode
}

export function PageReveal({ children }: PageRevealProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    clearRevealState(root)
    applyReveal(root)

    const observer = new MutationObserver(() => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }

      debounceRef.current = window.setTimeout(() => {
        applyReveal(root, true)
      }, 50)
    })

    observer.observe(root, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
    }
  }, [location.pathname])

  return (
    <div ref={rootRef} className="pageRevealRoot">
      {children}
    </div>
  )
}

export const REVEAL_TARGET_ATTR = 'data-reveal-target'
