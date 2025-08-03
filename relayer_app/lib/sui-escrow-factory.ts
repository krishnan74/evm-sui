import { SuiClient, SuiEvent, SuiEventFilter } from "@mysten/sui/client";

export class SUIEscrowFactory {
  constructor(
    private readonly client: SuiClient,
    private readonly packageId: string // The Move package ID for your escrow contract
  ) {}

  // Fetch EscrowCreated events from a specific checkpoint (block)
  public async getSrcDeployEvents(): Promise<SuiEvent[]> {
    const query: SuiEventFilter = {
      MoveModule: {
        package: this.packageId,
        module: "sui_contract",
      },
      MoveEventType: `${this.packageId}::escrow_factory::SrcEscrowCreated`,
    };

    const result = await this.client.queryEvents({
      query,
    });

    console.log(result.data);
    return result.data;
  }

  public async getDstDeployEvents(): Promise<SuiEvent[]> {
    console.log("Fetching DstEscrowCreated events...");
    const query: SuiEventFilter = {
      MoveEventType: `${this.packageId}::escrow_factory::DstEscrowCreated`,
    };

    const result = await this.client.queryEvents({
      query,
    });

    return result.data;
  }
}
