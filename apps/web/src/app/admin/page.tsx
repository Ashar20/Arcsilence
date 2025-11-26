'use client';

import Link from 'next/link';
import { WalletButton } from '@/components/WalletButton';
import { AdminPanel } from '@/components/darkpool/AdminPanel';

// Environment configuration
const MARKET_PUBKEY = process.env.NEXT_PUBLIC_MARKET_PUBKEY || 'MARKET_PUBKEY_NOT_SET';
const SOLVER_URL = process.env.NEXT_PUBLIC_SOLVER_URL || 'http://localhost:8080';

export default function AdminPage() {
  return (
    <main className="page">
      {/* Navigation */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        borderBottom: '1px solid #eee',
        background: 'white',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h2 style={{ margin: 0 }}>ArcSilence</h2>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
            <Link href="/" style={{ color: '#666', textDecoration: 'none' }}>
              Trade
            </Link>
            <Link href="/admin" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
              Admin
            </Link>
          </div>
        </div>
        <WalletButton />
      </nav>

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem',
      }}>
        <AdminPanel
          marketPubkey={MARKET_PUBKEY}
          solverUrl={SOLVER_URL}
        />
      </div>
    </main>
  );
}
