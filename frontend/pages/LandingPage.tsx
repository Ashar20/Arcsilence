import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Zap, ArrowRight, EyeOff, BarChart3, Terminal } from 'lucide-react';
import { Button, Card, Badge, SectionTitle } from '../components/UI';

const FeatureGrid = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mx-auto mt-32">
    <Card decorated className="col-span-1 md:col-span-2 group border-white/20 hover:border-primary transition-colors">
      <div className="flex flex-col h-full justify-between">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-primary/10 border border-primary flex items-center justify-center text-primary">
              <Lock className="w-6 h-6" />
            </div>
            <Badge color="green">CORE_FEATURE</Badge>
          </div>
          <h3 className="text-3xl font-display text-white mb-4 uppercase">Zero Information Leakage</h3>
          <p className="text-textMuted font-mono text-sm leading-relaxed max-w-lg">
            Orders are encrypted using <span className="text-white">x25519 + RescueCipher</span>. 
            Matching occurs within an Arcium secure MPC enclave. Not even the operator sees your intent.
          </p>
        </div>
        <div className="h-48 w-full bg-grid-pattern border-t border-white/10 relative overflow-hidden flex items-center justify-center">
             <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent"></div>
            <div className="flex items-center gap-4 text-xs font-mono text-primary z-10">
              <span className="px-2 py-1 border border-primary/50 bg-black">[ ENCRYPTED ]</span>
              <div className="w-8 h-[1px] bg-primary"></div>
              <span className="px-2 py-1 border border-primary bg-primary text-black font-bold">[ MPC_MATCH ]</span>
              <div className="w-8 h-[1px] bg-primary"></div>
              <span className="px-2 py-1 border border-primary/50 bg-black">[ SETTLED ]</span>
            </div>
        </div>
      </div>
    </Card>

    <Card className="col-span-1 group border-white/20 hover:border-white transition-colors">
      <div className="mb-6">
        <div className="w-12 h-12 bg-white/5 border border-white/20 flex items-center justify-center mb-6 text-white">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h3 className="text-2xl font-display text-white mb-4 uppercase">Execution Quality</h3>
        <p className="text-textMuted font-mono text-sm">
          Eliminate front-running. Large DAO rebalances execute with minimal slippage.
        </p>
      </div>
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div>
           <div className="flex justify-between text-xs font-mono uppercase mb-1">
             <span className="text-textMuted">Slippage</span>
             <span className="text-primary">-0.01%</span>
           </div>
           <div className="w-full bg-white/10 h-2">
             <div className="w-[98%] h-full bg-primary" />
           </div>
        </div>
        <div>
           <div className="flex justify-between text-xs font-mono uppercase mb-1">
             <span className="text-textMuted">Impact</span>
             <span className="text-white">~0.00%</span>
           </div>
           <div className="w-full bg-white/10 h-2">
             <div className="w-[1%] h-full bg-white" />
           </div>
        </div>
      </div>
    </Card>

    <Card className="col-span-1 group border-white/20 hover:border-primary transition-colors">
      <div className="w-12 h-12 bg-primary/10 border border-primary/30 flex items-center justify-center mb-6 text-primary">
        <Shield className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-display text-white mb-2 uppercase">Trustless Verification</h3>
      <p className="text-textMuted font-mono text-xs leading-relaxed">
        Cryptographic attestations verify code execution without revealing inputs.
      </p>
    </Card>

    <Card className="col-span-1 group border-white/20 hover:border-blue-500 transition-colors">
      <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-6 text-blue-400">
        <Zap className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-display text-white mb-2 uppercase">Solana Native</h3>
      <p className="text-textMuted font-mono text-xs leading-relaxed">
        High-frequency matching with sub-second settlement times on the Solana network.
      </p>
    </Card>

    <Card className="col-span-1 group border-white/20 hover:border-purple-500 transition-colors">
      <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-6 text-purple-400">
        <EyeOff className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-display text-white mb-2 uppercase">Dark Liquidity</h3>
      <p className="text-textMuted font-mono text-xs leading-relaxed">
        Access deep liquidity sources without exposing your position to the public order book.
      </p>
    </Card>
  </div>
);

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full pt-20 pb-20 flex flex-col items-center text-center border-b border-white/10 bg-grid-pattern">
        <div className="mb-8">
           <Badge color="green">SYSTEM STATUS: ONLINE (DEVNET)</Badge>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-display uppercase text-white max-w-5xl mx-auto leading-[0.9] tracking-tight mb-8">
          Private Trading for <br />
          <span className="text-primary bg-black px-4">DAO Treasuries</span>
        </h1>
        
        <p className="text-lg md:text-xl text-textMuted font-mono max-w-2xl mx-auto leading-relaxed mb-12 border-l-2 border-primary pl-6 text-left md:text-center md:border-l-0 md:pl-0">
          Execute large rebalancing trades without moving markets. 
          The first on-chain dark pool powered by secure <span className="text-white">Multi-Party Computation</span>.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md">
          <Button size="lg" fullWidth onClick={() => navigate('/trade')}>Start Trading</Button>
          <Button size="lg" fullWidth variant="outline" onClick={() => navigate('/architecture')}>View Architecture</Button>
        </div>

        {/* Stats Strip */}
        <div className="mt-24 w-full max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-px bg-white/20 border border-white/20">
          {[
            { label: 'Total Volume', value: '$142M+' },
            { label: 'Avg Trade', value: '$250k' },
            { label: 'Improvement', value: '2.4%' },
            { label: 'Privacy', value: '100%' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center justify-center py-6 bg-black hover:bg-white/5 transition-colors">
              <span className="text-3xl font-display text-white">{stat.value}</span>
              <span className="text-[10px] text-primary uppercase tracking-widest mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <FeatureGrid />

      {/* DAO Call to Action */}
      <section className="w-full max-w-6xl mx-auto py-32">
        <div className="relative border-2 border-white/10 bg-black p-8 md:p-16 flex flex-col md:flex-row items-center gap-16">
          <div className="absolute top-0 right-0 p-4">
              <Terminal className="w-12 h-12 text-white/5" />
          </div>
          
          <div className="flex-1 relative z-10">
            <h2 className="text-4xl font-display uppercase text-white mb-8">The DAO Treasury Dilemma</h2>
            <div className="space-y-8 font-mono">
              <div className="flex gap-6">
                <div className="text-red-500 font-bold text-xl">01</div>
                <div>
                  <h4 className="text-white font-bold uppercase mb-2">Public DEXs signal intent</h4>
                  <p className="text-textMuted text-sm">Large governance token sales on Uniswap cause immediate panic selling before your trade even settles.</p>
                </div>
              </div>
              <div className="flex gap-6">
                 <div className="text-primary font-bold text-xl">02</div>
                <div>
                  <h4 className="text-white font-bold uppercase mb-2">ArcSilence protects value</h4>
                  <p className="text-textMuted text-sm">By encrypting orders, the market only sees the settlement after the fact. No signal, no panic.</p>
                </div>
              </div>
            </div>
            <div className="mt-12">
              <Button variant="secondary" onClick={() => navigate('/use-cases')}>Read DAO Case Study</Button>
            </div>
          </div>

          <div className="flex-1 w-full relative z-10">
            <div className="bg-white/5 border border-white/20 p-6 font-mono text-xs">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                <span className="text-textMuted uppercase">Simulated Execution</span>
                <Badge color="green">SAVED $42,500</Badge>
              </div>
              <div className="space-y-6">
                <div className="flex justify-between">
                  <span className="text-textMuted uppercase">Trade Size</span>
                  <span className="text-white">1,000,000 GOV</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-textMuted uppercase">Public DEX Quote</span>
                  <div className="text-right">
                     <span className="text-red-500 block">$945,000</span>
                     <span className="text-[10px] text-textMuted">Impact -5.5%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-primary/10 -mx-2 px-2 py-2 border-l-2 border-primary">
                  <span className="text-primary uppercase font-bold">ArcSilence Fill</span>
                   <div className="text-right">
                     <span className="text-white block">$987,500</span>
                     <span className="text-[10px] text-primary">Impact -1.25%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};