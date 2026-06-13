/**
 * Pera Wallet connection management.
 * Provides a singleton connector and reactive state helpers.
 */
import { PeraWalletConnect } from '@perawallet/connect'

export const peraWallet = new PeraWalletConnect({ chainId: 416002 }) // 416002 = TestNet

let _address: string | null = null
const _listeners = new Set<(addr: string | null) => void>()

function notify(addr: string | null) {
  _address = addr
  _listeners.forEach((fn) => fn(addr))
}

/** Reconnect an existing session on page load */
export async function reconnect(): Promise<string | null> {
  try {
    const accounts = await peraWallet.reconnectSession()
    const addr = accounts[0] ?? null
    notify(addr)
    peraWallet.connector?.on('disconnect', () => notify(null))
    return addr
  } catch {
    return null
  }
}

/** Open the Pera Wallet modal and connect */
export async function connect(): Promise<string> {
  const accounts = await peraWallet.connect()
  const addr = accounts[0]
  notify(addr)
  peraWallet.connector?.on('disconnect', () => notify(null))
  return addr
}

/** Disconnect */
export async function disconnect(): Promise<void> {
  await peraWallet.disconnect()
  notify(null)
}

/** Get current connected address (null if not connected) */
export function getAddress(): string | null {
  return _address
}

/** Subscribe to address changes */
export function onAddressChange(fn: (addr: string | null) => void): () => void {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}
