'use client';

import React, { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

interface TokenBalanceProps {
  tokenMint: string;
  symbol: string;
  decimals?: number;
}

export function TokenBalance({ tokenMint, symbol, decimals = 9 }: TokenBalanceProps) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!publicKey || !tokenMint || tokenMint === 'MIDEN_TOKEN_MINT_ADDRESS_HERE') {
        setBalance('0');
        return;
      }

      try {
        setLoading(true);
        const mintPubkey = new PublicKey(tokenMint);
        const tokenAccount = await getAssociatedTokenAddress(mintPubkey, publicKey);

        try {
          const accountInfo = await getAccount(connection, tokenAccount);
          const balanceAmount = Number(accountInfo.amount) / Math.pow(10, decimals);
          setBalance(balanceAmount.toFixed(decimals));
        } catch (error) {
          // Token account doesn't exist or has no balance
          setBalance('0');
        }
      } catch (error) {
        console.error('Error fetching token balance:', error);
        setBalance('0');
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();

    // Refresh balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [connection, publicKey, tokenMint, decimals]);

  if (!publicKey) {
    return null;
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      fontSize: '0.875rem',
      color: '#666',
      marginLeft: '1rem'
    }}>
      <span>{loading ? '...' : balance}</span>
      <span style={{ fontWeight: 500 }}>{symbol}</span>
    </div>
  );
}

