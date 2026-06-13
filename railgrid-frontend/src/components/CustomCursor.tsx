import { useEffect, useState, useRef } from 'react'
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'

interface Burst {
  id: number
  x: number
  y: number
}

export default function CustomCursor() {
  const mx = useMotionValue(-200)
  const my = useMotionValue(-200)

  // Ring follows with spring lag
  const ringX = useSpring(mx, { damping: 22, stiffness: 260, mass: 0.4 })
  const ringY = useSpring(my, { damping: 22, stiffness: 260, mass: 0.4 })

  // Outer slow trail
  const trailX = useSpring(mx, { damping: 16, stiffness: 140, mass: 0.6 })
  const trailY = useSpring(my, { damping: 16, stiffness: 140, mass: 0.6 })

  const [hovered, setHovered] = useState(false)
  const [clicking, setClicking] = useState(false)
  const [bursts, setBursts] = useState<Burst[]>([])
  const burstId = useRef(0)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX)
      my.set(e.clientY)
    }

    const onOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      setHovered(!!el.closest('a, button, [role="button"], input, select, [data-hover]'))
    }

    const onDown = (e: MouseEvent) => {
      setClicking(true)
      // Spawn burst particles
      const id = burstId.current++
      setBursts((prev) => [...prev, { id, x: e.clientX, y: e.clientY }])
      setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== id)), 600)
    }

    const onUp = () => setClicking(false)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseover', onOver)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
    }
  }, [mx, my])

  return (
    <>
      {/* Outer slow trail */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9995] rounded-full border border-primary/15"
        style={{
          x: trailX,
          y: trailY,
          translateX: '-50%',
          translateY: '-50%',
          width: hovered ? 56 : 44,
          height: hovered ? 56 : 44,
          transition: 'width 0.3s, height 0.3s',
        }}
      />

      {/* Spring ring */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9996] rounded-full border border-primary/40"
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          width: hovered ? 40 : clicking ? 20 : 28,
          height: hovered ? 40 : clicking ? 20 : 28,
          backgroundColor: hovered ? 'rgba(222,219,200,0.08)' : 'transparent',
          borderColor: hovered ? 'rgba(222,219,200,0.7)' : 'rgba(222,219,200,0.4)',
        }}
        transition={{ duration: 0.2 }}
      />

      {/* Dot — follows instantly, mix-blend-difference for cool invert effect */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9997] rounded-full bg-primary"
        style={{ x: mx, y: my, translateX: '-50%', translateY: '-50%' }}
        animate={{
          width: clicking ? 10 : hovered ? 6 : 4,
          height: clicking ? 10 : hovered ? 6 : 4,
          opacity: clicking ? 0.6 : 1,
        }}
        transition={{ duration: 0.15 }}
      />

      {/* Click bursts */}
      <AnimatePresence>
        {bursts.map(({ id, x, y }) => (
          <motion.div
            key={id}
            className="fixed top-0 left-0 pointer-events-none z-[9994] rounded-full border border-primary/60"
            initial={{ width: 0, height: 0, opacity: 0.8, x, y, translateX: '-50%', translateY: '-50%' }}
            animate={{ width: 60, height: 60, opacity: 0 }}
            exit={{}}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </AnimatePresence>
    </>
  )
}
