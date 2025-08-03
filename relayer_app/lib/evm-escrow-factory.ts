import { id, Interface, JsonRpcProvider } from "ethers";
import * as Sdk from "@1inch/cross-chain-sdk";
import EscrowFactoryContract from "../lib/contracts-metadata/EscrowFactory.json";

export class EVMEscrowFactory {
  private iface = new Interface(EscrowFactoryContract.abi);

  constructor(
    private readonly provider: JsonRpcProvider,
    private readonly address: string
  ) {}

  public async getSourceImpl(): Promise<Sdk.Address> {
    return Sdk.Address.fromBigInt(
      BigInt(
        await this.provider.call({
          to: this.address,
          data: id("ESCROW_SRC_IMPLEMENTATION()").slice(0, 10),
        })
      )
    );
  }

  public async getDestinationImpl(): Promise<Sdk.Address> {
    return Sdk.Address.fromBigInt(
      BigInt(
        await this.provider.call({
          to: this.address,
          data: id("ESCROW_DST_IMPLEMENTATION()").slice(0, 10),
        })
      )
    );
  }

  public async getSrcDeployEvent(
    blockHash: string | null | undefined
  ): Promise<[Sdk.Immutables, Sdk.DstImmutablesComplement]> {
    const event = this.iface.getEvent("SrcEscrowCreated")!;

    if (!blockHash) {
      throw new Error(
        `❌ getSrcDeployEvent: blockHash is null or undefined. Cannot fetch event logs.\n` +
          `Make sure the transaction was mined and blockHash is returned from the send() call.\n` +
          `Factory: ${this.address}`
      );
    }

    const logs = await this.provider.getLogs({
      blockHash,
      address: this.address,
      topics: [event.topicHash],
    });

    if (!logs.length) {
      throw new Error(
        `❌ getSrcDeployEvent: No SrcEscrowCreated logs found for blockHash ${blockHash} and factory ${this.address}.\n` +
          `Check if the event was emitted and the blockHash is correct.`
      );
    }

    const [data] = logs.map((l) => this.iface.decodeEventLog(event, l.data));

    if (!data) {
      throw new Error(
        `❌ getSrcDeployEvent: Unable to decode event log for blockHash ${blockHash}.`
      );
    }

    const immutables = data.at(0);
    const complement = data.at(1);

    return [
      Sdk.Immutables.new({
        orderHash: immutables[0],
        hashLock: immutables[1],
        maker: Sdk.Address.fromBigInt(immutables[2]),
        taker: Sdk.Address.fromBigInt(immutables[3]),
        token: Sdk.Address.fromBigInt(immutables[4]),
        amount: immutables[5],
        safetyDeposit: immutables[6],
        timeLocks: Sdk.TimeLocks.fromBigInt(immutables[7]),
      }),
      Sdk.DstImmutablesComplement.new({
        maker: Sdk.Address.fromBigInt(complement[0]),
        amount: complement[1],
        token: Sdk.Address.fromBigInt(complement[2]),
        safetyDeposit: complement[3],
      }),
    ];
  }
}
