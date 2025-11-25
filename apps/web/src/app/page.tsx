import { WalletButton } from '@/components/WalletButton';

export default function Home() {
  return (
    <main className="page">
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        borderBottom: '1px solid #eee'
      }}>
        <h2 style={{ margin: 0 }}>ArcSilence</h2>
        <WalletButton />
      </nav>

      <section className="hero">
        <p className="eyebrow">Private Dark Pool</p>
        <h1>Trade on Solana with Arcium Encryption</h1>
        <p className="lede">
          Connect your wallet to place private orders.
        </p>
        <p className="body">
          Order matching runs inside Arcium&apos;s encrypted MPC environment.
          Only settlement occurs on-chain via Solana program instructions.
        </p>
      </section>
    </main>
  );
}
