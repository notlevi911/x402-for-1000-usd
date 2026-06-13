import { motion } from 'framer-motion'
import { Wallet, LogOut, Loader2 } from 'lucide-react'
import { useWallet } from '../lib/useWallet'

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export default function WalletBar() {
  const { address, connecting, connect, disconnect } = useWallet()

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-[9990]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {address ? (
        <div className="flex items-center gap-2 bg-[#101010] border border-primary/20 rounded-full px-4 py-2.5 shadow-lg">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
          <span className="text-xs text-primary/80 font-mono">{short(address)}</span>
          <span className="text-[9px] text-primary/30 uppercase tracking-widest">TestNet</span>
          <button
            onClick={disconnect}
            className="ml-1 text-primary/30 hover:text-primary/70 transition-colors"
            title="Disconnect"
          >
            <LogOut size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={connecting}
          className="group flex items-center gap-2 bg-primary text-black rounded-full px-5 py-2.5 font-medium text-sm shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {connecting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Wallet size={14} />
          )}
          {connecting ? 'Connecting…' : 'Connect Pera Wallet'}
        </button>
      )}
    </motion.div>
  )
}
