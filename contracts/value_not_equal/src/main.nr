use aztec::macros::aztec;

#[aztec]
pub contract ValueNotEqual {
    global HONK_VK_SIZE: u32 = 115;
    global HONK_PROOF_SIZE: u32 = 492 + 16;

    use bb_proof_verification::verify_honk_proof;

  use aztec::{
        macros::{functions::{external, initializer}, storage::storage},
        messages::message_delivery::MessageDelivery,
        oracle::debug_log::debug_log_format,
        protocol_types::{address::AztecAddress, traits::ToField},
        state_vars::Owned,
    };
    use balance_set::BalanceSet;
    // docs:end:imports

    // docs:start:storage_struct
    #[storage]
    struct Storage<Context> {
        counters: Owned<BalanceSet<Context>, Context>,
    }
    // docs:end:storage_struct

    // docs:start:constructor
    #[initializer]
    #[external("private")]
    // We can name our initializer anything we want as long as it's marked as aztec(initializer)
    fn initialize(headstart: u64, owner: AztecAddress) {
        self.storage.counters.at(owner).add(headstart as u128).deliver(
            MessageDelivery.CONSTRAINED_ONCHAIN,
        );
    }
    // docs:end:constructor

    // suppose this method is a whitelist_mint method and I as a collection creator only want to mint NFT from my collection if user age is is at least 18. because these are adult NFTS.


    #[external("private")]
    fn increment(
        owner: AztecAddress,
        verification_key: [Field; HONK_VK_SIZE],
        proof: [Field; HONK_PROOF_SIZE],
        public_inputs: [Field; 7],
        vk_hash: Field,
    ) {
        debug_log_format("Incrementing counter for owner {0}", [owner.to_field()]);
        verify_honk_proof(verification_key, proof, public_inputs, vk_hash);
        // ValueNotEqual::at(context.this_address()).emit_in_public(12345).enqueue(&mut context);
        self.storage.counters.at(owner).add(1).deliver(MessageDelivery.CONSTRAINED_ONCHAIN);
    }

    // #[external("public")]
    // fn emit_in_public(n: Field) {
    //     context.push_note_hash(n);
    // }

    #[external("utility")]
    unconstrained fn get_counter(owner: AztecAddress) -> pub u128 {
        self.storage.counters.at(owner).balance_of()
    }
}
