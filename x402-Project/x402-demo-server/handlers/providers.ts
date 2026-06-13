import type { Context } from 'hono';

export interface Provider {
  id: string;
  gpu: string;
  vram_gb: number;
  price_per_second: number;
  benchmark_score: number;
  available: boolean;
  registered_at: string;
  registered_tx?: string;         // real Algorand tx ID from /provider/register
  lora_url?: string;
}

const store = new Map<string, Provider>();

// Seed three nodes so the demo works immediately
store.set('node_rtx3090', {
  id: 'node_rtx3090',
  gpu: 'RTX 3090',
  vram_gb: 24,
  price_per_second: 0.003,
  benchmark_score: 85,
  available: true,
  registered_at: new Date().toISOString(),
});
store.set('node_rtx4080', {
  id: 'node_rtx4080',
  gpu: 'RTX 4080',
  vram_gb: 16,
  price_per_second: 0.004,
  benchmark_score: 92,
  available: true,
  registered_at: new Date().toISOString(),
});
store.set('node_a100', {
  id: 'node_a100',
  gpu: 'A100',
  vram_gb: 80,
  price_per_second: 0.012,
  benchmark_score: 99,
  available: false,
  registered_at: new Date().toISOString(),
});

export const getProviders = () => [...store.values()];
export const getProvider = (id: string) => store.get(id);
export const addProvider = (p: Provider) => store.set(p.id, p);

export function handleGetProviders(c: Context) {
  return c.json(getProviders());
}

export function handleGetProvider(c: Context) {
  const provider = getProvider(c.req.param('id') ?? '');
  if (!provider) return c.json({ error: 'Provider not found' }, 404);
  return c.json(provider);
}
