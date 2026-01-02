import data from "../data2.json";

import odata from '../data.json'

import fs from "fs";

console.log("Old data proof length:", odata.proofAsFields.length)
const payload = {
  vkAsFields: data.vkAsFields,
  proofAsFields: data.proofAsFields,
  publicInputs: data.publicInputs,
  vkHash: data.vkHash,
};

console.log(payload.proofAsFields.length)
// payload.vkAsFields = payload.vkAsFields.map((f: string) => "0x" + f);
// payload.proofAsFields = payload.proofAsFields.map((f: string) => "0x" + f);
// payload.publicInputs = payload.publicInputs.map((f: string) => "0x" + f);
// payload.vkHash = "0x" + payload.vkHash;


// fs.writeFileSync('data2.json', JSON.stringify(payload, null, 2))

// // fs.writeFileSync('data2.json', JSON.stringify(payload, null, 2))
// console.log("Payload for recursion:", payload);
