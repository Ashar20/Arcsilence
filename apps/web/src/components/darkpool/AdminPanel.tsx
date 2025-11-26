'use client';

import React, { useState } from 'react';

interface AdminPanelProps {
  marketPubkey: string;
  solverUrl: string;
}

interface MatchResult {
  txSignature: string | null;
  plan: {
    market: string;
    fills: Array<{
      buyOrder: string;
      sellOrder: string;
      baseAmount: string;
      quoteAmount: string;
    }>;
    createdAt: number;
    arciumSignature?: string;
  } | null;
  message?: string;
}

export function AdminPanel({ marketPubkey, solverUrl }: AdminPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MatchResult | null>(null);

  const handleRunMatch = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('[AdminPanel] Calling solver at:', solverUrl);
      console.log('[AdminPanel] Market pubkey:', marketPubkey);

      const response = await fetch(`${solverUrl}/match-and-settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          marketPubkey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: MatchResult = await response.json();
      console.log('[AdminPanel] Match result:', data);
      setResult(data);
    } catch (err: any) {
      console.error('[AdminPanel] Match error:', err);
      setError(err.message || 'Failed to run match');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '1.5rem',
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      <h2 style={{ marginTop: 0 }}>Operator Panel</h2>
      <p style={{ color: '#666', fontSize: '0.875rem' }}>
        Trigger private order matching via Arcium MPC network
      </p>

      {/* Market Info */}
      <div style={{
        background: '#f9fafb',
        padding: '1rem',
        borderRadius: '4px',
        marginBottom: '1.5rem',
      }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Market:</strong>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            color: '#666',
            marginTop: '0.25rem',
            wordBreak: 'break-all',
          }}>
            {marketPubkey}
          </div>
        </div>
        <div>
          <strong>Solver URL:</strong>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            color: '#666',
            marginTop: '0.25rem',
          }}>
            {solverUrl}
          </div>
        </div>
      </div>

      {/* Run Match Button */}
      <button
        onClick={handleRunMatch}
        disabled={loading}
        style={{
          width: '100%',
          padding: '1rem',
          background: loading ? '#94a3b8' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
          marginBottom: '1.5rem',
        }}
      >
        {loading ? (
          <>
            <span style={{ display: 'inline-block', marginRight: '0.5rem' }}>⏳</span>
            Running Private Match on Arcium MPC...
          </>
        ) : (
          <>
            <span style={{ display: 'inline-block', marginRight: '0.5rem' }}>🔐</span>
            Run Private Match
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div style={{
          padding: '1rem',
          background: '#fee',
          color: '#c33',
          borderRadius: '4px',
          fontSize: '0.875rem',
          marginBottom: '1rem',
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '4px',
          padding: '1.5rem',
        }}>
          <h3 style={{ marginTop: 0, color: '#059669' }}>✅ Match Complete</h3>

          {/* No orders message */}
          {result.message && (
            <div style={{
              padding: '1rem',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}>
              {result.message}
            </div>
          )}

          {/* Transaction Signature */}
          {result.txSignature && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Settlement Transaction:</strong>
              <div style={{ marginTop: '0.5rem' }}>
                <a
                  href={`https://solscan.io/tx/${result.txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    color: '#3b82f6',
                    textDecoration: 'none',
                    wordBreak: 'break-all',
                  }}
                >
                  {result.txSignature} →
                </a>
              </div>
            </div>
          )}

          {/* Arcium Signature */}
          {result.plan?.arciumSignature && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Arcium MPC Proof:</strong>
              <div style={{
                marginTop: '0.5rem',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                color: '#059669',
                wordBreak: 'break-all',
              }}>
                {result.plan.arciumSignature}
              </div>
            </div>
          )}

          {/* Fills */}
          {result.plan && result.plan.fills && result.plan.fills.length > 0 && (
            <div>
              <strong>Matched Orders ({result.plan.fills.length} fills):</strong>
              <div style={{ marginTop: '0.5rem' }}>
                {result.plan.fills.map((fill, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'white',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      marginBottom: '0.5rem',
                      fontSize: '0.75rem',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <strong>Buy Order:</strong>
                        <div style={{ fontFamily: 'monospace', color: '#666', fontSize: '0.7rem' }}>
                          {fill.buyOrder.slice(0, 12)}...
                        </div>
                      </div>
                      <div>
                        <strong>Sell Order:</strong>
                        <div style={{ fontFamily: 'monospace', color: '#666', fontSize: '0.7rem' }}>
                          {fill.sellOrder.slice(0, 12)}...
                        </div>
                      </div>
                      <div>
                        <strong>Base Amount:</strong>
                        <div style={{ fontFamily: 'monospace' }}>
                          {(Number(fill.baseAmount) / 1e9).toFixed(4)}
                        </div>
                      </div>
                      <div>
                        <strong>Quote Amount:</strong>
                        <div style={{ fontFamily: 'monospace' }}>
                          {(Number(fill.quoteAmount) / 1e9).toFixed(4)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          {result.plan && (
            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#666' }}>
              Executed at: {new Date(result.plan.createdAt).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Info box */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: '#eff6ff',
        borderRadius: '4px',
        fontSize: '0.75rem',
        color: '#1e40af',
      }}>
        <strong>How it works:</strong>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
          <li>Orders are encrypted using x25519 + RescueCipher</li>
          <li>Matching computation runs on Arcium MPC network</li>
          <li>Results are verified and settled on Solana</li>
          <li>No order details leaked during matching</li>
        </ul>
      </div>
    </div>
  );
}
