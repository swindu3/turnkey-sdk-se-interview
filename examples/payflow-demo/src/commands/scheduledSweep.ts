import { sweepUSDC } from "../sweepUSDC";
import { getOrCreateTreasury } from "../treasury";
import { USDC_TOKEN_ADDRESSES, formatAddress } from "../utils";
import { listMerchants } from "../utils/merchants";
import { createSpinner, success, error, warning, printHeader, printSeparator } from "../cli/display";
import prompts from "prompts";
import chalk from "chalk";

export async function runScheduledSweep(): Promise<void> {
  printHeader("Scheduled Sweep Job");

  const network = process.env.NETWORK || "sepolia";
  const usdcTokenAddress =
    process.env.USDC_TOKEN_ADDRESS || USDC_TOKEN_ADDRESSES[network];

  if (!usdcTokenAddress) {
    error(`USDC token address not found for network: ${network}`);
    return;
  }

  console.log(chalk.blue(`Network: ${network}\n`));

  // Get sweep threshold
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

  // Prompt for interval
  const { intervalChoice } = await prompts({
    type: "select",
    name: "intervalChoice",
    message: "Select sweep interval:",
    choices: [
      { title: "10 seconds (for testing)", value: "10s" },
      { title: "1 minute", value: 1 },
      { title: "5 minutes", value: 5 },
      { title: "30 minutes", value: 30 },
      { title: "Custom (enter minutes)", value: "custom" },
    ],
  });

  if (!intervalChoice) {
    return;
  }

  let intervalMinutes: number;
  let intervalMs: number;
  let intervalDisplay: string;

  if (intervalChoice === "10s") {
    // 10 seconds for testing
    intervalMs = 10 * 1000;
    intervalMinutes = 10 / 60; // For display purposes
    intervalDisplay = "10 seconds";
  } else if (intervalChoice === "custom") {
    const { customInterval } = await prompts({
      type: "number",
      name: "customInterval",
      message: "Enter interval in minutes:",
      validate: (value) => {
        if (!value || value <= 0) {
          return "Interval must be a positive number";
        }
        if (value < 0.1) {
          return "Minimum interval is 0.1 minutes (6 seconds)";
        }
        return true;
      },
    });

    if (!customInterval) {
      return;
    }
    intervalMinutes = customInterval;
    intervalMs = intervalMinutes * 60 * 1000;
    intervalDisplay = `${intervalMinutes} minute(s)`;
  } else {
    intervalMinutes = intervalChoice;
    intervalMs = intervalMinutes * 60 * 1000;
    intervalDisplay = `${intervalMinutes} minute(s)`;
  }

  console.log();
  printSeparator();
  console.log(chalk.bold.cyan("Scheduled Sweep Job Configuration"));
  console.log(chalk.blue(`Interval: ${intervalDisplay}`));
  console.log(chalk.blue(`Network: ${network}`));
  console.log(chalk.blue(`Treasury: ${formatAddress(treasury.address)}`));
  console.log(chalk.blue(`Threshold: ${sweepThresholdUSDC} USDC`));
  printSeparator();
  console.log();

  // Confirm start
  const { confirm } = await prompts({
    type: "confirm",
    name: "confirm",
    message: "Start the scheduled sweep job? (Press Ctrl+C to stop)",
    initial: true,
  });

  if (!confirm) {
    warning("Scheduled sweep job cancelled");
    return;
  }

  console.log();
  success("Scheduled sweep job started!");
  console.log(chalk.gray("Press Ctrl+C to stop the job\n"));

  let iterationCount = 0;
  let totalSwept = 0;
  let totalSuccessful = 0;
  let totalSkipped = 0;

  // Main sweep loop
  const runSweep = async (): Promise<void> => {
    iterationCount++;
    const timestamp = new Date().toLocaleString();

    console.log(chalk.cyan(`\n${"=".repeat(70)}`));
    console.log(chalk.bold.cyan(`Sweep Iteration #${iterationCount} - ${timestamp}`));
    console.log(chalk.cyan(`${"=".repeat(70)}\n`));

    try {
      // Get all merchants
      const merchants = await listMerchants();

      if (merchants.length === 0) {
        warning("No merchants found. Waiting for next interval...");
        return;
      }

      const totalWallets = merchants.reduce((sum, m) => sum + m.wallets.length, 0);
      console.log(chalk.blue(`Checking ${totalWallets} wallet(s) across ${merchants.length} merchant(s)\n`));

      const explorerBase =
        network === "sepolia"
          ? "https://sepolia.etherscan.io"
          : network === "goerli"
            ? "https://goerli.etherscan.io"
            : "https://etherscan.io";

      let iterationSuccessful = 0;
      let iterationSwept = 0;

      for (const merchant of merchants) {
        if (merchant.wallets.length === 0) {
          continue;
        }

        for (const wallet of merchant.wallets) {
          if (wallet.address === "N/A") {
            continue;
          }

          try {
            const sweepResult = await sweepUSDC(
              wallet.address,
              merchant.subOrganizationId,
              wallet.walletId,
              treasury.address,
              usdcTokenAddress,
              network,
            );

            if (sweepResult.success) {
              console.log(chalk.green(`  ✓ ${merchant.subOrganizationName} - ${wallet.walletName}: ${sweepResult.amount} USDC`));
              if (sweepResult.transactionHash) {
                console.log(chalk.gray(`    ${explorerBase}/tx/${sweepResult.transactionHash}`));
              }
              const amount = parseFloat(sweepResult.amount);
              iterationSwept += amount;
              totalSwept += amount;
              iterationSuccessful++;
              totalSuccessful++;
            } else {
              // Only log errors, not skipped (below threshold)
              if (sweepResult.error && !sweepResult.error.includes("below threshold") && !sweepResult.error.includes("No USDC")) {
                console.log(chalk.yellow(`  ⚠ ${merchant.subOrganizationName} - ${wallet.walletName}: ${sweepResult.error}`));
              }
              totalSkipped++;
            }
          } catch (err: any) {
            console.log(chalk.red(`  ✗ ${merchant.subOrganizationName} - ${wallet.walletName}: ${err.message}`));
            totalSkipped++;
          }
        }
      }

      // Summary for this iteration
      if (iterationSuccessful > 0) {
        console.log();
        success(`Iteration #${iterationCount} Summary: ${iterationSuccessful} successful sweep(s), ${iterationSwept.toFixed(6)} USDC`);
      } else {
        console.log();
        console.log(chalk.gray(`Iteration #${iterationCount}: No funds to sweep`));
      }

      if (intervalChoice === "10s") {
        console.log(chalk.gray(`\nNext sweep in 10 seconds...`));
      } else {
        console.log(chalk.gray(`\nNext sweep in ${intervalMinutes} minute(s)...`));
      }
    } catch (err: any) {
      error(`Error in sweep iteration: ${err.message}`);
      if (intervalChoice === "10s") {
        console.log(chalk.gray(`Will retry in 10 seconds...`));
      } else {
        console.log(chalk.gray(`Will retry in ${intervalMinutes} minute(s)...`));
      }
    }
  };

  // Run first sweep immediately
  await runSweep();

  // Set up interval
  const intervalId = setInterval(async () => {
    await runSweep();
  }, intervalMs);

  // Handle graceful shutdown
  const shutdown = () => {
    clearInterval(intervalId);
    console.log();
    printSeparator();
    printHeader("Scheduled Sweep Job Summary");
    console.log(chalk.bold(`Total Iterations: ${iterationCount}`));
    console.log(chalk.green(`Successful Sweeps: ${totalSuccessful}`));
    console.log(chalk.yellow(`Skipped/Failed: ${totalSkipped}`));
    if (totalSwept > 0) {
      console.log(chalk.green(`Total USDC Swept: ${totalSwept.toFixed(6)} USDC`));
    }
    printSeparator();
    console.log();
    success("Scheduled sweep job stopped");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

