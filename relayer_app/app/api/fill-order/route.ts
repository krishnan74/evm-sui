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

  srcChainUser = new EVMWallet(process.env.EVM_USER_PK!, src.provider);
  dstChainUser = new SUIWallet(
    process.env.SUI_USER_PK!,
    getFullnodeUrl("testnet")
  );

  srcChainResolver = new EVMWallet(process.env.EVM_RESOLVER_PK!, src.provider);
  dstChainResolver = new SUIWallet(
    "suiprivkey1qpunhm8jddh6dpr5aqp8ksgjsg9wzd30z7nmwqp4p247z4efcnmsq0p3t3t",
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

  const resolverApproveTx = await srcChainResolver.send({
    to: src.resolverContract,
    data: callData,
  });

  console.log(
    `🟢 [${srcChainId}] Resolver Approval:`,
    `🔑 Resolver ${await src.resolverContract} approved USDC for LOP in tx: ${
      resolverApproveTx.txHash
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
      makingAmount: parseUnits("1", 5), // 1 USDC
      takingAmount: BigInt(1),
      makerAsset: new Address(config.chain.source.tokens.USDC.address),
      takerAsset: new Address(
        config.chain.destination.tokens.USDC.address.slice(0, 42)
      ),
    },
    {
      hashLock: ogHashLock,
      timeLocks: Sdk.TimeLocks.new({
        srcWithdrawal: BigInt(10), // 10sec finality lock for test
        srcPublicWithdrawal: BigInt(120), // 2m for private withdrawal
        srcCancellation: BigInt(121), // 1sec public withdrawal
        srcPublicCancellation: BigInt(122), // 1sec private cancellation
        dstWithdrawal: BigInt(10), // 10sec finality lock for test
        dstPublicWithdrawal: BigInt(100), // 100sec private withdrawal
        dstCancellation: BigInt(101), // 1sec public withdrawal
      }),
      srcChainId: Sdk.NetworkEnum.ETHEREUM,
      dstChainId: Sdk.NetworkEnum.BINANCE,
      srcSafetyDeposit: parseEther("0.001"), // 1 USDC
      dstSafetyDeposit: BigInt(1),
    },
    {
      auction: new Sdk.AuctionDetails({
        initialRateBump: 0,
        points: [],
        duration: BigInt(120),
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

  const { txHash: orderFillHash, blockHash: srcDeployBlock } =
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
    `Order ${orderHash} filled for ${fillAmount} USDC in tx: ${orderFillHash} 🎯`
  );
}
