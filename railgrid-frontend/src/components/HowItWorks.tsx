import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import WordsPullUpMultiStyle from './animations/WordsPullUpMultiStyle'

const BODY =
  'You browse available GPU nodes, each priced per second. You call the estimator — paying a tiny USDC fee — and get back a precise cost and duration before spending a cent on compute. Then you submit the job, pay the cap amount, and the network runs your task. When it completes, the on-chain receipt lands in your wallet history automatically.'

function AnimatedLetter({ char, index, total }: { char: string; index: number; total: number }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.9', 'end 0.1'] })
  const charProgress = index / total
  const opacity = useTransform(scrollYProgress, [charProgress - 0.1, charProgress + 0.05], [0.15, 1])

  if (char === ' ') return <span ref={ref}>&nbsp;</span>
  return (
    <motion.span ref={ref} style={{ opacity }} className="inline-block">
      {char}
    </motion.span>
  )
}

export default function HowItWorks() {
  const chars = BODY.split('')

  return (
    <section className="bg-black py-20 md:py-28 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-[#101010] rounded-2xl md:rounded-3xl p-8 md:p-12 lg:p-16 text-center">
          {/* Label */}
          <p className="text-primary text-[10px] sm:text-xs uppercase tracking-widest mb-6">
            How it works
          </p>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl max-w-3xl mx-auto leading-[0.95] sm:leading-[0.9] mb-10 md:mb-14">
            <WordsPullUpMultiStyle
              segments={[
                { text: 'Pay per second,', className: 'font-normal text-primary' },
                {
                  text: 'nothing more.',
                  className: 'font-serif italic text-primary/80',
                },
                {
                  text: 'On-chain proof every time.',
                  className: 'font-normal text-primary',
                },
              ]}
            />
          </h2>

          {/* Scroll-animated body */}
          <p
            className="text-xs sm:text-sm md:text-base max-w-2xl mx-auto leading-relaxed"
            style={{ color: '#DEDBC8' }}
          >
            {chars.map((char, i) => (
              <AnimatedLetter key={i} char={char} index={i} total={chars.length} />
            ))}
          </p>

          {/* Steps */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 md:mt-16 text-left">
            {[
              { n: '01', title: 'Browse nodes', desc: 'See GPU specs and price per second.' },
              {
                n: '02',
                title: 'Estimate cost',
                desc: 'Pay $0.001 USDC to get a time + cost estimate.',
              },
              {
                n: '03',
                title: 'Submit job',
                desc: 'Pay the estimated cap. Job runs immediately.',
              },
              {
                n: '04',
                title: 'Get receipt',
                desc: 'Output delivered. On-chain tx visible in LoRa.',
              },
            ].map(({ n, title, desc }, i) => (
              <motion.div
                key={n}
                className="p-4 rounded-xl border border-primary/10"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="text-[10px] text-primary/30 font-mono">{n}</span>
                <h3 className="text-sm font-medium text-primary mt-1 mb-1.5">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
