import { SuiClient, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromBase64, toBase64 } from "@mysten/sui/utils";
import { Transaction } from "@mysten/sui/transactions";
import { getFaucetHost, requestSuiFromFaucetV2 } from "@mysten/sui/faucet";

export class SUIWallet {
  client: SuiClient;
  keypair: Ed25519Keypair;

  constructor(privateKey: string, rpc: string) {
    this.client = new SuiClient({ url: rpc });
    this.keypair = Ed25519Keypair.fromSecretKey(privateKey);
  }

  async getAddress(): Promise<string> {
    return this.keypair.getPublicKey().toSuiAddress();
  }

  async tokenBalance(coinType: string): Promise<bigint> {
    const coins = await this.client.getCoins({
      owner: await this.getAddress(),
      coinType,
    });
    return coins.data.reduce((sum, c) => sum + BigInt(c.balance), BigInt(0));
  }

  async topUp(): Promise<void> {
    await requestSuiFromFaucetV2({
      host: getFaucetHost("devnet"),
      recipient: "<YOUR SUI ADDRESS>",
    });
  }

  async transfer(dest: string, amount: bigint) {
    const coins = await this.client.getCoins({
      owner: await this.getAddress(),
      coinType: "0x2::sui::SUI",
    });
    if (coins.data.length === 0) throw new Error("No SUI coins available");
    const coinObjectId = coins.data[0].coinObjectId;

    const txb = new Transaction();

    const [splitCoin] = txb.splitCoins(txb.object(coinObjectId), [
      txb.pure.u64(amount.toString()),
    ]);
    txb.transferObjects([splitCoin], txb.pure.address(dest));

    return await this.client.signAndExecuteTransaction({
      transaction: txb,
      signer: this.keypair,
      options: { showEffects: true },
    });
  }

  async getCoinFromWallet(coinType: string): Promise<string> {
    const coins = await this.client.getCoins({
      owner: await this.getAddress(),
      coinType,
    });
    if (coins.data.length === 0)
      throw new Error(`No ${coinType} coins available`);
    const coinObjectId = coins.data[0].coinObjectId;

    return coinObjectId;
  }

  async signCrossChainOrder(order: any): Promise<string> {
    const message = new TextEncoder().encode(JSON.stringify(order));
    // signData is not available directly; you may need to use the keypair's sign method
    const signatureBytes = await this.keypair.sign(message);
    const signature = toBase64(signatureBytes);
    return signature;
  }

  async send(param: Transaction): Promise<{
    res: SuiTransactionBlockResponse;
    txHash: string;
    // blockTimestamp: bigint; blockHash: string
  }> {
    // Sign and execute the transaction
    const res = await this.client.signAndExecuteTransaction({
      transaction: param,
      signer: this.keypair,
      options: { showEffects: true },
    });

    // Check for transaction failure
    if (res.effects?.status?.status !== "success") {
      throw new Error(
        `Transaction failed: ${res.effects?.status?.error || "unknown error"}`
      );
    }

    // Fetch the block info using the transaction digest
    // const txBlock = await this.client.getTransactionBlock({digest: res.digest})

    // Return the required fields
    return {
      res,
      txHash: res.digest,
      // blockTimestamp: BigInt(txBlock.timestampMs ?? 0),
      // blockHash: txBlock.checkpoint ?? ''
    };
  }
}
