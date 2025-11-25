import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import React from 'react';
import { SolanaProvider } from '@/components/SolanaProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ArcSilence – Arcium Dark Pool',
  description: 'Private dark pool on Solana powered by Arcium private compute.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SolanaProvider>{children}</SolanaProvider>
      </body>
    </html>
  );
}
