'use client';

import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { getDarkpoolProgram, placeOrder } from '@/lib/darkpoolClient';
import { getAssociatedTokenAddress } from '@solana/spl-token';

interface OrderFormProps {
  marketPubkey: string;
  baseTokenMint: string;
  quoteTokenMint: string;
  onOrderPlaced?: () => void;
}

export function OrderForm({ marketPubkey, baseTokenMint, quoteTokenMint, onOrderPlaced }: OrderFormProps) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [side, setSide] = useState<'BID' | 'ASK'>('BID');
  const [amountIn, setAmountIn] = useState('');
  const [minAmountOut, setMinAmountOut] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!wallet.connected || !wallet.publicKey) {
      setError('Please connect your wallet');
      return;
    }

    if (!amountIn || parseFloat(amountIn) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const program = getDarkpoolProgram(connection, wallet);
      const market = new PublicKey(marketPubkey);

      // Determine which token account to use based on side
      const tokenMint = side === 'BID'
        ? new PublicKey(quoteTokenMint)
        : new PublicKey(baseTokenMint);

      const ownerTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        wallet.publicKey
      );

      // Convert to lamports (assuming 9 decimals for now)
      const amountInBN = new BN(parseFloat(amountIn) * 1e9);
      const minAmountOutBN = minAmountOut
        ? new BN(parseFloat(minAmountOut) * 1e9)
        : new BN(0);

      const tx = await placeOrder(
        program,
        market,
        side,
        amountInBN,
        minAmountOutBN,
        ownerTokenAccount
      );

      setSuccess(`Order placed! Tx: ${tx.slice(0, 8)}...`);
      setAmountIn('');
      setMinAmountOut('');

      if (onOrderPlaced) {
        onOrderPlaced();
      }

      // Reset success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('Error placing order:', err);
      setError(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '1.5rem',
      maxWidth: '500px',
    }}>
      <h3 style={{ marginTop: 0 }}>Place Order</h3>

      <form onSubmit={handleSubmit}>
        {/* Side selector */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Side
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={side === 'BID'}
                onChange={() => setSide('BID')}
                disabled={loading}
              />
              <span>Bid (Buy)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={side === 'ASK'}
                onChange={() => setSide('ASK')}
                disabled={loading}
              />
              <span>Ask (Sell)</span>
            </label>
          </div>
        </div>

        {/* Amount In */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Amount In {side === 'BID' ? '(Quote)' : '(Base)'}
          </label>
          <input
            type="number"
            step="0.000000001"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            placeholder="0.0"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          />
        </div>

        {/* Min Amount Out */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Min Amount Out (optional) {side === 'BID' ? '(Base)' : '(Quote)'}
          </label>
          <input
            type="number"
            step="0.000000001"
            value={minAmountOut}
            onChange={(e) => setMinAmountOut(e.target.value)}
            placeholder="0.0"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          />
        </div>

        {/* Error/Success messages */}
        {error && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            background: '#fee',
            color: '#c33',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            background: '#efe',
            color: '#3c3',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}>
            {success}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !wallet.connected}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: wallet.connected ? (side === 'BID' ? '#10b981' : '#ef4444') : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            fontWeight: 500,
            cursor: wallet.connected && !loading ? 'pointer' : 'not-allowed',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Placing Order...' : wallet.connected ? `Place ${side} Order` : 'Connect Wallet First'}
        </button>
      </form>

      <p style={{
        marginTop: '1rem',
        marginBottom: 0,
        fontSize: '0.75rem',
        color: '#666',
      }}>
        🔐 Your order is encrypted and matched privately via Arcium MPC network
      </p>
    </div>
  );
}
