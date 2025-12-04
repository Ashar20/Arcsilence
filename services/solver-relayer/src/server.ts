import express from 'express';
import { createArciumClient } from './arciumClient.js';
import {
  fetchOpenOrdersForMarket,
  submitExecutionPlan,
  cleanupFilledOrders,
} from './solanaClient.js';
import { config } from './config.js';

export function createServer() {
  const app = express();
  app.use(express.json());
  const arcium = createArciumClient();
  
  console.log(
    `Using ${config.arcium.useReal ? 'Real' : 'Local'} Arcium client`
  );

  app.post('/match-and-settle', async (req, res) => {
    try {
      const { marketPubkey } = req.body ?? {};

      if (!marketPubkey || typeof marketPubkey !== 'string') {
        return res.status(400).json({ error: 'marketPubkey is required' });
      }

      const orders = await fetchOpenOrdersForMarket(marketPubkey);

      if (!orders.length) {
        return res.status(200).json({
          txSignature: null,
          plan: null,
          message: 'No open orders for this market',
        });
      }

      // Limit to 2 orders maximum to stay within Arcium SDK transaction size limit
      // This ensures we don't exceed ~1232 bytes
      // Select 1 BID and 1 ASK to ensure matching is possible
      const bids = orders.filter(o => o.side === 'BID');
      const asks = orders.filter(o => o.side === 'ASK');

      const orderBatch: typeof orders = [];
      if (bids.length > 0) orderBatch.push(bids[0]);
      if (asks.length > 0) orderBatch.push(asks[0]);

      if (orderBatch.length < 2) {
        console.log(`⚠️  Not enough orders to match: ${bids.length} BIDs, ${asks.length} ASKs`);
      }

      if (orders.length > 2) {
        console.log(`⚠️  Found ${orders.length} orders, processing 1 BID + 1 ASK (Arcium SDK limit)`);
      }

      console.log('📦 Orders being matched:', JSON.stringify(orderBatch.map(o => ({
        pubkey: o.pubkey.slice(0, 8),
        side: o.side,
        amountIn: o.amountIn.toString(),
        minAmountOut: o.minAmountOut.toString(),
        status: o.status
      })), null, 2));

      const plan = await arcium.computeExecutionPlan(orderBatch);
      const txSignature = await submitExecutionPlan(plan);

      // Cleanup filled orders
      console.log('Settlement successful, cleaning up filled orders...');
      const cleanupResult = await cleanupFilledOrders(plan);

      return res.status(200).json({
        txSignature,
        plan,
        cleanup: cleanupResult,
        totalOrders: orders.length,
        processedOrders: orderBatch.length,
        remainingOrders: orders.length - orderBatch.length
      });
    } catch (err: any) {
      console.error('match-and-settle error', err);
      return res.status(500).json({ error: err?.message ?? 'internal error' });
    }
  });

  app.get('/health', (_req, res) => res.json({ ok: true }));

  const server = app.listen(config.port, () => {
    console.log(`solver-relayer listening on :${config.port}`);
  });

  return server;
}

