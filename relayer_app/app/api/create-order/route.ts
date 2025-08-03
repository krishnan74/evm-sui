import { NextRequest, NextResponse } from 'next/server'
import { MockOrder } from '@/lib/types'
import { ethers } from 'ethers'
import { orderStorage, StoredOrder } from '@/lib/orderStorage'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate required fields
    const requiredFields = [
      'escrowFactory', 'maker', 'makingAmount', 'takingAmount',
      'makerAsset', 'takerAsset', 'hashLock', 'srcChainId', 'dstChainId'
    ]
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Create order hash if not provided
    const orderHash = body.orderHash || ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(body))
    )

    // Create the order object
    const order: StoredOrder = {
      id: Date.now().toString(),
      orderHash,
      escrowFactory: body.escrowFactory,
      salt: BigInt(body.salt || Date.now()),
      maker: body.maker,
      makingAmount: BigInt(body.makingAmount),
      takingAmount: BigInt(body.takingAmount),
      makerAsset: body.makerAsset,
      takerAsset: body.takerAsset,
      hashLock: body.hashLock,
      timeLocks: {
        srcWithdrawal: BigInt(body.timeLocks?.srcWithdrawal || 10),
        srcPublicWithdrawal: BigInt(body.timeLocks?.srcPublicWithdrawal || 120),
        srcCancellation: BigInt(body.timeLocks?.srcCancellation || 121),
        srcPublicCancellation: BigInt(body.timeLocks?.srcPublicCancellation || 122),
        dstWithdrawal: BigInt(body.timeLocks?.dstWithdrawal || 10),
        dstPublicWithdrawal: BigInt(body.timeLocks?.dstPublicWithdrawal || 140),
        dstCancellation: BigInt(body.timeLocks?.dstCancellation || 101),
      },
      srcChainId: body.srcChainId,
      dstChainId: body.dstChainId,
      srcSafetyDeposit: BigInt(body.srcSafetyDeposit || 1),
      dstSafetyDeposit: BigInt(body.dstSafetyDeposit || 1000000000000000), // 0.001 ETH
      auction: {
        initialRateBump: body.auction?.initialRateBump || 0,
        points: body.auction?.points || [],
        duration: BigInt(body.auction?.duration || 120),
        startTime: BigInt(body.auction?.startTime || 0),
      },
      whitelist: body.whitelist || [],
      resolvingStartTime: BigInt(body.resolvingStartTime || 0),
      allowPartialFills: body.allowPartialFills || false,
      allowMultipleFills: body.allowMultipleFills || false,
      createdAt: new Date(),
    }

    // Store the order
    orderStorage.addOrder(order)

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        makingAmount: order.makingAmount.toString(),
        takingAmount: order.takingAmount.toString(),
        salt: order.salt.toString(),
        timeLocks: {
          srcWithdrawal: order.timeLocks.srcWithdrawal.toString(),
          srcPublicWithdrawal: order.timeLocks.srcPublicWithdrawal.toString(),
          srcCancellation: order.timeLocks.srcCancellation.toString(),
          srcPublicCancellation: order.timeLocks.srcPublicCancellation.toString(),
          dstWithdrawal: order.timeLocks.dstWithdrawal.toString(),
          dstPublicWithdrawal: order.timeLocks.dstPublicWithdrawal.toString(),
          dstCancellation: order.timeLocks.dstCancellation.toString(),
        },
        srcSafetyDeposit: order.srcSafetyDeposit.toString(),
        dstSafetyDeposit: order.dstSafetyDeposit.toString(),
        auction: {
          ...order.auction,
          duration: order.auction.duration.toString(),
          startTime: order.auction.startTime.toString(),
        },
        resolvingStartTime: order.resolvingStartTime.toString(),
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
