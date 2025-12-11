import { sweepUSDC } from "../sweepUSDC";
import { getOrCreateTreasury } from "../treasury";
import { USDC_TOKEN_ADDRESSES, formatAddress } from "../utils";
import { listMerchants } from "../utils/merchants";
import { createSpinner, success, error, warning, printHeader, printSeparator } from "../cli/display";
import chalk from "chalk";

export async function runSweepFunds(): Promise<void> {
  printHeader("Sweep Funds to Treasury");

  const network = process.env.NETWORK || "sepolia";
  const usdcTokenAddress =
    process.env.USDC_TOKEN_ADDRESS || USDC_TOKEN_ADDRESSES[network];

  if (!usdcTokenAddress) {
    error(`USDC token address not found for network: ${network}`);
    return;
  }

  console.log(chalk.blue(`Network: ${network}\n`));

  // Get sweep threshold from environment or use default (for display only - enforcement is at application level)
  const sweepThresholdUSDC = parseFloat(process.env.SWEEP_THRESHOLD_USDC || "0.03");
  console.log(chalk.gray(`Sweep Threshold: ${sweepThresholdUSDC} USDC (enforced at application level)\n`));

  // Get or create treasury
  const treasurySpinner = createSpinner("Setting up treasury wallet...");
  treasurySpinner.start();

  let treasury;
  try {
    treasury = await getOrCreateTreasury();
    treasurySpinner.succeed("Treasury wallet ready");
    success(`Treasury Address: ${treasury.address}\n`);
  } catch (err: any) {
    treasurySpinner.fail(`Failed to setup treasury: ${err.message}`);
    error(err.message);
    return;
  }

  // Get all merchants and their wallets
  const listSpinner = createSpinner("Fetching all merchant wallets...");
  listSpinner.start();

  let merchants;
  try {
    merchants = await listMerchants();
    listSpinner.succeed(`Found ${merchants.length} merchant(s) with wallets`);
  } catch (err: any) {
    listSpinner.fail(`Failed to list merchants: ${err.message}`);
    error(err.message);
    return;
  }

  if (merchants.length === 0) {
    warning("No merchants found. Create a merchant first using 'Create New Merchant' option.");
    return;
  }

  // Count total wallets
  const totalWallets = merchants.reduce((sum, m) => sum + m.wallets.length, 0);
  console.log(chalk.blue(`Total wallets to check: ${totalWallets}\n`));

  // Sweep from all merchant wallets
  const results: Array<{
    merchantName: string;
    walletAddress: string;
    walletName: string;
    success: boolean;
    amount?: string;
    transactionHash?: string;
    error?: string;
  }> = [];

  const explorerBase =
    network === "sepolia"
      ? "https://sepolia.etherscan.io"
      : network === "goerli"
        ? "https://goerli.etherscan.io"
        : "https://etherscan.io";

  for (const merchant of merchants) {
    if (merchant.wallets.length === 0) {
      continue;
    }

    console.log(chalk.cyan(`\n${"=".repeat(70)}`));
    console.log(chalk.bold.cyan(`Merchant: ${merchant.subOrganizationName}`));
    console.log(chalk.gray(`Sub-Org ID: ${merchant.subOrganizationId}`));
    console.log(chalk.gray(`Wallets: ${merchant.wallets.length}\n`));

    for (const wallet of merchant.wallets) {
      if (wallet.address === "N/A") {
        warning(`Skipping wallet ${wallet.walletName}: Address not available`);
        results.push({
          merchantName: merchant.subOrganizationName,
          walletAddress: wallet.address,
          walletName: wallet.walletName,
          success: false,
          error: "Address not available",
        });
        continue;
      }

      const sweepSpinner = createSpinner(
        `Sweeping from ${wallet.walletName} (${formatAddress(wallet.address)})...`
      );
      sweepSpinner.start();

      try {
        sweepSpinner.stop();

        const sweepResult = await sweepUSDC(
          wallet.address,
          merchant.subOrganizationId,
          wallet.walletId,
          treasury.address,
          usdcTokenAddress,
          network,
        );

        if (sweepResult.success) {
          sweepSpinner.succeed(`Swept ${sweepResult.amount} USDC`);
          if (sweepResult.transactionHash) {
            console.log(chalk.blue(`   Transaction: ${explorerBase}/tx/${sweepResult.transactionHash}`));
          }
          results.push({
            merchantName: merchant.subOrganizationName,
            walletAddress: wallet.address,
            walletName: wallet.walletName,
            success: true,
            amount: sweepResult.amount,
            transactionHash: sweepResult.transactionHash,
          });
        } else {
          sweepSpinner.warn(`Skipped: ${sweepResult.error}`);
          results.push({
            merchantName: merchant.subOrganizationName,
            walletAddress: wallet.address,
            walletName: wallet.walletName,
            success: false,
            error: sweepResult.error,
          });
        }
      } catch (err: any) {
        sweepSpinner.fail(`Failed: ${err.message}`);
        results.push({
          merchantName: merchant.subOrganizationName,
          walletAddress: wallet.address,
          walletName: wallet.walletName,
          success: false,
          error: err.message,
        });
      }
      console.log();
    }
  }

  // Summary
  printSeparator();
  printHeader("Sweep Summary");

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const totalSwept = successful.reduce((sum, r) => sum + parseFloat(r.amount || "0"), 0);

  console.log(chalk.bold(`Total Wallets Processed: ${results.length}`));
  console.log(chalk.green(`Successful Sweeps: ${successful.length}`));
  console.log(chalk.yellow(`Skipped/Failed: ${failed.length}`));
  if (totalSwept > 0) {
    console.log(chalk.green(`Total USDC Swept: ${totalSwept.toFixed(6)} USDC`));
  }
  console.log();

  if (successful.length > 0) {
    console.log(chalk.bold.green("Successful Sweeps:"));
    successful.forEach((r) => {
      console.log(chalk.green(`  ✓ ${r.merchantName} - ${r.walletName}`));
      console.log(chalk.gray(`    Address: ${formatAddress(r.walletAddress)}`));
      console.log(chalk.gray(`    Amount: ${r.amount} USDC`));
      if (r.transactionHash) {
        console.log(chalk.blue(`    Transaction: ${explorerBase}/tx/${r.transactionHash}`));
      }
      console.log();
    });
  }

  if (failed.length > 0) {
    console.log(chalk.bold.yellow("Skipped/Failed Sweeps:"));
    failed.forEach((r) => {
      console.log(chalk.yellow(`  ✗ ${r.merchantName} - ${r.walletName}`));
      console.log(chalk.gray(`    Address: ${formatAddress(r.walletAddress)}`));
      console.log(chalk.gray(`    Reason: ${r.error || "Unknown error"}`));
      console.log();
    });
  }

  if (failed.length > 0) {
    console.log(chalk.yellow("\nCommon reasons for skipped sweeps:"));
    console.log(chalk.gray("  - Balance below threshold"));
    console.log(chalk.gray("  - No USDC balance"));
    console.log(chalk.gray("  - Insufficient ETH for gas fees"));
    console.log(chalk.gray("  - Policy restrictions"));
  }

  printSeparator();
  success("Sweep operation completed!");
  console.log();
}

