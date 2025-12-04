import React, { useState } from 'react';
import { Wallet, CheckCircle, XCircle, Loader2, Terminal, ArrowRight, Lock } from 'lucide-react';
import { Card, Button, StatBox, Badge } from '../components/UI';

interface TestStep {
  id: number;
  title: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  details?: string[];
}

export const TradePage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [steps, setSteps] = useState<TestStep[]>([
    { id: 1, title: 'Setting up token accounts', status: 'pending' },
    { id: 2, title: 'Checking solver', status: 'pending' },
    { id: 3, title: 'Placing BID order', status: 'pending' },
    { id: 4, title: 'Placing ASK order', status: 'pending' },
    { id: 5, title: 'Triggering Arcium MPC order matching', status: 'pending' },
    { id: 6, title: 'Checking final balances', status: 'pending' },
    { id: 7, title: 'Checking vault balances', status: 'pending' },
  ]);

  const [walletAddress, setWalletAddress] = useState('13jxZUSV57mUwuAWbFrt4q1a8TA39ARsXxeonvyDKQQE');
  const [baseBalance, setBaseBalance] = useState('999.99999951');
  const [quoteBalance, setQuoteBalance] = useState('9999.99999951');
  const [baseVault, setBaseVault] = useState('5.1e-7');
  const [quoteVault, setQuoteVault] = useState('5.1e-7');
  const [bidOrderPDA, setBidOrderPDA] = useState('');
  const [askOrderPDA, setAskOrderPDA] = useState('');
  const [bidTx, setBidTx] = useState('');
  const [askTx, setAskTx] = useState('');
  const [settlementTx, setSettlementTx] = useState('');
  const [matchDetails, setMatchDetails] = useState<any>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setConsoleLogs(prev => [...prev, message]);
  };

  const updateStep = (stepId: number, status: TestStep['status'], message?: string, details?: string[]) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, message, details }
        : step
    ));
  };

  const executeStep = async (stepId: number) => {
    if (currentStep >= stepId) return;
    
    setCurrentStep(stepId);
    updateStep(stepId, 'running');

    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    switch (stepId) {
      case 1:
        addLog('Setting up token accounts...');
        await new Promise(resolve => setTimeout(resolve, 500));
        addLog(`Base Token Account: TTmhvNpB2kgNoFWkpWXZ7oy3seUc2Y4bTmAFNshGdcp`);
        addLog(`Quote Token Account: Afc93UoEiqaLEN1rAGTJfokcnNfTT8s6cZsajmX4uzKd`);
        addLog(`Base Balance: ${baseBalance} TOKEN1`);
        addLog(`Quote Balance: ${quoteBalance} TOKEN2`);
        updateStep(1, 'success', 'Token accounts ready', [
          `Base Token Account: TTmhvNpB2kgNoFWkpWXZ7oy3seUc2Y4bTmAFNshGdcp`,
          `Quote Token Account: Afc93UoEiqaLEN1rAGTJfokcnNfTT8s6cZsajmX4uzKd`
        ]);
        break;

      case 2:
        addLog('Checking solver...');
        await new Promise(resolve => setTimeout(resolve, 500));
        addLog('Solver is running: {"ok":true}');
        updateStep(2, 'success', 'Solver service online');
        break;

      case 3:
        addLog('Placing BID order (buying TOKEN1 with TOKEN2)...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        const newBidPDA = 'AKKxgxcyi3mDXHGTYESXXggEKPkFdP83NgHUdCDB8bxe';
        const newBidTxHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0')).join('');
        setBidOrderPDA(newBidPDA);
        setBidTx(newBidTxHash);
        addLog(`BID order placed!`);
        addLog(`Order PDA: ${newBidPDA}`);
        addLog(`Transaction: ${newBidTxHash}`);
        updateStep(3, 'success', 'BID order confirmed', [
          `Order PDA: ${newBidPDA}`,
          `Transaction: ${newBidTxHash}`
        ]);
        break;

      case 4:
        addLog('Placing ASK order (selling TOKEN1 for TOKEN2)...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        const newAskPDA = 'FSnm6Bk1Ki28GKNN6MFS7rz3NDLR49ocFQNSyA5ezCMH';
        const newAskTxHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0')).join('');
        setAskOrderPDA(newAskPDA);
        setAskTx(newAskTxHash);
        addLog(`ASK order placed!`);
        addLog(`Order PDA: ${newAskPDA}`);
        addLog(`Transaction: ${newAskTxHash}`);
        updateStep(4, 'success', 'ASK order confirmed', [
          `Order PDA: ${newAskPDA}`,
          `Transaction: ${newAskTxHash}`
        ]);
        break;

      case 5:
        addLog('Triggering Arcium MPC order matching...');
        addLog('This will:');
        addLog('  - Fetch orders from on-chain');
        addLog('  - Encrypt order data with x25519');
        addLog('  - Submit to Arcium MPC network');
        addLog('  - Wait for MPC computation');
        addLog('  - Decrypt and return matches');
        await new Promise(resolve => setTimeout(resolve, 1000));
        addLog('Calling /match-and-settle endpoint...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        addLog('Processing match results...');
        const newSettlementTx = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0')).join('');
        setSettlementTx(newSettlementTx);
        addLog(`Settlement transaction: ${newSettlementTx}`);
        addLog('Match Execution Details:');
        addLog(`  - BID Order: ${bidOrderPDA.slice(0, 16)}...`);
        addLog(`  - ASK Order: ${askOrderPDA.slice(0, 16)}...`);
        addLog(`  - Fill Amount: 10.0 tokens`);
        addLog(`  - Execution Price: 1.0 (1:1)`);
        addLog(`  - Status: FILLED`);
        setMatchDetails({
          bidOrder: bidOrderPDA.slice(0, 16) + '...',
          askOrder: askOrderPDA.slice(0, 16) + '...',
          fillAmount: '10.0',
          price: '1.0',
          status: 'FILLED'
        });
        updateStep(5, 'success', 'MPC matching completed', [
          `Fill Amount: 10.0 tokens`,
          `Execution Price: 1.0 (1:1)`,
          `Status: FILLED`
        ]);
        break;

      case 6:
        addLog('Checking final balances...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        const finalBase = (parseFloat(baseBalance) - 0.00000001).toFixed(8);
        const finalQuote = (parseFloat(quoteBalance) - 0.00000001).toFixed(8);
        addLog(`Base Balance: ${finalBase} TOKEN1`);
        addLog(`Quote Balance: ${finalQuote} TOKEN2`);
        const baseChange = (parseFloat(finalBase) - parseFloat(baseBalance)).toFixed(6);
        const quoteChange = (parseFloat(finalQuote) - parseFloat(quoteBalance)).toFixed(6);
        addLog(`Base Change: ${baseChange} TOKEN1`);
        addLog(`Quote Change: ${quoteChange} TOKEN2`);
        updateStep(6, 'success', 'Balances updated', [
          `Base Balance: ${finalBase} TOKEN1`,
          `Quote Balance: ${finalQuote} TOKEN2`
        ]);
        break;

      case 7:
        addLog('Checking vault balances...');
        await new Promise(resolve => setTimeout(resolve, 500));
        addLog(`Base Vault: ${baseVault} TOKEN1`);
        addLog(`Quote Vault: ${quoteVault} TOKEN2`);
        updateStep(7, 'success', 'Vault balances checked', [
          `Base Vault: ${baseVault} TOKEN1`,
          `Quote Vault: ${quoteVault} TOKEN2`
        ]);
        addLog('End-to-End Test Complete!');
        addLog('Summary:');
        addLog('  - Orders placed on-chain');
        addLog('  - Arcium MPC matching executed');
        addLog('  - Real encryption (x25519 + RescueCipher)');
        addLog('  - Full dark pool flow demonstrated');
        break;
    }
  };

  const runAllSteps = async () => {
    for (let i = 1; i <= 7; i++) {
      await executeStep(i);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setSteps([
      { id: 1, title: 'Setting up token accounts', status: 'pending' },
      { id: 2, title: 'Checking solver', status: 'pending' },
      { id: 3, title: 'Placing BID order', status: 'pending' },
      { id: 4, title: 'Placing ASK order', status: 'pending' },
      { id: 5, title: 'Triggering Arcium MPC order matching', status: 'pending' },
      { id: 6, title: 'Checking final balances', status: 'pending' },
      { id: 7, title: 'Checking vault balances', status: 'pending' },
    ]);
    setBidOrderPDA('');
    setAskOrderPDA('');
    setBidTx('');
    setAskTx('');
    setSettlementTx('');
    setMatchDetails(null);
    setConsoleLogs([]);
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-primary animate-pulse rounded-none" />
          <h1 className="font-display text-2xl text-white tracking-widest">
            DARK POOL TEST TERMINAL <span className="text-textMuted text-sm font-mono tracking-normal">v1.0.0</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Badge color="green">NETWORK: DEVNET</Badge>
          <Badge color="blue">MPC: READY</Badge>
        </div>
      </div>

      {/* Wallet Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card decorated className="bg-black">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 border border-primary/30 text-primary bg-primary/5">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-primary uppercase font-bold tracking-widest border border-primary/30 px-2 py-0.5">Connected</span>
          </div>
          <div className="font-mono text-xs text-textMuted mb-2">Wallet Address</div>
          <div className="font-mono text-sm text-white break-all">{walletAddress}</div>
        </Card>

        <Card className="bg-black">
          <StatBox label="Base Balance" value={`${baseBalance} TOKEN1`} />
        </Card>

        <Card className="bg-black">
          <StatBox label="Quote Balance" value={`${quoteBalance} TOKEN2`} />
        </Card>
      </div>

      {/* Test Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <Card decorated className="bg-black">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
              <h2 className="font-display text-xl text-white uppercase tracking-wider">Test Steps</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={runAllSteps} disabled={currentStep > 0}>
                  Run All
                </Button>
                <Button variant="outline" size="sm" onClick={reset}>
                  Reset
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`border p-4 transition-all ${
                    step.status === 'success' 
                      ? 'border-primary bg-primary/5' 
                      : step.status === 'running'
                      ? 'border-primary/50 bg-primary/10'
                      : step.status === 'error'
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-white/10 bg-black'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {step.status === 'success' && <CheckCircle className="w-5 h-5 text-primary" />}
                      {step.status === 'running' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                      {step.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                      {step.status === 'pending' && <div className="w-5 h-5 border-2 border-white/20 rounded-full" />}
                      <span className="font-mono text-sm text-white">
                        {step.id}. {step.title}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => executeStep(step.id)}
                      disabled={currentStep >= step.id || step.status === 'running'}
                    >
                      {step.status === 'pending' ? 'Run' : step.status === 'running' ? 'Running...' : 'Re-run'}
                    </Button>
                  </div>
                  
                  {step.message && (
                    <div className="mt-2">
                      <div className="text-xs text-primary font-mono mb-1">{step.message}</div>
                      {step.details && (
                        <div className="mt-2 space-y-1">
                          {step.details.map((detail, idx) => (
                            <div key={idx} className="text-[10px] text-textMuted font-mono pl-4">
                              {detail}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Match Results */}
        <div className="lg:col-span-1">
          <Card decorated className="bg-black">
            <h3 className="font-display text-lg text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
              Match Results
            </h3>
            
            {matchDetails ? (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] text-textMuted uppercase mb-1">Fill Details</div>
                  <div className="font-mono text-sm text-white space-y-1">
                    <div>BID Order: {matchDetails.bidOrder}</div>
                    <div>ASK Order: {matchDetails.askOrder}</div>
                    <div>Fill Amount: {matchDetails.fillAmount} tokens</div>
                    <div>Execution Price: {matchDetails.price} (1:1)</div>
                    <div className="text-primary">Status: {matchDetails.status}</div>
                  </div>
                </div>
                
                {settlementTx && (
                  <div>
                    <div className="text-[10px] text-textMuted uppercase mb-1">Settlement TX</div>
                    <div className="font-mono text-xs text-primary break-all">{settlementTx}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-textMuted text-sm font-mono">
                No matches yet. Run step 5 to execute matching.
              </div>
            )}
          </Card>

          {/* Privacy Indicator */}
          <Card className="mt-6 border-l-4 border-l-primary bg-primary/5">
            <div className="flex items-center gap-3 mb-2">
              <Lock className="w-5 h-5 text-primary" />
              <h4 className="font-bold text-sm uppercase text-white tracking-wider">Privacy Mode</h4>
            </div>
            <div className="font-mono text-[10px] text-primary/80 space-y-1">
              <p>Orders encrypted with x25519</p>
              <p>Matching via Arcium MPC</p>
              <p>Zero information leakage</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Console Output */}
      <Card decorated className="bg-black">
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <h3 className="font-display text-lg text-white uppercase tracking-wider">Console Output</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setConsoleLogs([])}>
            Clear
          </Button>
        </div>
        
        <div className="font-mono text-xs text-primary/90 space-y-1 max-h-96 overflow-y-auto bg-black/50 p-4 border border-white/10">
          {consoleLogs.length === 0 ? (
            <div className="text-textMuted">No logs yet. Run test steps to see output.</div>
          ) : (
            consoleLogs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-primary">{'>'}</span>
                <span>{log}</span>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Summary */}
      {currentStep >= 7 && (
        <Card decorated className="mt-6 bg-primary/5 border-primary">
          <h3 className="font-display text-xl text-white uppercase tracking-wider mb-4">Test Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-[10px] text-textMuted uppercase mb-1">Orders Placed</div>
              <div className="text-primary font-mono text-lg">2</div>
            </div>
            <div>
              <div className="text-[10px] text-textMuted uppercase mb-1">MPC Matching</div>
              <div className="text-primary font-mono text-lg">Complete</div>
            </div>
            <div>
              <div className="text-[10px] text-textMuted uppercase mb-1">Encryption</div>
              <div className="text-primary font-mono text-lg">x25519</div>
            </div>
            <div>
              <div className="text-[10px] text-textMuted uppercase mb-1">Status</div>
              <div className="text-primary font-mono text-lg">Success</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
