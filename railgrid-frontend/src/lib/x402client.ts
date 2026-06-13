/**
 * Real x402 payment client for Algorand TestNet.
 *
 * Flow for every gated call:
 *  1. Attempt the request (no payment header)
 *  2. Server returns 402 — requirements encoded in PAYMENT-REQUIRED header (x402 v2)
 *  3. Build the Algorand USDC transfer tx via ExactAvmScheme
 *  4. Sign it with Pera Wallet (user sees the wallet popup)
 *  5. Encode signed payload → X-Payment header
 *  6. Retry the request — server verifies on-chain → returns real response
 *
 * The tx ID returned in responses is the REAL Algorand TestNet transaction,
 * visible on LoRa: https://lora.algokit.io/testnet/transaction/<txId>
 */

import algosdk from 'algosdk'
import { ExactAvmScheme } from '@x402/avm'
import { encodePaymentSignatureHeader, decodePaymentRequiredHeader } from '@x402/core/http'
import type { ClientAvmSigner } from '@x402/avm'
import type { PaymentRequired } from '@x402/core/types'
import { peraWallet, getAddress } from './wallet'

export class WalletNotConnectedError extends Error {
  constructor() { super('Connect your Pera Wallet first') }
}

export class PaymentRejectedError extends Error {
  constructor() { super('Payment rejected — wallet sign cancelled') }
}

/** Adapt Pera Wallet to the ClientAvmSigner interface expected by ExactAvmScheme */
function makeClientSigner(address: string): ClientAvmSigner {
  return {
    address,
    async signTransactions(
      txns: Uint8Array[],
      indexesToSign?: number[]
    ): Promise<(Uint8Array | null)[]> {
      // Decode raw bytes to algosdk Transaction objects
      const decoded = txns.map((b) => algosdk.decodeUnsignedTransaction(b))

      // Build SignerTransaction groups for Pera
      // Pass signers=[] for transactions the user should NOT sign (fee payer slots)
      const txGroup = decoded.map((txn, i) => ({
        txn,
        signers: indexesToSign && !indexesToSign.includes(i) ? [] : undefined,
      }))

      let signed: Uint8Array[]
      try {
        signed = await peraWallet.signTransaction([txGroup])
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('cancel') || msg.includes('reject') || msg.includes('denied')) {
          throw new PaymentRejectedError()
        }
        throw err
      }

      // Map back: slots we didn't ask to sign → null
      let signedIdx = 0
      return txns.map((_, i) => {
        const shouldSign = !indexesToSign || indexesToSign.includes(i)
        if (shouldSign) return signed[signedIdx++] ?? null
        return null
      })
    },
  }
}

/**
 * Make an HTTP request. If the server returns 402, automatically:
 *  - Decodes the payment requirements
 *  - Triggers Pera Wallet to sign the Algorand USDC transfer
 *  - Retries with the real X-Payment header
 *
 * Throws WalletNotConnectedError if no wallet is connected.
 * Throws PaymentRejectedError if the user cancels the wallet signing.
 */
export async function x402Fetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // First attempt — no payment header
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  })

  if (res.status !== 402) return res

  // ── Payment required ──────────────────────────────────────────────
  const address = getAddress()
  if (!address) throw new WalletNotConnectedError()

  // x402 v2: payment requirements are in the PAYMENT-REQUIRED header (base64-encoded),
  // not the body (body is {} by design)
  const paymentRequiredHeader = res.headers.get('PAYMENT-REQUIRED') ?? res.headers.get('payment-required')
  if (!paymentRequiredHeader) throw new Error('No PAYMENT-REQUIRED header in 402 response')
  const paymentRequired: PaymentRequired = decodePaymentRequiredHeader(paymentRequiredHeader)
  const requirements = paymentRequired.accepts?.[0]
  if (!requirements) throw new Error('No payment requirements in 402 response')

  // Build and sign the Algorand transaction
  const signer = makeClientSigner(address)
  const scheme = new ExactAvmScheme(signer)
  const partialPayload = await scheme.createPaymentPayload(
    paymentRequired.x402Version ?? 2,
    requirements
  )

  // v2 requires the full PaymentPayload shape — the server's findMatchingRequirements
  // does deepEqual(requirement, paymentPayload.accepted), so `accepted` must be present.
  const paymentPayload = {
    x402Version: partialPayload.x402Version,
    payload: partialPayload.payload,
    resource: paymentRequired.resource,
    accepted: requirements,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentHeader = encodePaymentSignatureHeader(paymentPayload as any)

  // Retry with payment — send both header names the server might check
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
      'X-Payment': paymentHeader,
      'Payment-Signature': paymentHeader,
    },
  })
}

/** Convenience wrappers */
export async function x402Post<T>(url: string, body: unknown): Promise<T> {
  const res = await x402Fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    // Log raw error so we can debug payment rejections in the console
    console.error(`[x402] ${res.status} from ${url}:`, text)
    let parsed: { error?: string } = {}
    try { parsed = JSON.parse(text) } catch { /* ignore */ }
    throw new Error(parsed.error ?? text)
  }
  return res.json() as Promise<T>
}
