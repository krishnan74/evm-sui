import { NextRequest, NextResponse } from 'next/server'
import { orderStorage } from '@/lib/orderStorage'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const maker = searchParams.get('maker')
    const status = searchParams.get('status')

    // Get orders with filtering and pagination
    const result = orderStorage.getOrders({
      limit,
      offset,
      maker: maker || undefined,
      status: status || undefined
    })

    // Convert BigInt values to strings for JSON serialization
    const serializedOrders = result.orders.map(order => ({
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
    }))

    return NextResponse.json({
      success: true,
      orders: serializedOrders,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore
      }
    })

  } catch (error) {
    console.error('Error retrieving orders:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve orders' },
      { status: 500 }
    )
  }
} 