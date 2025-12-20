import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { getAztecNodeUrl } from "../config/config.js";

async function main() {

    const nodeUrl = getAztecNodeUrl();
    console.log("node url", nodeUrl)
    const node = createAztecNodeClient(nodeUrl);
    console.log(await node.getChainId())
    let block = await node.getBlock("latest");
    console.log(block)
    // console.log(await block?.hash())
}

main();
