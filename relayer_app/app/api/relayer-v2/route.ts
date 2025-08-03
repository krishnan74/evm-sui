import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import * as Sdk from "@1inch/cross-chain-sdk";

// Global state for the relayer
let isRelayerRunning = false;
let lastProcessedBlock: string | null = null;
let pollingInterval: NodeJS.Timeout | null = null;

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();

    if (action === 'start') {
      if (isRelayerRunning) {
        return NextResponse.json({ 
          success: false, 
          message: 'Relayer is already running' 
        });
      }

      await startRelayer();
      return NextResponse.json({ 
        success: true, 
        message: 'Relayer started successfully' 
      });

    } else if (action === 'stop') {
      if (!isRelayerRunning) {
        return NextResponse.json({ 
          success: false, 
          message: 'Relayer is not running' 
        });
      }

      await stopRelayer();
      return NextResponse.json({ 
        success: true, 
        message: 'Relayer stopped successfully' 
      });

    } else if (action === 'status') {
      return NextResponse.json({
        success: true,
        isRunning: isRelayerRunning,
        lastProcessedBlock,
        uptime: isRelayerRunning ? Date.now() - (global as any).relayerStartTime : 0
      });

    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid action. Use: start, stop, or status' 
      });
    }

  } catch (error) {
    console.error('Relayer error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process relayer request' 
    }, { status: 500 });
  }
}

async function startRelayer() {
  try {
    console.log('🚀 Starting relayer service...');
    
    // Initialize provider (you'll need to set up your RPC URL)
    const rpcUrl = process.env.SRC_CHAIN_RPC || "https://sepolia.base.org";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Contract address for the escrow factory
    const escrowFactoryAddress = process.env.ESCROW_FACTORY_ADDRESS || "0xE53136D9De56672e8D2665C98653AC7b8A60Dc44";
    
    // ABI for the SrcEscrowCreated event
    const abi = [
      "event SrcEscrowCreated(bytes32 indexed orderHash, bytes32 hashLock, address maker, address taker, address token, uint256 amount, uint256 safetyDeposit, tuple(uint256 srcWithdrawal, uint256 srcPublicWithdrawal, uint256 srcCancellation, uint256 srcPublicCancellation, uint256 dstWithdrawal, uint256 dstPublicWithdrawal, uint256 dstCancellation, uint256 deployedAt) timeLocks, address makerDst, uint256 amountDst, address tokenDst, uint256 safetyDepositDst)"
    ];

    isRelayerRunning = true;
    (global as any).relayerStartTime = Date.now();

    // Start polling for events
    pollingInterval = setInterval(async () => {
      await pollForSourceEscrowEvents(provider, escrowFactoryAddress, abi);
    }, 5000); // Poll every 5 seconds

    console.log('✅ Relayer service started successfully');

  } catch (error) {
    console.error('❌ Failed to start relayer:', error);
    isRelayerRunning = false;
    throw error;
  }
}

async function stopRelayer() {
  try {
    console.log('🛑 Stopping relayer service...');
    
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    
    isRelayerRunning = false;
    console.log('✅ Relayer service stopped successfully');

  } catch (error) {
    console.error('❌ Failed to stop relayer:', error);
    throw error;
  }
}

async function pollForSourceEscrowEvents(
  provider: ethers.JsonRpcProvider,
  escrowFactoryAddress: string,
  abi: string[]
) {
  try {
    if (!isRelayerRunning) return;

    console.log('🔍 Polling for Source Escrow deploy events...');

    // Get the latest block number
    const latestBlock = await provider.getBlockNumber();
    
    // If we don't have a last processed block, start from the latest
    if (!lastProcessedBlock) {
      lastProcessedBlock = latestBlock.toString();
      return;
    }

    // Get events from the last processed block to the latest
    const fromBlock = parseInt(lastProcessedBlock) + 1;
    const toBlock = latestBlock;

    if (fromBlock > toBlock) {
      return; // No new blocks to process
    }

    console.log(`📦 Processing blocks ${fromBlock} to ${toBlock}`);

    // Create contract interface
    const iface = new ethers.Interface(abi);
    const eventTopic = iface.getEvent("SrcEscrowCreated")!.topicHash;

    // Get all SrcEscrowCreated events in the block range
    const logs = await provider.getLogs({
      fromBlock,
      toBlock,
      address: escrowFactoryAddress,
      topics: [eventTopic],
    });

    for (const log of logs) {
      try {
        await processSourceEscrowEvent(log, iface);
      } catch (error) {
        console.error('❌ Error processing event:', error);
        // Continue processing other events
      }
    }

    // Update the last processed block
    lastProcessedBlock = toBlock.toString();

  } catch (error) {
    console.error('❌ Error polling for events:', error);
  }
}

async function processSourceEscrowEvent(
  log: any,
  iface: ethers.Interface
) {
  try {
    console.log('🎯 Processing Source Escrow event...');

    // Decode the event
    const decodedLog = iface.decodeEventLog("SrcEscrowCreated", log.data, log.topics);

    console.log('📋 Source Escrow Event Details:');
    console.log('Order Hash:', decodedLog[0]);
    console.log('Hash Lock:', decodedLog[1]);
    console.log('Maker:', decodedLog[2]);
    console.log('Taker:', decodedLog[3]);
    console.log('Token:', decodedLog[4]);
    console.log('Amount:', decodedLog[5].toString());
    console.log('Safety Deposit:', decodedLog[6].toString());

    // Create destination escrow
    await createDestinationEscrow(decodedLog);

  } catch (error) {
    console.error('❌ Error processing Source Escrow event:', error);
    throw error;
  }
}

async function createDestinationEscrow(eventData: any) {
  try {
    console.log('🏗️ Creating destination escrow...');

    // Here you would implement the logic to create the destination escrow
    // This would involve:
    // 1. Creating the immutables for the destination chain
    // 2. Sending a transaction to create the destination escrow
    // 3. Storing the order in local storage

    console.log('✅ Destination escrow creation initiated');
    console.log(`🎯 Order Hash: ${eventData[0]}`);

    // Store the order in our local storage
    const orderData = {
      id: Date.now().toString(),
      orderHash: eventData[0],
      escrowFactory: process.env.DST_ESCROW_FACTORY_ADDRESS || "0x...",
      salt: BigInt(Date.now()),
      maker: eventData[2],
      makingAmount: eventData[5],
      takingAmount: eventData[5], // This would be different for destination
      makerAsset: eventData[4],
      takerAsset: eventData[4], // This would be different for destination
      hashLock: eventData[1],
      timeLocks: {
        srcWithdrawal: eventData[7][0],
        srcPublicWithdrawal: eventData[7][1],
        srcCancellation: eventData[7][2],
        srcPublicCancellation: eventData[7][3],
        dstWithdrawal: eventData[7][4],
        dstPublicWithdrawal: eventData[7][5],
        dstCancellation: eventData[7][6],
      },
      srcChainId: 84532, // Base Sepolia
      dstChainId: 1, // Sui
      srcSafetyDeposit: eventData[6],
      dstSafetyDeposit: eventData[6], // This would be different for destination
      auction: {
        initialRateBump: 0,
        points: [],
        duration: BigInt(120),
        startTime: BigInt(0),
      },
      whitelist: [],
      resolvingStartTime: BigInt(0),
      allowPartialFills: false,
      allowMultipleFills: false,
      createdAt: new Date(),
    };

    console.log('📦 Order data prepared for storage:', orderData);

    // In a real implementation, you would:
    // 1. Send transaction to create destination escrow
    // 2. Store the order in a database
    // 3. Handle any errors and retries

  } catch (error) {
    console.error('❌ Error creating destination escrow:', error);
    throw error;
  }
}
