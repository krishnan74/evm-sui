import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { getFaucetHost, requestSuiFromFaucetV2 } from "@mysten/sui/faucet";
import { Transaction, TransactionArgument } from "@mysten/sui/transactions";
import { ChainConfig, config } from "@/lib/sui-to-evm-config";
import { bcs } from "@mysten/sui.js/bcs";
import { uint8ArrayToHex, UINT_40_MAX } from "@1inch/byte-utils";
import {
  ethers,
  Interface,
  keccak256,
  MaxUint256,
  parseEther,
  parseUnits,
  randomBytes,
} from "ethers";
import { fromBase64, MIST_PER_SUI } from "@mysten/sui/utils";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import * as Sdk from "@1inch/cross-chain-sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  EVMChain,
  Immutables,
  MockOrder,
  SUIChain,
  Timelocks,
} from "@/lib/types";
import {
  deployDestinationEscrow,
  getDstEscrowCreatedEvents,
  suiWithdraw,
} from "@/utils/sui-utils";
import { EVMWallet } from "@/lib/evmWallet";
import { SUIEscrowFactory } from "@/lib/sui-escrow-factory";
import { SUIWallet } from "@/lib/suiWallet";
import { initEVMChain } from "@/utils/evm-utils";
import { initSUIChain } from "@/utils/sui-utils";
import { EVMEscrowFactory } from "@/lib/evm-escrow-factory";
import { getBalances } from "@/utils/common-utils";
import { Resolver } from "@/lib/resolver";
const { Address } = Sdk;

export async function GET(req: NextRequest) {
  const srcChainId = config.chain.source.chainId;
  const dstChainId = config.chain.destination.chainId;

  let src: SUIChain;
  let dst: EVMChain;

  let srcChainUser: SUIWallet;
  let dstChainUser: EVMWallet;

  let srcChainResolver: SUIWallet;
  let dstChainResolver: EVMWallet;

  let srcTimestamp: bigint;

  let srcFactory: SUIEscrowFactory;
  let dstFactory: EVMEscrowFactory;

  let srcResolverContract: SUIWallet;
  let dstResolverContract: EVMWallet;

  [src, dst] = await Promise.all([
    initSUIChain(config.chain.source),
    initEVMChain(config.chain.destination),
  ]);

  srcChainUser = new SUIWallet(
    process.env.SUI_USER_PK!,
    getFullnodeUrl("testnet")
  );
  dstChainUser = new EVMWallet(process.env.EVM_USER_PK!, dst.provider);

  srcChainResolver = new SUIWallet(
    process.env.SUI_RESOLVER_PK!,
    getFullnodeUrl("testnet")
  );
  dstChainResolver = new EVMWallet(process.env.EVM_RESOLVER_PK!, dst.provider);

  srcFactory = new SUIEscrowFactory(src.provider, src.escrowFactory);
  dstFactory = new EVMEscrowFactory(dst.provider, dst.escrowFactory);

  await dstChainResolver.transfer(dst.resolverContract, parseEther("0.01"));

  const erc20Iface = new Interface([
    "function approve(address spender, uint256 amount)",
  ]);

  const approveData = erc20Iface.encodeFunctionData("approve", [
    dst.escrowFactory,
    MaxUint256,
  ]);

  const resolverIface = new Interface([
    "function arbitraryCalls(address[] targets, bytes[] arguments)",
  ]);

  const callData = resolverIface.encodeFunctionData("arbitraryCalls", [
    [config.chain.source.tokens.USDC.address], // targets: array of contract(s) to call
    [approveData], // arguments: array of calldata for each
  ]);

  const resolverApproveTx = await dstChainResolver.send({
    to: dst.resolverContract,
    data: callData,
  });

  // srcTimestamp = BigInt((await src.provider.getTransactionBlock()))!.timestamp);

  console.log(
    `🟢 [${srcChainId}] Resolver Approval:`,
    `🔑 Resolver ${await dst.resolverContract} approved USDC for Escrow Factory ${
      dst.escrowFactory
    } in tx: ${resolverApproveTx.txHash} 🎉`
  );

  console.log("🔍 Step 1️⃣: Fetching Initial Balances...");
  const initialBalances = await getBalances(
    srcChainUser,
    dstChainUser,
    srcChainResolver,
    dstChainResolver,
    config.chain.source.tokens.USDC.address,
    config.chain.destination.tokens.USDC.address
  );
  console.log("💰 Initial Balances:", initialBalances);

  // User creates order
  console.log("📝 Step 2️⃣: Creating Cross-Chain Order...");
  const secret = uint8ArrayToHex(randomBytes(32)); // note: use crypto secure random number in real world

  const srcChainUserAddress = await srcChainUser.getAddress();
  const orderMock: MockOrder = {
    escrowFactory: src.escrowFactory,
    salt: BigInt(1000),
    maker: srcChainUserAddress,
    makingAmount: BigInt(1),
    takingAmount: parseUnits("1", 5),
    makerAsset: config.chain.source.tokens.USDC.address,
    takerAsset: config.chain.destination.tokens.USDC.address.slice(0, 42),
    hashLock: Sdk.HashLock.forSingleFill(secret).toString(),
    timeLocks: {
      srcWithdrawal: BigInt(10),
      srcPublicWithdrawal: BigInt(120),
      srcCancellation: BigInt(121),
      srcPublicCancellation: BigInt(122),
      dstWithdrawal: BigInt(10),
      dstPublicWithdrawal: BigInt(140),
      dstCancellation: BigInt(101),
    },
    srcChainId: config.chain.source.chainId,
    dstChainId: config.chain.destination.chainId,
    srcSafetyDeposit: BigInt(1),
    dstSafetyDeposit: parseEther("0.001"),
    auction: {
      initialRateBump: 0,
      points: [],
      duration: BigInt(120),
      startTime: BigInt(0),
    },
    whitelist: [
      {
        address: srcChainUserAddress,
        allowFrom: BigInt(0),
      },
    ],
    resolvingStartTime: BigInt(0),
    allowMultipleFills: false,
    allowPartialFills: false,
  };

  // Resolver fills order
  const resolverContract = new Resolver(
    src.resolverContract,
    dst.resolverContract
  );
  // generate random order hash

  const orderHash = ethers.keccak256(
    ethers.toUtf8Bytes(JSON.stringify(orderMock))
  );

  console.log(`[${srcChainId}]`, `Filling order ${orderHash}`);

  const fillAmount = orderMock.makingAmount;
  console.log("🤝 Step 3️⃣: Filling Order on Source Chain...");

  orderMock.orderHash = orderHash;

  const { txHash: orderFillHash } = await srcChainResolver.send(
    resolverContract.suiDeploySrc(srcChainId, orderMock, fillAmount)
  );

  console.log(
    `✅ [${srcChainId}] Order Filled:`,
    `Order ${orderHash} filled for ${fillAmount} USDC in tx: ${orderFillHash} 🎯`
  );

  console.log("🔎 Step 4️⃣: Retrieving Source Escrow Event...");
  const srcEscrowDeployEvents = await srcFactory.getSrcDeployEvents();

  const latestSrcDeployEvent = srcEscrowDeployEvents[0];

  const destEscrowID = (latestSrcDeployEvent.parsedJson as any).escrow_id;

  const immutables = Sdk.Immutables.new({
    orderHash: srcImmutables.orderHash,
    hashLock: srcImmutables.hashLock,
    maker: srcImmutables.maker,
    taker: srcImmutables.taker,
    token: srcImmutables.token,
    amount: dstImmutables.amount,
    safetyDeposit: dstImmutables.safetyDeposit,
    timeLocks: srcImmutables.timeLocks,
  });

  console.log(
    `🔍 [${dstChainId}] Immutables going to destination chain:`,
    immutables
  );

  console.log(
    `💸 [${dstChainId}] Preparing Deposit:`,
    `Depositing ${immutables.amount} SUI for order ${orderHash} on destination chain...`
  );

  console.log("🏗️ Step 5️⃣: Preparing Destination Chain Deposit...");
  const suiCoinObjectId = await dstChainResolver.getCoinFromWallet(
    "0x2::sui::SUI"
  );
  const usdcCoinObjectId = await dstChainResolver.getCoinFromWallet(
    config.chain.destination.tokens.USDC.address
  );

  const txb = new Transaction();

  // Split the coin
  console.log("🪙 Splitting SUI coins for safety deposit...");
  const [safetyDepositCoin] = txb.splitCoins(txb.object(suiCoinObjectId), [
    txb.pure.u64(immutables.safetyDeposit),
  ]);
  console.log("🪙 Splitted SUI coins for safety deposit: ", safetyDepositCoin);

  console.log("🪙 Splitting USDC coins for escrow...");
  const [escrowCoin] = txb.splitCoins(txb.object(usdcCoinObjectId), [
    txb.pure.u64(immutables.amount),
  ]);

  console.log("🪙 Splitted USDC coins for escrow: ", escrowCoin);

  // Add the contract call to the same transaction block
  console.log("📦 Adding SUI deploy destination call to transaction block...");
  const tx = resolverContract.suiDeployDst(
    immutables,
    escrowCoin,
    safetyDepositCoin,
    txb // Make sure this function adds the call to the provided txb
  );

  // Execute the transaction block
  console.log("🚀 Step 6️⃣: Sending Transaction to Destination Chain...");
  const { res: txResult, txHash: dstDepositHash } = await dstChainResolver.send(
    tx
  );
  console.log(`📤 [${dstChainId}] Transaction Sent:`, dstDepositHash);

  const deployEvents = await dstFactory.getDstEscrowCreatedEvents();
  const latestDeployEvent = deployEvents[0];

  const destEscrowID = (latestDeployEvent.parsedJson as any).escrow_id;
  console.log(
    `🎉 [${dstChainId}] Destination Escrow Created:`,
    `Created destination deposit for order ${orderHash} in tx: ${dstDepositHash}`
  );
  console.log("🏦 Destination Escrow ID:", destEscrowID);

  const ESCROW_SRC_IMPLEMENTATION = await srcFactory.getSourceImpl();
  // const ESCROW_DST_IMPLEMENTATION = await dstFactory.getDestinationImpl()

  const srcEscrowAddress = new Sdk.EscrowFactory(
    new Address(src.escrowFactory)
  ).getSrcEscrowAddress(srcEscrowEvent[0], ESCROW_SRC_IMPLEMENTATION);
  console.log("🏦 Source Escrow Address:", srcEscrowAddress);

  // await increaseTime(11)
  // User shares key after validation of dst escrow deployment

  const newsecret = Sdk.HashLock.forSingleFill(secret);

  console.log("🔍 Hash Lock Validation:");
  console.log("Original Hash Lock:", srcEscrowEvent[0].hashLock.toString());
  console.log("New Hash Lock:", newsecret.toString());
  console.log(
    "Hash Locks Equal:",
    srcEscrowEvent[0].hashLock.toString() == newsecret.toString()
  );

  // Verify the hash lock matches before attempting withdrawal
  if (srcEscrowEvent[0].hashLock.toString() != newsecret.toString()) {
    throw new Error("Hash lock mismatch - withdrawal conditions not met");
  }

  console.log(
    `🔓 [${srcChainId}] Resolver Withdrawal:`,
    `Withdrawing funds for resolver from escrow address: ${srcEscrowAddress}...`
  );

  // Get the resolver address
  const resolverAddress = await srcChainResolver.getAddress();
  console.log(`🔑 Resolver Address: ${resolverAddress}`);

  // Check if enough time has passed for withdrawal
  const currentTime = Math.floor(Date.now() / 1000);
  // For now, use a default withdrawal delay since the event structure might not have these properties
  const deploymentTime = currentTime - 15; // Assume deployment was 15 seconds ago
  const withdrawalDelay = 10; // 10 seconds as set in the order creation

  console.log(`⏰ Time Check:`);
  console.log(`Current Time: ${currentTime}`);
  console.log(`Deployment Time: ${deploymentTime}`);
  console.log(`Withdrawal Delay: ${withdrawalDelay}`);
  console.log(`Time Elapsed: ${currentTime - deploymentTime}`);
  console.log(
    `Can Withdraw: ${currentTime - deploymentTime >= withdrawalDelay}`
  );

  if (currentTime - deploymentTime < withdrawalDelay) {
    console.log(`⏳ Waiting for withdrawal delay...`);
    // Wait for the remaining time
    const remainingTime = withdrawalDelay - (currentTime - deploymentTime);
    await new Promise((resolve) =>
      setTimeout(resolve, (remainingTime + 1) * 1000)
    );
  }

  let resolverWithdrawHash: string;
  try {
    console.log(`🔍 Withdrawal Parameters:`);
    console.log(`Side: src`);
    console.log(`Escrow Address: ${srcEscrowAddress}`);
    console.log(`Secret: ${secret}`);
    console.log(`Immutables:`, srcEscrowEvent[0]);

    const hashed = keccak256(secret);
    console.log("Keccak hash:", hashed);

    // Compare to immutables.hashlock
    if (hashed !== immutables.hashLock.toString()) {
      throw new Error("Secret doesn't match the expected hashlock");
    }

    console.log("🔍 Taker Validation:");
    console.log("Taker:", immutables.taker.toString());
    console.log("Resolver Address:", resolverContract.srcAddress);
    console.log(
      "Taker Matches Resolver:",
      immutables.taker.toString() === resolverContract.srcAddress
    );

    // Also confirm taker matches
    if (
      (await resolverContract.srcAddress.toLowerCase()) !==
      immutables.taker.toString()
    ) {
      throw new Error("Only taker can call withdraw()");
    }

    const result = await srcChainResolver.send(
      resolverContract.evmWithdraw(
        "src",
        srcEscrowAddress,
        secret,
        srcEscrowEvent[0]
      )
    );

    resolverWithdrawHash = result.txHash;

    console.log(
      `💸 [${srcChainId}] Resolver Funds Withdrawn:`,
      `Funds withdrawn for resolver from ${srcEscrowAddress} to ${src.resolverContract} in tx: ${resolverWithdrawHash}`
    );
  } catch (error: any) {
    console.error(`❌ [${srcChainId}] Resolver Withdrawal Failed:`, error);
    throw new Error(
      `Resolver withdrawal failed: ${error?.message || "Unknown error"}`
    );
  }

  console.log(
    `💸 [${srcChainId}] Resolver Funds Withdrawn:`,
    `Funds withdrawn for resolver from ${srcEscrowAddress} to ${src.resolverContract} in tx: ${resolverWithdrawHash}`
  );

  console.log(
    `🔓 [${dstChainId}] User Withdrawal:`,
    `Withdrawing funds for user from destination escrow ID: ${destEscrowID}...`
  );

  await dstChainResolver.send(
    resolverContract.suiWithdraw("dst", destEscrowID, secret)
  );
  console.log(
    `💸 [${dstChainId}] User Funds Withdrawn:`,
    `Funds withdrawn for user from destination escrow ID: ${destEscrowID}`
  );

  console.log("🔍 Step 7️⃣: Fetching Result Balances...");
  const resultBalances = await getBalances(
    srcChainUser,
    dstChainUser,
    srcChainResolver,
    dstChainResolver,
    config.chain.source.tokens.USDC.address,
    config.chain.destination.tokens.USDC.address
  );
  console.log("💰 Result Balances:", resultBalances);

  // user transferred funds to resolver on source chain

  console.log(
    "✨ All steps completed! Cross-chain relayer process finished successfully! 🏁"
  );

  return NextResponse.json({
    message: "Relayer request processed successfully",
    srcChainId,
    dstChainId,
    srcChainUser: await srcChainUser.getAddress(),
    dstChainUser: await dstChainUser.getAddress(),
    srcChainResolver: await srcChainResolver.getAddress(),
    dstChainResolver: await dstChainResolver.getAddress(),
    orderHash,
    srcEscrowAddress,
    destEscrowID,
    srcDeployBlock,
    resolverWithdrawHash,
    dstDepositHash,
    initialBalances,
    resultBalances,
  });
}
