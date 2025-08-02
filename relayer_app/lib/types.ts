export type Immutables = {
  orderHash: string;
  hashLock: string;
  maker: string;
  taker: string;
  token: string;
  amount: number;
  safetyDeposit: number;
  timeLocks: Timelocks;
};

export type Timelocks = {
  src_withdrawal: number;
  src_public_withdrawal: number;
  src_cancellation: number;
  src_public_cancellation: number;
  dst_withdrawal: number;
  dst_public_withdrawal: number;
  dst_cancellation: number;
  deployed_at: number;
};
