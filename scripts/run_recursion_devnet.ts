// This token bridge is to bridge tokens from Ethereum sepolia to aztec devnet



import { createAztecNodeClient, waitForNode } from "@aztec/aztec.js/node";
import { getAztecNodeUrl, getL1RpcUrl } from "../config/config.js";
import { createExtendedL1Client } from '@aztec/ethereum/client'
import { TestWallet } from "@aztec/test-wallet/server";
import { AztecAddress, EthAddress } from '@aztec/aztec.js/addresses'
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
import { getAccountFromEnv } from "../utils/create_account_from_env.js";
import { sepolia } from "viem/chains";
import { Contract, ContractInstanceWithAddress, getContractInstanceFromInstantiationParams } from "@aztec/aztec.js/contracts";
import { getSponsoredFPCInstance } from "../utils/sponsored_fpc.js";
import { SponsoredFPCContract } from "@aztec/noir-contracts.js/SponsoredFPC";
import { SponsoredFeePaymentMethod } from "@aztec/aztec.js/fee";
import { ValueNotEqualContract, ValueNotEqualContractArtifact } from "../contracts/artifacts/ValueNotEqual.js";
import data from "../data.json";
import { FieldLike } from "@aztec/aztec.js/abi";

const logger = createLogger('raven: token-bridge');





export async function getTokenContractInstance(args: any[]): Promise<ContractInstanceWithAddress> {
  return await getContractInstanceFromInstantiationParams(TokenContractArtifact, {
    constructorArgs: args,
    salt: new Fr(1),
  });
}

const VALUE_NOT_EQUAL_SALT = new Fr(0);

export async function getValueNotEqualInstance(deployer: AztecAddress): Promise<ContractInstanceWithAddress> {
  return await getContractInstanceFromInstantiationParams(ValueNotEqualContract.artifact, {
    salt: VALUE_NOT_EQUAL_SALT,
    constructorArgs: [10, ownerAztecAddress],
    deployer
  });
}



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

// process.exit(1)


// const l2TokenContract = await TokenContract.deploy(wallet, ownerAztecAddress, 'Raven L2 TEST', 'RAVENL2TEST', 18)
//   .send({
//     from: ownerAztecAddress, fee: {
//       paymentMethod: sponsoredPaymentMethod
//     }
//   })
//   .deployed();

// const contract = await Contract.deploy(wallet, ValueNotEqualContractArtifact, [10, ownerAztecAddress]).send({
//   from: ownerAztecAddress, fee: { paymentMethod: sponsoredPaymentMethod },
//   contractAddressSalt: VALUE_NOT_EQUAL_SALT
// }).deployed()
// logger.info(`Value not equal contract deployed at ${contract.address}`);



const instance = await wallet.registerContract({ instance: await getValueNotEqualInstance(ownerAztecAddress), artifact: ValueNotEqualContractArtifact });

const contract = await ValueNotEqualContract.at(instance.address, wallet)

const tx = await contract.methods.increment(
  ownerAztecAddress,
  data.vkAsFields as unknown as FieldLike[],
  data.proofAsFields as unknown as FieldLike[],
  data.publicInputs as unknown as FieldLike[],
  data.vkHash as unknown as FieldLike
).send({
  from: ownerAztecAddress, fee: {
    paymentMethod: sponsoredPaymentMethod
  }
}).wait({ timeout: 60_000 });

console.log("Tx hash", tx.txHash.toString())
const counterValue = await contract.methods
  .get_counter(ownerAztecAddress)
  .simulate({ from: ownerAztecAddress });

console.log(`Counter value: ${counterValue}`);
process.exit(1)
