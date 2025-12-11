import { ethers } from "ethers";
import { getProvider, getTurnkeyClient, getTurnkeySigner } from "../provider";
import { getOrCreateTreasury } from "../treasury";
import { USDC_TOKEN_ADDRESSES, ERC20_ABI, USDC_DECIMALS, formatAddress, toReadableAmount, fromReadableAmount } from "../utils";
import { listMerchants } from "../utils/merchants";
import { createSpinner, success, error, warning, printHeader, printSeparator } from "../cli/display";
import { promptSubOrgIdWithSelection } from "../cli/menu";
import prompts from "prompts";
import chalk from "chalk";

export async function runSendFunds(): Promise<void> {
  printHeader("Send Funds to Merchant Wallet");

  const network = process.env.NETWORK || "sepolia";
  const usdcTokenAddress =
    process.env.USDC_TOKEN_ADDRESS || USDC_TOKEN_ADDRESSES[network];

  if (!usdcTokenAddress) {
    error(`USDC token address not found for network: ${network}`);
    return;
  }

  console.log(chalk.blue(`Network: ${network}\n`));

  // Get treasury wallet and show balance upfront
  const treasurySpinner = createSpinner("Loading treasury wallet...");
  treasurySpinner.start();

  let treasury;
  try {
    treasury = await getOrCreateTreasury();
    treasurySpinner.succeed("Treasury wallet loaded");
  } catch (err: any) {
    treasurySpinner.fail(`Failed to load treasury: ${err.message}`);
    error(err.message);
    return;
  }

  // Display treasury balance
  const provider = getProvider(network);
  const treasuryBalanceSpinner = createSpinner("Checking treasury balance...");
  treasuryBalanceSpinner.start();

  try {
    const ethBalance = await provider.getBalance(treasury.address);
    const ethBalanceReadable = ethers.formatEther(ethBalance);
    
    const usdcContract = new ethers.Contract(usdcTokenAddress, ERC20_ABI, provider);
    const usdcBalance = await usdcContract.balanceOf(treasury.address);
    const usdcBalanceReadable = toReadableAmount(usdcBalance, USDC_DECIMALS);
    
    treasuryBalanceSpinner.succeed("Treasury balance retrieved");
    
    console.log();
    printHeader("Treasury Wallet Balance");
    console.log(chalk.blue(`Treasury Address: ${formatAddress(treasury.address)}`));
    console.log(chalk.green(`ETH Balance: ${ethBalanceReadable} ETH`));
    console.log(chalk.green(`USDC Balance: ${usdcBalanceReadable} USDC`));
    console.log();
  } catch (err: any) {
    treasuryBalanceSpinner.warn(`Could not check treasury balance: ${err.message}`);
    console.log();
  }

  // Get all merchants
  const listSpinner = createSpinner("Fetching merchants...");
  listSpinner.start();

  let merchants;
  try {
    merchants = await listMerchants();
    listSpinner.succeed(`Found ${merchants.length} merchant(s)`);
  } catch (err: any) {
    listSpinner.fail(`Failed to list merchants: ${err.message}`);
    error(err.message);
    return;
  }

  if (merchants.length === 0) {
    warning("No merchants found. Create a merchant first using 'Create New Merchant' option.");
    return;
  }

  // Select merchant
  const selectedSubOrgId = await promptSubOrgIdWithSelection(merchants);
  if (!selectedSubOrgId) {
    return;
  }

  const selectedMerchant = merchants.find((m) => m.subOrganizationId === selectedSubOrgId);
  if (!selectedMerchant) {
    error("Merchant not found");
    return;
  }

  if (selectedMerchant.wallets.length === 0) {
    warning("This merchant has no wallets.");
    return;
  }

  // Get treasury balance for display when selecting wallet (provider already created above)
  let treasuryEthBalance: bigint;
  let treasuryUsdcBalance: bigint;
  try {
    treasuryEthBalance = await provider.getBalance(treasury.address);
    const usdcContract = new ethers.Contract(usdcTokenAddress, ERC20_ABI, provider);
    treasuryUsdcBalance = await usdcContract.balanceOf(treasury.address);
  } catch (err: any) {
    treasuryEthBalance = 0n;
    treasuryUsdcBalance = 0n;
  }

  const ethBalanceReadable = ethers.formatEther(treasuryEthBalance);
  const usdcBalanceReadable = toReadableAmount(treasuryUsdcBalance, USDC_DECIMALS);

  // Select wallet
  const { walletIndex } = await prompts({
    type: "select",
    name: "walletIndex",
    message: `Select a wallet to send funds to (Treasury: ${ethBalanceReadable} ETH, ${usdcBalanceReadable} USDC):`,
    choices: selectedMerchant.wallets.map((wallet, idx) => ({
      title: `${wallet.walletName} (${formatAddress(wallet.address)})`,
      value: idx,
    })),
  });

  if (walletIndex === undefined) {
    return;
  }

  const selectedWallet = selectedMerchant.wallets[walletIndex];
  if (selectedWallet.address === "N/A") {
    error("Selected wallet address is not available");
    return;
  }

  // Select token type (show treasury balance for context - already fetched above)
  const { tokenType } = await prompts({
    type: "select",
    name: "tokenType",
    message: `What would you like to send? (Treasury: ${ethBalanceReadable} ETH, ${usdcBalanceReadable} USDC)`,
    choices: [
      { title: `ETH (for gas fees) - Treasury has ${ethBalanceReadable} ETH`, value: "ETH" },
      { title: `USDC - Treasury has ${usdcBalanceReadable} USDC`, value: "USDC" },
    ],
  });

  if (!tokenType) {
    return;
  }

  // Get amount
  const { amount } = await prompts({
    type: "text",
    name: "amount",
    message: `Enter amount to send (${tokenType === "ETH" ? "in ETH" : "in USDC"}):`,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "Amount cannot be empty";
      }
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) {
        return "Amount must be a positive number";
      }
      return true;
    },
  });

  if (!amount) {
    return;
  }

  const amountNum = parseFloat(amount);

  // Choose sender: Treasury wallet or private key
  const { senderType } = await prompts({
    type: "select",
    name: "senderType",
    message: "Send from:",
    choices: [
      { title: "Treasury Wallet (via Turnkey API)", value: "treasury" },
      { title: "Private Key Wallet", value: "private-key" },
    ],
  });

  if (!senderType) {
    return;
  }

  // Provider already set up above
  let senderWallet: ethers.Signer;
  let senderAddress: string;

  if (senderType === "treasury") {
    // Use treasury wallet via Turnkey (already loaded above)
    if (!treasury.walletId) {
      error("Treasury wallet is not managed by Turnkey. Cannot use Turnkey API to sign.");
      return;
    }

    senderAddress = treasury.address;
    console.log(chalk.blue(`\nUsing Treasury Wallet: ${formatAddress(senderAddress)}`));

    try {
      // Get wallet details to find the correct signing identifier
      const turnkeyClient = getTurnkeyClient();
      const organizationId = process.env.ORGANIZATION_ID!;

      const wallet = await turnkeyClient.apiClient().getWallet({
        organizationId,
        walletId: treasury.walletId,
      });

      let signWith = senderAddress;
      const walletData = wallet.wallet as any;
      if (walletData?.accounts && Array.isArray(walletData.accounts) && walletData.accounts.length > 0) {
        const ethAccount = walletData.accounts.find(
          (acc: any) => acc.addressFormat === "ADDRESS_FORMAT_ETHEREUM"
        );
        if (ethAccount?.privateKeyId) {
          signWith = ethAccount.privateKeyId;
        } else if (ethAccount?.address) {
          signWith = ethAccount.address;
        }
      } else if (walletData?.addresses && Array.isArray(walletData.addresses) && walletData.addresses.length > 0) {
        signWith = walletData.addresses[0];
      }

      // Create Turnkey signer
      senderWallet = getTurnkeySigner(provider, organizationId, signWith, turnkeyClient);
    } catch (err: any) {
      error(`Failed to setup treasury signer: ${err.message}`);
      return;
    }
  } else {
    // Use private key wallet
    const { senderPrivateKey } = await prompts({
      type: "password",
      name: "senderPrivateKey",
      message: "Enter sender wallet private key (this wallet must have funds):",
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return "Private key cannot be empty";
        }
        // Basic validation - should start with 0x and be 66 chars, or be 64 chars without 0x
        const cleaned = value.trim().startsWith("0x") ? value.trim() : `0x${value.trim()}`;
        if (cleaned.length !== 66) {
          return "Invalid private key format";
        }
        return true;
      },
    });

    if (!senderPrivateKey) {
      return;
    }

    // Normalize private key
    const normalizedKey = senderPrivateKey.trim().startsWith("0x")
      ? senderPrivateKey.trim()
      : `0x${senderPrivateKey.trim()}`;

    try {
      senderWallet = new ethers.Wallet(normalizedKey, provider);
      senderAddress = senderWallet.address;
      console.log(chalk.blue(`\nSender Address: ${formatAddress(senderAddress)}`));
    } catch (err: any) {
      error(`Invalid private key: ${err.message}`);
      return;
    }
  }

  const balanceSpinner = createSpinner("Checking sender balance...");
  balanceSpinner.start();

  try {
    const ethBalance = await provider.getBalance(senderAddress);
    const ethBalanceReadable = ethers.formatEther(ethBalance);
    balanceSpinner.succeed(`ETH Balance: ${ethBalanceReadable} ETH`);

    if (tokenType === "ETH") {
      const requiredAmount = ethers.parseEther(amount);
      if (ethBalance < requiredAmount) {
        error(`Insufficient ETH balance. Required: ${amount} ETH, Available: ${ethBalanceReadable} ETH`);
        return;
      }
    } else {
      // For USDC, check USDC balance
      const usdcContract = new ethers.Contract(usdcTokenAddress, ERC20_ABI, provider);
      const usdcBalance = await usdcContract.balanceOf(senderAddress);
      const usdcBalanceReadable = toReadableAmount(usdcBalance, USDC_DECIMALS);
      console.log(chalk.blue(`USDC Balance: ${usdcBalanceReadable} USDC`));

      const requiredAmount = fromReadableAmount(amount, USDC_DECIMALS);
      if (usdcBalance < requiredAmount) {
        error(`Insufficient USDC balance. Required: ${amount} USDC, Available: ${usdcBalanceReadable} USDC`);
        return;
      }

      // Also need ETH for gas (rough estimate: 0.001 ETH should be enough for most ERC20 transfers)
      const minGasRequired = ethers.parseEther("0.001");
      if (ethBalance < minGasRequired) {
        error(`Insufficient ETH for gas fees. Need at least ~0.001 ETH for gas, available: ${ethers.formatEther(ethBalance)} ETH`);
        return;
      }
    }
  } catch (err: any) {
    balanceSpinner.fail(`Failed to check balance: ${err.message}`);
    error(err.message);
    return;
  }

  // Confirm transaction
  console.log();
  const { confirm } = await prompts({
    type: "confirm",
    name: "confirm",
    message: `Send ${amount} ${tokenType} to ${selectedWallet.walletName} (${formatAddress(selectedWallet.address)})?`,
    initial: false,
  });

  if (!confirm) {
    warning("Transaction cancelled");
    return;
  }

  // Send transaction
  const sendSpinner = createSpinner(`Sending ${amount} ${tokenType}...`);
  sendSpinner.start();

  try {
    let txHash: string;

    if (tokenType === "ETH") {
      const tx = await senderWallet.sendTransaction({
        to: selectedWallet.address,
        value: ethers.parseEther(amount),
      });
      txHash = tx.hash;
      sendSpinner.succeed(`Transaction sent: ${txHash}`);
    } else {
      // USDC transfer
      const usdcContract = new ethers.Contract(usdcTokenAddress, ERC20_ABI, senderWallet);
      const amountRaw = fromReadableAmount(amount, USDC_DECIMALS);
      const tx = await usdcContract.transfer(selectedWallet.address, amountRaw);
      txHash = tx.hash;
      sendSpinner.succeed(`Transaction sent: ${txHash}`);
    }

    console.log();
    success(`Transaction Hash: ${txHash}`);

    const explorerBase =
      network === "sepolia"
        ? "https://sepolia.etherscan.io"
        : network === "goerli"
          ? "https://goerli.etherscan.io"
          : "https://etherscan.io";
    console.log(chalk.blue(`View on Etherscan: ${explorerBase}/tx/${txHash}`));

    // Wait for confirmation
    const confirmSpinner = createSpinner("Waiting for confirmation...");
    confirmSpinner.start();

    try {
      const receipt = await provider.waitForTransaction(txHash, 1);
      confirmSpinner.succeed("Transaction confirmed!");

      if (receipt.status === 1) {
        success(`Successfully sent ${amount} ${tokenType} to ${formatAddress(selectedWallet.address)}`);
      } else {
        error("Transaction failed");
      }
    } catch (err: any) {
      confirmSpinner.warn(`Could not wait for confirmation: ${err.message}`);
      console.log(chalk.gray("Transaction was sent but confirmation check failed. Check Etherscan for status."));
    }
  } catch (err: any) {
    sendSpinner.fail(`Failed to send transaction: ${err.message}`);
    error(err.message);
    return;
  }

  printSeparator();
  console.log();
}

