import { CreateServerReturnType } from "prool";
import { JsonRpcProvider } from "ethers";
import { SuiClient } from "@mysten/sui/client";

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

export type EVMChain = {
  node?: CreateServerReturnType | undefined;
  provider: JsonRpcProvider;
  escrowFactory: string;
  resolverContract: string;
};

export type SUIChain = {
  provider: SuiClient;
  escrowFactory: string;
  resolverContract: string;
};

export type MockOrder = {
  orderHash?: string;
  escrowFactory: string;
  salt: bigint;
  maker: string;
  makingAmount: bigint;
  takingAmount: bigint;
  makerAsset: string;
  takerAsset: string;

  hashLock: string;
  timeLocks: {
    srcWithdrawal: bigint;
    srcPublicWithdrawal: bigint;
    srcCancellation: bigint;
    srcPublicCancellation: bigint;
    dstWithdrawal: bigint;
    dstPublicWithdrawal: bigint;
    dstCancellation: bigint;
  };

  srcChainId: number;
  dstChainId: number;
  srcSafetyDeposit: bigint;
  dstSafetyDeposit: bigint;

  auction: {
    initialRateBump: number;
    points: any[];
    duration: bigint;
    startTime: bigint;
  };

  whitelist: Array<{
    address: string;
    allowFrom: bigint;
  }>;

  resolvingStartTime: bigint;

  allowPartialFills: boolean;
  allowMultipleFills: boolean;
};
