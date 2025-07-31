import 'dotenv/config'
import {afterAll, beforeAll, describe, expect, it, jest} from '@jest/globals'
import {getFullnodeUrl, SuiClient} from '@mysten/sui/client'
import {createServer, CreateServerReturnType} from 'prool'
import {anvil} from 'prool/instances'

import Sdk from '@1inch/cross-chain-sdk'
import {
    computeAddress,
    ContractFactory,
    JsonRpcProvider,
    MaxUint256,
    parseEther,
    parseUnits,
    randomBytes,
    Wallet as SignerWallet
} from 'ethers'
import {uint8ArrayToHex, UINT_40_MAX} from '@1inch/byte-utils'
import assert from 'node:assert'
import {ChainConfig, config} from './config'
import {EVMWallet} from './evmWallet'
import {Resolver} from './resolver'
import {EscrowFactory} from './escrow-factory'
import {SUIEscrowFactory} from './sui-escrow-factory'
import factoryContract from '../dist/contracts/TestEscrowFactory.sol/TestEscrowFactory.json'
import resolverContract from '../dist/contracts/Resolver.sol/Resolver.json'
import {SUIWallet} from './suiWallet'
import {Ed25519Keypair} from '@mysten/sui/keypairs/ed25519'
import {Transaction} from '@mysten/sui/transactions'

const {Address} = Sdk

jest.setTimeout(1000 * 60)

const userPk = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
const resolverPk = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'

// eslint-disable-next-line max-lines-per-function
describe('Resolving example', () => {
    const srcChainId = config.chain.source.chainId
    const dstChainId = config.chain.destination.chainId

    type EVMChain = {
        node?: CreateServerReturnType | undefined
        provider: JsonRpcProvider
        escrowFactory: string
        resolver: string
    }

    type SUIChain = {
        provider: SuiClient
        escrowFactory: string
        resolver: string
    }

    let src: EVMChain
    let dst: SUIChain

    let srcChainUser: EVMWallet
    let dstChainUser: SUIWallet
    let srcChainResolver: EVMWallet
    let dstChainResolver: SUIWallet

    let srcFactory: EscrowFactory
    let dstFactory: SUIEscrowFactory
    let srcResolverContract: EVMWallet
    let dstResolverContract: SUIWallet

    let srcTimestamp: bigint

    // async function increaseTime(t: number): Promise<void> {
    //     await Promise.all([src, dst].map((chain) => chain.provider.send('evm_increaseTime', [t])))
    // }

    beforeAll(async () => {
        ;[src, dst] = await Promise.all([initEVMChain(config.chain.source), initSUIChain(config.chain.destination)])

        srcChainUser = new EVMWallet(userPk, src.provider)
        dstChainUser = new SUIWallet(userPk, getFullnodeUrl('testnet'))

        srcChainResolver = new EVMWallet(resolverPk, src.provider)
        dstChainResolver = new SUIWallet(resolverPk, getFullnodeUrl('testnet'))

        srcFactory = new EscrowFactory(src.provider, src.escrowFactory)
        dstFactory = new SUIEscrowFactory(dst.provider, dst.escrowFactory)
        // get 1000 USDC for user in SRC chain and approve to LOP
        await srcChainUser.topUpFromDonor(
            config.chain.source.tokens.USDC.address,
            config.chain.source.tokens.USDC.donor,
            parseUnits('1000', 6)
        )
        await srcChainUser.approveToken(
            config.chain.source.tokens.USDC.address,
            config.chain.source.limitOrderProtocol,
            MaxUint256
        )

        // get 2000 USDC for resolver in DST chain
        srcResolverContract = await EVMWallet.fromAddress(src.resolver, src.provider)

        srcTimestamp = BigInt((await src.provider.getBlock('latest'))!.timestamp)
    })

    async function getBalances(
        srcToken: string,
        dstToken: string
    ): Promise<{src: {user: bigint; resolver: bigint}; dst: {user: bigint; resolver: bigint}}> {
        return {
            src: {
                user: await srcChainUser.tokenBalance(srcToken),
                resolver: await srcResolverContract.tokenBalance(srcToken)
            },
            dst: {
                user: await dstChainUser.tokenBalance(dstToken),
                // resolver: await dstResolverContract.tokenBalance(dstToken)
                resolver: 1n
            }
        }
    }

    afterAll(async () => {
        src.provider.destroy()
        await Promise.all([src.node?.stop()])
    })

    // eslint-disable-next-line max-lines-per-function
    describe('Fill', () => {
        it('should swap Ethereum USDC -> SUI Testnet SUI. Single fill only', async () => {
            const initialBalances = await getBalances(
                config.chain.source.tokens.USDC.address,
                config.chain.destination.tokens.SUI.address
            )

            // User creates order
            const secret = uint8ArrayToHex(randomBytes(32)) // note: use crypto secure random number in real world
            const order = Sdk.CrossChainOrder.new(
                new Address(src.escrowFactory),
                {
                    salt: Sdk.randBigInt(1000n),
                    maker: new Address(await srcChainUser.getAddress()),
                    makingAmount: parseUnits('100', 6),
                    takingAmount: 1n,
                    makerAsset: new Address(config.chain.source.tokens.USDC.address),
                    takerAsset: new Address(config.chain.destination.tokens.SUI.address)
                },
                {
                    hashLock: Sdk.HashLock.forSingleFill(secret),
                    timeLocks: Sdk.TimeLocks.new({
                        srcWithdrawal: 10n, // 10sec finality lock for test
                        srcPublicWithdrawal: 120n, // 2m for private withdrawal
                        srcCancellation: 121n, // 1sec public withdrawal
                        srcPublicCancellation: 122n, // 1sec private cancellation
                        dstWithdrawal: 10n, // 10sec finality lock for test
                        dstPublicWithdrawal: 100n, // 100sec private withdrawal
                        dstCancellation: 101n // 1sec public withdrawal
                    }),
                    srcChainId,
                    dstChainId,
                    srcSafetyDeposit: parseEther('0.001'),
                    dstSafetyDeposit: parseEther('0.001')
                },
                {
                    auction: new Sdk.AuctionDetails({
                        initialRateBump: 0,
                        points: [],
                        duration: 120n,
                        startTime: srcTimestamp
                    }),
                    whitelist: [
                        {
                            address: new Address(src.resolver),
                            allowFrom: 0n
                        }
                    ],
                    resolvingStartTime: 0n
                },
                {
                    nonce: Sdk.randBigInt(UINT_40_MAX),
                    allowPartialFills: false,
                    allowMultipleFills: false
                }
            )

            const signature = await srcChainUser.signOrder(srcChainId, order)
            const orderHash = order.getOrderHash(srcChainId)
            // Resolver fills order
            const resolverContract = new Resolver(src.resolver, dst.resolver)

            console.log(`[${srcChainId}]`, `Filling order ${orderHash}`)

            const fillAmount = order.makingAmount
            const {txHash: orderFillHash, blockHash: srcDeployBlock} = await srcChainResolver.send(
                resolverContract.deploySrc(
                    srcChainId,
                    order,
                    signature,
                    Sdk.TakerTraits.default()
                        .setExtension(order.extension)
                        .setAmountMode(Sdk.AmountMode.maker)
                        .setAmountThreshold(order.takingAmount),
                    fillAmount
                )
            )

            console.log(`[${srcChainId}]`, `Order ${orderHash} filled for ${fillAmount} in tx ${orderFillHash}`)

            const srcEscrowEvent = await srcFactory.getSrcDeployEvent(srcDeployBlock)

            const dstImmutables = srcEscrowEvent[0]
                .withComplement(srcEscrowEvent[1])
                .withTaker(new Address(resolverContract.dstAddress))

            console.log(`[${dstChainId}]`, `Depositing ${dstImmutables.amount} for order ${orderHash}`)

            const coinObjectId = await dstChainResolver.getCoinFromWallet()
            const txb = new Transaction()

            // Split the coin
            const [escrowCoin, safetyDepositCoin] = txb.splitCoins(txb.object(coinObjectId), [
                txb.pure.u64('3'),
                txb.pure.u64('1')
            ])

            // Add the contract call to the same transaction block
            resolverContract.suiDeployDst(
                dstImmutables,
                escrowCoin,
                safetyDepositCoin,
                txb // Make sure this function adds the call to the provided txb
            )

            // Execute the transaction block
            const {
                res: txResult,
                txHash: dstDepositHash,
                blockTimestamp: dstDeployedAt
            } = await dstChainResolver.send(txb)

            const deployEvent = txResult.events?.find((event) => event.type.includes('::resolver::SrcEscrowDeployed'))

            if (!deployEvent) {
                throw new Error('Failed to deploy source escrow')
            }

            const destEscrowID = (deployEvent.parsedJson as any).escrow_id
            console.log(`[${dstChainId}]`, `Created dst deposit for order ${orderHash} in tx ${dstDepositHash}`)

            const ESCROW_SRC_IMPLEMENTATION = await srcFactory.getSourceImpl()
            // const ESCROW_DST_IMPLEMENTATION = await dstFactory.getDestinationImpl()

            const srcEscrowAddress = new Sdk.EscrowFactory(new Address(src.escrowFactory)).getSrcEscrowAddress(
                srcEscrowEvent[0],
                ESCROW_SRC_IMPLEMENTATION
            )

            // await increaseTime(11)
            // User shares key after validation of dst escrow deployment
            console.log(`[${dstChainId}]`, `Withdrawing funds for user from ${destEscrowID}`)
            await dstChainResolver.send(resolverContract.suiWithdraw('dst', destEscrowID, secret))

            console.log(`[${srcChainId}]`, `Withdrawing funds for resolver from ${srcEscrowAddress}`)
            const {txHash: resolverWithdrawHash} = await srcChainResolver.send(
                resolverContract.withdraw('src', srcEscrowAddress, secret, srcEscrowEvent[0])
            )
            console.log(
                `[${srcChainId}]`,
                `Withdrew funds for resolver from ${srcEscrowAddress} to ${src.resolver} in tx ${resolverWithdrawHash}`
            )

            const resultBalances = await getBalances(
                config.chain.source.tokens.USDC.address,
                config.chain.destination.tokens.SUI.address
            )

            // user transferred funds to resolver on source chain
            expect(initialBalances.src.user - resultBalances.src.user).toBe(order.makingAmount)
            expect(resultBalances.src.resolver - initialBalances.src.resolver).toBe(order.makingAmount)
            // resolver transferred funds to user on destination chain
            expect(resultBalances.dst.user - initialBalances.dst.user).toBe(order.takingAmount)
            expect(initialBalances.dst.resolver - resultBalances.dst.resolver).toBe(order.takingAmount)
        })
    })
})

async function initSUIChain(cnf: ChainConfig): Promise<{
    provider: SuiClient
    escrowFactory: string
    resolver: string
}> {
    const client = await getSUIClient()
    console.log(`[${cnf.chainId}]`, `SUI client connected to`, cnf.url)

    const privateKeyBech32 = cnf.ownerPrivateKey

    console.log(`[${cnf.chainId}]`, `SUI keypair created from private key`, privateKeyBech32)
    console.log(privateKeyBech32)
    const keypair = Ed25519Keypair.fromSecretKey(privateKeyBech32)

    // deploy EscrowFactory
    // const escrowFactory = await deploySUIModule('../dist/sui-escrow-factory', keypair)
    // const resolver = await deploySUIModule('../dist/resolver', keypair)

    const escrowFactory = '0x7d586d4aa3fcbb0fecd29de0db77bb060b9db74eabcb08a5e47ed30fbce8a5ba'
    const resolver = '0x7d586d4aa3fcbb0fecd29de0db77bb060b9db74eabcb08a5e47ed30fbce8a5ba'

    return {provider: client, escrowFactory, resolver}
}
// deploy EscrowFactory

async function initEVMChain(cnf: ChainConfig): Promise<{
    node?: CreateServerReturnType
    provider: JsonRpcProvider
    escrowFactory: string
    resolver: string
}> {
    const {node, provider} = await getEVMProvider(cnf)
    const deployer = new SignerWallet(cnf.ownerPrivateKey, provider)

    // deploy EscrowFactory
    const escrowFactory = await deployEVMContract(
        factoryContract,
        [
            cnf.limitOrderProtocol,
            cnf.wrappedNative, // feeToken,
            Address.fromBigInt(0n).toString(), // accessToken,
            deployer.address, // owner
            60 * 30, // src rescue delay
            60 * 30 // dst rescue delay
        ],
        provider,
        deployer
    )
    console.log(`[${cnf.chainId}]`, `Escrow factory contract deployed to`, escrowFactory)

    // deploy Resolver contract
    const resolver = await deployEVMContract(
        resolverContract,
        [
            escrowFactory,
            cnf.limitOrderProtocol,
            computeAddress(resolverPk) // resolver as owner of contract
        ],
        provider,
        deployer
    )
    console.log(`[${cnf.chainId}]`, `Resolver contract deployed to`, resolver)

    return {node: node, provider, resolver, escrowFactory}
}

async function getSUIClient(): Promise<SuiClient> {
    return new SuiClient({url: getFullnodeUrl('testnet')})
}

async function getEVMProvider(cnf: ChainConfig): Promise<{node?: CreateServerReturnType; provider: JsonRpcProvider}> {
    if (!cnf.createFork) {
        return {
            provider: new JsonRpcProvider(cnf.url, cnf.chainId, {
                cacheTimeout: -1,
                staticNetwork: true
            })
        }
    }

    const node = createServer({
        instance: anvil({forkUrl: cnf.url, chainId: cnf.chainId}),
        limit: 1
    })
    await node.start()

    const address = node.address()
    assert(address)

    const provider = new JsonRpcProvider(`http://[${address.address}]:${address.port}/1`, cnf.chainId, {
        cacheTimeout: -1,
        staticNetwork: true
    })

    return {
        provider,
        node
    }
}

/**
 * Deploy contract and return its address
 */
async function deployEVMContract(
    json: {abi: any; bytecode: any},
    params: unknown[],
    provider: JsonRpcProvider,
    deployer: SignerWallet
): Promise<string> {
    const deployed = await new ContractFactory(json.abi, json.bytecode, deployer).deploy(...params)
    await deployed.waitForDeployment()

    return await deployed.getAddress()
}

async function deploySUIModule(packagePath: string, keypair: Ed25519Keypair): Promise<string> {
    const {execSync} = require('child_process')
    // Generate a new Ed25519 Keypair'

    const client = new SuiClient({
        url: getFullnodeUrl('testnet')
    })
    const {modules, dependencies} = JSON.parse(
        execSync(`sui move build --dump-bytecode-as-base64 --path ${packagePath}`, {
            encoding: 'utf-8'
        })
    )
    const tx = new Transaction()
    const [upgradeCap] = tx.publish({
        modules,
        dependencies
    })

    tx.transferObjects([upgradeCap], keypair.toSuiAddress())
    const result = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx
    })

    // Extract the packageId from the objectChanges
    const packageId = result.objectChanges?.find((x) => x.type === 'published')?.packageId

    if (!packageId) {
        throw new Error('PackageId not found in transaction result')
    }

    return packageId
}
