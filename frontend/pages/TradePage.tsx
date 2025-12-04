import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { Wallet, Settings, History, Info, Lock, Terminal as TerminalIcon, BarChart3, ChevronDown } from 'lucide-react';
import { Card, Button, StatBox, Badge } from '../components/UI';
import { ChartDataPoint } from '../types';

// Mock Data
const CHART_DATA: ChartDataPoint[] = Array.from({ length: 48 }, (_, i) => ({
  time: `${Math.floor(i/2)}:${i%2 === 0 ? '00' : '30'}`,
  value: 145 + Math.sin(i * 0.2) * 5 + Math.random() * 2,
  volume: Math.random() * 1000
}));

const ASSETS = [
  { symbol: 'SOL', name: 'Solana', balance: 142.5, price: 145.20, change: 2.4 },
  { symbol: 'USDC', name: 'USD Coin', balance: 54320.00, price: 1.00, change: 0.01 },
  { symbol: 'JUP', name: 'Jupiter', balance: 15000.00, price: 1.24, change: -1.2 },
  { symbol: 'BONK', name: 'Bonk', balance: 1000000.00, price: 0.000024, change: 5.6 },
];

export const TradePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'TRADE' | 'BORROW'>('TRADE');
  const [selectedAsset, setSelectedAsset] = useState('SOL');
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('SELL');
  const [amount, setAmount] = useState('');

  return (
    <div className="min-h-screen pb-12">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-primary animate-pulse rounded-none" />
          <h1 className="font-display text-2xl text-white tracking-widest">TRADING_TERMINAL <span className="text-textMuted text-sm font-mono tracking-normal">v2.4.0</span></h1>
        </div>
        <div className="flex gap-2">
            <Badge color="green">NETWORK: MAINNET</Badge>
            <Badge color="blue">MPC: CONNECTED</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card decorated className="col-span-1 bg-black group relative">
          <div className="flex justify-between items-start mb-4">
             <div className="p-2 border border-primary/30 text-primary bg-primary/5">
               <Wallet className="w-5 h-5" />
             </div>
             <span className="text-[10px] text-primary uppercase font-bold tracking-widest border border-primary/30 px-2 py-0.5">Connected</span>
          </div>
          <StatBox label="Total Value" value="$75,243.50" subtext="4.2 SOL Available" />
        </Card>

        <Card className="col-span-1 md:col-span-3 flex items-center justify-between bg-black">
           <div className="flex gap-12">
             <StatBox label="Buying Power" value="$54,320.00" />
             <StatBox label="Locked in Orders" value="$12,500.00" />
             <StatBox label="24h Volume" value="$1,240,000" trend={12.5} />
           </div>
           <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2 uppercase text-[10px]">
                <History className="w-3 h-3" /> Orders
              </Button>
              <Button variant="outline" size="sm" className="gap-2 uppercase text-[10px]">
                <Settings className="w-3 h-3" /> Config
              </Button>
           </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        
        {/* Left Column: Market List */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <Card className="flex-1 flex flex-col" noPadding decorated>
            <div className="p-3 border-b border-white/20 bg-white/5 flex justify-between items-center">
              <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">[ Markets ]</h3>
              <BarChart3 className="w-4 h-4 text-textMuted" />
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-1">
              {ASSETS.map((asset) => (
                <div 
                  key={asset.symbol}
                  onClick={() => setSelectedAsset(asset.symbol)}
                  className={`p-3 cursor-pointer transition-all border flex justify-between items-center group ${
                    selectedAsset === asset.symbol 
                      ? 'bg-primary/10 border-primary' 
                      : 'border-transparent hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-mono font-bold ${selectedAsset === asset.symbol ? 'text-white' : 'text-textMuted group-hover:text-white'}`}>
                        {asset.symbol}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-white">${asset.price.toFixed(asset.price < 1 ? 6 : 2)}</div>
                    <div className={`text-[10px] font-mono ${asset.change >= 0 ? 'text-primary' : 'text-red-500'}`}>
                       {asset.change > 0 ? '+' : ''}{asset.change}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          
          <Card className="p-4 border-l-4 border-l-primary bg-primary/5">
             <div className="flex items-center gap-2 mb-2">
                <TerminalIcon className="w-4 h-4 text-primary" />
                <h4 className="font-bold text-xs uppercase text-white tracking-wider">System Log</h4>
             </div>
             <div className="font-mono text-[10px] text-primary/80 space-y-1">
                <p>{'>'} Connecting to Arcium Node...</p>
                <p>{'>'} Handshake established.</p>
                <p>{'>'} Enclave verified (SGX).</p>
                <p className="animate-pulse">{'>'} Ready for encrypted intent.</p>
             </div>
          </Card>
        </div>

        {/* Middle Column: Order Entry */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card decorated className="flex-1 flex flex-col">
            <div className="flex border-b border-white/10 mb-6">
              <button 
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'TRADE' ? 'bg-white text-black' : 'text-textMuted hover:text-white hover:bg-white/5'}`}
                onClick={() => setActiveTab('TRADE')}
              >
                Trade
              </button>
              <button 
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'BORROW' ? 'bg-white text-black' : 'text-textMuted hover:text-white hover:bg-white/5'}`}
                onClick={() => setActiveTab('BORROW')}
              >
                Borrow
              </button>
            </div>

            <div className="flex-1 flex flex-col">
               <div className="flex gap-2 mb-8 bg-black border border-white/20 p-1">
                   <button 
                     onClick={() => setOrderType('BUY')}
                     className={`flex-1 py-2 font-bold uppercase text-sm tracking-wide transition-all ${
                        orderType === 'BUY' 
                        ? 'bg-primary text-black' 
                        : 'text-textMuted hover:text-white'
                     }`}
                   >
                       Buy
                   </button>
                   <button 
                     onClick={() => setOrderType('SELL')}
                     className={`flex-1 py-2 font-bold uppercase text-sm tracking-wide transition-all ${
                        orderType === 'SELL' 
                        ? 'bg-red-600 text-black' 
                        : 'text-textMuted hover:text-white'
                     }`}
                   >
                       Sell
                   </button>
               </div>

               <div className="space-y-6">
                   <div className="group">
                       <div className="flex justify-between text-[10px] uppercase text-textMuted mb-2 tracking-wider">
                           <span>Amount ({selectedAsset})</span>
                           <span className="text-white">Avail: 142.50</span>
                       </div>
                       <div className="relative">
                           <input 
                             type="text" 
                             value={amount}
                             onChange={(e) => setAmount(e.target.value)}
                             placeholder="0.00"
                             className="w-full bg-black border-2 border-white/20 focus:border-primary px-4 py-4 text-xl font-mono text-white placeholder:text-white/20 outline-none transition-colors rounded-none"
                           />
                           <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                             <button className="text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white px-2 py-1 uppercase">Max</button>
                             <span className="font-mono text-xs text-textMuted">{selectedAsset}</span>
                           </div>
                       </div>
                   </div>

                   <div>
                       <div className="flex justify-between text-[10px] uppercase text-textMuted mb-2 tracking-wider">
                           <span>Limit Price (USDC)</span>
                           <span className="text-primary underline cursor-pointer decoration-dotted">Set Market</span>
                       </div>
                       <div className="relative">
                           <input 
                             type="text" 
                             placeholder="145.20"
                             className="w-full bg-black border-2 border-white/20 focus:border-primary px-4 py-4 text-xl font-mono text-white placeholder:text-white/20 outline-none transition-colors rounded-none"
                           />
                           <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              <span className="font-mono text-xs text-textMuted">USDC</span>
                           </div>
                       </div>
                   </div>

                   {/* Privacy Visual */}
                   <div className="border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                           <Lock className="w-4 h-4 text-primary" />
                           <div>
                              <div className="text-xs font-bold text-white uppercase tracking-wider">Dark Pool Mode</div>
                              <div className="text-[10px] text-primary">Zero Information Leakage</div>
                           </div>
                       </div>
                       <div className="w-2 h-2 bg-primary animate-pulse" />
                   </div>
               </div>

               <div className="mt-auto pt-8">
                   <div className="space-y-2 mb-6 border-t border-white/10 pt-4">
                       <div className="flex justify-between text-xs font-mono">
                           <span className="text-textMuted">Execution Engine</span>
                           <span className="text-white">Arcium MPC</span>
                       </div>
                       <div className="flex justify-between text-xs font-mono">
                           <span className="text-textMuted">Est. Impact</span>
                           <span className="text-primary">~0.00%</span>
                       </div>
                       <div className="flex justify-between text-xs font-mono">
                           <span className="text-textMuted">Fee</span>
                           <span className="text-white">0.02%</span>
                       </div>
                   </div>

                   <Button 
                     fullWidth 
                     size="lg"
                     variant={orderType === 'BUY' ? 'primary' : 'danger'}
                     onClick={() => {}}
                     className="text-lg relative overflow-hidden group"
                    >
                      <span className="relative z-10">{orderType} {selectedAsset}</span>
                   </Button>
               </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Chart */}
        <div className="lg:col-span-5 flex flex-col h-full gap-6">
          <Card className="flex-1 flex flex-col min-h-[400px]" noPadding decorated>
             <div className="flex justify-between items-center p-4 border-b border-white/20">
                 <div className="flex items-center gap-2">
                    <span className="text-xl font-display text-white">{selectedAsset}/USDC</span>
                    <span className="text-primary font-mono text-lg">$145.20</span>
                 </div>
                 <div className="flex gap-1">
                    {['1H', '4H', '1D', '1W'].map(tf => (
                         <button 
                            key={tf} 
                            className={`text-[10px] font-bold px-2 py-1 ${tf === '1D' ? 'bg-primary text-black' : 'text-textMuted hover:text-white'}`}
                         >
                             {tf}
                         </button>
                     ))}
                 </div>
             </div>
             
             <div className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={CHART_DATA} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00FF41" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#00FF41" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#111" vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis 
                          orientation="right" 
                          domain={['dataMin - 2', 'dataMax + 2']} 
                          tick={{fill: '#666', fontSize: 10, fontFamily: 'monospace'}}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '0px' }}
                            itemStyle={{ color: '#00FF41', fontFamily: 'monospace' }}
                            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                            labelStyle={{ color: '#666', fontFamily: 'monospace', fontSize: '10px' }}
                        />
                        <Area 
                            type="step" 
                            dataKey="value" 
                            stroke="#00FF41" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorValue)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
             </div>
          </Card>
          
          {/* Order Book / Recent Trades */}
          <Card className="h-64 flex flex-col" noPadding decorated>
            <div className="flex border-b border-white/20">
                <div className="px-4 py-2 text-xs font-bold uppercase text-white bg-white/5 border-r border-white/20">Recent Settled</div>
                <div className="px-4 py-2 text-xs font-bold uppercase text-textMuted hover:text-white cursor-pointer">Order Book</div>
            </div>
            <div className="flex-1 overflow-auto">
                <table className="w-full text-right">
                    <thead className="text-[10px] text-textMuted uppercase bg-black sticky top-0">
                        <tr>
                            <th className="px-4 py-2 text-left font-normal">Time</th>
                            <th className="px-4 py-2 font-normal">Type</th>
                            <th className="px-4 py-2 font-normal">Size (SOL)</th>
                            <th className="px-4 py-2 font-normal">Price</th>
                        </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                        {[...Array(8)].map((_, i) => (
                            <tr key={i} className="hover:bg-white/5 border-b border-white/5 last:border-0">
                                <td className="px-4 py-2 text-left text-textMuted">14:23:{10+i}</td>
                                <td className={`px-4 py-2 ${i % 2 === 0 ? 'text-red-500' : 'text-primary'}`}>
                                    {i % 2 === 0 ? 'SELL' : 'BUY'}
                                </td>
                                <td className="px-4 py-2 text-white">{(Math.random() * 10).toFixed(2)}</td>
                                <td className="px-4 py-2 text-white">145.{20+i}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};