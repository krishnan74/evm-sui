import { EVMWallet } from "@/lib/evmWallet";
import { SUIWallet } from "@/lib/suiWallet";

export async function getBalances(
  srcChainUser: EVMWallet | SUIWallet,
  dstChainUser: SUIWallet | EVMWallet,
  srcChainResolver: EVMWallet | SUIWallet,
  dstChainResolver: SUIWallet | EVMWallet,
  srcToken: string,
  dstToken: string
): Promise<{
  src: { user: number; resolver: number };
  dst: { user: number; resolver: number };
}> {
  function formatBalance(balance: bigint): number {
    // Divide by 1_000_000n (same as 1e6n) and convert to number
    return Number(balance) / 1_000_000;
  }

  return {
    src: {
      user: formatBalance(await srcChainUser.tokenBalance(srcToken)),
      resolver: formatBalance(await srcChainResolver.tokenBalance(srcToken)),
    },
    dst: {
      user: formatBalance(await dstChainUser.tokenBalance(dstToken)),
      resolver: formatBalance(await dstChainResolver.tokenBalance(dstToken)),
    },
  };
}
