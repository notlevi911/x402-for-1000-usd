import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface Segment {
  text: string
  className?: string
}

interface Props {
  segments: Segment[]
  wrapperClassName?: string
}

export default function WordsPullUpMultiStyle({ segments, wrapperClassName = '' }: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  const allWords: { word: string; className: string }[] = segments.flatMap((seg) =>
    seg.text.split(' ').map((word) => ({ word, className: seg.className ?? '' }))
  )

  return (
    <span ref={ref} className={`inline-flex flex-wrap justify-center ${wrapperClassName}`}>
      {allWords.map(({ word, className }, i) => (
        <span key={i} className="overflow-hidden inline-block mr-[0.18em] mb-[0.05em]">
          <motion.span
            className={`inline-block ${className}`}
            initial={{ y: 20, opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  )
}
