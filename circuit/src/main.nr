use binary_merkle_root::binary_merkle_root;
use std::hash::poseidon::bn254::hash_2 as poseidon2;

global MAX_DEPTH: u32 = 32;
fn main(
    identity_commitment: Field,
    merkle_proof_length: u32, 
    merkle_proof_indices: [u1; MAX_DEPTH], 
    merkle_proof_siblings: [Field; MAX_DEPTH], 
) {

    // Calculate Merkle root.
    let merkle_root = binary_merkle_root(poseidon2, identity_commitment, merkle_proof_length, merkle_proof_indices, merkle_proof_siblings);
}
