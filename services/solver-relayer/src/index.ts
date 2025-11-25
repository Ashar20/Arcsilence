import { createServer } from './server.js';

export async function main(): Promise<void> {
  createServer();
}

// Run when executed directly
main().catch((err) => {
  console.error('solver-relayer failed to start', err);
  process.exit(1);
});
