// This token bridge is to bridge tokens from Ethereum sepolia to aztec devnet



import { createAztecNodeClient, waitForNode } from "@aztec/aztec.js/node";
import { getAztecNodeUrl, getL1RpcUrl } from "../config/config.js";
import { createExtendedL1Client } from '@aztec/ethereum'
import { TestWallet } from "@aztec/test-wallet/server";
import { AztecAddress, EthAddress } from '@aztec/aztec.js/addresses'
import { deployL1Contract } from "@aztec/ethereum/deploy-l1-contracts";
import { TestERC20Abi, TestERC20Bytecode, FeeAssetHandlerAbi, FeeAssetHandlerBytecode, TokenPortalAbi, TokenPortalBytecode } from "@aztec/l1-artifacts";
import { erc20Abi, getContract, PrivateKeyAccount } from "viem";
import { TokenContract, TokenContractArtifact } from "@aztec/noir-contracts.js/Token";
import { L1TokenManager, L1TokenPortalManager } from "@aztec/aztec.js/ethereum";
import { createLogger } from "@aztec/aztec.js/log";
import { TokenBridgeContract, TokenBridgeContractArtifact } from "@aztec/noir-contracts.js/TokenBridge";
import { Fr } from "@aztec/aztec.js/fields";
import { computeL2ToL1MembershipWitness } from "@aztec/stdlib/messaging";
import { privateKeyToAccount } from "viem/accounts";
import { getAccountFromEnv } from "../src/utils/create_account_from_env.js";
import { sepolia } from "viem/chains";
import { Contract, ContractInstanceWithAddress, getContractInstanceFromInstantiationParams } from "@aztec/aztec.js/contracts";
import { getSponsoredFPCInstance } from "../src/utils/sponsored_fpc.js";
import { SponsoredFPCContract } from "@aztec/noir-contracts.js/SponsoredFPC";
import { SponsoredFeePaymentMethod } from "@aztec/aztec.js/fee";
import { sleep } from "../src/utils/time.js";



// sepolia RPC url
const l1RpcUrl = getL1RpcUrl();
const logger = createLogger('raven: token-bridge');


console.log(l1RpcUrl)

const privateKeyAccount = privateKeyToAccount(`0x${process.env.ETHEREUM_WALLET_PRIVATE_KEY || ""}`)
const l1Client = createExtendedL1Client(l1RpcUrl.split(','), privateKeyAccount, sepolia,);
const L2_TOKEN_CONTRACT_SALT = new Fr(1);



export async function getContractInstance(args: any[], deployer: AztecAddress, salt: Fr, artifact: any): Promise<ContractInstanceWithAddress> {
  return await getContractInstanceFromInstantiationParams(artifact, {
    constructorArgs: args,
    salt: L2_TOKEN_CONTRACT_SALT,
    deployer
  });
}

// metamask wallet address
const ownerEthAddress = l1Client.account.address;
const MINT_AMOUNT = BigInt(1e3);

console.log({ ownerEthAddress, MINT_AMOUNT })
// process.exit(1)

// here we will connect with the aztec devnet

const setupDevnetNetwork = async () => {
  const nodeUrl = getAztecNodeUrl();
  const node = createAztecNodeClient(nodeUrl);
  await waitForNode(node);
  console.log('Aztec node is ready');
  const wallet = await TestWallet.create(node);
  console.log('Test wallet created');
  return { node, wallet };
};

async function deployTestERC20(): Promise<EthAddress> {

  const constructorArgs = ['RAVEN Token', 'RAVENHOUSETEST', l1Client.account.address];

  return await deployL1Contract(l1Client, TestERC20Abi, TestERC20Bytecode, constructorArgs).then(
    ({ address }) => address,
  );
}

async function deployFeeAssetHandler(l1TokenContract: EthAddress): Promise<EthAddress> {
  const constructorArgs = [l1Client.account.address, l1TokenContract.toString(), MINT_AMOUNT];
  return await deployL1Contract(l1Client, FeeAssetHandlerAbi, FeeAssetHandlerBytecode, constructorArgs).then(
    ({ address }) => address,
  );
}

async function deployTokenPortal(): Promise<EthAddress> {
  return await deployL1Contract(l1Client, TokenPortalAbi, TokenPortalBytecode, []).then(({ address }) => address);
}

async function addMinter(l1TokenContract: EthAddress, l1TokenHandler: EthAddress) {
  const contract = getContract({
    address: l1TokenContract.toString(),
    abi: TestERC20Abi,
    client: l1Client,
  });
  await contract.write.addMinter([l1TokenHandler.toString()]);
}





logger.info("Flow starts");


const { wallet, node } = await setupDevnetNetwork();
console.log("")
// const [ownerAztecAddress] = await registerInitialLocalNetworkAccountsInWallet(wallet);

const ownerAztecAddress = (await (await getAccountFromEnv(wallet)).getAccount()).getAddress()


const sponsoredFPC = await getSponsoredFPCInstance();
logger.info(`💰 Sponsored FPC instance obtained at: ${sponsoredFPC.address}`);

logger.info('📝 Registering sponsored FPC contract with wallet...');
await wallet.registerContract(sponsoredFPC, SponsoredFPCContract.artifact);
const sponsoredPaymentMethod = new SponsoredFeePaymentMethod(sponsoredFPC.address);
console.log(ownerAztecAddress)


// console.log('Local network setup complete');
const l1ContractAddresses = (await node.getNodeInfo()).l1ContractAddresses;
logger.info('L1 Contract Addresses:');
logger.info(`Registry Address: ${l1ContractAddresses.registryAddress}`);
logger.info(`Inbox Address: ${l1ContractAddresses.inboxAddress}`);
logger.info(`Outbox Address: ${l1ContractAddresses.outboxAddress}`);
logger.info(`Rollup Address: ${l1ContractAddresses.rollupAddress}`);


// process.exit(1)

const L2_TOKEN_ARGS = [ownerAztecAddress, 'Raven L2 TEST', 'RAVENL2TEST', 18] as any

// const l2TokenContract = await Contract.deploy(wallet, TokenContractArtifact, L2_TOKEN_ARGS, "constructor").send({
//   from: ownerAztecAddress, fee: { paymentMethod: sponsoredPaymentMethod },
//   contractAddressSalt: L2_TOKEN_CONTRACT_SALT
// }).deployed()

//comment this when deploying new contract
const l2TokenContractInstance = await getContractInstance(L2_TOKEN_ARGS, ownerAztecAddress, L2_TOKEN_CONTRACT_SALT, TokenContractArtifact)
await wallet.registerContract(l2TokenContractInstance, TokenContractArtifact)
const l2TokenContract = await TokenContract.at(AztecAddress.fromString(process.env.RAVENHOUSETEST_L2_TOKEN_ADDRESS || ""), wallet)


logger.info(`L2 token contract deployed at ${l2TokenContract.address}`);
// await contract.methods.set_minter(AztecAddress.fromString(process.env.AZTEC_ADMIN2_ADDRESS || ""), true).send({ from: ownerAztecAddress, fee: { paymentMethod: sponsoredPaymentMethod } }).wait();



// Deploy L1 token contract & mint tokens
// const l1TokenContract = await deployTestERC20();
// console.log("l1 token address", l1TokenContract.toString())
// logger.info('erc20 contract deployed');
// process.exit(1);
const l1TokenContractAddress = EthAddress.fromString(process.env.RAVENHOUSETEST_TOKEN_ADDRESS || "")
const l1TokenContract = getContract({
  address: l1TokenContractAddress.toString(),
  abi: erc20Abi,
  client: l1Client
})

// await addMinter(l1TokenContractAddress, "YASH METAMASK ADDRESS");

// const feeAssetHandler = await deployFeeAssetHandler(l1TokenContractAddress);
const feeAssetHandler = EthAddress.fromString(process.env.L1_FEE_ASSET_HANDLER_ADDRESS || "")
await addMinter(l1TokenContractAddress, feeAssetHandler);

console.log("L1 fee asset handler address", feeAssetHandler.toString())

const l1TokenManager = new L1TokenManager(l1TokenContractAddress, feeAssetHandler, l1Client, logger);

// Deploy L1 portal contract: only deploy once
// const l1PortalContractAddress = await deployTokenPortal();
const l1PortalContractAddress = EthAddress.fromString(process.env.L1_PORTAL_CONTRACT_ADDRESS || "")
logger.info('L1 portal contract deployed with address', l1PortalContractAddress.toString());


const l1Portal = getContract({
  address: l1PortalContractAddress.toString(),
  abi: TokenPortalAbi,
  client: l1Client,
});

// process.exit(1)

const L2_BRIDGE_CONTRACT_ARGS = [l2TokenContract.address, l1PortalContractAddress] as any
// Deploy L2 bridge contract
// const l2BridgeContract = await TokenBridgeContract.deploy(wallet, L2_BRIDGE_CONTRACT_ARGS[0], L2_BRIDGE_CONTRACT_ARGS[1])
//   .send({ from: ownerAztecAddress, fee: { paymentMethod: sponsoredPaymentMethod }, contractAddressSalt: L2_TOKEN_CONTRACT_SALT })
//   .deployed();

//comments this 3 lines if deploying new contract
const l2BridgeContractInstance = await getContractInstance(L2_BRIDGE_CONTRACT_ARGS, ownerAztecAddress, L2_BRIDGE_CONTRACT_ARGS, TokenBridgeContractArtifact)
await wallet.registerContract(l2BridgeContractInstance, TokenBridgeContractArtifact)
const l2BridgeContract = await TokenBridgeContract.at(l2BridgeContractInstance.address, wallet)

logger.info(`L2 token bridge contract deployed at ${l2BridgeContract.address}`);
// docs:end:deploy-l2-bridge

// Set Bridge as a minter
// docs:start:authorize-l2-bridge
await l2TokenContract.methods.set_minter(l2BridgeContract.address, true).send({ from: ownerAztecAddress, fee: { paymentMethod: sponsoredPaymentMethod } }).wait();
// docs:end:authorize-l2-bridge

// Initialize L1 portal contract
// docs:start:setup-portal
await l1Portal.write.initialize(
  [l1ContractAddresses.registryAddress.toString(), l1TokenContractAddress.toString(), l2BridgeContract.address.toString()],
  {},
);
logger.info('L1 portal contract initialized');

console.log({
  l1PortalContractAddress,
  l1TokenContractAddress,
  feeAssetHandler,
  outboxAddress: l1ContractAddresses.outboxAddress,
})

const l1PortalManager = new L1TokenPortalManager(
  l1PortalContractAddress,
  l1TokenContractAddress,
  feeAssetHandler,
  l1ContractAddresses.outboxAddress,
  l1Client,
  logger,
);



// docs:end:setup-portal

// docs:start:l1-bridge-public
// const claim = await l1PortalManager.bridgeTokensPublic(ownerAztecAddress, MINT_AMOUNT, true);

// const currentNode = await node.getBlockNumber();
// let initial = currentNode;


// while (initial < currentNode + 3) {
//   console.log("Sleeping for 5 seconds")
//   await sleep(5000)
//   initial = await node.getBlockNumber()
// }
// somehow here wait for two-three blocks to process.


// Do 2 unrelated actions because
// TODO: Find a better way to wait till this claim is available on L2

// Claim tokens publicly on L2
// docs:start:claim
// await l2BridgeContract.methods
//   .claim_public(ownerAztecAddress, MINT_AMOUNT, claim.claimSecret, claim.messageLeafIndex)
//   .send({ from: ownerAztecAddress, fee: { paymentMethod: sponsoredPaymentMethod } })
//   .wait();
// const balance = await l2TokenContract.methods
//   .balance_of_public(ownerAztecAddress)
//   .simulate({ from: ownerAztecAddress });
// logger.info(`Public L2 balance of ${ownerAztecAddress} is ${balance}`);
// docs:end:claim

logger.info('Withdrawing funds from L2');

console.log("This flow is for L2 to L1")

// docs:start:setup-withdrawal
const withdrawAmount = 100n;
const authwitNonce = Fr.random();

// Give approval to bridge to burn owner's funds:
const authwit = await wallet.setPublicAuthWit(
  ownerAztecAddress,
  {
    caller: l2BridgeContract.address,
    action: l2TokenContract.methods.burn_public(ownerAztecAddress, withdrawAmount, authwitNonce),
  },
  true,
);
await authwit.send({ fee: { paymentMethod: sponsoredPaymentMethod } }).wait();
// docs:end:setup-withdrawal

// docs:start:l2-withdraw
const l2ToL1Message = await l1PortalManager.getL2ToL1MessageLeaf(
  withdrawAmount,
  EthAddress.fromString(ownerEthAddress),
  l2BridgeContract.address,
  EthAddress.ZERO,
);
const l2TxReceipt = await l2BridgeContract.methods
  .exit_to_l1_public(EthAddress.fromString(ownerEthAddress), withdrawAmount, EthAddress.ZERO, authwitNonce)
  .send({ from: ownerAztecAddress, fee: { paymentMethod: sponsoredPaymentMethod } })
  .wait();

const newL2Balance = await l2TokenContract.methods
  .balance_of_public(ownerAztecAddress)
  .simulate({ from: ownerAztecAddress });
logger.info(`New L2 balance of ${ownerAztecAddress} is ${newL2Balance}`);
// docs:end:l2-withdraw

// docs:start:l1-withdraw
const result = await computeL2ToL1MembershipWitness(node, await node.getBlockNumber(), l2ToL1Message);
if (!result) {
  throw new Error('L2 to L1 message not found');
}

const currentBlock = await node.getBlockNumber();
let provenBlock = await node.getProvenBlockNumber();
// let initial = currentNode;?


while (provenBlock < currentBlock) {
  console.log(`Sleeping for 5 seconds while aztec node no ${provenBlock} gets bigger. current Block ${currentBlock}`)
  await sleep(5000)
  provenBlock = await node.getProvenBlockNumber()
}
await l1PortalManager.withdrawFunds(
  withdrawAmount,
  EthAddress.fromString(ownerEthAddress),
  BigInt(l2TxReceipt.blockNumber!),
  result.leafIndex,
  result.siblingPath,
);
const newL1Balance = await l1TokenManager.getL1TokenBalance(ownerEthAddress);
logger.info(`New L1 balance of ${ownerEthAddress} is ${newL1Balance}`);
logger.info(`Withdrawal of ${withdrawAmount} complete`);
// docs:end:l1-withdraw
logger.info('Token bridge flow complete');
