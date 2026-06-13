import type { Context } from 'hono';
import { getProvider, getProviders } from './providers';
import { extractTxId, loraUrl } from './tx';

const TASK_COMPLEXITY: Record<string, number> = {
  image_generation: 1.2,
  text_inference: 0.3,
  video_render: 2.5,
  '3d_render': 2.0,
  object_detection: 0.8,
  fine_tuning: 4.0,
};

export function estimateDuration(
  task_type: string,
  steps: number,
  benchmark_score: number
): number {
  const base = 5;
  const complexity = TASK_COMPLEXITY[task_type] ?? 1.0;
  const throughput = benchmark_score / 100;
  const stepFactor = steps / 30;
  return Math.ceil((base / throughput) * complexity * stepFactor);
}

export async function handleEstimate(c: Context) {
  try {
    console.log('✓ PAYMENT VERIFIED - POST /estimate handler executing');

    // Extract the real Algorand tx ID from the verified payment header
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

    const estimated_seconds = estimateDuration(task_type, steps, provider.benchmark_score);
    const estimated_cost_usdc = +(estimated_seconds * provider.price_per_second).toFixed(6);

    const result = {
      estimated_seconds,
      estimated_cost_usdc,
      price_per_second: provider.price_per_second,
      confidence: 'high',
      provider: provider.id,
      gpu: provider.gpu,
      task_type,
      steps,
      // Real Algorand payment proof
      payment_tx_id: txId,
      payment_explorer_url: loraUrl(txId),
    };

    console.log(`[estimate] ${task_type} on ${provider.gpu}: ${estimated_seconds}s / $${estimated_cost_usdc} USDC`);
    console.log(`[estimate] Payment tx: ${txId}`);

    return c.json(result);
  } catch (err) {
    console.error('[estimate] Error:', err);
    return c.json({ error: 'Estimate failed' }, 500);
  }
}
