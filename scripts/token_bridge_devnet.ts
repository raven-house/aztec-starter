// This token bridge is to bridge tokens from Ethereum sepolia to aztec devnet



import { createAztecNodeClient, waitForNode } from "@aztec/aztec.js/node";
import { getAztecNodeUrl, getL1RpcUrl } from "../config/config.js";
import { createExtendedL1Client } from '@aztec/ethereum/client'
import { registerInitialLocalNetworkAccountsInWallet, TestWallet } from "@aztec/test-wallet/server";
import { EthAddress } from '@aztec/aztec.js/addresses'
import { deployL1Contract } from "@aztec/ethereum/deploy-l1-contracts";
import { TestERC20Abi, TestERC20Bytecode, FeeAssetHandlerAbi, FeeAssetHandlerBytecode, TokenPortalAbi, TokenPortalBytecode } from "@aztec/l1-artifacts";
import { erc20Abi, getContract, PrivateKeyAccount } from "viem";
import { TokenContract, TokenContractArtifact } from "@aztec/noir-contracts.js/Token";
import { L1TokenManager, L1TokenPortalManager } from "@aztec/aztec.js/ethereum";
import { createLogger } from "@aztec/aztec.js/log";
import { TokenBridgeContract } from "@aztec/noir-contracts.js/TokenBridge";
import { Fr } from "@aztec/aztec.js/fields";
import { computeL2ToL1MembershipWitness } from "@aztec/stdlib/messaging";
import { privateKeyToAccount } from "viem/accounts";
import { getAccountFromEnv } from "../src/utils/create_account_from_env.js";
import { sepolia } from "viem/chains";
import { Contract, ContractInstanceWithAddress, getContractInstanceFromInstantiationParams } from "@aztec/aztec.js/contracts";
import { getSponsoredFPCInstance } from "../src/utils/sponsored_fpc.js";
import { SponsoredFPCContract } from "@aztec/noir-contracts.js/SponsoredFPC";
import { SponsoredFeePaymentMethod } from "@aztec/aztec.js/fee";




// sepolia RPC url
const l1RpcUrl = getL1RpcUrl();
const logger = createLogger('raven: token-bridge');


console.log(l1RpcUrl)

const privateKeyAccount = privateKeyToAccount(`0x${process.env.ETHEREUM_WALLET_PRIVATE_KEY || ""}`)
const l1Client = createExtendedL1Client(l1RpcUrl.split(','), privateKeyAccount, sepolia);


export async function getTokenContractInstance(args: any[]): Promise<ContractInstanceWithAddress> {
  return await getContractInstanceFromInstantiationParams(TokenContractArtifact, {
    constructorArgs: args,
    salt: new Fr(1),
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

const l2TokenContractInstance = await getTokenContractInstance([ownerAztecAddress, 'Raven L2 TEST', 'RAVENL2TEST', 18])
await wallet.registerContract(l2TokenContractInstance, TokenContractArtifact)

// const l2TokenContract = await TokenContract.deploy(wallet, ownerAztecAddress, 'Raven L2 TEST', 'RAVENL2TEST', 18)
//   .send({
//     from: ownerAztecAddress, fee: {
//       paymentMethod: sponsoredPaymentMethod
//     }
//   })
//   .deployed();

const contract = await Contract.deploy(wallet, TokenContractArtifact, [ownerAztecAddress, 'Raven L2 TEST', 'RAVENL2TEST', 18], "constructor").send({
  from: ownerAztecAddress, fee: { paymentMethod: sponsoredPaymentMethod }
}).deployed()
logger.info(`L2 token contract deployed at ${contract.address}`);


process.exit(1)

// Deploy L1 token contract & mint tokens
// const l1TokenContract = await deployTestERC20();
// console.log("l1 token address", l1TokenContract.toString())
// logger.info('erc20 contract deployed');
// process.exit(1);

// const l1TokenContract = getContract({
//   address: `0x${process.env.RAVENHOUSETEST_TOKEN_ADDRESS}`,
//   abi: erc20Abi,
//   client: l1Client
// })

// await addMinter(l1TokenContractAddress, "YASH METAMASK ADDRESS");

const l1TokenContractAddress = EthAddress.fromString(process.env.RAVENHOUSETEST_TOKEN_ADDRESS || "")

const feeAssetHandler = await deployFeeAssetHandler(l1TokenContractAddress);
await addMinter(l1TokenContractAddress, feeAssetHandler);

const l1TokenManager = new L1TokenManager(l1TokenContractAddress, feeAssetHandler, l1Client, logger);

// Deploy L1 portal contract
const l1PortalContractAddress = await deployTokenPortal();
logger.info('L1 portal contract deployed');

const l1Portal = getContract({
  address: l1PortalContractAddress.toString(),
  abi: TokenPortalAbi,
  client: l1Client,
});

// Deploy L2 bridge contract
const l2BridgeContract = await TokenBridgeContract.deploy(wallet, l2TokenContract.address, l1PortalContractAddress)
  .send({ from: ownerAztecAddress })
  .deployed();
logger.info(`L2 token bridge contract deployed at ${l2BridgeContract.address}`);
// docs:end:deploy-l2-bridge

// Set Bridge as a minter
// docs:start:authorize-l2-bridge
await l2TokenContract.methods.set_minter(l2BridgeContract.address, true).send({ from: ownerAztecAddress }).wait();
// docs:end:authorize-l2-bridge

// Initialize L1 portal contract
// docs:start:setup-portal
await l1Portal.write.initialize(
  [l1ContractAddresses.registryAddress.toString(), l1TokenContract.toString(), l2BridgeContract.address.toString()],
  {},
);
logger.info('L1 portal contract initialized');

const l1PortalManager = new L1TokenPortalManager(
  l1PortalContractAddress,
  l1TokenContract,
  feeAssetHandler,
  l1ContractAddresses.outboxAddress,
  l1Client,
  logger,
);
// docs:end:setup-portal

// docs:start:l1-bridge-public
const claim = await l1PortalManager.bridgeTokensPublic(ownerAztecAddress, MINT_AMOUNT, true);

// Do 2 unrelated actions because
// https://github.com/AztecProtocol/aztec-packages/blob/7e9e2681e314145237f95f79ffdc95ad25a0e319/yarn-project/end-to-end/src/shared/cross_chain_test_harness.ts#L354-L355
await l2TokenContract.methods.mint_to_public(ownerAztecAddress, 0n).send({ from: ownerAztecAddress }).wait();
await l2TokenContract.methods.mint_to_public(ownerAztecAddress, 0n).send({ from: ownerAztecAddress }).wait();
// docs:end:l1-bridge-public

// Claim tokens publicly on L2
// docs:start:claim
await l2BridgeContract.methods
  .claim_public(ownerAztecAddress, MINT_AMOUNT, claim.claimSecret, claim.messageLeafIndex)
  .send({ from: ownerAztecAddress })
  .wait();
const balance = await l2TokenContract.methods
  .balance_of_public(ownerAztecAddress)
  .simulate({ from: ownerAztecAddress });
logger.info(`Public L2 balance of ${ownerAztecAddress} is ${balance}`);
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
await authwit.send().wait();
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
  .send({ from: ownerAztecAddress })
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
