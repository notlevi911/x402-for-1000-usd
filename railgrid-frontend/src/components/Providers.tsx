import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getProviders, type Provider } from '../lib/api'
import WordsPullUpMultiStyle from './animations/WordsPullUpMultiStyle'
import SpotlightCard from './SpotlightCard'

const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'node_rtx3090',
    gpu: 'RTX 3090',
    vram_gb: 24,
    price_per_second: 0.003,
    benchmark_score: 85,
    available: true,
    registered_at: new Date().toISOString(),
  },
  {
    id: 'node_rtx4080',
    gpu: 'RTX 4080',
    vram_gb: 16,
    price_per_second: 0.004,
    benchmark_score: 92,
    available: true,
    registered_at: new Date().toISOString(),
  },
  {
    id: 'node_a100',
    gpu: 'A100',
    vram_gb: 80,
    price_per_second: 0.012,
    benchmark_score: 99,
    available: false,
    registered_at: new Date().toISOString(),
  },
]

interface Props {
  onSelect: (provider: Provider) => void
  selectedId: string | null
}

export default function Providers({ onSelect, selectedId }: Props) {
  const [providers, setProviders] = useState<Provider[]>(MOCK_PROVIDERS)

  useEffect(() => {
    getProviders()
      .then(setProviders)
      .catch(() => setProviders(MOCK_PROVIDERS))
  }, [])

  return (
    <section id="browse-nodes" className="bg-black py-20 md:py-28 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="mb-10 md:mb-14">
          <p className="text-[10px] sm:text-xs text-primary/40 uppercase tracking-widest mb-4">
            Available compute
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal text-left">
            <WordsPullUpMultiStyle
              segments={[
                { text: 'GPU nodes on the grid.', className: 'text-primary font-normal' },
                {
                  text: 'Pick one to get started.',
                  className: 'text-gray-500 font-normal',
                },
              ]}
              wrapperClassName="justify-start"
            />
          </h2>
        </div>

        {/* Provider cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {providers.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ delay: i * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
            <SpotlightCard
              onClick={() => p.available && onSelect(p)}
              className={`rounded-2xl p-6 border transition-all duration-200 ${
                p.available ? 'cursor-none hover:border-primary/30' : 'opacity-40 cursor-not-allowed'
              } ${selectedId === p.id ? 'border-primary/60' : 'border-transparent'}`}
              style={{ background: selectedId === p.id ? '#1a1a14' : '#212121' }}
            >
              {/* Availability pill */}
              <div className="flex items-center justify-between mb-5">
                <span
                  className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-medium ${
                    p.available
                      ? 'bg-emerald-900/40 text-emerald-400'
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  {p.available ? 'Available' : 'Offline'}
                </span>
                {selectedId === p.id && (
                  <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                    Selected
                  </span>
                )}
              </div>

              {/* GPU name */}
              <h3 className="text-xl sm:text-2xl font-medium text-primary mb-1">{p.gpu}</h3>
              <p className="text-xs text-gray-500 mb-5">{p.vram_gb} GB VRAM</p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/40 rounded-xl p-3">
                  <p className="text-[9px] text-primary/30 uppercase tracking-widest mb-1">
                    Price / sec
                  </p>
                  <p className="text-sm font-medium text-primary">
                    ${p.price_per_second.toFixed(4)}
                  </p>
                </div>
                <div className="bg-black/40 rounded-xl p-3">
                  <p className="text-[9px] text-primary/30 uppercase tracking-widest mb-1">
                    Benchmark
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-primary">{p.benchmark_score}</p>
                    <div className="flex-1 bg-black/60 rounded-full h-1">
                      <div
                        className="bg-primary/60 h-1 rounded-full"
                        style={{ width: `${p.benchmark_score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
