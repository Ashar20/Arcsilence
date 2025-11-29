import React from 'react';
import { Lock, Server, Database, ShieldCheck, Cpu, Key, ArrowDownToLine, Globe, ArrowDown } from 'lucide-react';

interface NodeData {
  id: string;
  title: string;
  icon: React.ReactNode;
  tag: string;
  description: string;
  codeSnippet?: string;
  desktopClass?: string;
}

const NODES: NodeData[] = [
  {
    id: 'local',
    title: "Local Encryption",
    icon: <Lock className="w-4 h-4" />,
    tag: "CLIENT",
    description: "Client generates ephemeral keys. Intent encrypted locally via x25519.",
    codeSnippet: `const eph = x25519.gen();\nconst enc = encrypt(order, eph);`,
    desktopClass: "top-[2%] left-[2%]"
  },
  {
    id: 'solana',
    title: "Solana Ledger",
    icon: <Globe className="w-4 h-4" />,
    tag: "ON-CHAIN",
    description: "Stores encrypted blobs. Enforces PDA access policies. Immutable log.",
    codeSnippet: `pub fn post(ctx: Context, blob: Vec<u8>) {\n  ctx.accounts.store.data = blob;\n}`,
    desktopClass: "top-[38%] left-1/2 -translate-x-1/2"
  },
  {
    id: 'mpc',
    title: "Arcium MPC",
    icon: <Cpu className="w-4 h-4" />,
    tag: "OFF-CHAIN",
    description: "TEE enclaves process orders. Matching occurs without revealing inputs.",
    codeSnippet: `// TEE Enclave\nfn match(orders) -> Match {\n  if a.price >= b.price { ... }\n}`,
    desktopClass: "top-[2%] right-[2%]"
  },
  {
    id: 'keys',
    title: "Key Protocol",
    icon: <Key className="w-4 h-4" />,
    tag: "ACCESS",
    description: "Threshold keys reconstructed only upon valid ZK match proof.",
    codeSnippet: `if verify_zkp(proof) {\n  let k = reconstruct(shards);\n}`,
    desktopClass: "bottom-[2%] right-[2%]"
  },
  {
    id: 'settlement',
    title: "Settlement",
    icon: <ArrowDownToLine className="w-4 h-4" />,
    tag: "FINALITY",
    description: "Atomic swap executed. Only final amounts visible on-chain.",
    codeSnippet: `transfer(a, b, amt);\ntransfer(b, a, amt);\nemit!(TradeExecuted);`,
    desktopClass: "bottom-[2%] left-[2%]"
  }
];

const ArchNode: React.FC<{
  node: NodeData;
  className?: string;
}> = ({ node, className = '' }) => {
  return (
    <div className={`w-full max-w-[280px] ${className}`}>
      <div className="relative group h-full">
        {/* Glow Effect */}
        <div className="absolute -inset-0.5 bg-primary/20 rounded-none blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
        
        {/* Card Body */}
        <div className="relative bg-black border border-white/20 p-4 flex flex-col gap-3 group-hover:border-primary transition-colors duration-300 h-full">
          <div className="flex items-center justify-between">
            <div className="p-1.5 border border-white/10 bg-white/5 text-white group-hover:text-primary group-hover:border-primary/50 transition-colors">
              {node.icon}
            </div>
            {node.tag && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 bg-white/5 border border-white/10 text-textMuted">
                {node.tag}
              </span>
            )}
          </div>
          
          <div>
            <h3 className="text-base font-display text-white uppercase mb-1 tracking-wide group-hover:text-primary transition-colors">{node.title}</h3>
            <p className="text-[11px] text-textMuted font-mono leading-tight">{node.description}</p>
          </div>

          {node.codeSnippet && (
            <div className="mt-auto pt-2">
              <div className="bg-white/5 border border-white/10 p-2 font-mono text-[9px] text-primary/80 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-0.5 h-full bg-primary/50"></div>
                <pre className="whitespace-pre-wrap font-mono">{node.codeSnippet}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// SVG Connector Component
const ConnectionLine: React.FC<{
  startX: string; // Percentage
  startY: string; // Percentage
  endX: string; // Percentage
  endY: string; // Percentage
  curvature?: number;
  label?: string;
  animDuration?: string;
}> = ({ startX, startY, endX, endY, curvature = 50, label, animDuration = "3s" }) => {
  // Convert percentages to coordinates for the 1000x600 viewBox
  const sx = parseFloat(startX) * 10;
  const sy = parseFloat(startY) * 6;
  const ex = parseFloat(endX) * 10;
  const ey = parseFloat(endY) * 6;

  const path = `M ${sx} ${sy} C ${sx + curvature} ${sy}, ${ex - curvature} ${ey}, ${ex} ${ey}`;

  return (
    <g>
      <path 
        d={path} 
        fill="none" 
        stroke="#222" 
        strokeWidth="2" 
      />
      <path 
        d={path} 
        fill="none" 
        stroke="#00FF41" 
        strokeWidth="1" 
        strokeDasharray="4 4"
        className="opacity-40"
      >
        <animate 
          attributeName="stroke-dashoffset" 
          from="100" 
          to="0" 
          dur={animDuration} 
          repeatCount="indefinite" 
        />
      </path>
    </g>
  );
};

export const ArchitecturePage: React.FC = () => {
  return (
    <div className="w-full pb-12">
      <div className="container mx-auto px-6 py-8 text-center">
        <h1 className="text-3xl md:text-5xl font-display text-white mb-2 uppercase">System Architecture</h1>
        <p className="text-textMuted font-mono text-xs uppercase tracking-wider">
          <span className="text-primary">Encryption</span> {'>>'} <span className="text-primary">MPC Match</span> {'>>'} <span className="text-primary">Settlement</span>
        </p>
      </div>

      {/* --- DESKTOP LAYOUT (>= 1024px) --- */}
      <div className="hidden lg:block relative w-full max-w-[1000px] mx-auto h-[500px] bg-[#050505] border border-white/10 mb-12 group">
        <div className="absolute inset-0 bg-[size:20px_20px] bg-grid-pattern opacity-10"></div>
        
        {/* SVG Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 1000 600" preserveAspectRatio="none">
           {/* Connections adjusted for tighter layout */}
           <ConnectionLine startX="28" startY="15" endX="40" endY="45" curvature={20} animDuration="4s" />
           <ConnectionLine startX="60" startY="45" endX="72" endY="15" curvature={20} animDuration="2s" />
           <ConnectionLine startX="85" startY="35" endX="85" endY="75" curvature={0} animDuration="6s" />
           <ConnectionLine startX="72" startY="85" endX="60" endY="55" curvature={20} animDuration="3s" />
           <ConnectionLine startX="40" startY="55" endX="28" endY="85" curvature={20} animDuration="2s" />
        </svg>

        {/* Nodes */}
        {NODES.map(node => (
          <div key={node.id} className={`absolute z-10 ${node.desktopClass}`}>
             <ArchNode node={node} />
          </div>
        ))}
      </div>

      {/* --- MOBILE / TABLET LAYOUT (< 1024px) --- */}
      <div className="lg:hidden container mx-auto px-6 mb-12 max-w-md">
         <div className="flex flex-col items-center gap-4 relative">
            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/10 -z-10 transform -translate-x-1/2" />
            {NODES.map((node, idx) => (
              <React.Fragment key={node.id}>
                <ArchNode node={node} className="w-full" />
                {idx < NODES.length - 1 && (
                  <div className="w-6 h-6 rounded-full bg-black border border-white/20 flex items-center justify-center text-primary z-10">
                    <ArrowDown className="w-3 h-3" />
                  </div>
                )}
              </React.Fragment>
            ))}
         </div>
      </div>

      {/* Compact Info Grid */}
      <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl">
         {[
           { title: "Verifiable", icon: <ShieldCheck className="w-4 h-4" />, text: "Cryptographic attestations verify enclave code. No backdoors possible." },
           { title: "Solver Network", icon: <Server className="w-4 h-4" />, text: "Independent solvers relay state. Incentivized matching, zero visibility." },
           { title: "Storage", icon: <Database className="w-4 h-4" />, text: "Encrypted blobs on Walrus/Solana. Minimizes rent, ensures availability." }
         ].map((item, i) => (
           <div key={i} className="bg-black border border-white/10 p-4 hover:border-primary/30 transition-colors">
              <h3 className="font-display text-white text-lg mb-2 flex items-center gap-2">
                  <span className="text-primary">{item.icon}</span>
                  {item.title}
              </h3>
              <p className="text-[10px] font-mono text-textMuted leading-relaxed">{item.text}</p>
           </div>
         ))}
      </div>
    </div>
  );
};
