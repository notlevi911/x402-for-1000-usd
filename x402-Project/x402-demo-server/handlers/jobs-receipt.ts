import type { Context } from 'hono';
import { jobs } from './jobs-run';
import { loraUrl } from './tx';

export function handleGetReceipt(c: Context) {
  const id = c.req.param('id') ?? '';
  const job = jobs.get(id);
  if (!job) return c.json({ error: 'Job not found' }, 404);

  return c.json({
    job_id: job.id,
    task_type: job.task_type,
    gpu: job.gpu,
    status: job.status,
    started_at: job.started_at,
    completed_at: job.completed_at ?? null,
    duration_seconds: job.duration_seconds ?? null,
    cost_usdc: job.cost_usdc ?? null,
    // On-chain proof
    payment_tx_id: job.payment_tx_id,
    payment_explorer_url: job.payment_explorer_url,
    settled: job.settled,
    settled_tx_id: job.settled_tx_id ?? null,
    settled_explorer_url: job.settled_tx_id ? loraUrl(job.settled_tx_id) : null,
    network: 'Algorand TestNet',
  });
}
