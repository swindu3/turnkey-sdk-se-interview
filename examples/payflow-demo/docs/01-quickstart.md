# Quick Start Guide

Get the Payflow demo up and running in minutes.

## Prerequisites

Before you begin, ensure you have:

- **Node.js v18+** installed ([Download](https://nodejs.org/))
- **pnpm** package manager (comes with Node.js via `corepack`)
- **Turnkey Account** with API credentials
- **Infura API Key** for Ethereum RPC access ([Get one here](https://www.infura.io/))

## Step 1: Clone and Install

```bash
# If you haven't already cloned the SDK
$ git clone https://github.com/tkhq/sdk
$ cd sdk/

# Install dependencies
$ corepack enable
$ pnpm install -r

# Build all workspace packages (REQUIRED)
# This step is essential - it builds @turnkey/sdk-server and other workspace
# dependencies that the demo needs. Without this, you'll get module resolution errors.
$ pnpm run build-all

# Navigate to the demo
$ cd examples/payflow-demo/
```

> **Note**: The `pnpm run build-all` command compiles all TypeScript packages in the workspace, including `@turnkey/sdk-server`, `@turnkey/ethers`, and `@turnkey/api-key-stamper`. These packages are workspace dependencies that must be built before the demo can run. This step may take a few minutes on first run.

## Step 2: Get Turnkey Credentials

1. Sign up at [https://app.turnkey.com](https://app.turnkey.com)
2. Create an organization (or use an existing one)
3. Navigate to **Settings** → **API Keys**
4. Generate a new API key pair
5. Copy your credentials:
   - `API_PUBLIC_KEY`
   - `API_PRIVATE_KEY`
   - `ORGANIZATION_ID` (found in your organization settings)

## Step 3: Get Infura API Key

1. Sign up at [https://www.infura.io/](https://www.infura.io/)
2. Create a new project
3. Copy your **API Key** from the project dashboard

## Step 4: Configure Environment Variables

Create a `.env.local` file in the `payflow-demo` directory:

```bash
# Turnkey API Credentials (required)
API_PUBLIC_KEY=your_api_public_key_here
API_PRIVATE_KEY=your_api_private_key_here
ORGANIZATION_ID=your_organization_id_here
BASE_URL=https://api.turnkey.com

# Infura API key (REQUIRED)
INFURA_KEY=your_infura_api_key_here

# Network configuration
NETWORK=sepolia  # or "goerli" for Goerli testnet

# USDC token address (optional - defaults based on network)
USDC_TOKEN_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

# Treasury wallet (optional - will create new if not set)
TREASURY_WALLET_ADDRESS=
TREASURY_WALLET_ID=

# Sweep threshold (optional - default: 0.03 USDC)
# Minimum USDC amount required in merchant wallets before a sweep is allowed
SWEEP_THRESHOLD_USDC=0.03
```

### Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `API_PUBLIC_KEY` | Yes | Your Turnkey API public key |
| `API_PRIVATE_KEY` | Yes | Your Turnkey API private key |
| `ORGANIZATION_ID` | Yes | Your Turnkey organization ID |
| `INFURA_KEY` | Yes | Your Infura API key for Ethereum RPC |
| `BASE_URL` | No | Turnkey API base URL (default: `https://api.turnkey.com`) |
| `NETWORK` | No | Ethereum network (`sepolia`, `goerli`, or `mainnet`) |
| `USDC_TOKEN_ADDRESS` | No | USDC token contract address (auto-detected by network) |
| `TREASURY_WALLET_ADDRESS` | No | Existing treasury wallet address (creates new if not set) |
| `TREASURY_WALLET_ID` | No | Existing treasury wallet ID (faster lookup) |
| `SWEEP_THRESHOLD_USDC` | No | Minimum USDC balance to trigger sweep (default: 0.03) |

## Step 5: Run the Demo

Start the interactive CLI:

```bash
$ pnpm demo
```

You'll see a menu with the following options:

```
Payflow Demo - Interactive CLI

What would you like to do?
  1. Run Full Demo
  2. Create New Merchant
  3. List All Merchants
  4. Add Wallet to Merchant
  5. Delete Merchant
  6. Sweep Funds to Treasury
  7. Check Wallet Balance
  8. Exit
```

### Option 1: Run Full Demo

Select **"1. Run Full Demo"** to execute the complete flow:

1. Creates or retrieves a treasury wallet
2. Creates a merchant sub-organization with a deposit wallet
3. Creates a restrictive policy (USDC-only → treasury)
4. Attempts to sweep any USDC balance from merchant to treasury

### Option 2: Individual Commands

Use the other menu options to perform specific actions:

- **Create New Merchant**: Set up a new merchant sub-organization
- **List All Merchants**: View all existing merchants
- **Add Wallet to Merchant**: Create additional wallets for a merchant
- **Sweep Funds**: Manually trigger a fund sweep
- **Check Balance**: Query wallet balances

## Expected Output

When running the full demo, you should see:

```
Payflow Full Demo

Network: sepolia
USDC Token: 0x1c7D...

============================================================
STEP 1: Setting up Treasury Wallet
============================================================
Treasury wallet ready
Treasury Address: 0x1234...5678
   Wallet ID: wallet_abc123...

============================================================
STEP 2: Creating Merchant Sub-Organization & Wallet
============================================================
Merchant created successfully
Sub-Organization ID: org_def456...
Wallet ID: wallet_ghi789...
Merchant Address: 0xabcd...ef01

============================================================
STEP 3: Creating Restricted Policy
============================================================
Policy created successfully
Policy Name: USDC-Only Policy for 0xabcd...ef01
Policy ID: policy_xyz789...
   Restriction: USDC transfers only → 0x1234...5678
   Threshold: Minimum 0.03 USDC (enforced at application level)

============================================================
STEP 4: Sweeping USDC to Treasury
============================================================
Merchant wallet 0xabcd...ef01 has 0 USDC
Sweep skipped: No USDC balance to sweep
   Note: To test the sweep, send some USDC to 0xabcd...ef01
   You can get testnet USDC from: https://faucet.circle.com/

============================================================
Demo Summary
============================================================
Treasury Wallet:     0x1234...5678
Merchant Sub-Org:     org_def456...
Merchant Wallet:      0xabcd...ef01
Merchant Wallet ID:   wallet_ghi789...
Policy ID:            policy_xyz789...
Policy Restriction:   USDC-only → 0x1234...5678
============================================================

Demo completed successfully!
```

## Testing the Sweep Functionality

To test the complete flow including fund sweeping:

1. **Get Testnet USDC**:
   - Visit [Circle's USDC Faucet](https://faucet.circle.com/)
   - Request testnet USDC for Sepolia or Goerli

2. **Send USDC to Merchant Wallet**:
   - Use the merchant address from the demo output
   - Send at least `SWEEP_THRESHOLD_USDC` (default: 0.03 USDC)

3. **Run Sweep**:
   - Use menu option **"6. Sweep Funds to Treasury"**
   - Or re-run the full demo

4. **Verify**:
   - Check the transaction on [Sepolia Etherscan](https://sepolia.etherscan.io) or [Goerli Etherscan](https://goerli.etherscan.io)
   - Verify USDC was transferred to the treasury wallet

## Troubleshooting

### Module Not Found Error

If you see an error like:

```
Error: Cannot find module '@turnkey/sdk-server/dist/index.js'
```

**Solution**: You need to build the workspace packages first. From the repository root, run:
```bash
$ pnpm run build-all
```

This builds all workspace dependencies including `@turnkey/sdk-server`. After building, try running the demo again.

### Missing Environment Variables

If you see an error about missing environment variables:

```
Missing required environment variables:
   - API_PUBLIC_KEY
   - INFURA_KEY
```

**Solution**: Ensure your `.env.local` file exists and contains all required variables.

### Invalid API Credentials

If you see authentication errors:

```
Error: Invalid API credentials
```

**Solution**: 
- Verify your API keys are correct
- Ensure you copied the full key (they're long strings)
- Check that your organization ID matches the one associated with your API keys

### Insufficient ETH for Gas

If sweeping fails with:

```
Error: Insufficient ETH for gas fees
```

**Solution**: 
- The merchant wallet needs ETH to pay for transaction gas
- Send some testnet ETH to the merchant wallet address
- You can get testnet ETH from [Sepolia Faucet](https://sepoliafaucet.com/) or [Goerli Faucet](https://goerlifaucet.com/)

### Network Connection Issues

If you see RPC errors:

```
Error: Failed to connect to Ethereum network
```

**Solution**:
- Verify your `INFURA_KEY` is correct
- Check your network configuration (`NETWORK` env var)
- Ensure you have internet connectivity

## Next Steps

Now that you're up and running:

- Learn about the [Turnkey Hierarchy](02-turnkey-hierarchy.md)
- Understand [Sub-Organizations](03-sub-organizations.md)
- Explore [Policies](04-policies.md)
- Read about [Fund Sweeping](05-fund-sweeping.md)
- Master the [CLI Interface](06-cli-usage.md)

