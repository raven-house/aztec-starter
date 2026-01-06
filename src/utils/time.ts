export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getPermit2Nonce(owner: string): Promise<bigint> {
  // Permit2 uses a bitmap of nonces
  // For simplicity, use random nonce in available range
  const randomNonce = BigInt(Math.floor(Math.random() * 1000000));
  return randomNonce;
}
