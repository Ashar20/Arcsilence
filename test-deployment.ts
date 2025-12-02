import { Connection, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';

// Try both RPCs
const QUICKNODE_RPC = 'https://fabled-purple-pool.solana-testnet.quiknode.pro/1788c0e4b59f72f7e893217b2d7c1b7d0f58fbf6';
const DEFAULT_RPC = 'https://api.devnet.solana.com';

const PROGRAM_ID = new PublicKey('CMy5ru8L5nwnn4RK8TZJiCLs4FVkouV2PKPnuPCLFedB');

async function testWithRPC(rpcUrl: string, rpcName: string) {
  console.log(`\nTesting with ${rpcName}...`);
  const connection = new Connection(rpcUrl, 'confirmed');

  try {
    const programInfo = await connection.getAccountInfo(PROGRAM_ID);
    if (!programInfo) {
      console.log(`   ❌ Program not found with ${rpcName}`);
      return false;
    }
    console.log(`   ✅ Program found with ${rpcName}`);
    console.log(`   Program size: ${programInfo.data.length} bytes`);
    console.log(`   Owner: ${programInfo.owner.toBase58()}`);
    return true;
  } catch (error: any) {
    console.log(`   ❌ Error with ${rpcName}:`, error.message);
    return false;
  }
}

async function testDeployment() {
  console.log('Testing darkpool deployment...\n');
  console.log(`Program ID: ${PROGRAM_ID.toBase58()}`);

  // Test with both RPCs
  const quicknodeWorks = await testWithRPC(QUICKNODE_RPC, 'QuickNode RPC');
  const defaultWorks = await testWithRPC(DEFAULT_RPC, 'Default devnet RPC');

  if (!quicknodeWorks && !defaultWorks) {
    console.log('\n❌ Program not found on either RPC!');
    process.exit(1);
  }

  // Load IDL and check it
  console.log('\n2. Checking IDL file...');
  const idlPath = './target/idl/darkpool.json';
  if (!fs.existsSync(idlPath)) {
    console.log('   ❌ IDL file not found!');
    process.exit(1);
  }

  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
  console.log('   ✅ IDL file loaded');
  console.log(`   Program ID in IDL: ${idl.address}`);

  if (idl.address !== PROGRAM_ID.toBase58()) {
    console.log('   ❌ Program ID mismatch!');
    console.log(`   Expected: ${PROGRAM_ID.toBase58()}`);
    console.log(`   Got: ${idl.address}`);
    process.exit(1);
  }

  console.log('   ✅ Program ID matches!');

  // Check program instructions
  console.log('\n3. Checking program instructions...');
  console.log(`   Found ${idl.instructions.length} instructions:`);
  idl.instructions.forEach((ix: any) => {
    console.log(`   - ${ix.name}`);
  });

  // Check accounts
  console.log('\n4. Checking program accounts...');
  console.log(`   Found ${idl.accounts?.length || 0} account types:`);
  if (idl.accounts) {
    idl.accounts.forEach((acc: any) => {
      console.log(`   - ${acc.name}`);
    });
  }

  console.log('\n✅ All deployment checks passed!');
  console.log('\nProgram is correctly deployed and ready to use.');
  console.log(`Program ID: ${PROGRAM_ID.toBase58()}`);
}

testDeployment().catch(console.error);
