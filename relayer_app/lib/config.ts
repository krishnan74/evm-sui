import { z } from "zod";
import * as Sdk from "@1inch/cross-chain-sdk";
import * as process from "node:process";
import { getFullnodeUrl } from "@mysten/sui/client";

const bool = z
  .string()
  .transform((v) => v.toLowerCase() === "true")
  .pipe(z.boolean());

const ConfigSchema = z.object({
  SRC_CHAIN_RPC: z.string().url(),
  DST_CHAIN_RPC: z.string().url(),
  SRC_CHAIN_CREATE_FORK: bool.default(true),
  DST_CHAIN_CREATE_FORK: bool.default(true),
});

const fromEnv = ConfigSchema.parse(process.env);

export const config = {
  chain: {
    // source: {
    //     chainId: Sdk.NetworkEnum.ETHEREUM,
    //     url: fromEnv.SRC_CHAIN_RPC,
    //     createFork: fromEnv.SRC_CHAIN_CREATE_FORK,
    //     limitOrderProtocol: '0x111111125421ca6dc452d289314280a0f8842a65',
    //     wrappedNative: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    //     ownerPrivateKey: '',
    //     tokens: {
    //         USDC: {
    //             address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    //             donor: '0xd54F23BE482D9A58676590fCa79c8E43087f92fB'
    //         }
    //     }
    // },

    source: {
      chainId: Sdk.NetworkEnum.BASE_SEPOLIA,
      url: fromEnv.SRC_CHAIN_RPC,
      createFork: fromEnv.SRC_CHAIN_CREATE_FORK,
      limitOrderProtocol: "0x2fd469547443Fd2E33dc06BDA46262A2830acaC8",
      wrappedNative: "0x4200000000000000000000000000000000000006",
      ownerPrivateKey: "",
      tokens: {
        USDC: {
          address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          donor: "0xd54F23BE482D9A58676590fCa79c8E43087f92fB",
        },
      },
    },
    destination: {
      chainId: Sdk.NetworkEnum.SUI,
      url: getFullnodeUrl("testnet"),
      createFork: false,
      limitOrderProtocol: "0x2fd469547443Fd2E33dc06BDA46262A2830acaC8",
      wrappedNative: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
      ownerPrivateKey: "",
      tokens: {
        SUI: {
          address: "0x2::sui::SUI",
          donor: "0x4188663a85C92EEa35b5AD3AA5cA7CeB237C6fe9",
        },
      },
    },
  },
} as const;

export type ChainConfig = (typeof config.chain)["source" | "destination"];
