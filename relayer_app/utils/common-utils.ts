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
  src: { user: bigint; resolver: bigint };
  dst: { user: bigint; resolver: bigint };
}> {
  return {
    src: {
      user: await srcChainUser.tokenBalance(srcToken),
      resolver: await srcChainResolver.tokenBalance(srcToken),
    },
    dst: {
      user: await dstChainUser.tokenBalance(dstToken),
      resolver: await dstChainResolver.tokenBalance(dstToken),
    },
  };
}
