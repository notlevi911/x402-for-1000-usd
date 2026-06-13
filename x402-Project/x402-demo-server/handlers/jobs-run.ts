import type { Context } from 'hono';
import { getProvider, getProviders } from './providers';
import { estimateDuration } from './estimate';
import { extractTxId, loraUrl } from './tx';

export interface Job {
  id: string;
  task_type: string;
  provider_id: string;
  gpu: string;
  status: 'running' | 'complete' | 'cancelled';
  steps: number;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  cost_usdc?: number;
  // Real Algorand payment proof
  payment_tx_id: string;
  payment_explorer_url: string;
  // Settlement confirmation (populated by onAfterSettle hook)
  settled: boolean;
  settled_tx_id?: string;
  output?: {
    type: 'image' | 'video' | 'text' | 'json' | 'file';
    url: string;
    preview?: string;
  };
}

const MOCK_OUTPUTS: Record<string, Job['output']> = {
  image_generation: {
    type: 'image',
    url: 'https://picsum.photos/seed/railgrid/512/512',
  },
  text_inference: {
    type: 'text',
    url: '',
    preview:
      'Inference complete: "This is a mocked LLM response generated after GPU execution on RailGrid. The computation was verified on-chain via Algorand TestNet."',
  },
  video_render: {
    type: 'video',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
  },
  '3d_render': {
    type: 'image',
    url: 'https://picsum.photos/seed/blender3d/512/512',
  },
  object_detection: {
    type: 'json',
    url: '',
    preview: JSON.stringify(
      [
        { label: 'person', confidence: 0.97, bbox: [120, 80, 200, 320] },
        { label: 'laptop', confidence: 0.91, bbox: [340, 210, 180, 140] },
        { label: 'monitor', confidence: 0.88, bbox: [500, 150, 220, 180] },
      ],
      null,
      2
    ),
  },
  fine_tuning: {
    type: 'file',
    url: 'https://example.com/mock-lora-adapter.safetensors',
    preview: 'LoRA adapter trained successfully. Download link active for 24h.',
  },
};

// In-memory job store
export const jobs = new Map<string, Job>();

// Called by onAfterSettle hook in index.ts to mark a job as settled
export function markJobSettled(txId: string, settledTxId: string) {
  for (const job of jobs.values()) {
    if (job.payment_tx_id === txId && !job.settled) {
      job.settled = true;
      job.settled_tx_id = settledTxId;
      console.log(`[jobs] Job ${job.id} settlement confirmed: ${settledTxId}`);
    }
  }
}

export async function handleJobRun(c: Context) {
  try {
    console.log('✓ PAYMENT VERIFIED - POST /jobs/run handler executing');

    // Real Algorand tx ID from the payment header — never mocked
    const txId = extractTxId(c);

    const body = await c.req.json();
    const { task_type, steps = 30, provider_id } = body;

    if (!task_type) {
      return c.json({ error: 'task_type is required' }, 400);
    }

    const provider = provider_id
      ? getProvider(provider_id)
      : getProviders().find((p) => p.available);

    if (!provider) {
      return c.json({ error: 'No available provider found' }, 400);
    }

    const duration = estimateDuration(task_type, steps, provider.benchmark_score);
    const cost_usdc = +(duration * provider.price_per_second).toFixed(6);

    const job: Job = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      task_type,
      provider_id: provider.id,
      gpu: provider.gpu,
      status: 'running',
      steps,
      started_at: new Date().toISOString(),
      payment_tx_id: txId,
      payment_explorer_url: loraUrl(txId),
      settled: false,
    };

    jobs.set(job.id, job);

    console.log(`[jobs] Created job ${job.id} | tx: ${txId} | ${duration}s on ${provider.gpu}`);

    // Mock GPU execution — sleep for duration then mark complete
    setTimeout(() => {
      const j = jobs.get(job.id);
      if (!j || j.status !== 'running') return;
      j.status = 'complete';
      j.completed_at = new Date().toISOString();
      j.duration_seconds = duration;
      j.cost_usdc = cost_usdc;
      j.output = MOCK_OUTPUTS[task_type] ?? {
        type: 'text',
        url: '',
        preview: 'Job complete.',
      };
      console.log(`[jobs] Job ${j.id} complete after ${duration}s`);
    }, duration * 1000);

    return c.json({
      job_id: job.id,
      status: 'running',
      gpu: provider.gpu,
      estimated_seconds: duration,
      estimated_cost_usdc: cost_usdc,
      // Real Algorand tx — viewable on LoRa immediately
      payment_tx_id: txId,
      payment_explorer_url: loraUrl(txId),
    });
  } catch (err) {
    console.error('[jobs/run] Error:', err);
    return c.json({ error: 'Job submission failed' }, 500);
  }
}

export function handleGetJob(c: Context) {
  const id = c.req.param('id') ?? '';
  const job = jobs.get(id);
  if (!job) return c.json({ error: 'Job not found' }, 404);
  return c.json(job);
}
