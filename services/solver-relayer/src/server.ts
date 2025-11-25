import express from 'express';
import { createArciumClient } from './arciumClient.js';
import {
  fetchOpenOrdersForMarket,
  submitExecutionPlan,
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

      const plan = await arcium.computeExecutionPlan(orders);
      const txSignature = await submitExecutionPlan(plan);

      return res.status(200).json({ txSignature, plan });
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

