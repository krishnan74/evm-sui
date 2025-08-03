# Order Management API Endpoints

This document describes the API endpoints for creating and retrieving orders using the MockOrder type.

## Endpoints

### 1. Create Order
**POST** `/api/create-order`

Creates a new order and stores it locally.

#### Request Body
```json
{
  "escrowFactory": "0x...",
  "maker": "0x...",
  "makingAmount": "1000000000000000000",
  "takingAmount": "1000000000000000000",
  "makerAsset": "0x...",
  "takerAsset": "0x...",
  "hashLock": "0x...",
  "srcChainId": 1,
  "dstChainId": 2,
  "salt": "1234567890",
  "srcSafetyDeposit": "1000000000000000000",
  "dstSafetyDeposit": "1000000000000000000",
  "timeLocks": {
    "srcWithdrawal": "10",
    "srcPublicWithdrawal": "120",
    "srcCancellation": "121",
    "srcPublicCancellation": "122",
    "dstWithdrawal": "10",
    "dstPublicWithdrawal": "140",
    "dstCancellation": "101"
  },
  "auction": {
    "initialRateBump": 0,
    "points": [],
    "duration": "120",
    "startTime": "0"
  },
  "whitelist": [
    {
      "address": "0x...",
      "allowFrom": "0"
    }
  ],
  "resolvingStartTime": "0",
  "allowPartialFills": false,
  "allowMultipleFills": false
}
```

#### Response
```json
{
  "success": true,
  "order": {
    "id": "1234567890",
    "orderHash": "0x...",
    "escrowFactory": "0x...",
    "maker": "0x...",
    "makingAmount": "1000000000000000000",
    "takingAmount": "1000000000000000000",
    "makerAsset": "0x...",
    "takerAsset": "0x...",
    "hashLock": "0x...",
    "timeLocks": {
      "srcWithdrawal": "10",
      "srcPublicWithdrawal": "120",
      "srcCancellation": "121",
      "srcPublicCancellation": "122",
      "dstWithdrawal": "10",
      "dstPublicWithdrawal": "140",
      "dstCancellation": "101"
    },
    "srcChainId": 1,
    "dstChainId": 2,
    "srcSafetyDeposit": "1000000000000000000",
    "dstSafetyDeposit": "1000000000000000000",
    "auction": {
      "initialRateBump": 0,
      "points": [],
      "duration": "120",
      "startTime": "0"
    },
    "whitelist": [...],
    "resolvingStartTime": "0",
    "allowPartialFills": false,
    "allowMultipleFills": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Get All Orders
**GET** `/api/orders`

Retrieves all orders with optional filtering and pagination.

#### Query Parameters
- `limit` (optional): Number of orders to return (default: 50)
- `offset` (optional): Number of orders to skip (default: 0)
- `maker` (optional): Filter by maker address
- `status` (optional): Filter by order status

#### Example Request
```
GET /api/orders?limit=10&offset=0&maker=0x1234...
```

#### Response
```json
{
  "success": true,
  "orders": [
    {
      "id": "1234567890",
      "orderHash": "0x...",
      "escrowFactory": "0x...",
      "maker": "0x...",
      "makingAmount": "1000000000000000000",
      "takingAmount": "1000000000000000000",
      "makerAsset": "0x...",
      "takerAsset": "0x...",
      "hashLock": "0x...",
      "timeLocks": {...},
      "srcChainId": 1,
      "dstChainId": 2,
      "srcSafetyDeposit": "1000000000000000000",
      "dstSafetyDeposit": "1000000000000000000",
      "auction": {...},
      "whitelist": [...],
      "resolvingStartTime": "0",
      "allowPartialFills": false,
      "allowMultipleFills": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

### 3. Get Specific Order
**GET** `/api/orders/[id]`

Retrieves a specific order by its ID.

#### Example Request
```
GET /api/orders/1234567890
```

#### Response
```json
{
  "success": true,
  "order": {
    "id": "1234567890",
    "orderHash": "0x...",
    "escrowFactory": "0x...",
    "maker": "0x...",
    "makingAmount": "1000000000000000000",
    "takingAmount": "1000000000000000000",
    "makerAsset": "0x...",
    "takerAsset": "0x...",
    "hashLock": "0x...",
    "timeLocks": {...},
    "srcChainId": 1,
    "dstChainId": 2,
    "srcSafetyDeposit": "1000000000000000000",
    "dstSafetyDeposit": "1000000000000000000",
    "auction": {...},
    "whitelist": [...],
    "resolvingStartTime": "0",
    "allowPartialFills": false,
    "allowMultipleFills": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400`: Bad Request (missing required fields)
- `404`: Not Found (order not found)
- `500`: Internal Server Error

## Notes

- All BigInt values are serialized as strings in the JSON responses
- Orders are stored in-memory and will be lost on server restart
- In production, you should use a proper database for persistence
- The API uses the MockOrder type from `@/lib/types` 