export interface AppConfig {
  rpcUrl: string;
  programId: string;
  adminKeypairPath: string;
  port: number;
  arcium: {
    useReal: boolean;
    compDefId?: string;
    network?: string;
    apiKey?: string;
  };
}

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getEnvVarOptional(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

function getBooleanEnvVar(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

export const config: AppConfig = {
  rpcUrl: getEnvVar('SOLANA_RPC_URL'),
  programId: getEnvVar('DARKPOOL_PROGRAM_ID'),
  adminKeypairPath: getEnvVar('DARKPOOL_ADMIN_KEYPAIR'),
  port: parseInt(getEnvVarOptional('PORT', '8080'), 10),
  arcium: {
    useReal: getBooleanEnvVar('ARCIUM_USE_REAL', false),
    compDefId: process.env.ARCIUM_COMP_DEF_ID,
    network: getEnvVarOptional('ARCIUM_NETWORK', 'testnet'),
    apiKey: process.env.ARCIUM_API_KEY,
  },
};

