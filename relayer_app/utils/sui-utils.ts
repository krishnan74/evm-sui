import {
  getFullnodeUrl,
  SuiClient,
  SuiEvent,
  SuiEventFilter,
} from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { TransactionArgument } from "@mysten/sui/transactions";
import { Immutables } from "../lib/types";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { ChainConfig } from "@/lib/evm-to-sui-config";
import {
  suiEscrowFactoryAddress,
  suiResolverContractAddress,
} from "@/lib/constants";

export async function initSUIChain(cnf: ChainConfig): Promise<{
  provider: SuiClient;
  escrowFactory: string;
  resolverContract: string;
}> {
  const client = await getSUIClient();

  const privateKeyBech32 = process.env.SUI_RESOLVER_PK!;

  const keypair = Ed25519Keypair.fromSecretKey(privateKeyBech32);

  // deploy EscrowFactory
  // const escrowFactory = await deploySUIModule('../dist/sui-escrow-factory', keypair)
  // const resolver = await deploySUIModule('../dist/resolver', keypair)

  return {
    provider: client,
    escrowFactory: suiEscrowFactoryAddress,
    resolverContract: suiResolverContractAddress,
  };
}

export async function getSUIClient(): Promise<SuiClient> {
  return new SuiClient({ url: getFullnodeUrl("testnet") });
}

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

  const hexNoPrefix = hashLock.startsWith("0x") ? hashLock.slice(2) : hashLock;
  const hashLocku8 = Uint8Array.from(Buffer.from(hexNoPrefix, "hex"));

  txb.moveCall({
    target: `${packageObjectId}::resolver::deploy_dst`,
    typeArguments: [
      // config.chain.destination.tokens.USDC.address,
      "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
      "0x2::sui::SUI",
    ],
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

async function deploySUIModule(
  packagePath: string,
  keypair: Ed25519Keypair
): Promise<string> {
  const { execSync } = require("child_process");
  // Generate a new Ed25519 Keypair'

  const client = new SuiClient({
    url: getFullnodeUrl("testnet"),
  });
  const { modules, dependencies } = JSON.parse(
    execSync(`sui move build --dump-bytecode-as-base64 --path ${packagePath}`, {
      encoding: "utf-8",
    })
  );
  const tx = new Transaction();
  const [upgradeCap] = tx.publish({
    modules,
    dependencies,
  });

  tx.transferObjects([upgradeCap], keypair.toSuiAddress());
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });

  // Extract the packageId from the objectChanges
  const packageId = result.objectChanges?.find(
    (x) => x.type === "published"
  )?.packageId;

  if (!packageId) {
    throw new Error("PackageId not found in transaction result");
  }

  return packageId;
}
