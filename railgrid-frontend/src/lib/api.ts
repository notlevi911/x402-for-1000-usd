export const API_BASE = 'http://localhost:4021'

export interface Provider {
  id: string
  gpu: string
  vram_gb: number
  price_per_second: number
  benchmark_score: number
  available: boolean
  registered_at: string
}

export interface EstimateResult {
  estimated_seconds: number
  estimated_cost_usdc: number
  price_per_second: number
  confidence: 'low' | 'medium' | 'high'
  provider: string
  gpu: string
  payment_tx_id?: string
  payment_explorer_url?: string
}

export interface JobResult {
  job_id: string
  tx_id: string
  explorer_url: string
  status: 'running' | 'complete' | 'cancelled'
  estimated_seconds: number
}

export interface JobStatus {
  id: string
  task_type: string
  status: 'running' | 'complete' | 'cancelled'
  duration_seconds?: number
  cost_algo?: number
  tx_id: string
  explorer_url: string
  output?: { type: string; url: string; preview?: string }
}

export interface PaymentRequiredError {
  type: 'payment_required'
  payment: unknown
}

export async function getProviders(): Promise<Provider[]> {
  const res = await fetch(`${API_BASE}/providers`)
  if (!res.ok) throw new Error('Failed to fetch providers')
  return res.json()
}

export async function estimate(params: {
  task_type: string
  steps: number
  provider_id?: string
}): Promise<EstimateResult | PaymentRequiredError> {
  const res = await fetch(`${API_BASE}/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (res.status === 402) {
    const payment = await res.json()
    return { type: 'payment_required', payment }
  }
  if (!res.ok) throw new Error('Estimate failed')
  return res.json()
}

export async function estimateWithPayment(
  params: { task_type: string; steps: number; provider_id?: string },
  paymentSig: string
): Promise<EstimateResult> {
  const res = await fetch(`${API_BASE}/estimate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Payment': paymentSig,
      'Payment-Signature': paymentSig,
    },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error('Estimate failed after payment')
  return res.json()
}

export async function runJob(params: {
  task_type: string
  steps: number
  provider_id: string
  max_algo: number
}): Promise<JobResult | PaymentRequiredError> {
  const res = await fetch(`${API_BASE}/jobs/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (res.status === 402) {
    const payment = await res.json()
    return { type: 'payment_required', payment }
  }
  if (!res.ok) throw new Error('Job run failed')
  return res.json()
}

export async function runJobWithPayment(
  params: { task_type: string; steps: number; provider_id: string; max_algo: number },
  paymentSig: string
): Promise<JobResult> {
  const res = await fetch(`${API_BASE}/jobs/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Payment': paymentSig,
      'Payment-Signature': paymentSig,
    },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error('Job run failed after payment')
  return res.json()
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`)
  if (!res.ok) throw new Error('Job not found')
  return res.json()
}
