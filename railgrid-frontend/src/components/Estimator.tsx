import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Zap, Clock, DollarSign, Cpu, ExternalLink } from 'lucide-react'
import { type Provider, type EstimateResult, API_BASE } from '../lib/api'
import { x402Post, WalletNotConnectedError, PaymentRejectedError } from '../lib/x402client'
import WordsPullUpMultiStyle from './animations/WordsPullUpMultiStyle'

const TASK_TYPES = [
  { value: 'image_generation', label: 'Image Generation', desc: 'Stable Diffusion / SDXL' },
  { value: 'text_inference', label: 'Text Inference', desc: 'LLaMA / Mistral' },
  { value: 'video_render', label: 'Video Render', desc: 'FFmpeg / CUDA effects' },
  { value: '3d_render', label: '3D Render', desc: 'Blender scene' },
  { value: 'object_detection', label: 'Object Detection', desc: 'YOLOv8 batch' },
  { value: 'fine_tuning', label: 'Fine-Tuning', desc: 'LoRA adapter training' },
]


interface Props {
  provider: Provider | null
  onEstimate: (result: EstimateResult, taskType: string) => void
}

type UIState = 'idle' | 'loading' | 'done'

export default function Estimator({ provider, onEstimate }: Props) {
  const [taskType, setTaskType] = useState('image_generation')
  const [steps, setSteps] = useState(30)
  const [uiState, setUiState] = useState<UIState>('idle')
  const [result, setResult] = useState<EstimateResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const selectedTask = TASK_TYPES.find((t) => t.value === taskType)!

  async function handleEstimate() {
    if (!provider) return
    setErrorMsg(null)
    setUiState('loading')
    try {
      // Real x402 call — Pera Wallet popup fires inside x402Post
      const est = await x402Post<EstimateResult>(`${API_BASE}/estimate`, {
        task_type: taskType,
        steps,
        provider_id: provider.id,
      })
      setResult(est)
      onEstimate(est, taskType)
      setUiState('done')
    } catch (err) {
      if (err instanceof WalletNotConnectedError) {
        setErrorMsg('Connect your Pera Wallet first (button bottom-right)')
      } else if (err instanceof PaymentRejectedError) {
        setErrorMsg('Payment cancelled')
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Request failed')
      }
      setUiState('idle')
    }
  }

  return (
    <section id="estimate" className="bg-black py-20 md:py-28 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10 md:mb-14">
          <p className="text-[10px] sm:text-xs text-primary/40 uppercase tracking-widest mb-4">
            Estimator
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal text-left">
            <WordsPullUpMultiStyle
              segments={[
                { text: 'Know the cost', className: 'text-primary font-normal' },
                {
                  text: 'before you commit.',
                  className: 'text-gray-500 font-normal',
                },
              ]}
              wrapperClassName="justify-start"
            />
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left — form */}
          <div className="bg-[#101010] rounded-2xl p-6 md:p-8 space-y-6">
            {/* Provider display */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-primary/10">
              <Cpu size={16} className="text-primary/40 flex-shrink-0" />
              {provider ? (
                <div>
                  <p className="text-xs text-primary font-medium">{provider.gpu}</p>
                  <p className="text-[10px] text-gray-500">
                    ${provider.price_per_second.toFixed(4)}/sec · score {provider.benchmark_score}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Select a GPU node above first</p>
              )}
            </div>

            {/* Task type selector */}
            <div>
              <label className="block text-[10px] text-primary/40 uppercase tracking-widest mb-3">
                Task type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TASK_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTaskType(t.value)}
                    className={`text-left p-3 rounded-xl border text-xs transition-all duration-150 ${
                      taskType === t.value
                        ? 'border-primary/40 bg-primary/5 text-primary'
                        : 'border-primary/10 text-gray-500 hover:border-primary/20'
                    }`}
                  >
                    <span className="block font-medium mb-0.5">{t.label}</span>
                    <span className="text-[10px] opacity-60">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Steps slider */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] text-primary/40 uppercase tracking-widest">
                  Steps
                </label>
                <span className="text-xs text-primary font-medium">{steps}</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={steps}
                onChange={(e) => setSteps(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-gray-600">10 (fast)</span>
                <span className="text-[9px] text-gray-600">100 (quality)</span>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleEstimate}
              disabled={!provider || uiState === 'loading'}
              className="w-full group flex items-center justify-between bg-primary text-black rounded-full px-5 py-2.5 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              <span>{uiState === 'loading' ? 'Waiting for wallet…' : 'Estimate cost'}</span>
              <span className="bg-black rounded-full w-8 h-8 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <ArrowRight size={14} className="text-primary" />
              </span>
            </button>

            {errorMsg && (
              <p className="text-[10px] text-red-400/80 text-center">{errorMsg}</p>
            )}

            <p className="text-[10px] text-gray-600 text-center">
              Costs $0.001 USDC via x402 · Pera Wallet signs the real Algorand tx
            </p>
          </div>

          {/* Right — payment modal / result */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {uiState === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#101010] rounded-2xl p-6 md:p-8 h-full flex flex-col items-center justify-center text-center gap-4 min-h-[300px]"
                >
                  <div className="w-14 h-14 rounded-2xl bg-black/60 border border-primary/10 flex items-center justify-center">
                    <Zap size={24} className="text-primary/30" />
                  </div>
                  <p className="text-gray-500 text-sm">
                    Select a task type and click "Estimate cost" to see how long your job will take
                    and what it'll cost.
                  </p>
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
                  <p className="text-[10px] text-gray-600">Sending $0.001 USDC on Algorand TestNet</p>
                </motion.div>
              )}

              {uiState === 'done' && result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#101010] rounded-2xl p-6 md:p-8 min-h-[300px] flex flex-col gap-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-primary/40 uppercase tracking-widest">
                      Estimate
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                        result.confidence === 'high'
                          ? 'bg-emerald-900/40 text-emerald-400'
                          : 'bg-yellow-900/30 text-yellow-400'
                      }`}
                    >
                      {result.confidence} confidence
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/50 rounded-xl p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Clock size={12} className="text-primary/40" />
                        <span className="text-[10px] text-primary/40 uppercase tracking-widest">
                          Duration
                        </span>
                      </div>
                      <p className="text-2xl font-medium text-primary">
                        {result.estimated_seconds}s
                      </p>
                    </div>
                    <div className="bg-black/50 rounded-xl p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <DollarSign size={12} className="text-primary/40" />
                        <span className="text-[10px] text-primary/40 uppercase tracking-widest">
                          Cost
                        </span>
                      </div>
                      <p className="text-2xl font-medium text-primary">
                        ${result.estimated_cost_usdc.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-black/40 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">GPU</span>
                      <span className="text-primary/80">{result.gpu}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Rate</span>
                      <span className="text-primary/80">
                        ${result.price_per_second.toFixed(4)} / sec
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Task</span>
                      <span className="text-primary/80">{selectedTask.label}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-900/10 border border-emerald-900/30">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0" />
                    <p className="text-[10px] text-emerald-400/80 flex-1">
                      $0.001 USDC confirmed on Algorand TestNet
                    </p>
                    {result.payment_explorer_url && (
                      <a
                        href={result.payment_explorer_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[10px] text-emerald-400/60 hover:text-emerald-400 transition-colors flex-shrink-0"
                      >
                        LoRa <ExternalLink size={10} />
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => setUiState('idle')}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors text-center"
                  >
                    Reset estimator
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
