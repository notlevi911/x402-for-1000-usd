import { useState, useEffect } from 'react'
import { getAddress, onAddressChange, reconnect, connect, disconnect } from './wallet'

export function useWallet() {
  const [address, setAddress] = useState<string | null>(getAddress())
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    // Try to restore session on mount
    reconnect().then(setAddress)
    return onAddressChange(setAddress)
  }, [])

  async function handleConnect() {
    setConnecting(true)
    try {
      await connect()
    } catch {
      // user dismissed modal
    } finally {
      setConnecting(false)
    }
  }

  return { address, connecting, connect: handleConnect, disconnect }
}
