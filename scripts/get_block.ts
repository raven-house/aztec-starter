import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { getAztecNodeUrl } from "../config/config.js";

async function main() {

    const nodeUrl = getAztecNodeUrl();
    console.log("node url", nodeUrl)
    const node = createAztecNodeClient(nodeUrl);

    const nodeInfo = (await node.getNodeInfo())
    const l1ContractAddresses = nodeInfo.l1ContractAddresses
    const protocolContractAddresses = nodeInfo.protocolContractAddresses
    const rollupVersion = nodeInfo.rollupVersion
    const l1ChainId = nodeInfo.l1ChainId
    const nodeVersion = nodeInfo.nodeVersion

    console.log({ l1ContractAddresses, protocolContractAddresses, rollupVersion, l1ChainId, nodeVersion })

    // console.log(await node.getChainId())
    // let block = await node.getBlock("latest");
    // console.log(block)
    // console.log(await block?.hash())
}

main();
