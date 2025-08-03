import { NextRequest, NextResponse } from 'next/server'
import { orderStorage } from '@/lib/orderStorage'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Find the order by ID
    const order = orderStorage.getOrderById(id)

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Convert BigInt values to strings for JSON serialization
    const serializedOrder = {
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

    return NextResponse.json({
      success: true,
      order: serializedOrder
    })

  } catch (error) {
    console.error('Error retrieving order:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve order' },
      { status: 500 }
    )
  }
} 