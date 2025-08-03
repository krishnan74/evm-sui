import { ChainConfig, config } from "@/lib/evm-to-sui-config";
import { createServer, CreateServerReturnType } from "prool";
import {
  computeAddress,
  JsonRpcProvider,
  ContractFactory,
  randomBytes,
  Wallet as SignerWallet,
} from "ethers";
import { anvil } from "prool/instances";
import assert from "node:assert";
import * as Sdk from "@1inch/cross-chain-sdk";
import {
  evmEscrowFactoryAddress,
  evmResolverContractAddress,
} from "@/lib/constants";
import factoryContract from "../lib/contracts-metadata/TestEscrowFactory.json";
import resolverContract from "../lib/contracts-metadata/Resolver.json";

const { Address } = Sdk;

export async function getEVMProvider(
  cnf: ChainConfig
): Promise<{ node?: CreateServerReturnType; provider: JsonRpcProvider }> {
  if (!cnf.createFork) {
    return {
      provider: new JsonRpcProvider(cnf.url, cnf.chainId, {
        cacheTimeout: -1,
        staticNetwork: true,
      }),
    };
  }

  const node = createServer({
    instance: anvil({ forkUrl: cnf.url, chainId: cnf.chainId }),
    limit: 1,
  });
  await node.start();

  const address = node.address();
  assert(address);

  const provider = new JsonRpcProvider(
    `http://[${address.address}]:${address.port}/1`,
    cnf.chainId,
    {
      cacheTimeout: -1,
      staticNetwork: true,
    }
  );

  return {
    provider,
    node,
  };
}

export async function initEVMChain(cnf: ChainConfig): Promise<{
  node?: CreateServerReturnType;
  provider: JsonRpcProvider;
  escrowFactory: string;
  resolverContract: string;
}> {
  const { node, provider } = await getEVMProvider(cnf);

  const evm_resolver_pk = process.env.EVM_RESOLVER_PK!.slice(2);
  const deployer = new SignerWallet(evm_resolver_pk, provider);

  // if (evmResolverContractAddress && evmEscrowFactoryAddress) {
  //   return {
  //     node: node,
  //     provider,
  //     resolverContract: evmResolverContractAddress,
  //     escrowFactory: evmEscrowFactoryAddress,
  //   };
  // }

  // const resolverContractAddress = "0x02f9720c42E86577e160840C11c8dBA9010627Cd";
  // const escrowFactoryAddress = "0xA162fc8a1700A15eB9e8B734056201205d48124e";

  // deploy EscrowFactory
  const escrowFactory = await deployEVMContract(
    factoryContract,
    [
      cnf.limitOrderProtocol,
      "0x4200000000000000000000000000000000000006", // feeToken,
      Address.fromBigInt(BigInt(0)).toString(), // accessToken,
      deployer.address, // owner
      60 * 30, // src rescue delay
      60 * 30, // dst rescue delay
    ],
    provider,
    deployer
  );
  console.log(
    `[${cnf.chainId}]`,
    `Escrow factory contract deployed to`,
    escrowFactory
  );

  // deploy Resolver contract
  const resolver = await deployEVMContract(
    resolverContract,
    [
      escrowFactory,
      cnf.limitOrderProtocol,
      computeAddress(process.env.EVM_RESOLVER_PK!), // resolver as owner of contract
    ],
    provider,
    deployer
  );
  console.log(`[${cnf.chainId}]`, `Resolver contract deployed to`, resolver);

  return {
    node: node,
    provider,
    resolverContract: resolver,
    escrowFactory: escrowFactory,
  };
}

async function deployEVMContract(
  json: { abi: any; bytecode: any },
  params: unknown[],
  provider: JsonRpcProvider,
  deployer: SignerWallet
): Promise<string> {
  const deployed = await new ContractFactory(
    json.abi,
    json.bytecode,
    deployer
  ).deploy(...params);
  await deployed.waitForDeployment();

  return await deployed.getAddress();
}
