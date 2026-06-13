import { useRef, type ReactNode, type CSSProperties } from 'react'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

export default function SpotlightCard({ children, className = '', style, onClick }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  function onMouseMove(e: React.MouseEvent) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--sx', `${e.clientX - rect.left}px`)
    el.style.setProperty('--sy', `${e.clientY - rect.top}px`)
  }

  function onMouseLeave() {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--sx', '-999px')
    el.style.setProperty('--sy', '-999px')
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className={`relative overflow-hidden ${className}`}
      style={{
        ...style,
        // spotlight radial gradient tracks --sx, --sy
        background: `
          radial-gradient(circle 180px at var(--sx, -999px) var(--sy, -999px), rgba(222,219,200,0.055), transparent 70%),
          ${style?.background ?? '#212121'}
        `,
      }}
    >
      {children}
    </div>
  )
}
