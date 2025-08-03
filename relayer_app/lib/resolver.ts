import { Interface, Signature, TransactionRequest } from "ethers";
import * as Sdk from "@1inch/cross-chain-sdk";
import Contract from "../lib/contracts-metadata/Resolver.json";
import { Transaction, TransactionArgument } from "@mysten/sui/transactions";
import { config } from "./evm-to-sui-config";
import { MockOrder } from "./types";

export class Resolver {
  private readonly iface = new Interface(Contract.abi);

  constructor(
    public readonly srcAddress: string,
    public readonly dstAddress: string
  ) {}

  public deploySrc(
    chainId: number,
    order: Sdk.CrossChainOrder,
    signature: string,
    takerTraits: Sdk.TakerTraits,
    amount: bigint,
    hashLock = order.escrowExtension.hashLockInfo
  ): TransactionRequest {
    const { r, yParityAndS: vs } = Signature.from(signature);
    const { args, trait } = takerTraits.encode();
    const immutables = order.toSrcImmutables(
      chainId,
      new Sdk.Address(this.srcAddress),
      amount,
      hashLock
    );

    return {
      to: this.srcAddress,
      data: this.iface.encodeFunctionData("deploySrc", [
        immutables.build(),
        order.build(),
        r,
        vs,
        amount,
        trait,
        args,
      ]),
      value: order.escrowExtension.srcSafetyDeposit,
    };
  }

  // public suiDeploySrc(
  //   srcChainId: number,
  //   mockOrder: MockOrder,
  //   fillAmount: bigint
  // ): Transaction {
  //   const packageObjectId = this.srcAddress;

  //   const {
  //     orderHash,
  //     hashLock,
  //     maker,
  //     takerAsset,
  //     token,
  //     amount,
  //     safetyDeposit,
  //     timeLocks,
  //   } = mockOrder;

  //   return;
  // }

  public deployDst(
    /**
     * Immutables from SrcEscrowCreated event with complement applied
     */
    immutables: Sdk.Immutables
  ): TransactionRequest {
    return {
      to: this.dstAddress,
      data: this.iface.encodeFunctionData("deployDst", [
        immutables.build(),
        immutables.timeLocks.toSrcTimeLocks().privateCancellation,
      ]),
      value: immutables.safetyDeposit,
    };
  }

  public suiDeployDst(
    immutables: Sdk.Immutables,
    escrowCoin: TransactionArgument,
    safetyDepositCoin: TransactionArgument,
    tx: Transaction
  ): Transaction {
    const packageObjectId = this.dstAddress;
    const {
      orderHash,
      hashLock,
      maker,
      taker,
      token,
      amount,
      safetyDeposit,
      timeLocks,
    } = immutables;

    const u64Amount = Number(amount);
    const u64SafetyDeposit = Number(safetyDeposit);

    const hashLockString = hashLock.toString();
    const hexNoPrefix = hashLockString.startsWith("0x")
      ? hashLockString.slice(2)
      : hashLockString;
    const hashLocku8 = Uint8Array.from(Buffer.from(hexNoPrefix, "hex"));

    const deployedAt = timeLocks.deployedAt;

    const dst_withdrawal_delay = timeLocks.toDstTimeLocks().privateWithdrawal;
    const dst_public_withdrawal_delay =
      timeLocks.toDstTimeLocks().publicWithdrawal;
    const dst_cancellation_delay =
      timeLocks.toDstTimeLocks().privateCancellation;
    const src_cancellation_timestamp =
      timeLocks.toSrcTimeLocks().privateCancellation;

    tx.moveCall({
      target: `${packageObjectId}::resolver::deploy_dst`,
      typeArguments: [
        config.chain.destination.tokens.USDC.address,
        "0x2::sui::SUI",
      ],
      arguments: [
        tx.object("0x6"), // Clock object reference
        escrowCoin, // Coin<T> object reference
        safetyDepositCoin, // Coin<T> object reference
        tx.pure.string(orderHash), // order_hash
        tx.pure.vector("u8", hashLocku8), // hashlock
        tx.pure.address(maker.toString()), // maker address
        tx.pure.address(
          "0x0f427b0025f72af9236d24f9a20cab2fcab5ae7c34bca409c96c78ab42b9101e"
        ), // taker address
        tx.pure.address(token.toString()), // token address
        tx.pure.u64(u64Amount), // amount
        tx.pure.u64(u64SafetyDeposit), // safety_deposit
        tx.pure.u64(Number(dst_withdrawal_delay)), // dst_withdrawal_delay
        tx.pure.u64(Number(dst_public_withdrawal_delay)), // dst_public_withdrawal_delay
        tx.pure.u64(Number(dst_cancellation_delay)), // dst_cancellation_delay
        tx.pure.u64(Number(src_cancellation_timestamp)), // src_cancellation_timestamp
        tx.pure.u64(Number(deployedAt)), // deployed_at
      ],
    });

    return tx;
  }

  public evmWithdraw(
    side: "src" | "dst",
    escrow: Sdk.Address,
    secret: string,
    immutables: Sdk.Immutables
  ): TransactionRequest {
    return {
      to: side === "src" ? this.srcAddress : this.dstAddress,
      data: this.iface.encodeFunctionData("withdraw", [
        escrow.toString(),
        secret,
        immutables.build(),
      ]),
    };
  }

  public evmWithdrawTo(
    side: "src" | "dst",
    escrow: Sdk.Address,
    target: string,
    secret: string,
    immutables: Sdk.Immutables
  ): TransactionRequest {
    return {
      to: side === "src" ? this.srcAddress : this.dstAddress,
      data: this.iface.encodeFunctionData("withdrawTo", [
        escrow.toString(),
        target,
        secret,
        immutables.build(),
      ]),
    };
  }

  public suiWithdraw(
    side: "src" | "dst",
    escrowId: "",
    secret: string
  ): Transaction {
    const tx = new Transaction();
    const packageObjectId = side === "src" ? this.srcAddress : this.dstAddress;
    const functionName = side === "src" ? "withdraw_src" : "withdraw_dst";

    const hexNoPrefix = secret.startsWith("0x") ? secret.slice(2) : secret;
    const secretu8 = Uint8Array.from(Buffer.from(hexNoPrefix, "hex"));

    tx.moveCall({
      target: `${packageObjectId}::resolver::${functionName}`,
      typeArguments: [
        // config.chain.destination.tokens.USDC.address,
        "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
        "0x2::sui::SUI",
      ],
      arguments: [
        tx.object("0x6"), // clock object id (shared)
        tx.object(escrowId), // escrow object id
        tx.pure.vector("u8", secretu8), // secret as vector<u8>
      ],
    });

    return tx;
  }

  public cancel(
    side: "src" | "dst",
    escrow: Sdk.Address,
    immutables: Sdk.Immutables
  ): TransactionRequest {
    return {
      to: side === "src" ? this.srcAddress : this.dstAddress,
      data: this.iface.encodeFunctionData("cancel", [
        escrow.toString(),
        immutables.build(),
      ]),
    };
  }
}
