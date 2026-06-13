import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  active: boolean
  activePulse: number  // 0–1, drives brightness
}

const NODE_COUNT = 62
const CONNECTION_DIST = 130
const MOUSE_REPEL_DIST = 110
const ACTIVATION_INTERVAL = 1800  // ms between random node activations

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -999, y: -999 })
  const animRef = useRef<number>(0)
  const lastActivationRef = useRef(0)
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    function resize() {
      canvas!.width = canvas!.offsetWidth
      canvas!.height = canvas!.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Init particles
    particlesRef.current = Array.from({ length: NODE_COUNT }, () => ({
      x: rand(0, canvas.width),
      y: rand(0, canvas.height),
      vx: rand(-0.25, 0.25),
      vy: rand(-0.25, 0.25),
      radius: rand(1.2, 2.8),
      alpha: rand(0.15, 0.45),
      active: false,
      activePulse: 0,
    }))

    function onMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    canvas.addEventListener('mousemove', onMouseMove)
    // Also track on window so particles react even in the padded area
    window.addEventListener('mousemove', (e) => {
      const rect = canvas!.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    })

    function draw(ts: number) {
      animRef.current = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, canvas!.width, canvas!.height)

      const particles = particlesRef.current
      const { x: mx, y: my } = mouseRef.current

      // Random activation
      if (ts - lastActivationRef.current > ACTIVATION_INTERVAL) {
        lastActivationRef.current = ts
        const idx = Math.floor(Math.random() * particles.length)
        particles[idx].active = true
      }

      // Update & draw particles
      for (const p of particles) {
        // Repel from mouse
        const dx = p.x - mx
        const dy = p.y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < MOUSE_REPEL_DIST && dist > 0) {
          const force = (MOUSE_REPEL_DIST - dist) / MOUSE_REPEL_DIST
          p.vx += (dx / dist) * force * 0.3
          p.vy += (dy / dist) * force * 0.3
        }

        // Dampen velocity
        p.vx *= 0.98
        p.vy *= 0.98

        // Clamp speed
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (speed > 0.8) { p.vx = (p.vx / speed) * 0.8; p.vy = (p.vy / speed) * 0.8 }
        if (speed < 0.05) { p.vx += rand(-0.02, 0.02); p.vy += rand(-0.02, 0.02) }

        p.x += p.vx
        p.y += p.vy

        // Wrap edges
        if (p.x < 0) p.x = canvas!.width
        if (p.x > canvas!.width) p.x = 0
        if (p.y < 0) p.y = canvas!.height
        if (p.y > canvas!.height) p.y = 0

        // Activation pulse
        if (p.active) {
          p.activePulse = Math.min(p.activePulse + 0.04, 1)
          if (p.activePulse >= 1) { p.active = false }
        } else {
          p.activePulse = Math.max(p.activePulse - 0.015, 0)
        }

        const glow = p.activePulse
        const finalAlpha = p.alpha + glow * 0.7
        const finalRadius = p.radius + glow * 3

        // Glow halo for active nodes
        if (glow > 0.05) {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, finalRadius * 6)
          grad.addColorStop(0, `rgba(222,219,200,${glow * 0.25})`)
          grad.addColorStop(1, 'rgba(222,219,200,0)')
          ctx.beginPath()
          ctx.arc(p.x, p.y, finalRadius * 6, 0, Math.PI * 2)
          ctx.fillStyle = grad
          ctx.fill()
        }

        // Dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, finalRadius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(222,219,200,${finalAlpha})`
        ctx.fill()
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DIST) {
            const opacity = (1 - dist / CONNECTION_DIST) * 0.12
            const pulse = (a.activePulse + b.activePulse) * 0.5
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(222,219,200,${opacity + pulse * 0.2})`
            ctx.lineWidth = 0.6 + pulse * 0.6
            ctx.stroke()
          }
        }
      }

      // Mouse proximity glow
      if (mx > 0 && my > 0) {
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, 180)
        grad.addColorStop(0, 'rgba(222,219,200,0.04)')
        grad.addColorStop(1, 'rgba(222,219,200,0)')
        ctx.beginPath()
        ctx.arc(mx, my, 180, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: 'block' }}
    />
  )
}
