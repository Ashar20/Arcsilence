export type OrderSide = 'BID' | 'ASK';

export type OrderStatus =
  | 'OPEN'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELLED';

export interface Order {
  pubkey: string;
  owner: string;
  market: string;
  side: OrderSide;
  amountIn: bigint;
  filledAmountIn: bigint;
  minAmountOut: bigint;
  status: OrderStatus;
  createdAt: bigint;
}

export interface Fill {
  order: string;
  counterparty: string;
  amountIn: bigint;
  amountOut: bigint;
  orderOwner: string;
  counterpartyOwner: string;
}

export interface ExecutionPlan {
  market: string;
  fills: Fill[];
  createdAt: string;
  arciumSignature: string;
}

