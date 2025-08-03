import { NextRequest, NextResponse } from "next/server";
import * as Sdk from "@1inch/cross-chain-sdk";
import { Transaction } from "@mysten/sui/transactions";
import { uint8ArrayToHex } from "@1inch/byte-utils";
import { randomBytes } from "ethers";
import { Immutables } from "@/lib/types";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { suiResolverContractAddress } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const suiClient = new SuiClient({ url: getFullnodeUrl("testnet") });
  const keypair = Ed25519Keypair.fromSecretKey(
    "suiprivkey1qpunhm8jddh6dpr5aqp8ksgjsg9wzd30z7nmwqp4p247z4efcnmsq0p3t3t"
  );
  const secret = uint8ArrayToHex(randomBytes(32));

  const hashLock = Sdk.HashLock.forSingleFill(secret!);

  console.log("🔍 Hash Lock Validation:");
  const txb = new Transaction();

  const hashLockString = hashLock.toString();
  const lockhexNoPrefix = hashLockString.startsWith("0x")
    ? hashLockString.slice(2)
    : hashLockString;

  const hashLocku8 = Uint8Array.from(Buffer.from(lockhexNoPrefix, "hex"));

  const secrethexNoPrefix = secret.startsWith("0x") ? secret.slice(2) : secret;
  const secretu8 = Uint8Array.from(Buffer.from(secrethexNoPrefix, "hex"));

  const MY_ADDRESS =
    "0x043d0499d17b09ffffd91a3eebb684553ca7255e273c69ed72e355950e0d77be";

  console.log("Sui Hash Lock:");

  const only_check_tx = await call_only_valid_check(
    suiClient,
    keypair,
    secretu8,
    hashLocku8,
    suiResolverContractAddress,
    txb
  );

  const withdraw_response = await suiClient.signAndExecuteTransaction({
    transaction: only_check_tx,
    signer: keypair,
    options: { showEffects: true },
  });

  console.log("Withdraw Response:", withdraw_response);

  // console.log("Original Hash Lock:", hashLock);
  // console.log("New Hash Lock:", suiHashLock.toString());
  // console.log("Hash Locks Equal:", hashLock == suiHashLock.toString());

  return NextResponse.json({
    success: true,
  });
}

const call_only_valid_check = (
  suiClient: SuiClient,
  keypair: Ed25519Keypair,
  secret: Uint8Array,
  hashLocku8: Uint8Array,
  packageObjectId: string,
  tx: Transaction
): Transaction => {
  tx.moveCall({
    target: `${packageObjectId}::escrow_checks::only_valid_secret_test_check`,
    arguments: [tx.pure.vector("u8", secret), tx.pure.vector("u8", hashLocku8)],
  });
  return tx;
};
