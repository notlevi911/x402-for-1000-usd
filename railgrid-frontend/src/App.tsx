import { useState } from 'react'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import Providers from './components/Providers'
import Estimator from './components/Estimator'
import JobRunner from './components/JobRunner'
import ProviderRegister from './components/ProviderRegister'
import CustomCursor from './components/CustomCursor'
import WalletBar from './components/WalletBar'
import { type Provider, type EstimateResult } from './lib/api'

export default function App() {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [estimate, setEstimate] = useState<EstimateResult | null>(null)
  const [taskType, setTaskType] = useState('image_generation')

  return (
    <div className="bg-black min-h-screen cursor-none">
      <CustomCursor />
      <WalletBar />
      <Hero />
      <HowItWorks />
      <Providers onSelect={setSelectedProvider} selectedId={selectedProvider?.id ?? null} />
      <Estimator
        provider={selectedProvider}
        onEstimate={(result, type) => {
          setEstimate(result)
          setTaskType(type)
        }}
      />
      <JobRunner provider={selectedProvider} estimate={estimate} taskType={taskType} />
      <ProviderRegister />
      <footer className="bg-black border-t border-primary/5 py-10 px-4 md:px-8 text-center">
        <p className="text-[10px] text-primary/20 uppercase tracking-widest">
          RailGrid · x402 Build Challenge · India DevRetreat · Algorand · June 2026
        </p>
      </footer>
    </div>
  )
}
