# CLI Usage Guide

The Payflow demo includes an interactive command-line interface (CLI) that provides a user-friendly way to explore and test all features. This guide explains how to use the CLI.

## Starting the CLI

Launch the interactive CLI:

```bash
$ pnpm demo
```

You'll see the main menu:

```
Payflow Demo - Interactive CLI

What would you like to do? (Use arrow keys to navigate)
  1. Run Full Demo
  2. Create New Merchant
  3. List All Merchants
  4. Add Wallet to Merchant
  5. Delete Merchant
  6. Sweep Funds to Treasury
  7. Scheduled Sweep Job
  8. Send Funds to Merchant
  9. Check Wallet Balance
  10. Exit
```

## Menu Options

### 1. Run Full Demo

Executes the complete Payflow flow in sequence:

1. Creates or retrieves treasury wallet
2. Creates merchant sub-organization with wallet
3. Creates USDC-only policy
4. Attempts to sweep USDC to treasury

**Use Case**: Best for first-time users or testing the complete flow.

**Output**: Detailed step-by-step progress with results for each step.

### 2. Create New Merchant

Creates a new merchant sub-organization with a default wallet.

**Prompts**:
- Merchant name (default: "Payflow Merchant Demo")

**Output**:
- Sub-organization ID
- Wallet ID
- Merchant wallet address

**Use Case**: Onboard a new merchant to the system.

### 3. List All Merchants

Displays all sub-organizations (merchants) in your Turnkey organization.

**Output**: Table showing:
- Merchant name
- Sub-organization ID
- Creation date
- Associated wallets

**Use Case**: View all merchants, find specific merchant IDs.

### 4. Add Wallet to Merchant

Creates an additional wallet for an existing merchant.

**Prompts**:
- Select merchant (from list)
- Wallet name (optional)

**Output**:
- New wallet ID
- New wallet address

**Use Case**: Create additional deposit addresses for a merchant.

### 5. Delete Merchant

Removes a merchant sub-organization and its associated resources.

**Prompts**:
- Select merchant to delete
- Confirmation prompt

**Warning**: This action is irreversible. All wallets and policies in the sub-organization will be deleted.

**Use Case**: Remove a merchant from the system.

### 6. Sweep Funds to Treasury

Automatically sweeps USDC from all merchant wallets to the treasury wallet (one-time execution).

**Process**:
1. Fetches all merchants and their wallets
2. For each wallet, checks USDC balance
3. Sweeps funds if balance meets threshold
4. Displays summary of all sweeps

**Output**:
- List of all wallets processed
- Success/failure status for each wallet
- Amount swept per wallet
- Transaction hashes (if successful)
- Summary statistics

**Use Case**: 
- Batch sweep all merchant wallets at once
- One-time fund collection
- Testing sweep functionality

### 7. Scheduled Sweep Job

Runs automated fund sweeping at regular intervals (long-running process).

**Prompts**:
- Select interval (1 min, 5 min, 30 min, or custom)
- Confirm job start

**Process**:
1. Runs continuously at specified interval
2. Automatically sweeps all merchant wallets each cycle
3. Displays real-time results for each iteration
4. Tracks cumulative statistics

**Output**:
- Per-iteration sweep results
- Transaction hashes
- Cumulative statistics
- Next sweep countdown

**Use Case**: 
- Production automation
- Continuous fund collection
- Long-running sweep operations

**Note**: Press Ctrl+C to stop the job gracefully. See [Scheduled Sweep Jobs](07-scheduled-sweep.md) for detailed documentation.

### 8. Send Funds to Merchant

Sends ETH or USDC from a sender wallet to a merchant wallet. Useful for testing the sweep functionality.

**Prompts**:
- Select merchant (from list)
- Select wallet (from merchant's wallets)
- Select token type (ETH or USDC)
- Enter amount
- Choose sender: Treasury Wallet (via Turnkey API) or Private Key Wallet
  - If Treasury: Uses Turnkey API to sign (no private key needed)
  - If Private Key: Enter sender wallet private key

**Output**:
- Transaction hash
- Etherscan link
- Confirmation status

**Use Case**: 
- Fund merchant wallets for testing
- Send testnet ETH for gas fees
- Send testnet USDC to test sweeps
- Use treasury wallet to fund merchants (recommended)

**Note**: 
- **Treasury Wallet**: Uses Turnkey API to sign transactions - no private key needed, more secure
- **Private Key Wallet**: Requires entering a private key (only used to sign, not stored)
- The sender wallet must have sufficient funds (ETH and/or USDC)

### 9. Check Wallet Balance

Queries the USDC and ETH balance of a wallet.

**Prompts**:
- Wallet address

**Output**:
- USDC balance
- ETH balance
- Formatted amounts

**Use Case**: 
- Verify deposits
- Check if sweep threshold is met
- Monitor wallet balances

### 10. Exit

Exits the CLI application.

## Navigation

### Using the Menu

The menu supports navigation using arrow keys:

- **Arrow Keys**: Use ↑ (up) and ↓ (down) to navigate through options
- **Enter**: Confirm your selection
- **Ctrl+C**: Exit at any time

**Example**: Use the arrow keys to navigate to "Run Full Demo" and press Enter to select it.

### After Command Completion

After each command completes, you'll be prompted:

```
Continue?
```

- **Yes**: Return to main menu
- **No**: Exit CLI

## Common Workflows

### First-Time Setup

1. Run "1. Run Full Demo" to see everything in action
2. Review the output to understand the flow
3. Note the merchant address for testing

### Testing Sweep Functionality

1. Run "2. Create New Merchant" (or use existing)
2. Get testnet USDC from [Circle Faucet](https://faucet.circle.com/)
3. Send USDC to merchant wallet address
4. Send ETH to merchant wallet for gas fees
5. Run "6. Sweep Funds to Treasury"
6. Verify transaction on Etherscan

### Managing Multiple Merchants

1. Run "2. Create New Merchant" for each merchant
2. Use "3. List All Merchants" to view all merchants
3. Use "4. Add Wallet to Merchant" to create additional wallets
4. Use "6. Sweep Funds to Treasury" to sweep from specific merchants

### Troubleshooting

1. Use "7. Check Wallet Balance" to verify deposits
2. Check ETH balance (needed for gas)
3. Verify USDC balance meets threshold
4. Re-run sweep if needed

## Input Validation

The CLI validates inputs to prevent errors:

### Address Validation

When prompted for an Ethereum address:
- Must be valid Ethereum address format
- Automatically checksummed
- Rejects invalid addresses with error message

### Name Validation

When prompted for names:
- Cannot be empty
- Trims whitespace
- Provides sensible defaults

### Selection Validation

When selecting from lists:
- Must select a valid option
- Cannot proceed without selection

## Error Handling

The CLI handles errors gracefully:

### Missing Environment Variables

If required environment variables are missing, the CLI exits with a clear error message listing what's needed.

### API Errors

If Turnkey API calls fail:
- Error message is displayed
- You're prompted to continue
- No partial state is left

### Network Errors

If Ethereum network calls fail:
- Error is displayed
- Transaction is not sent
- You can retry

### Transaction Failures

If a transaction fails:
- Error details are shown
- Transaction hash (if available) is displayed
- You can investigate on Etherscan

## Output Formatting

The CLI uses color coding and formatting for clarity:

- **Success messages**: Green
- **Error messages**: Red
- **Warning messages**: Yellow
- **Info messages**: Blue
- **Separators**: Visual dividers between sections

### Example Output

```
============================================================
STEP 1: Setting up Treasury Wallet
============================================================
Treasury wallet ready
Treasury Address: 0x1234...5678
   Wallet ID: wallet_abc123...
```

## Advanced Usage

### Environment Variables

The CLI reads from `.env.local`. You can override specific values:

```bash
NETWORK=goerli pnpm demo
```

### Scripting

While the CLI is interactive, you can use it in scripts by piping input:

```bash
echo "1" | pnpm demo  # Run full demo (non-interactive)
```

Note: This is limited and not recommended for production use.

## Tips and Best Practices

### 1. Keep Track of Merchant IDs

After creating merchants, note their sub-organization IDs. You'll need them for:
- Programmatic access
- Database storage
- Future operations

### 2. Test with Small Amounts

When testing sweeps:
- Start with small USDC amounts
- Verify the flow works
- Then scale up

### 3. Monitor Gas Costs

Keep an eye on:
- ETH balance in merchant wallets
- Gas prices on the network
- Transaction costs

### 4. Use List Command Regularly

Run "3. List All Merchants" to:
- Verify merchants were created
- Find merchant IDs
- Check system state

### 5. Clean Up Test Data

Use "5. Delete Merchant" to:
- Remove test merchants
- Clean up sub-organizations
- Free up resources

## Troubleshooting Common Issues

### CLI Won't Start

**Problem**: CLI exits immediately or shows error.

**Solutions**:
- Check environment variables are set
- Verify `.env.local` exists
- Check Node.js version (v18+)
- Ensure dependencies are installed

### Commands Fail Silently

**Problem**: Command runs but nothing happens.

**Solutions**:
- Check network connectivity
- Verify API credentials
- Check Turnkey API status
- Review error messages carefully

### Can't Find Merchants

**Problem**: "List All Merchants" shows empty.

**Solutions**:
- Verify you're using correct organization ID
- Check that merchants were created in this org
- Ensure API keys have proper permissions

### Sweep Always Fails

**Problem**: Sweeps consistently fail.

**Solutions**:
- Check merchant wallet has ETH for gas
- Verify USDC balance meets threshold
- Check policy is correctly configured
- Verify treasury address is correct

## Next Steps

- Review the [Quick Start Guide](01-quickstart.md) for setup
- Understand the [Turnkey Hierarchy](02-turnkey-hierarchy.md)
- Learn about [Sub-Organizations](03-sub-organizations.md)
- Explore [Policies](04-policies.md)
- Read about [Fund Sweeping](05-fund-sweeping.md)

