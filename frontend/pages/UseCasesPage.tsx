import React from 'react';
import { Card, Button, SectionTitle } from '../components/UI';
import { ArrowRight, Coins, Building2, TrendingUp, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UseCaseCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  scenario: string;
  solution: string;
  benefit: string;
  code: string;
}> = ({ title, icon, scenario, solution, benefit, code }) => (
  <Card decorated className="flex flex-col h-full hover:bg-white/5 transition-all duration-300">
    <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
       <div className="p-2 border border-primary/30 text-primary bg-primary/5">
          {icon}
       </div>
       <div className="font-mono text-xs text-textMuted uppercase">{code}</div>
    </div>
    <h3 className="text-2xl font-display text-white mb-6 uppercase tracking-wide">{title}</h3>
    
    <div className="space-y-6 flex-1 font-mono text-xs">
      <div>
        <h4 className="font-bold text-red-500 uppercase tracking-wider mb-2">[ Problem ]</h4>
        <p className="text-textMuted leading-relaxed">{scenario}</p>
      </div>
      <div>
        <h4 className="font-bold text-primary uppercase tracking-wider mb-2">[ Solution ]</h4>
        <p className="text-textMuted leading-relaxed">{solution}</p>
      </div>
    </div>
    
    <div className="mt-8 pt-4 border-t border-white/10">
       <div className="flex items-center gap-3 text-white font-bold uppercase text-xs">
          <ArrowRight className="w-4 h-4 text-primary" />
          {benefit}
       </div>
    </div>
  </Card>
);

export const UseCasesPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto px-6 py-16">
       <SectionTitle 
          title="Strategic Modules" 
          subtitle="Privacy protocols for institutional DeFi actors. Secure execution environments for large scale capital movement." 
        />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
         <UseCaseCard 
            code="MOD_01"
            title="DAO Treasury"
            icon={<Building2 className="w-6 h-6" />}
            scenario="A DAO needs to diversify $5M of its governance token. A public listing crashes the price (-15%) and signals distress."
            solution="The DAO places an encrypted Limit Sell. No one sees the order book depth. Matches occur silently."
            benefit="Zero market panic"
         />
         <UseCaseCard 
            code="MOD_02"
            title="Institutional Fund"
            icon={<Coins className="w-6 h-6" />}
            scenario="A crypto hedge fund needs to rebalance positions. MEV bots front-run their large transactions, eating 2-3% of profits."
            solution="Orders are matched in the MPC enclave. MEV bots cannot see the transaction content until settled."
            benefit="MEV Protection"
         />
         <UseCaseCard 
            code="MOD_03"
            title="Market Maker"
            icon={<TrendingUp className="w-6 h-6" />}
            scenario="Market makers need to offload toxic inventory without signaling weakness to other predatory trading firms."
            solution="Inventory listed in the dark pool. Only matching counterparties will ever know the liquidity existed."
            benefit="Inventory Secrecy"
         />
      </div>

      <div className="bg-black border border-primary/30 p-12 text-center relative overflow-hidden group">
         <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
         <div className="relative z-10 flex flex-col items-center">
            <Terminal className="w-12 h-12 text-primary mb-6" />
            <h2 className="text-4xl font-display uppercase text-white mb-6">Initialize Trading Sequence</h2>
            <p className="text-textMuted mb-8 max-w-xl mx-auto font-mono text-sm">
               Join the first wave of DAOs and institutions securing execution.
            </p>
            <Button size="lg" onClick={() => navigate('/trade')}>Launch Terminal</Button>
         </div>
      </div>
    </div>
  );
};