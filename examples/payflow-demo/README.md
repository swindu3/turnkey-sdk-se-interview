# Payflow Demo - Automated Merchant Wallet & Fund Sweeping

This demo showcases how **Payflow** (a fintech startup) can use Turnkey to automate wallet creation and fund sweeping for their merchant payment rails.

## Overview

Payflow needs to:
1. Generate dedicated deposit wallets for each merchant on demand
2. Automatically sweep incoming USDC deposits into a single treasury (omnibus) wallet
3. Restrict fund movement by enforcing policies that only allow USDC transfers to the treasury wallet

## Quick Navigation

- **[Quick Start Guide](docs/01-quickstart.md)** - Get up and running in minutes
- **[Turnkey Hierarchy](docs/02-turnkey-hierarchy.md)** - Understand the organizational structure
- **[Sub-Organizations](docs/03-sub-organizations.md)** - Learn about merchant isolation
- **[Policies](docs/04-policies.md)** - How transaction restrictions work
- **[Fund Sweeping](docs/05-fund-sweeping.md)** - Automated USDC transfer mechanism
- **[Scheduled Sweep Jobs](docs/07-scheduled-sweep.md)** - Long-running automated sweep jobs
- **[CLI Usage](docs/06-cli-usage.md)** - Interactive command-line interface guide

## Architecture

This demo uses the following Turnkey primitives:

- **Sub-Organizations**: Each merchant gets their own isolated sub-organization for security and access control
- **Wallets**: Ethereum wallets are created for both merchants (deposit wallets) and the treasury (omnibus wallet)
- **Policies**: Restrictive policies are applied to ensure only USDC transfers to the treasury are allowed

### Key Components

1. **Merchant Creation** (`createMerchant.ts`): Creates a sub-organization and wallet for each merchant
2. **Policy Engine** (`createPolicy.ts`): Creates policies that restrict transactions to USDC-only transfers to treasury
3. **Fund Sweeping** (`sweepUSDC.ts`): Automatically transfers USDC from merchant wallets to treasury
4. **Treasury Management** (`treasury.ts`): Manages the central treasury wallet

## Getting Started

See the [Quick Start Guide](docs/01-quickstart.md) for detailed setup instructions.

### Prerequisites

- Node.js v18+ installed
- A Turnkey organization with API credentials
- `pnpm` package manager (install via `corepack enable`)
- Infura API key for Ethereum RPC access

### Quick Setup

```bash
# Install dependencies
$ corepack enable
$ pnpm install -r

# Build all workspace packages (REQUIRED)
# This builds @turnkey/sdk-server and other dependencies needed by the demo
$ pnpm run build-all

# Navigate to the demo
$ cd examples/payflow-demo/

# Configure environment variables (see .env.local.example)
$ cp .env.local.example .env.local
# Edit .env.local with your credentials

# Run the interactive CLI
$ pnpm demo
```

**Important**: The `pnpm run build-all` step is required before running the demo. This builds all workspace packages including `@turnkey/sdk-server`, which the demo depends on. Without this step, you'll see an error like `Cannot find module '@turnkey/sdk-server/dist/index.js'`.

## Project Structure

```
payflow-demo/
├── src/
│   ├── index.ts              # Main CLI entry point
│   ├── createMerchant.ts     # Merchant sub-org & wallet creation
│   ├── createPolicy.ts       # Policy creation for USDC restrictions
│   ├── sweepUSDC.ts          # USDC transfer to treasury
│   ├── treasury.ts           # Treasury wallet management
│   ├── provider.ts            # Ethereum provider & Turnkey client setup
│   ├── utils.ts               # Utility functions
│   ├── commands/              # CLI command implementations
│   │   ├── fullDemo.ts
│   │   ├── createMerchant.ts
│   │   ├── listMerchants.ts
│   │   ├── addMerchantWallet.ts
│   │   ├── deleteMerchant.ts
│   │   ├── sweepFunds.ts
│   │   ├── scheduledSweep.ts
│   │   ├── sendFunds.ts
│   │   └── checkBalance.ts
│   └── cli/                   # CLI UI components
│       ├── menu.ts
│       ├── display.ts
│       └── balance.ts
├── docs/                      # Documentation
│   ├── 01-quickstart.md
│   ├── 02-turnkey-hierarchy.md
│   ├── 03-sub-organizations.md
│   ├── 04-policies.md
│   ├── 05-fund-sweeping.md
│   ├── 06-cli-usage.md
│   └── 07-scheduled-sweep.md
├── package.json
├── tsconfig.json
└── README.md
```

## Key Concepts

### Sub-Organizations
Each merchant gets their own isolated sub-organization, providing:
- **Security isolation**: Merchant wallets are completely separate
- **Access control**: Independent user management per merchant
- **Policy scoping**: Policies apply only to their sub-organization

Learn more: [Sub-Organizations Guide](docs/03-sub-organizations.md)

### Policy Engine
Turnkey's policy engine enforces transaction restrictions at the infrastructure level:
- **USDC-only**: Only transactions to the USDC token contract are allowed
- **Treasury-only**: Transfers must go to the treasury wallet address
- **Calldata parsing**: Policy validates transaction data to ensure correct destination

Learn more: [Policies Guide](docs/04-policies.md)

### Fund Sweeping
Automated mechanism to transfer USDC from merchant wallets to treasury:
- **Threshold enforcement**: Minimum balance required before sweeping
- **Gas management**: Merchant wallet pays for transaction gas
- **Automatic execution**: Can be triggered on-demand or via automation

Learn more: [Fund Sweeping Guide](docs/05-fund-sweeping.md)

## Testing the Sweep Functionality

To test the full flow including fund sweeping:

1. **Get Testnet USDC**: Visit [Circle's USDC Faucet](https://faucet.circle.com/) and request testnet USDC
2. **Send USDC to Merchant Wallet**: Transfer some USDC to the merchant address shown in the demo output
3. **Re-run the Demo**: The sweep will automatically transfer the USDC to the treasury

Alternatively, you can use the CLI's "Sweep Funds" option after creating a merchant.

## Key Assumptions & Simplifications

1. **Policy Implementation**: The current policy implementation is simplified. In production, you would need to:
   - Parse transaction calldata to verify the transfer destination matches the treasury
   - Implement more granular policy conditions
   - Handle edge cases and additional security checks

2. **Treasury Wallet Lookup**: The demo creates a new treasury wallet if `TREASURY_WALLET_ADDRESS` is not set. In production, you'd want to:
   - Store wallet IDs in a database
   - Implement proper wallet lookup by address
   - Handle existing treasury wallets more robustly

3. **Sub-Organization Users**: The demo creates sub-orgs with minimal user setup. In production, you'd configure:
   - Proper authentication methods (API keys, passkeys, etc.)
   - User permissions and access controls
   - Multi-user quorum requirements

4. **Network Support**: Currently supports Sepolia and Goerli testnets. Mainnet support is available but requires appropriate configuration.

## References

This demo leverages patterns from:

- **[Sweeper Example](../sweeper)**: Fund transfer automation template
- **[Kitchen-Sink Example](../kitchen-sink)**: Multi-feature wallet operations including sub-org and policy creation
- **[Turnkey Documentation](https://docs.turnkey.com)**: 
  - [Sub-Organizations](https://docs.turnkey.com/concepts/sub-organizations)
  - [Policy Engine](https://docs.turnkey.com/concepts/policies/overview)
  - [Ethereum Policies](https://docs.turnkey.com/concepts/policies/examples/ethereum)

## Next Steps

For production deployment, consider:

1. **Enhanced Policy Engine**: Implement more sophisticated policy conditions that parse transaction data
2. **Automated Monitoring**: Set up webhooks or polling to detect incoming USDC deposits
3. **Batch Processing**: Implement batch sweeping for multiple merchant wallets
4. **Error Handling**: Add retry logic and comprehensive error handling
5. **Logging & Analytics**: Implement proper logging and transaction tracking
6. **Security Hardening**: Review and enhance security measures for production use

## Support

For questions or issues:
- Turnkey Documentation: [https://docs.turnkey.com](https://docs.turnkey.com)
- Turnkey Support: [support@turnkey.com](mailto:support@turnkey.com)
