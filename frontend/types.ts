export interface NavItem {
  label: string;
  path: string;
}

export enum MarketType {
  SPOT = 'SPOT',
  PERP = 'PERP'
}

export interface TradeOrder {
  id: string;
  pair: string;
  type: 'BID' | 'ASK';
  amount: number;
  price: number;
  status: 'OPEN' | 'MATCHING' | 'SETTLED' | 'CANCELLED';
  timestamp: number;
}

export interface ChartDataPoint {
  time: string;
  value: number;
  volume: number;
}
