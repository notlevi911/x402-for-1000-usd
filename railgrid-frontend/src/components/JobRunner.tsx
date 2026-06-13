import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ExternalLink, CheckCircle, Loader2 } from 'lucide-react'
import { type Provider, type EstimateResult, API_BASE } from '../lib/api'
import { x402Post, WalletNotConnectedError, PaymentRejectedError } from '../lib/x402client'
import WordsPullUpMultiStyle from './animations/WordsPullUpMultiStyle'

interface RunResponse {
  job_id: string
  status: string
  gpu: string
  estimated_seconds: number
  estimated_cost_usdc: number
  payment_tx_id: string
  payment_explorer_url: string
}

interface JobStatus {
  id: string
  task_type: string
  status: 'running' | 'complete' | 'cancelled'
  duration_seconds?: number
  cost_usdc?: number
  payment_tx_id: string
  payment_explorer_url: string
  settled: boolean
  settled_tx_id?: string
  output?: { type: string; url: string; preview?: string }
}

interface JobState {
  jobId: string
  txId: string
  explorerUrl: string
  estimatedSeconds: number
  elapsedSeconds: number
  status: 'running' | 'complete'
  costUsdc?: number
  output?: { type: string; url: string; preview?: string }
}

type UIState = 'idle' | 'loading' | 'running' | 'done'

interface Props {
  provider: Provider | null
  estimate: EstimateResult | null
  taskType: string
}

export default function JobRunner({ provider, estimate, taskType }: Props) {
  const [uiState, setUiState] = useState<UIState>('idle')
  const [job, setJob] = useState<JobState | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function handleRun() {
    if (!provider || !estimate) return
    setErrorMsg(null)
    setUiState('loading')

    let runResp: RunResponse
    try {
      runResp = await x402Post<RunResponse>(`${API_BASE}/jobs/run`, {
        task_type: taskType,
        steps: 30,
        provider_id: provider.id,
        max_usdc: estimate.estimated_cost_usdc,
      })
    } catch (err) {
      if (err instanceof WalletNotConnectedError) {
        setErrorMsg('Connect your Pera Wallet first (button bottom-right)')
      } else if (err instanceof PaymentRejectedError) {
        setErrorMsg('Payment cancelled')
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Request failed')
      }
      setUiState('idle')
      return
    }

    const jobState: JobState = {
      jobId: runResp.job_id,
      txId: runResp.payment_tx_id,
      explorerUrl: runResp.payment_explorer_url,
      estimatedSeconds: runResp.estimated_seconds,
      elapsedSeconds: 0,
      status: 'running',
    }
    setJob(jobState)
    setUiState('running')

    // Tick elapsed time display
    intervalRef.current = setInterval(() => {
      setJob((prev) =>
        prev ? { ...prev, elapsedSeconds: Math.min(prev.elapsedSeconds + 1, prev.estimatedSeconds) } : prev
      )
    }, 1000)

    // Poll backend for job completion
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/jobs/${runResp.job_id}`)
        if (!res.ok) return
        const status: JobStatus = await res.json()
        if (status.status === 'complete') {
          clearInterval(pollRef.current!)
          clearInterval(intervalRef.current!)
          setJob((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'complete',
                  elapsedSeconds: status.duration_seconds ?? prev.estimatedSeconds,
                  costUsdc: status.cost_usdc,
                  output: status.output,
                }
              : prev
          )
          setUiState('done')
        }
      } catch {
        // silently retry
      }
    }, 1500)
  }

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
    },
    []
  )

  const progress = job ? job.elapsedSeconds / job.estimatedSeconds : 0

  return (
    <section id="run-job" className="relative bg-black py-20 md:py-28 px-4 md:px-8">
      <div className="bg-noise absolute inset-0 opacity-[0.15] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        <div className="mb-10 md:mb-14">
          <p className="text-[10px] sm:text-xs text-primary/40 uppercase tracking-widest mb-4">
            Job runner
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal text-left">
            <WordsPullUpMultiStyle
              segments={[
                { text: 'Submit. Pay. Get output.', className: 'text-primary font-normal' },
                { text: 'On-chain every time.', className: 'text-gray-500 font-normal' },
              ]}
              wrapperClassName="justify-start"
            />
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left — job details + run button */}
          <div className="bg-[#101010] rounded-2xl p-6 md:p-8 space-y-5">
            <p className="text-[10px] text-primary/40 uppercase tracking-widest">Job parameters</p>

            {estimate && provider ? (
              <>
                <div className="space-y-2">
                  {[
                    { label: 'GPU', value: provider.gpu },
                    { label: 'Task', value: taskType.replace(/_/g, ' ') },
                    { label: 'Estimated time', value: `${estimate.estimated_seconds}s` },
                    { label: 'Max cost', value: `$${estimate.estimated_cost_usdc.toFixed(4)} USDC` },
                    { label: 'Rate', value: `$${estimate.price_per_second.toFixed(4)} / sec` },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex justify-between items-center py-2 border-b border-primary/5 last:border-0"
                    >
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className="text-xs text-primary/80 font-medium">{value}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleRun}
                  disabled={uiState !== 'idle'}
                  className="w-full group flex items-center justify-between bg-primary text-black rounded-full px-5 py-2.5 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>
                    {uiState === 'idle'
                      ? 'Run job'
                      : uiState === 'loading'
                        ? 'Waiting for wallet...'
                        : 'Job submitted'}
                  </span>
                  <span className="bg-black rounded-full w-8 h-8 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                    <ArrowRight size={14} className="text-primary" />
                  </span>
                </button>

                {errorMsg && (
                  <p className="text-[10px] text-red-400/80 text-center">{errorMsg}</p>
                )}

                <p className="text-[10px] text-gray-600 text-center">
                  Costs $0.01 USDC via x402 · Pera Wallet signs the real Algorand tx
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <p className="text-sm text-gray-500">
                  Complete the Estimator above to populate job parameters.
                </p>
              </div>
            )}
          </div>

          {/* Right — status + output */}
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
                    <Loader2 size={24} className="text-primary/20" />
                  </div>
                  <p className="text-gray-500 text-sm max-w-[240px]">
                    Fill in the Estimator, then submit a job to see it run on-chain.
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
                  <p className="text-[10px] text-gray-600">Sending $0.01 USDC on Algorand TestNet</p>
                </motion.div>
              )}

              {(uiState === 'running' || uiState === 'done') && job && (
                <motion.div
                  key="running"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#101010] rounded-2xl p-6 md:p-8 flex flex-col gap-5"
                >
                  {/* Status header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {uiState === 'running' ? (
                        <Loader2 size={14} className="text-primary animate-spin" />
                      ) : (
                        <CheckCircle size={14} className="text-emerald-400" />
                      )}
                      <span className="text-xs text-primary font-medium">
                        {uiState === 'running' ? 'Running...' : 'Complete'}
                      </span>
                    </div>
                    <span className="text-[9px] text-primary/30 font-mono truncate max-w-[140px]">
                      {job.jobId}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-[10px] text-primary/40 mb-2">
                      <span>
                        {job.elapsedSeconds}s / {job.estimatedSeconds}s
                      </span>
                      <span>{Math.round(Math.min(progress, 1) * 100)}%</span>
                    </div>
                    <div className="h-1 bg-black/60 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress, 1) * 100}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>

                  {/* Output */}
                  <AnimatePresence>
                    {uiState === 'done' && job.output && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        {job.output.type === 'image' && (
                          <img
                            src={job.output.url}
                            alt="Job output"
                            className="w-full rounded-xl object-cover"
                          />
                        )}
                        {job.output.type === 'video' && (
                          <video
                            src={job.output.url}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full rounded-xl"
                          />
                        )}
                        {(job.output.type === 'text' ||
                          job.output.type === 'json' ||
                          job.output.type === 'file') && (
                          <pre className="bg-black/60 rounded-xl p-4 text-[10px] text-primary/70 overflow-auto max-h-40 whitespace-pre-wrap">
                            {job.output.preview ?? job.output.url}
                          </pre>
                        )}

                        {/* Receipt with real LoRa link */}
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-900/10 border border-emerald-900/30">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0" />
                          <p className="text-[10px] text-emerald-400/80 flex-1">
                            ${job.costUsdc?.toFixed(4) ?? '...'} USDC · {job.elapsedSeconds}s
                          </p>
                          <a
                            href={job.explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[10px] text-emerald-400/60 hover:text-emerald-400 transition-colors flex-shrink-0"
                          >
                            LoRa <ExternalLink size={10} />
                          </a>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Real Algorand tx ID */}
                  <div className="p-3 rounded-xl bg-black/40 border border-primary/5">
                    <p className="text-[9px] text-primary/30 uppercase tracking-widest mb-1">
                      Algorand tx
                    </p>
                    <a
                      href={job.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-[10px] text-primary/50 hover:text-primary/80 transition-colors font-mono break-all"
                    >
                      {job.txId}
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
