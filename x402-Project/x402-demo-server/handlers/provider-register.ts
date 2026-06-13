import type { Context } from 'hono';
import { addProvider } from './providers';
import { extractTxId, loraUrl } from './tx';

export async function handleProviderRegister(c: Context) {
  try {
    console.log('✓ PAYMENT VERIFIED - POST /provider/register handler executing');

    // Real Algorand tx ID — never mocked
    const txId = extractTxId(c);

    const body = await c.req.json();
    const { gpu, vram_gb = 8, price_per_second, endpoint_url = 'http://mock-node' } = body;

    if (!gpu || !price_per_second) {
      return c.json({ error: 'gpu and price_per_second are required' }, 400);
    }

    const id = `node_${gpu.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;
    const provider = {
      id,
      gpu,
      vram_gb: Number(vram_gb),
      price_per_second: Number(price_per_second),
      benchmark_score: Math.floor(Math.random() * 40) + 60, // 60–100
      available: true,
      registered_at: new Date().toISOString(),
      registered_tx: txId,
      lora_url: loraUrl(txId),
    };

    addProvider(provider);

    console.log(`[register] Provider ${id} registered | stake tx: ${txId}`);

    return c.json({
      provider_id: id,
      message: 'Provider registered successfully',
      provider,
      stake_tx_id: txId,
      stake_explorer_url: loraUrl(txId),
    });
  } catch (err) {
    console.error('[register] Error:', err);
    return c.json({ error: 'Registration failed' }, 500);
  }
}
