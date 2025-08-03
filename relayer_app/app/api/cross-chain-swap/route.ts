import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { getFaucetHost, requestSuiFromFaucetV2 } from "@mysten/sui/faucet";
import {
  coinWithBalance,
  Transaction,
  TransactionArgument,
} from "@mysten/sui/transactions";
import { ChainConfig, config } from "@/lib/evm-to-sui-config";
import { bcs } from "@mysten/sui.js/bcs";
import { uint8ArrayToHex, UINT_40_MAX } from "@1inch/byte-utils";
import {
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
import { EVMChain, Immutables, SUIChain, Timelocks } from "@/lib/types";
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

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    makingAmount,
    takingAmount,
    srcWithdrawal,
    srcPublicWithdrawal,
    srcCancellation,
    srcPublicCancellation,
    dstWithdrawal,
    dstPublicWithdrawal,
    dstCancellation,
    srcSafetyDeposit,
    dstSafetyDeposit,
    auctionInitialRateBump,
    auctionDuration,
  } = await body;

  const srcChainId = config.chain.source.chainId;
  const dstChainId = config.chain.destination.chainId;

  let src: EVMChain;
  let dst: SUIChain;

  let srcChainUser: EVMWallet;
  let dstChainUser: SUIWallet;
  let srcChainResolver: EVMWallet;
  let dstChainResolver: SUIWallet;

  let srcFactory: EVMEscrowFactory;
  let dstFactory: SUIEscrowFactory;
  let srcResolverContract: EVMWallet;
  let dstResolverContract: SUIWallet;

  let srcTimestamp: bigint;

  [src, dst] = await Promise.all([
    initEVMChain(config.chain.source),
    initSUIChain(config.chain.destination),
  ]);

  console.log(
    `[${srcChainId}] 🚀`,
    `Base Sepolia Escrow factory contract deployed to`,
    src.escrowFactory
  );

  console.log(
    `[${srcChainId}] 🚀`,
    `Base Sepolia Resolver contract deployed to`,
    src.resolverContract
  );

  console.log(
    `[${dstChainId}] 🚀`,
    `SUI Escrow factory and Resolver package published to`,
    dst.escrowFactory
  );

  srcChainUser = new EVMWallet(process.env.EVM_USER_PK!, src.provider);
  dstChainUser = new SUIWallet(
    process.env.SUI_USER_PK!,
    getFullnodeUrl("testnet")
  );

  srcChainResolver = new EVMWallet(process.env.EVM_RESOLVER_PK!, src.provider);
  dstChainResolver = new SUIWallet(
    process.env.SUI_RESOLVER_PK!,
    getFullnodeUrl("testnet")
  );

  srcFactory = new EVMEscrowFactory(src.provider, src.escrowFactory);
  dstFactory = new SUIEscrowFactory(dst.provider, dst.escrowFactory);

  await srcChainUser.approveToken(
    config.chain.source.tokens.USDC.address,
    config.chain.source.limitOrderProtocol,
    MaxUint256
  );

  console.log(
    `🟢 [${srcChainId}] User Wallet Approval:`,
    `✅ User ${await srcChainUser.getAddress()} successfully approved USDC for Limit Order Protocol! 🚀`
  );

  const erc20Iface = new Interface([
    "function approve(address spender, uint256 amount)",
  ]);

  const approveData = erc20Iface.encodeFunctionData("approve", [
    config.chain.source.limitOrderProtocol,
    MaxUint256,
  ]);

  const resolverIface = new Interface([
    "function arbitraryCalls(address[] targets, bytes[] arguments)",
  ]);

  const callData = resolverIface.encodeFunctionData("arbitraryCalls", [
    [config.chain.source.tokens.USDC.address], // targets: array of contract(s) to call
    [approveData], // arguments: array of calldata for each
  ]);

  const srcResolverApproveTx = await srcChainResolver.send({
    to: src.resolverContract,
    data: callData,
  });

  console.log(
    `🟢 [${srcChainId}] Resolver Approval:`,
    `🔑 Resolver ${await src.resolverContract} approved USDC for LOP in tx: ${
      srcResolverApproveTx.txHash
    } 🎉`
  );

  srcTimestamp = BigInt((await src.provider.getBlock("latest"))!.timestamp);

  console.log(`⏰ [${srcChainId}] Current Block Timestamp:`, srcTimestamp);

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

  const ogHashLock = Sdk.HashLock.forSingleFill(secret!);

  const order = Sdk.CrossChainOrder.new(
    new Address(src.escrowFactory),
    {
      salt: Sdk.randBigInt(BigInt(1000)),
      maker: new Address(await srcChainUser.getAddress()),
      // receiver: new Address(await srcChainResolver.getAddress()),
      makingAmount: parseUnits("1", makingAmount), // 1 USDC
      takingAmount: BigInt(takingAmount),
      makerAsset: new Address(config.chain.source.tokens.USDC.address),
      takerAsset: new Address(
        config.chain.destination.tokens.USDC.address.slice(0, 42)
      ),
    },
    {
      hashLock: ogHashLock,
      timeLocks: Sdk.TimeLocks.new({
        srcWithdrawal: BigInt(srcWithdrawal), // 10sec finality lock for test
        srcPublicWithdrawal: BigInt(srcPublicWithdrawal), // 2m for private withdrawal
        srcCancellation: BigInt(srcCancellation), // 1sec public withdrawal
        srcPublicCancellation: BigInt(srcPublicCancellation), // 1sec private cancellation
        dstWithdrawal: BigInt(dstWithdrawal), // 10sec finality lock for test
        dstPublicWithdrawal: BigInt(dstPublicWithdrawal), // 100sec private withdrawal
        dstCancellation: BigInt(dstCancellation), // 1sec public withdrawal
      }),
      srcChainId: Sdk.NetworkEnum.ETHEREUM,
      dstChainId: Sdk.NetworkEnum.BINANCE,
      srcSafetyDeposit: parseEther(srcSafetyDeposit), // 1 USDC
      dstSafetyDeposit: BigInt(dstSafetyDeposit), // 1 USDC
    },
    {
      auction: new Sdk.AuctionDetails({
        initialRateBump: auctionInitialRateBump,
        points: [],
        duration: BigInt(auctionDuration),
        startTime: srcTimestamp,
      }),
      whitelist: [
        {
          address: new Address(src.resolverContract),
          allowFrom: BigInt(0),
        },
      ],
      resolvingStartTime: BigInt(0),
    },
    {
      nonce: Sdk.randBigInt(UINT_40_MAX),
      allowPartialFills: false,
      allowMultipleFills: false,
    }
  );

  order.inner.fusionExtension.srcChainId = srcChainId;
  order.inner.fusionExtension.dstChainId = dstChainId;

  const signature = await srcChainUser.signOrder(srcChainId, order);
  const orderHash = order.getOrderHash(srcChainId);

  const resolverContract = new Resolver(
    src.resolverContract,
    dst.resolverContract
  );

  console.log(`[${srcChainId}]`, `Filling order ${orderHash}`);

  const fillAmount = order.makingAmount;
  console.log("🤝 Step 3️⃣: Filling Order on Source Chain...");

  const { txHash: orderFillTx, blockHash: srcDeployBlock } =
    await srcChainResolver.send(
      resolverContract.deploySrc(
        srcChainId,
        order,
        signature,
        Sdk.TakerTraits.default()
          .setExtension(order.extension)
          .setAmountMode(Sdk.AmountMode.maker)
          .setAmountThreshold(order.takingAmount),
        fillAmount
      )
    );

  console.log(
    `✅ [${srcChainId}] Order Filled:`,
    `Order ${orderHash} filled for ${fillAmount} USDC in tx: ${orderFillTx} 🎯`
  );

  console.log("🔎 Step 4️⃣: Retrieving Source Escrow Event...");
  const srcEscrowEvent = await srcFactory.getSrcDeployEvent(srcDeployBlock);

  const srcImmutables = srcEscrowEvent[0];
  const dstImmutables = srcEscrowEvent[1];

  const immutables = Sdk.Immutables.new({
    orderHash: srcImmutables.orderHash,
    hashLock: ogHashLock,
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
  // const [safetyDepositCoin] = txb.splitCoins(txb.object(suiCoinObjectId), [
  //   txb.pure.u64(immutables.safetyDeposit),
  // ]);

  const safetyDepositCoin = coinWithBalance({
    balance: immutables.safetyDeposit, // default it will be for sui
  });

  console.log("🪙 Splitted SUI coins for safety deposit: ");

  console.log("🪙 Splitting USDC coins for escrow...");
  // const [escrowCoin] = txb.splitCoins(txb.object(usdcCoinObjectId), [
  //   txb.pure.u64(immutables.amount),
  // ]);
  const escrowCoin = coinWithBalance({
    balance: immutables.amount,
    type: "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
  });

  console.log("🪙 Splitted USDC coins for escrow: ");

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
  const { res: txResult, txHash: dstDepositDigest } =
    await dstChainResolver.send(tx);

  console.log(
    `✅ [${dstChainId}] Deposit Successful:`,
    `Created destination escrow for order ${orderHash} in tx: ${dstDepositDigest}`
  );

  const deployEvents = await dstFactory.getDstDeployEvents();

  const sorted = deployEvents.sort(
    (a, b) => Number(b.timestampMs) - Number(a.timestampMs)
  );
  const latestDeployEvent = sorted[0];

  const destEscrowID = (latestDeployEvent.parsedJson as any).escrow_id;
  console.log(
    `🎉 [${dstChainId}] Destination Escrow Created:`,
    `Created destination deposit for order ${orderHash} in tx: ${dstDepositDigest}`
  );
  console.log("🏦 Destination Escrow ID:", destEscrowID);

  const ESCROW_SRC_IMPLEMENTATION = await srcFactory.getSourceImpl();
  // const ESCROW_DST_IMPLEMENTATION = await dstFactory.getDestinationImpl()

  const srcEscrowAddress = new Sdk.EscrowFactory(
    new Address(src.escrowFactory)
  ).getSrcEscrowAddress(srcEscrowEvent[0], ESCROW_SRC_IMPLEMENTATION);
  console.log("🏦 Source Escrow Address:", srcEscrowAddress);

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

  console.log(
    `💸 [${dstChainId}] User Funds Withdrawn:`,
    `Funds withdrawn for user from destination escrow ID: ${destEscrowID}`
  );

  let srcResolverWithdrawHash: string;
  try {
    const hashed = keccak256(secret);
    console.log("Keccak hash:", hashed);

    // Compare to immutables.hashlock
    if (hashed !== immutables.hashLock.toString()) {
      throw new Error("Secret doesn't match the expected hashlock");
    }

    console.log("🔍 Taker Validation:");
    console.log("Taker:", immutables.taker.toString());
    console.log("Resolver Address:", resolverContract.srcAddress);

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

    srcResolverWithdrawHash = result.txHash;
  } catch (error: any) {
    console.error(`❌ [${srcChainId}] Resolver Withdrawal Failed:`, error);
    throw new Error(
      `Resolver withdrawal failed: ${error?.message || "Unknown error"}`
    );
  }

  console.log(
    `💸 [${srcChainId}] Resolver Funds Withdrawn:`,
    `Funds withdrawn for resolver from ${srcEscrowAddress} to ${src.resolverContract} in tx: ${srcResolverWithdrawHash}`
  );

  console.log(
    `🔓 [${dstChainId}] User Withdrawal:`,
    `Withdrawing funds for user from destination escrow ID: ${destEscrowID}...`
  );

  const destResolverWithdraw = await dstChainResolver.send(
    resolverContract.suiWithdraw("dst", destEscrowID, secret)
  );

  console.log(
    `🔓 [${dstChainId}] User Funds Withdrawn:`,
    `Withdrawing funds for user from destination escrow ID: ${destEscrowID}... in tx: ${destResolverWithdraw.txHash}`
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

  console.log(
    "✨ All steps completed! Cross-chain atomic swap using 1inch and HTLC process finished successfully! 🏁"
  );

  // Helper function to recursively convert BigInt to string
  function convertBigIntToString(obj: any): any {
    if (typeof obj === "bigint") {
      return obj.toString();
    } else if (Array.isArray(obj)) {
      return obj.map(convertBigIntToString);
    } else if (obj && typeof obj === "object") {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, convertBigIntToString(v)])
      );
    }
    return obj;
  }

  return NextResponse.json(
    convertBigIntToString({
      message: "Relayer request processed successfully",
      srcChainId,
      dstChainId,
      srcChainUser: await srcChainUser.getAddress(),
      dstChainUser: await dstChainUser.getAddress(),
      srcChainResolver: await srcChainResolver.getAddress(),
      dstChainResolver: await dstChainResolver.getAddress(),
      srcEscrowAddress,
      dstEscrowAddress: destEscrowID,
      srcResolverApproveTx,
      orderFillTx,
      dstDepositDigest,
      srcResolverWithdrawHash,
      destResolverWithdraw,
      initialBalances,
      resultBalances,
    })
  );
}
