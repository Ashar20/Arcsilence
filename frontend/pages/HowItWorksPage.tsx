
import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/UI';
import { Terminal, Shield, Cpu, Wifi, CheckCircle2, ChevronRight, Lock, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProtocolStep {
  id: string;
  code: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  logs: string[];
  status: 'READY' | 'WAITING' | 'LOCKED';
}

const PROTOCOL_STEPS: ProtocolStep[] = [
  {
    id: '01',
    code: 'INIT_UPLINK',
    title: 'Establish Connection',
    icon: <Wifi className="w-5 h-5" />,
    description: "Initiate secure handshake with the Solana network via your Web3 wallet provider (Phantom/Solflare).",
    logs: [
      "> Scanning for wallet providers...",
      "> Provider found: Phantom",
      "> Establishing RPC connection...",
      "> Handshake: ACKNOWLEDGED",
      "> UPLINK ESTABLISHED"
    ],
    status: 'READY'
  },
  {
    id: '02',
    code: 'AUTH_ASSETS',
    title: 'Asset Authorization',
    icon: <Shield className="w-5 h-5" />,
    description: "Approve the ArcSilence smart contract to interact with your specific SPL tokens. Funds remain in your custody.",
    logs: [
      "> Requesting approval...",
      "> Program_ID: ArcSilence_v1",
      "> Scope: Token_Transfer",
      "> Waiting for signature...",
      "> AUTH_TOKEN: VERIFIED"
    ],
    status: 'WAITING'
  },
  {
    id: '03',
    code: 'ENCRYPT_INTENT',
    title: 'Order Encryption',
    icon: <Lock className="w-5 h-5" />,
    description: "Construct your trade intent. The client generates an ephemeral keypair and encrypts the order before broadcast.",
    logs: [
      "> Generating x25519 ephemeral keys...",
      "> Public_Key: [REDACTED]",
      "> Encrypting payload (AES-GCM)...",
      "> Constructing blob...",
      "> PAYLOAD_SECURE"
    ],
    status: 'LOCKED'
  },
  {
    id: '04',
    code: 'EXEC_SETTLE',
    title: 'MPC Settlement',
    icon: <Cpu className="w-5 h-5" />,
    description: "The encrypted blob enters the dark pool. Arcium MPC nodes perform matching inside TEEs. Atomic swap executes on match.",
    logs: [
      "> Uploading to Arcium Network...",
      "> Enclave Verification: SGX_OK",
      "> Matching Engine: ACTIVE",
      "> Order Status: HIDDEN",
      "> Awaiting Counterparty..."
    ],
    status: 'LOCKED'
  }
];

export const HowItWorksPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [typedLogs, setTypedLogs] = useState<string[]>([]);
  const navigate = useNavigate();

  // Typing effect for logs
  useEffect(() => {
    setTypedLogs([]);
    const logs = PROTOCOL_STEPS[activeStep].logs;
    let currentLogIndex = 0;
    
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setTypedLogs(prev => [...prev, logs[currentLogIndex]]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [activeStep]);

  return (
    <div className="container mx-auto px-6 py-12 max-w-7xl min-h-[80vh] flex flex-col">
      <div className="flex items-end gap-4 mb-12 border-b border-white/10 pb-6">
        <h1 className="text-4xl md:text-6xl font-display text-white uppercase leading-none">
          Protocol <br/><span className="text-primary">Manual</span>
        </h1>
        <div className="hidden md:block mb-1 font-mono text-xs text-textMuted uppercase tracking-widest">
          // Operational Guidelines v1.0
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 flex-1">
        
        {/* LEFT: Step Navigation */}
        <div className="lg:col-span-5 flex flex-col justify-center relative">
          {/* Vertical Track Line */}
          <div className="absolute left-6 top-6 bottom-6 w-px bg-white/10 hidden lg:block"></div>
          
          <div className="space-y-6 relative z-10">
            {PROTOCOL_STEPS.map((step, index) => (
              <div 
                key={step.id}
                onClick={() => setActiveStep(index)}
                className={`group cursor-pointer relative pl-0 lg:pl-16 transition-all duration-300 ${activeStep === index ? 'opacity-100 translate-x-2' : 'opacity-50 hover:opacity-80'}`}
              >
                {/* Connector Dot */}
                <div className={`hidden lg:block absolute left-[20px] top-1/2 -translate-y-1/2 w-3 h-3 border border-black transition-colors duration-300 ${
                   activeStep === index ? 'bg-primary' : 'bg-white/20 group-hover:bg-white'
                }`} />

                <Card noPadding className={`p-5 border transition-colors duration-300 ${
                  activeStep === index ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-white/30'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-widest ${activeStep === index ? 'text-primary' : 'text-textMuted'}`}>
                      STEP_{step.id}
                    </span>
                    {activeStep === index && <div className="w-2 h-2 bg-primary animate-pulse" />}
                  </div>
                  <h3 className={`text-xl font-display uppercase tracking-wide mb-1 ${activeStep === index ? 'text-white' : 'text-textMuted'}`}>
                    {step.title}
                  </h3>
                  <div className={`font-mono text-[10px] uppercase ${activeStep === index ? 'text-white/60' : 'text-textMuted/50'}`}>
                    [{step.code}]
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Detail View / Terminal */}
        <div className="lg:col-span-7">
          <Card decorated className="h-full min-h-[500px] flex flex-col bg-black relative overflow-hidden group">
            {/* Header Bar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
               <div className="flex items-center gap-2">
                 <Terminal className="w-4 h-4 text-primary" />
                 <span className="font-mono text-xs uppercase text-primary">SYS_ROOT/MANUAL/{PROTOCOL_STEPS[activeStep].code}</span>
               </div>
               <div className="flex gap-1">
                 <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                 <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                 <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
               </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 flex flex-col relative z-10">
              
              {/* Icon & Title */}
              <div className="mb-8">
                 <div className="w-16 h-16 border border-primary bg-primary/10 flex items-center justify-center text-primary mb-6">
                    {PROTOCOL_STEPS[activeStep].icon}
                 </div>
                 <h2 className="text-3xl font-display text-white uppercase mb-4">
                   {PROTOCOL_STEPS[activeStep].title}
                 </h2>
                 <p className="text-textMuted font-mono text-sm leading-relaxed max-w-lg border-l-2 border-primary/30 pl-4">
                   {PROTOCOL_STEPS[activeStep].description}
                 </p>
              </div>

              {/* Terminal Logs */}
              <div className="mt-auto bg-black border border-white/10 p-4 font-mono text-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-20 pointer-events-none">
                  <Cpu className="w-24 h-24 text-white" />
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                   <span className="text-white/40 uppercase">System Output</span>
                   <span className="text-primary animate-pulse uppercase">Live</span>
                </div>
                <div className="space-y-1 h-32 overflow-y-auto scrollbar-hide">
                  {typedLogs.map((log, i) => (
                    <div key={i} className="text-primary/80">
                      {log}
                    </div>
                  ))}
                  <div className="w-2 h-4 bg-primary/50 animate-pulse inline-block align-middle ml-1"></div>
                </div>
              </div>

            </div>

            {/* Background Decorations */}
            <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
          </Card>
        </div>
      </div>

      {/* Footer Action */}
      <div className="mt-12 flex justify-end">
        <Button 
          size="lg" 
          onClick={() => navigate('/trade')}
          className="group"
        >
          <span className="flex items-center gap-2">
            Execute Protocol <Play className="w-4 h-4 fill-black group-hover:fill-primary transition-colors" />
          </span>
        </Button>
      </div>
    </div>
  );
};
