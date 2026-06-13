/**
 * Shared utility: extract the real Algorand tx ID from the x402 payment header.
 *
 * The middleware puts the verified payment payload in the `payment-signature` (or
 * `x-payment`) header as a base64-encoded JSON object. For the AVM exact scheme
 * the payload contains the signed transaction group; we compute the tx ID from the
 * payment transaction bytes — this matches the ID that will appear on LoRa after
 * the facilitator broadcasts it.
 */

import type { Context } from 'hono';
import { decodePaymentSignatureHeader } from '@x402/core/http';
import { isExactAvmPayload, getTransactionId, decodeTransaction } from '@x402/avm';

export const LORA_BASE = 'https://lora.algokit.io/testnet/transaction';

export function extractTxId(c: Context): string {
  const raw =
    c.req.header('payment-signature') ??
    c.req.header('x-payment') ??
    '';

  if (!raw) {
    console.warn('[tx] No payment header found on context');
    return 'no-payment-header';
  }

  try {
    const payment = decodePaymentSignatureHeader(raw);
    const p = payment.payload;

    if (isExactAvmPayload(p)) {
      const txBytes = decodeTransaction(p.paymentGroup[p.paymentIndex]);
      const txId = getTransactionId(txBytes);
      console.log(`[tx] Extracted Algorand tx ID: ${txId}`);
      return txId;
    }

    console.warn('[tx] Payload is not ExactAvmPayload:', typeof p);
    return 'unknown-scheme';
  } catch (err) {
    console.error('[tx] Failed to decode payment header:', err);
    return 'decode-error';
  }
}

export function loraUrl(txId: string): string {
  return `${LORA_BASE}/${txId}`;
}
