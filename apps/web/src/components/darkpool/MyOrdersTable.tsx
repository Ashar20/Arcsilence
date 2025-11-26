'use client';

import React, { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import {
  getDarkpoolProgram,
  fetchUserOrders,
  cancelOrder,
  getOrderSideString,
  getOrderStatusString,
  Order,
} from '@/lib/darkpoolClient';
import { getAssociatedTokenAddress } from '@solana/spl-token';

interface MyOrdersTableProps {
  marketPubkey: string;
  baseTokenMint: string;
  quoteTokenMint: string;
  refreshTrigger?: number;
}

export function MyOrdersTable({ marketPubkey, baseTokenMint, quoteTokenMint, refreshTrigger }: MyOrdersTableProps) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      setOrders([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const program = getDarkpoolProgram(connection, wallet);
      const userOrders = await fetchUserOrders(program, wallet.publicKey);

      // Filter by market
      const marketPK = new PublicKey(marketPubkey);
      const filteredOrders = userOrders.filter(
        (order) => order.market.toString() === marketPK.toString()
      );

      setOrders(filteredOrders);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [wallet.connected, wallet.publicKey, refreshTrigger]);

  const handleCancelOrder = async (order: Order) => {
    if (!wallet.publicKey) return;

    setCancellingOrder(order.pubkey.toString());
    setError('');

    try {
      const program = getDarkpoolProgram(connection, wallet);
      const market = new PublicKey(marketPubkey);

      // Determine which token account based on side
      const tokenMint = getOrderSideString(order.side) === 'BID'
        ? new PublicKey(quoteTokenMint)
        : new PublicKey(baseTokenMint);

      const ownerTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        wallet.publicKey
      );

      await cancelOrder(program, order.pubkey, market, ownerTokenAccount);

      // Refresh orders
      await fetchOrders();
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      setError(`Failed to cancel order: ${err.message}`);
    } finally {
      setCancellingOrder(null);
    }
  };

  const formatAmount = (amount: any) => {
    try {
      return (Number(amount.toString()) / 1e9).toFixed(4);
    } catch {
      return '0.0000';
    }
  };

  const formatDate = (timestamp: any) => {
    try {
      const date = new Date(Number(timestamp.toString()) * 1000);
      return date.toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  const getFilledPercentage = (order: Order) => {
    try {
      const filled = Number(order.filledAmountIn.toString());
      const total = Number(order.amountIn.toString());
      if (total === 0) return 0;
      return Math.round((filled / total) * 100);
    } catch {
      return 0;
    }
  };

  if (!wallet.connected) {
    return (
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center',
        color: '#666',
      }}>
        Connect your wallet to see your orders
      </div>
    );
  }

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '1.5rem',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <h3 style={{ margin: 0 }}>My Orders</h3>
        <button
          onClick={fetchOrders}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            background: '#f0f0f0',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '0.875rem',
          }}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

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

      {loading && orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          No orders yet. Place your first order above!
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Side</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount In</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Filled</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Min Out</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Created</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const side = getOrderSideString(order.side);
                const status = getOrderStatusString(order.status);
                const filledPct = getFilledPercentage(order);

                return (
                  <tr
                    key={order.pubkey.toString()}
                    style={{ borderBottom: '1px solid #eee' }}
                  >
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: side === 'BID' ? '#d1fae5' : '#fee2e2',
                        color: side === 'BID' ? '#059669' : '#dc2626',
                      }}>
                        {side}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>
                      {formatAmount(order.amountIn)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>
                      {formatAmount(order.filledAmountIn)}
                      <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: '0.25rem' }}>
                        ({filledPct}%)
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>
                      {formatAmount(order.minAmountOut)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        color: status === 'OPEN' ? '#059669' : status === 'FILLED' ? '#3b82f6' : '#6b7280',
                      }}>
                        {status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#666' }}>
                      {formatDate(order.createdAt)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {status === 'OPEN' && (
                        <button
                          onClick={() => handleCancelOrder(order)}
                          disabled={cancellingOrder === order.pubkey.toString()}
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: '#fee',
                            color: '#c33',
                            border: '1px solid #fcc',
                            borderRadius: '4px',
                            cursor: cancellingOrder === order.pubkey.toString() ? 'wait' : 'pointer',
                            fontSize: '0.75rem',
                          }}
                        >
                          {cancellingOrder === order.pubkey.toString() ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
