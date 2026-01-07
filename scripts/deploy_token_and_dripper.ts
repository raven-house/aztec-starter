import { createAztecNodeClient, waitForNode } from "@aztec/aztec.js/node";
import { getAztecNodeUrl, getL1RpcUrl } from "../config/config.js";
import { createExtendedL1Client } from '@aztec/ethereum/client'
import { TestWallet } from "@aztec/test-wallet/server";
import { AztecAddress, EthAddress } from '@aztec/aztec.js/addresses'
import { deployL1Contract } from "@aztec/ethereum/deploy-l1-contracts";
import { TestERC20Abi, TestERC20Bytecode, FeeAssetHandlerAbi, FeeAssetHandlerBytecode, TokenPortalAbi, TokenPortalBytecode } from "@aztec/l1-artifacts";
import { erc20Abi, getContract, PrivateKeyAccount } from "viem";
import { DripperContract, DripperContractArtifact } from "@defi-wonderland/aztec-standards/artifacts/Dripper"
import { TokenContract, TokenContractArtifact } from "@defi-wonderland/aztec-standards/artifacts/Token"
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
import { ContractDeployer } from "@aztec/aztec.js/deployment";


const L2_TOKEN_CONTRACT_SALT = new Fr(2);

const setupDevnetNetwork = async () => {
  const nodeUrl = getAztecNodeUrl();
  console.log('Connecting to Aztec node at', nodeUrl);
  const node = createAztecNodeClient(nodeUrl);
  await waitForNode(node);
  console.log('Aztec node is ready');
  const wallet = await TestWallet.create(node, { proverEnabled: true });
  console.log('Test wallet created');
  return { node, wallet };
};

const { wallet, node } = await setupDevnetNetwork();

const ownerAztecAddress = (await (await getAccountFromEnv(wallet)).getAccount()).getAddress()


const tokenParams = {
  "name": "USDC",
  "symbol": "USDC",
  "decimals": 6,
  "minter": ownerAztecAddress.toString(),
  "upgrade_authority": ownerAztecAddress.toString()
}

const sponsoredFPC = await getSponsoredFPCInstance();
console.log(`💰 Sponsored FPC instance obtained at: ${sponsoredFPC.address}`);

console.log('📝 Registering sponsored FPC contract with wallet...');
await wallet.registerContract(sponsoredFPC, SponsoredFPCContract.artifact);
const sponsoredPaymentMethod = new SponsoredFeePaymentMethod(sponsoredFPC.address);
console.log(ownerAztecAddress)

console.log(TokenContract)

export async function getContractInstance(args: any[], deployer: AztecAddress, salt: Fr, artifact: any): Promise<ContractInstanceWithAddress> {
  return await getContractInstanceFromInstantiationParams(artifact, {
    constructorArgs: args,
    salt: L2_TOKEN_CONTRACT_SALT,
    deployer
  });
}

const dripperDeployer = new ContractDeployer(DripperContractArtifact, wallet, undefined, 'constructor');

const dripperTx = dripperDeployer.deploy()
  .send({ contractAddressSalt: L2_TOKEN_CONTRACT_SALT, from: ownerAztecAddress, fee: { paymentMethod: sponsoredPaymentMethod } });
const dripperReceipt = await dripperTx.getReceipt();
console.log(`✅ Deployed L2 token contract at address: ${dripperReceipt.txHash.toString()}`);
const dripper = await getContractInstance([], ownerAztecAddress, L2_TOKEN_CONTRACT_SALT, DripperContractArtifact)
console.log(`✅ Dripper contract instance obtained at address: ${dripper.address.toString()}`);


const deployer = new ContractDeployer(TokenContractArtifact, wallet, undefined, 'constructor_with_minter');
const tx = deployer
  .deploy(tokenParams.name, tokenParams.symbol, tokenParams.decimals, dripper.address, tokenParams.upgrade_authority)
  .send({ contractAddressSalt: L2_TOKEN_CONTRACT_SALT, from: ownerAztecAddress, fee: { paymentMethod: sponsoredPaymentMethod } });
const receipt = await tx.getReceipt();
console.log(`✅ Deployed L2 token contract at address: ${receipt.txHash.toString()}`);



// const l2TokenContractInstance = await getContractInstance([tokenParams.name, tokenParams.symbol, tokenParams.decimals, tokenParams.minter, tokenParams.upgrade_authority], ownerAztecAddress, L2_TOKEN_CONTRACT_SALT, TokenContractArtifact)

// await wallet.registerContract(l2TokenContractInstance, TokenContractArtifact)
// const l2TokenContract = await TokenContract.at(AztecAddress.fromString(process.env.RAVEN_USDC_CONTRACT_ADDRESS || ""), wallet)

// console.log(`✅ L2 token contract instance obtained at address: ${l2TokenContract.address.toString()}`);

