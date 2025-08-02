import { SuiClient, SuiEvent, SuiEventFilter } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { TransactionArgument } from "@mysten/sui/transactions";
import { Immutables } from "./types";

export async function deployDestinationEscrow(
  immutables: Immutables,
  packageObjectId: string,
  escrowCoin: TransactionArgument,
  safetyDepositCoin: TransactionArgument,
  txb: Transaction
) {
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

  console.log("Deploying destination escrow with immutables:", immutables);

  console.log("HashLock (Buffer):", Buffer.from(hashLock, "hex"));

  const hexNoPrefix = hashLock.startsWith("0x") ? hashLock.slice(2) : hashLock;
  const hashLocku8 = Uint8Array.from(Buffer.from(hexNoPrefix, "hex"));

  console.log("HashLock Uint8Array:", hashLocku8);

  txb.moveCall({
    target: `${packageObjectId}::resolver::deploy_dst`,
    typeArguments: ["0x2::sui::SUI"],
    arguments: [
      txb.object("0x6"), // Clock object reference
      escrowCoin, // Coin<T> object reference
      safetyDepositCoin, // Coin<T> object reference
      txb.pure.string(orderHash), // order_hash
      txb.pure.vector("u8", hashLocku8), // hashlock
      txb.pure.address(maker.toString()), // maker address
      txb.pure.address(taker.toString()), // taker address
      txb.pure.address(token.toString()), // token address
      txb.pure.u64(amount), // amount
      txb.pure.u64(safetyDeposit),
      txb.pure.u64(timeLocks.dst_withdrawal), // dst_withdrawal
      txb.pure.u64(timeLocks.dst_public_withdrawal), // dst_public_withdrawal
      txb.pure.u64(timeLocks.dst_cancellation), // dst_cancellation
      txb.pure.u64(timeLocks.src_cancellation), // src_cancellation
      txb.pure.u64(timeLocks.deployed_at), // deployed_at
    ],
  });

  return txb;
}

export async function getDstEscrowCreatedEvents(
  packageId: string,
  client: SuiClient
): Promise<SuiEvent[]> {
  const query: SuiEventFilter = {
    MoveEventType: `${packageId}::escrow_factory::DstEscrowCreated`,
  };

  const result = await client.queryEvents({
    query,
  });

  return result.data;
}

export async function suiWithdraw(
  side: "src" | "dst",
  escrowId: string,
  secret: string,
  packageObjectId: string
): Promise<Transaction> {
  const tx = new Transaction();
  const functionName = side === "src" ? "withdraw_src" : "withdraw_dst";

  const hexNoPrefix = secret.startsWith("0x") ? secret.slice(2) : secret;
  const secretu8 = Uint8Array.from(Buffer.from(hexNoPrefix, "hex"));

  console.log("Secret Uint8Array:", secretu8);

  tx.moveCall({
    target: `${packageObjectId}::resolver::${functionName}`,
    typeArguments: ["0x2::sui::SUI"],
    arguments: [
      tx.object("0x6"), // clock object id (shared)
      tx.object(escrowId), // escrow object id
      tx.pure.vector("u8", secretu8), // secret as vector<u8>
    ],
  });

  return tx;
}
