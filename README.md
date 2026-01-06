# Raven Aztec bridge

## Sandbox

This repo is meant to be a starting point for learning to write Aztec contracts and tests on the Aztec sandbox (local development environment). It includes an example contract, useful commands in `package.json` and helpful scripts in `./scripts`.

You can find the **Easy Private Voting contract** in `./src/main.nr`. A simple integration test is in `./src/test/e2e/index.test.ts`.

## Devnet

This repo connects to a locally running Aztec Sandbox by default, but can be configured to connect to the devnet by specifying `AZTEC_ENV=devnet` in a `.env` file or by prefixing a command e.g. `AZTEC_ENV=devnet bun deploy`.

---

```bash
export VERSION=3.0.0-devnet.5
aztec-up && docker pull aztecprotocol/aztec:$VERSION && docker tag aztecprotocol/aztec:$VERSION aztecprotocol/aztec:latest
```

### Environment Configuration

This project uses JSON configuration files to manage environment-specific settings:

- `config/sandbox.json` - Configuration for local sandbox development
- `config/devnet.json` - Configuration for devnet deployment

The system automatically loads the appropriate configuration file based on the `ENV` environment variable. If `ENV` is not set, it defaults to `sandbox`.

The configuration files contain network URLs, timeouts, and environment-specific settings. You can modify these files to customize your development environment.

### Running on Sandbox (Local Development)

Start the sandbox with:

```bash
aztec start --local-network
```

Run scripts and tests with default sandbox configuration:

```bash
bun compile && bun codegen  # Compile contract and generate TS
bun deploy       # Deploy to sandbox
bun test         # Run tests on sandbox
```

### Running on Devnet

All scripts support a `::devnet` suffix to automatically use devnet configuration:

```bash
bun deploy::devnet              # Deploy to devnet
bun test::devnet                # Run tests on devnet
bun deploy-account::devnet      # Deploy account to devnet
bun interaction-existing-contract::devnet  # Interact with devnet contracts
```

The `::devnet` suffix automatically sets `ENV=devnet`, loading configuration from `config/devnet.json`.

---

## 📦 **Install Packages**

```bash
<<<<<<< HEAD
bun install
=======
yarn install
>>>>>>> upstream/main
```

---

## 🏗 **Compile**

```bash
aztec-nargo compile
```

or

```bash
bun compile
```

---

## 🔧 **Codegen**

Generate the **contract artifact JSON** and TypeScript interface:

```bash
bun codegen
```

---

:warning: Tests and scripts set up and run the Private Execution Environment (PXE) and store PXE data in the `./store` directory. If you restart the sandbox, you will need to delete the `./store` directory to avoid errors.

## Transaction Profiling

**Make sure the sandbox is running before profiling.**

```bash
aztec start --sandbox
```

Then run an example contract deployment profile with:

```bash
bun profile
```

You can specify the bb binary path for faster native proving, e.g.

```bash
BB_BINARY_PATH="/home/user/.bb/bb" BB_WORKING_DIRECTORY="/tmp/bb" CRS_PATH="/tmp/bb" bun profile
```

See the [demo-wallet for an example](https://github.com/AztecProtocol/demo-wallet/blob/main/app/scripts/copyBB.js) of how to fetch the appropriate bb binary (version and OS) in an application.

## 🧪 **Test**

**Make sure the sandbox is running before running tests.**

```bash
aztec start --sandbox
```

Then test with:

```bash
bun test
```

Testing will run the **TypeScript tests** defined in `index.test.ts` inside `./src/test/e2e`, as well as the [Aztec Testing eXecution Environment (TXE)](https://docs.aztec.network/developers/guides/smart_contracts/testing) tests defined in [`first.nr`](./src/test/first.nr) (imported in the contract file with `mod test;`).

Note: The Typescript tests spawn an instance of the sandbox to test against, and close it once the TS tests are complete.

---

## Scripts

You can find a handful of scripts in the `./scripts` folder.

- `./scripts/deploy_account.ts` is an example of how to deploy a schnorr account.
- `./scripts/deploy_contract.ts` is an example of how to deploy a contract.
- `./scripts/fees.ts` is an example of how to pay for a contract deployment using various fee payment methods.
- `./scripts/multiple_wallet.ts` is an example of how to deploy a contract from one wallet instance and interact with it from another.
- `./scripts/profile_deploy.ts` shows how to profile a transaction and print the results.
- `./scripts/interaction_existing_contract.ts` demonstrates how to interact with an already deployed voting contract, including casting votes and checking vote counts.
- `./scripts/get_block.ts` is an example of how to retrieve and display block information from the Aztec node.

### Utility Functions

The `./src/utils/` folder contains utility functions:

- `./src/utils/create_account_from_env.ts` provides functions to create Schnorr accounts from environment variables (SECRET, SIGNING_KEY, and SALT), useful for account management across different environments.
- `./src/utils/setup_wallet.ts` provides a function to set up and configure the TestWallet with proper configuration based on the environment.
- `./src/utils/deploy_account.ts` provides a function to deploy Schnorr accounts to the network with sponsored fee payment, including key generation and deployment verification.
- `./src/utils/sponsored_fpc.ts` provides functions to deploy and manage the SponsoredFPC (Fee Payment Contract) for handling sponsored transaction fees.
- `./config/config.ts` provides environment-aware configuration loading, automatically selecting the correct JSON config file based on the `ENV` variable.

## ❗ **Error Resolution**

:warning: Tests and scripts set up and run the Private Execution Environment (PXE) and store PXE data in the `./store` directory. If you restart the sandbox, you will need to delete the `./store` directory to avoid errors.

### 🔄 **Update Node.js and Noir Dependencies**

```bash
bun update
```

### 🔄 **Update Contract**

Get the **contract code from the monorepo**. The script will look at the versions defined in `./Nargo.toml` and fetch that version of the code from the monorepo.

```bash
bun update
```

You may need to update permissions with:

```bash
chmod +x .github/scripts/update_contract.sh
```

## AI Agent Contributor Guide

This repository includes an [AGENTS.md](./AGENTS.md) file with detailed
instructions for setting up your environment, running tests, and creating
pull requests. Please read it before contributing changes.

# What is Anvil

Anvil is a fast local ethereum development node

Anvil is part of the Foundry suit and is installed alongside forge, cast and chisel.

```bash
anvil --fork-url <RPC_URL>
```

# What is Permit2?

Permit2 is Uniswap's token approval contract that provides a more efficient and secure way to manage token approvals for smart contracts. Instead of users granting unlimited approvals to multiple contracts, they grant a single approval to the Permit2 contract, which then manages granular permissions through off-chain signatures.
Key Benefits

https://github.com/Uniswap/permit2

**Single Approval**: Users approve Permit2 once per token, instead of approving every protocol individually
**Signature-based Transfers**: Uses EIP-712 signatures for gasless approvals with expiration times
**Batch Operations**: Can approve multiple tokens or transfer to multiple recipients in one transaction
**Revocable Permissions**: Users can revoke permissions without needing to set allowances to zero
**Better UX**: Reduces transaction count and gas costs for users bridging tokens

**Current Flow (L1 → L2)**

User calls approve() on L1 token contract for the portal
Portal pulls tokens via transferFrom()
Tokens are locked and message sent to L2
User claims on L2 via bridge contract

**Permit2 Flow (L1 → L2)**

User signs a Permit2 message off-chain (no gas cost)
User calls bridge function with signature included
Bridge uses Permit2 to pull tokens atomically
Same L2 claiming process

```
┌─────────────┐
│   User      │
│  Wallet     │
└──────┬──────┘
       │ Signs Permit2 Message
       ↓
┌─────────────────────────────┐
│  Your Portal Contract (L1)  │
│  - Validates signature      │
│  - Calls Permit2.permit()   │
│  - Transfers tokens         │
│  - Sends L2 message         │
└─────────────┬───────────────┘
              │
              ↓
┌─────────────────────────────┐
│   Permit2 Contract (L1)     │
│   (Already deployed)        │
│   0x000000000022D473030F116dDEE9F6B43aC78BA3 │
└─────────────────────────────┘

```

## Permit 2 resources

- https://www.cyfrin.io/blog/how-to-implement-permit2
