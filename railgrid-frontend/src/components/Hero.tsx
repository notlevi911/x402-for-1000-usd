import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import WordsPullUp from './animations/WordsPullUp'
import HeroCanvas from './HeroCanvas'

const NAV_ITEMS = ['Browse Nodes', 'Estimate', 'Run Job', 'Docs', 'MCP']

export default function Hero() {
  return (
    <section className="relative h-screen p-4 md:p-6">
      <div className="relative h-full rounded-2xl md:rounded-[2rem] overflow-hidden bg-[#0a0a0a]">
        {/* Animated particle network canvas */}
        <HeroCanvas />

        {/* Subtle grid overlay on top of canvas */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(222,219,200,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(222,219,200,0.025) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />

        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_50%_at_50%_80%,rgba(222,219,200,0.07),transparent)]" />

        {/* Noise overlay */}
        <div className="noise-overlay absolute inset-0 opacity-[0.4] mix-blend-overlay pointer-events-none" />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70" />

        {/* Navbar */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-black rounded-b-2xl md:rounded-b-3xl px-4 py-2 md:px-8">
            <nav className="flex items-center gap-3 sm:gap-6 md:gap-10 lg:gap-12">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(' ', '-')}`}
                  className="text-[10px] sm:text-xs md:text-sm transition-colors duration-200"
                  style={{ color: 'rgba(225, 224, 204, 0.8)' }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#E1E0CC')}
                  onMouseLeave={(e) =>
                    ((e.target as HTMLElement).style.color = 'rgba(225, 224, 204, 0.8)')
                  }
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-4 md:p-8 lg:p-10">
          <div className="grid grid-cols-12 items-end gap-4">
            {/* Giant heading */}
            <div className="col-span-12 lg:col-span-8">
              <h1
                className="text-[22vw] sm:text-[20vw] md:text-[18vw] lg:text-[16vw] xl:text-[15vw] font-medium leading-[0.85] tracking-[-0.07em] m-0 p-0"
                style={{ color: '#E1E0CC' }}
              >
                <WordsPullUp text="Rail" showAsterisk={false} />
                <WordsPullUp text="Grid" showAsterisk={true} />
              </h1>
            </div>

            {/* Right column */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 pb-2 lg:pb-4">
              {/* Tagline */}
              <motion.p
                className="text-xs sm:text-sm md:text-base text-primary/70"
                style={{ lineHeight: 1.3 }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                Pay-per-second GPU compute on Algorand. No account. No credit card. Submit a job,
                pay in USDC, get your output — on-chain proof included.
              </motion.p>

              {/* CTA */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <a
                  href="#browse-nodes"
                  className="group inline-flex items-center gap-2 hover:gap-3 transition-all duration-200 bg-primary rounded-full pl-4 sm:pl-5 pr-1 py-1 font-medium text-sm sm:text-base text-black"
                >
                  Start computing
                  <span className="bg-black rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 flex-shrink-0">
                    <ArrowRight size={16} className="text-primary" />
                  </span>
                </a>
              </motion.div>
            </div>
          </div>

          {/* Stats bar */}
          <motion.div
            className="mt-6 flex flex-wrap gap-6 md:gap-10 border-t border-primary/10 pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            {[
              { label: 'GPU nodes', value: '3 live' },
              { label: 'Network', value: 'Algorand TestNet' },
              { label: 'Min payment', value: '$0.001 USDC' },
              { label: 'Settlement', value: 'On-chain proof' },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-[9px] sm:text-[10px] text-primary/40 uppercase tracking-widest">
                  {label}
                </span>
                <span className="text-xs sm:text-sm text-primary/80 font-medium">{value}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
