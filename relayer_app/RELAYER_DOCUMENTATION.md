# Relayer Service Documentation

The relayer service is a continuous background process that listens for Source Escrow deploy events on the source chain and automatically creates corresponding destination escrows when triggered.

## Overview

The relayer service provides the following functionality:

1. **Continuous Event Monitoring**: Polls the source chain for `SrcEscrowCreated` events
2. **Automatic Destination Escrow Creation**: Creates destination escrows when source events are detected
3. **Order Storage**: Stores processed orders in local storage
4. **Service Management**: Start, stop, and monitor the relayer service

## API Endpoints

### POST `/api/relayer`

Controls the relayer service.

#### Request Body
```json
{
  "action": "start" | "stop" | "status"
}
```

#### Actions

- **`start`**: Starts the relayer service
- **`stop`**: Stops the relayer service  
- **`status`**: Returns the current status of the relayer

#### Example Responses

**Start Relayer:**
```json
{
  "success": true,
  "message": "Relayer started successfully"
}
```

**Get Status:**
```json
{
  "success": true,
  "isRunning": true,
  "lastProcessedBlock": "12345",
  "uptime": 300000
}
```

## Environment Variables

Set these environment variables to configure the relayer:

```bash
# Source chain RPC URL
SRC_CHAIN_RPC=https://sepolia.base.org

# Escrow factory contract addresses
ESCROW_FACTORY_ADDRESS=0xE53136D9De56672e8D2665C98653AC7b8A60Dc44
DST_ESCROW_FACTORY_ADDRESS=0x...

# Optional: Private key for signing transactions
PRIVATE_KEY=0x...
```

## How It Works

### 1. Event Polling
- The relayer polls the source chain every 5 seconds
- It tracks the last processed block to avoid reprocessing
- Only processes new blocks since the last check

### 2. Event Processing
When a `SrcEscrowCreated` event is detected:

1. **Event Decoding**: Decodes the event data to extract order information
2. **Data Validation**: Validates the event data structure
3. **Destination Escrow Creation**: Prepares data for destination chain
4. **Order Storage**: Stores the order in local storage

### 3. Event Structure
The `SrcEscrowCreated` event contains:
- `orderHash`: Unique identifier for the order
- `hashLock`: Cryptographic hash lock for security
- `maker`: Address of the order maker
- `taker`: Address of the order taker
- `token`: Token address
- `amount`: Order amount
- `safetyDeposit`: Safety deposit amount
- `timeLocks`: Time lock configuration
- Additional destination chain data

## Usage Examples

### Start the Relayer
```bash
curl -X POST http://localhost:3000/api/relayer \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

### Check Status
```bash
curl -X POST http://localhost:3000/api/relayer \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'
```

### Stop the Relayer
```bash
curl -X POST http://localhost:3000/api/relayer \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'
```

## Monitoring

The relayer provides detailed logging:

- `🚀 Starting relayer service...` - Service startup
- `🔍 Polling for Source Escrow deploy events...` - Event polling
- `📦 Processing blocks X to Y` - Block processing
- `🎯 Processing Source Escrow event...` - Event processing
- `📋 Source Escrow Event Details:` - Event data
- `🏗️ Creating destination escrow...` - Destination creation
- `✅ Destination escrow creation initiated` - Success confirmation

## Error Handling

The relayer includes comprehensive error handling:

- **Network Errors**: Retries on connection failures
- **Event Processing Errors**: Continues processing other events
- **Transaction Errors**: Logs errors for manual intervention
- **Service Errors**: Graceful shutdown and restart capabilities

## Production Considerations

For production deployment:

1. **Database Storage**: Replace in-memory storage with a database
2. **Transaction Signing**: Implement proper private key management
3. **Retry Logic**: Add retry mechanisms for failed transactions
4. **Monitoring**: Add metrics and alerting
5. **Security**: Implement proper authentication and authorization
6. **Scalability**: Consider horizontal scaling for high-volume scenarios

## Troubleshooting

### Common Issues

1. **Relayer not starting**: Check RPC URL and network connectivity
2. **No events detected**: Verify contract address and event signature
3. **Transaction failures**: Check gas limits and account balances
4. **Memory issues**: Monitor memory usage for long-running instances

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=true
```

This will provide additional detailed logging for troubleshooting. 