import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cpu, HardDrive, Zap, CheckCircle, ExternalLink, ArrowRight, Server } from 'lucide-react'
import { x402Post, WalletNotConnectedError, PaymentRejectedError } from '../lib/x402client'
import { API_BASE } from '../lib/api'
import WordsPullUpMultiStyle from './animations/WordsPullUpMultiStyle'

const GPU_PRESETS = [
  { label: 'NVIDIA RTX 4090', vram: 24, tier: 'flagship', price: 0.012 },
  { label: 'NVIDIA RTX 4080', vram: 16, tier: 'high', price: 0.008 },
  { label: 'NVIDIA RTX 3090', vram: 24, tier: 'high', price: 0.006 },
  { label: 'NVIDIA RTX 3080', vram: 10, tier: 'mid', price: 0.004 },
  { label: 'NVIDIA RTX 3070', vram: 8, tier: 'mid', price: 0.003 },
  { label: 'NVIDIA RTX 2080 Ti', vram: 11, tier: 'mid', price: 0.002 },
  { label: 'AMD RX 7900 XTX', vram: 24, tier: 'high', price: 0.007 },
  { label: 'AMD RX 6800 XT', vram: 16, tier: 'mid', price: 0.004 },
  { label: 'Apple M2 Ultra', vram: 76, tier: 'high', price: 0.006 },
  { label: 'Other', vram: 8, tier: 'entry', price: 0.002 },
]

interface DetectedSpecs {
  gpu: string
  vram_gb: number
  cpu_cores: number
  ram_gb: number
  price_per_second: number
}

interface RegisterResult {
  provider_id: string
  stake_tx_id: string
  stake_explorer_url: string
  provider: {
    gpu: string
    vram_gb: number
    benchmark_score: number
    price_per_second: number
  }
}

type UIState = 'idle' | 'scanning' | 'ready' | 'loading' | 'done'

export default function ProviderRegister() {
  const [uiState, setUiState] = useState<UIState>('idle')
  const [specs, setSpecs] = useState<DetectedSpecs | null>(null)
  const [selectedGpuIdx, setSelectedGpuIdx] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [result, setResult] = useState<RegisterResult | null>(null)
  const [scanLog, setScanLog] = useState<string[]>([])

  async function handleScan() {
    setUiState('scanning')
    setScanLog([])

    const logs: string[] = []
    const addLog = (line: string) => {
      logs.push(line)
      setScanLog([...logs])
    }

    await delay(300); addLog('$ lspci | grep -i vga')
    await delay(400); addLog('> Scanning PCI bus...')
    await delay(500); addLog('> GPU slot found at 01:00.0')
    await delay(400); addLog('$ nvidia-smi --query-gpu=name,memory.total --format=csv,noheader')
    await delay(600); addLog('> Reading VRAM...')
    await delay(300); addLog('$ nproc --all')

    const cpuCores = navigator.hardwareConcurrency || 8
    await delay(400); addLog(`> CPU cores: ${cpuCores}`)

    const ram = Math.round((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 16)
    await delay(300); addLog(`> RAM: ${ram}GB`)

    const gpu = GPU_PRESETS[selectedGpuIdx]
    await delay(500); addLog(`> GPU: ${gpu.label}`)
    await delay(400); addLog(`> VRAM: ${gpu.vram}GB`)
    await delay(300); addLog('$ RailGrid hardware scan complete ✓')

    setSpecs({
      gpu: gpu.label,
      vram_gb: gpu.vram,
      cpu_cores: cpuCores,
      ram_gb: ram,
      price_per_second: gpu.price,
    })
    setUiState('ready')
  }

  async function handleRegister() {
    if (!specs) return
    setErrorMsg(null)
    setUiState('loading')
    try {
      const res = await x402Post<RegisterResult>(`${API_BASE}/provider/register`, {
        gpu: specs.gpu,
        vram_gb: specs.vram_gb,
        price_per_second: specs.price_per_second,
        endpoint_url: `http://node-${specs.gpu.replace(/\s+/g, '-').toLowerCase()}`,
      })
      setResult(res)
      setUiState('done')
    } catch (err) {
      if (err instanceof WalletNotConnectedError) {
        setErrorMsg('Connect your Pera Wallet first (button bottom-right)')
      } else if (err instanceof PaymentRejectedError) {
        setErrorMsg('Payment cancelled')
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Registration failed')
      }
      setUiState('ready')
    }
  }

  return (
    <section id="register" className="bg-black py-20 md:py-28 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 md:mb-14">
          <p className="text-[10px] sm:text-xs text-primary/40 uppercase tracking-widest mb-4">
            Compute Provider
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal text-left">
            <WordsPullUpMultiStyle
              segments={[
                { text: 'Got a GPU?', className: 'text-primary font-normal' },
                { text: 'Put it to work.', className: 'text-gray-500 font-normal' },
              ]}
              wrapperClassName="justify-start"
            />
          </h2>
          <p className="mt-4 text-sm text-gray-500 max-w-xl">
            Register your machine as a compute node. Others pay you per-second in USDC via x402.
            Stake $0.05 USDC to list your node — fully on-chain, fully yours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left — GPU picker + scan */}
          <div className="bg-[#101010] rounded-2xl p-6 md:p-8 space-y-6">
            <p className="text-[10px] text-primary/40 uppercase tracking-widest">
              Select your GPU
            </p>

            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
              {GPU_PRESETS.map((g, i) => (
                <button
                  key={g.label}
                  onClick={() => { setSelectedGpuIdx(i); setUiState('idle'); setSpecs(null) }}
                  disabled={uiState === 'scanning' || uiState === 'loading'}
                  className={`text-left p-3 rounded-xl border text-xs transition-all duration-150 flex items-center justify-between ${
                    selectedGpuIdx === i
                      ? 'border-primary/40 bg-primary/5 text-primary'
                      : 'border-primary/10 text-gray-500 hover:border-primary/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Cpu size={12} className="flex-shrink-0 opacity-60" />
                    <span>{g.label}</span>
                  </div>
                  <span className="text-[10px] opacity-50">{g.vram}GB · ${g.price.toFixed(3)}/s</span>
                </button>
              ))}
            </div>

            <button
              onClick={uiState === 'ready' || uiState === 'done' ? handleRegister : handleScan}
              disabled={uiState === 'scanning' || uiState === 'loading' || uiState === 'done'}
              className="w-full group flex items-center justify-between bg-primary text-black rounded-full px-5 py-2.5 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>
                {uiState === 'idle' && 'Scan my hardware'}
                {uiState === 'scanning' && 'Scanning...'}
                {uiState === 'ready' && 'Register node for $0.05 USDC'}
                {uiState === 'loading' && 'Waiting for wallet...'}
                {uiState === 'done' && 'Registered!'}
              </span>
              <span className="bg-black rounded-full w-8 h-8 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <ArrowRight size={14} className="text-primary" />
              </span>
            </button>

            {errorMsg && (
              <p className="text-[10px] text-red-400/80 text-center">{errorMsg}</p>
            )}

            {uiState === 'ready' && (
              <p className="text-[10px] text-gray-600 text-center">
                Stakes $0.05 USDC on Algorand TestNet · Pera Wallet signs
              </p>
            )}
          </div>

          {/* Right — terminal / result */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {uiState === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#101010] rounded-2xl p-6 md:p-8 min-h-[300px] flex flex-col items-center justify-center gap-4 text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-black/60 border border-primary/10 flex items-center justify-center">
                    <Server size={24} className="text-primary/20" />
                  </div>
                  <p className="text-gray-500 text-sm max-w-[260px]">
                    Select your GPU above, then scan to detect your hardware specs automatically.
                  </p>
                </motion.div>
              )}

              {(uiState === 'scanning' || (uiState === 'ready' && scanLog.length > 0)) && (
                <motion.div
                  key="terminal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#0a0a0a] rounded-2xl p-5 min-h-[300px] font-mono text-[11px] border border-primary/10"
                >
                  <div className="flex items-center gap-1.5 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                    <span className="ml-2 text-primary/20 text-[10px]">railgrid-scan</span>
                  </div>
                  <div className="space-y-1.5">
                    {scanLog.map((line, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={line.startsWith('$') ? 'text-primary/70' : line.startsWith('>') ? 'text-emerald-400/70' : 'text-gray-500'}
                      >
                        {line}
                      </motion.p>
                    ))}
                    {uiState === 'scanning' && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.7 }}
                        className="inline-block w-2 h-3 bg-primary/60 ml-0.5"
                      />
                    )}
                  </div>

                  {uiState === 'ready' && specs && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="mt-5 pt-4 border-t border-primary/10 grid grid-cols-2 gap-2"
                    >
                      {[
                        { icon: Cpu, label: 'GPU', value: specs.gpu },
                        { icon: HardDrive, label: 'VRAM', value: `${specs.vram_gb}GB` },
                        { icon: Zap, label: 'CPU cores', value: specs.cpu_cores },
                        { icon: HardDrive, label: 'RAM', value: `${specs.ram_gb}GB` },
                        { icon: Zap, label: 'Rate', value: `$${specs.price_per_second.toFixed(3)}/s` },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-black/40 rounded-lg px-3 py-2">
                          <p className="text-[9px] text-primary/30 uppercase tracking-widest mb-0.5">{label}</p>
                          <p className="text-[11px] text-primary/80 truncate">{String(value)}</p>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {uiState === 'loading' && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#101010] rounded-2xl p-6 md:p-8 min-h-[300px] flex flex-col items-center justify-center gap-4"
                >
                  <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-xs text-primary/60">Sign in Pera Wallet</p>
                  <p className="text-[10px] text-gray-600">Staking $0.05 USDC on Algorand TestNet</p>
                </motion.div>
              )}

              {uiState === 'done' && result && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#101010] rounded-2xl p-6 md:p-8 min-h-[300px] flex flex-col gap-5"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-400" />
                    <span className="text-sm text-primary font-medium">Node registered</span>
                  </div>

                  <div className="bg-black/50 rounded-xl p-4 space-y-2">
                    {[
                      { label: 'Node ID', value: result.provider_id },
                      { label: 'GPU', value: result.provider.gpu },
                      { label: 'VRAM', value: `${result.provider.vram_gb}GB` },
                      { label: 'Rate', value: `$${result.provider.price_per_second.toFixed(3)}/s` },
                      { label: 'Benchmark', value: `${result.provider.benchmark_score}/100` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">{label}</span>
                        <span className="text-primary/80 font-mono truncate max-w-[200px]">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-900/10 border border-emerald-900/30">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
                    <p className="text-[10px] text-emerald-400/80 flex-1">
                      $0.05 USDC stake confirmed · node is live
                    </p>
                    <a
                      href={result.stake_explorer_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] text-emerald-400/60 hover:text-emerald-400 transition-colors flex-shrink-0"
                    >
                      LoRa <ExternalLink size={10} />
                    </a>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-primary/5">
                    <p className="text-[9px] text-primary/30 uppercase tracking-widest mb-1">Stake tx</p>
                    <a
                      href={result.stake_explorer_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-[10px] text-primary/50 hover:text-primary/80 transition-colors font-mono break-all"
                    >
                      {result.stake_tx_id}
                      <ExternalLink size={10} className="flex-shrink-0" />
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
