
export async function POST(req: NextRequest) {
  {
    const MY_ADDRESS =
      "0x043d0499d17b09ffffd91a3eebb684553ca7255e273c69ed72e355950e0d77be";

    const suiClient = new SuiClient({ url: getFullnodeUrl("testnet") });
    const keypair = Ed25519Keypair.fromSecretKey("");

    const balance = (balance: any) => {
      return Number.parseInt(balance.totalBalance) / Number(MIST_PER_SUI);
    };

    const suiBalance = await suiClient.getBalance({
      owner: MY_ADDRESS,
    });

    const coinObjectId = await getCoinFromWallet(suiClient, MY_ADDRESS);
    const txb = new Transaction();

    const [escrowCoin, safetyDepositCoin] = txb.splitCoins(
      txb.object(coinObjectId),
      [txb.pure.u64("2"), txb.pure.u64("1")]
    );

    const secret = uint8ArrayToHex(randomBytes(32));
    const packageObjectId =
      "0x2ffbee72e7dd17cb0cdc05ad8b0deaeadfd823b8e2e50cf8cf360c2cf1da02ad";

    const hashlock = Sdk.HashLock.forSingleFill(secret);

    const hashLockString = hashlock.toString();

    const secretHash = keccak256(secret);

    const immutables: Immutables = {
      orderHash: "0x1234567890abcdef",
      hashLock: hashLockString,
      maker: MY_ADDRESS,
      taker: MY_ADDRESS,
      token: "0xabcdefabcdefabcdefabcdefabcdefabcdef",
      amount: 1,
      safetyDeposit: 1,
      timeLocks: {
        src_withdrawal: 0,
        src_public_withdrawal: 0,
        src_cancellation: 100,
        src_public_cancellation: 0,
        dst_withdrawal: 0,
        dst_public_withdrawal: 0,
        dst_cancellation: 0,
        deployed_at: 0,
      },
    };

    const tx = await deployDestinationEscrow(
      immutables,
      packageObjectId,
      escrowCoin,
      safetyDepositCoin,
      txb
    );

    const response = await suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: { showEffects: true },
    });

    if (response.effects?.status?.status !== "success") {
      throw new Error(
        `Transaction failed: ${
          response.effects?.status?.error || "unknown error"
        }`
      );
    }

    const deployEvents = await getDstEscrowCreatedEvents(
      packageObjectId,
      suiClient
    );

    const latestDeployEvent = deployEvents[0];

    const destEscrowID = (latestDeployEvent.parsedJson as any).escrow_id;

    const withdraw_tx = await suiWithdraw(
      "dst",
      destEscrowID,
      secret,
      packageObjectId
    );

    const withdraw_response = await suiClient.signAndExecuteTransaction({
      transaction: withdraw_tx,
      signer: keypair,
      options: { showEffects: true },
    });

    // Check for transaction failure
    if (response.effects?.status?.status !== "success") {
      throw new Error(
        `Transaction failed: ${
          response.effects?.status?.error || "unknown error"
        }`
      );
    }

    return NextResponse.json({
      message: "hash checked succesfully request processed successfully",
      secret,
      immutables,
      flag: hashLockString == secretHash,
    });
  }
}

async function getCoinFromWallet(
  suiClient: SuiClient,
  MY_ADDRESS: string
): Promise<string> {
  const coins = await suiClient.getCoins({
    owner: await MY_ADDRESS,
    coinType: "0x2::sui::SUI",
  });
  if (coins.data.length === 0) throw new Error("No SUI coins available");
  const coinObjectId = coins.data[0].coinObjectId;

  return coinObjectId;
}