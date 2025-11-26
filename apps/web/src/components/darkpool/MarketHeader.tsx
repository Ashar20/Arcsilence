'use client';

import React from 'react';

interface MarketHeaderProps {
  marketPubkey: string;
  baseMint: string;
  quoteMint: string;
  baseSymbol?: string;
  quoteSymbol?: string;
}

export function MarketHeader({
  marketPubkey,
  baseMint,
  quoteMint,
  baseSymbol = 'BASE',
  quoteSymbol = 'QUOTE',
}: MarketHeaderProps) {
  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '1.5rem',
      background: '#f9fafb',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
            {baseSymbol}/{quoteSymbol}
          </h2>
          <div style={{
            fontSize: '0.75rem',
            color: '#666',
            marginTop: '0.25rem',
          }}>
            <span style={{
              background: '#dbeafe',
              color: '#1e40af',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontWeight: 600,
            }}>
              DEVNET
            </span>
            <span style={{ marginLeft: '0.5rem' }}>
              Dark Pool Market
            </span>
          </div>
        </div>
        <div style={{
          padding: '0.5rem 1rem',
          background: '#10b981',
          color: 'white',
          borderRadius: '4px',
          fontSize: '0.875rem',
          fontWeight: 600,
        }}>
          🔐 Arcium MPC Enabled
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '0.5rem',
        fontSize: '0.75rem',
      }}>
        <div>
          <strong>Market:</strong>
          <div style={{
            fontFamily: 'monospace',
            color: '#666',
            marginTop: '0.25rem',
            wordBreak: 'break-all',
          }}>
            {marketPubkey}
          </div>
        </div>
      </div>
    </div>
  );
}
