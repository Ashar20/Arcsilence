'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WalletButton } from '@/components/WalletButton';
import { MarketHeader } from '@/components/darkpool/MarketHeader';
import { OrderForm } from '@/components/darkpool/OrderForm';
import { MyOrdersTable } from '@/components/darkpool/MyOrdersTable';

// Environment configuration
const MARKET_PUBKEY = process.env.NEXT_PUBLIC_MARKET_PUBKEY || 'MARKET_PUBKEY_NOT_SET';
const BASE_TOKEN_MINT = process.env.NEXT_PUBLIC_BASE_TOKEN_MINT || 'BASE_MINT_NOT_SET';
const QUOTE_TOKEN_MINT = process.env.NEXT_PUBLIC_QUOTE_TOKEN_MINT || 'QUOTE_MINT_NOT_SET';
const BASE_SYMBOL = process.env.NEXT_PUBLIC_BASE_SYMBOL || 'BASE';
const QUOTE_SYMBOL = process.env.NEXT_PUBLIC_QUOTE_SYMBOL || 'QUOTE';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleOrderPlaced = () => {
    // Trigger refresh of orders table
    setRefreshTrigger(prev => prev + 1);
  };

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
            <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
              Trade
            </Link>
            <Link href="/admin" style={{ color: '#666', textDecoration: 'none' }}>
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
        {/* Market Header */}
        <div style={{ marginBottom: '2rem' }}>
          <MarketHeader
            marketPubkey={MARKET_PUBKEY}
            baseMint={BASE_TOKEN_MINT}
            quoteMint={QUOTE_TOKEN_MINT}
            baseSymbol={BASE_SYMBOL}
            quoteSymbol={QUOTE_SYMBOL}
          />
        </div>

        {/* Trading Interface */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          marginBottom: '2rem',
        }}>
          {/* Order Form */}
          <OrderForm
            marketPubkey={MARKET_PUBKEY}
            baseTokenMint={BASE_TOKEN_MINT}
            quoteTokenMint={QUOTE_TOKEN_MINT}
            onOrderPlaced={handleOrderPlaced}
          />

          {/* Info Card */}
          <div style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '1.5rem',
            background: '#eff6ff',
          }}>
            <h3 style={{ marginTop: 0, color: '#1e40af' }}>🔐 Privacy-First Trading</h3>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
              ArcSilence is a dark pool exchange on Solana powered by Arcium&apos;s Multi-Party Computation (MPC) network.
            </p>
            <div style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
              <strong>How it works:</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                <li>Your orders are encrypted using x25519 + RescueCipher</li>
                <li>Order matching runs inside Arcium&apos;s encrypted MPC environment</li>
                <li>No order details are revealed during matching</li>
                <li>Only final settlement is recorded on Solana</li>
              </ul>
            </div>
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'white',
              borderRadius: '4px',
              fontSize: '0.75rem',
              color: '#666',
            }}>
              <strong>Note:</strong> This is a devnet deployment. Use devnet SOL and test tokens only.
            </div>
          </div>
        </div>

        {/* My Orders Table */}
        <MyOrdersTable
          marketPubkey={MARKET_PUBKEY}
          baseTokenMint={BASE_TOKEN_MINT}
          quoteTokenMint={QUOTE_TOKEN_MINT}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </main>
  );
}
