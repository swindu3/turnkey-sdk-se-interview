import prompts from "prompts";
import { ethers } from "ethers";

export type MenuAction =
  | "full-demo"
  | "create-merchant"
  | "list-merchants"
  | "add-merchant-wallet"
  | "delete-merchant"
  | "sweep-funds"
  | "scheduled-sweep"
  | "send-funds"
  | "check-balance"
  | "view-policies"
  | "exit";

const MENU_CHOICES = [
  { title: "1. Run Full Demo", value: "full-demo" },
  { title: "2. Create New Merchant", value: "create-merchant" },
  { title: "3. List All Merchants", value: "list-merchants" },
  { title: "4. Add Wallet to Merchant", value: "add-merchant-wallet" },
  { title: "5. Delete Merchant", value: "delete-merchant" },
  { title: "6. Sweep Funds to Treasury", value: "sweep-funds" },
  { title: "7. Scheduled Sweep Job", value: "scheduled-sweep" },
  { title: "8. Send Funds to Merchant", value: "send-funds" },
  { title: "9. Check Wallet Balance", value: "check-balance" },
  { title: "10. View Policy Configs", value: "view-policies" },
  { title: "11. Exit", value: "exit" },
];

/**
 * Shows the main menu and returns the selected action
 * Menu items are selectable using arrow keys
 */
export async function showMainMenu(): Promise<MenuAction | null> {
  const { action } = await prompts({
    type: "select",
    name: "action",
    message: "What would you like to do? (Use arrow keys to navigate)",
    choices: MENU_CHOICES,
    onState: (state) => {
      if (state.aborted) {
        process.stdout.write('\n');
        process.exit(1);
      }
    },
  });

  return action || null;
}

/**
 * Confirms if a step should be executed
 */
export async function confirmStep(stepName: string): Promise<boolean> {
  const { proceed } = await prompts({
    type: "confirm",
    name: "proceed",
    message: `Run: ${stepName}?`,
    initial: true,
  });

  return proceed ?? false;
}

/**
 * Prompts for merchant name
 */
export async function promptMerchantName(): Promise<string> {
  const { name } = await prompts({
    type: "text",
    name: "name",
    message: "Merchant name:",
    initial: "Payflow Merchant Demo",
    validate: (value) => (value.trim().length > 0 ? true : "Name cannot be empty"),
  });

  return name?.trim() || "Payflow Merchant Demo";
}

/**
 * Prompts for an Ethereum address with validation
 */
export async function promptAddress(label: string): Promise<string> {
  const { address } = await prompts({
    type: "text",
    name: "address",
    message: `${label}:`,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "Address cannot be empty";
      }
      if (!ethers.isAddress(value)) {
        return "Invalid Ethereum address";
      }
      return true;
    },
  });

  return address?.trim() || "";
}

/**
 * Prompts for sub-organization ID
 */
export async function promptSubOrgId(): Promise<string> {
  const { subOrgId } = await prompts({
    type: "text",
    name: "subOrgId",
    message: "Sub-Organization ID:",
    validate: (value) => (value.trim().length > 0 ? true : "Sub-Organization ID cannot be empty"),
  });

  return subOrgId?.trim() || "";
}

/**
 * Prompts for sub-organization ID with merchant selection
 */
export async function promptSubOrgIdWithSelection(merchants: Array<{ subOrganizationId: string; subOrganizationName: string }>): Promise<string> {
  const { selection } = await prompts({
    type: "select",
    name: "selection",
    message: "Select a merchant:",
    choices: merchants.map((m, idx) => ({
      title: `${idx + 1}. ${m.subOrganizationName} (${m.subOrganizationId.slice(0, 12)}...)`,
      value: m.subOrganizationId,
    })),
  });

  return selection || "";
}

/**
 * Prompts for wallet ID
 */
export async function promptWalletId(): Promise<string> {
  const { walletId } = await prompts({
    type: "text",
    name: "walletId",
    message: "Wallet ID:",
    validate: (value) => (value.trim().length > 0 ? true : "Wallet ID cannot be empty"),
  });

  return walletId?.trim() || "";
}

/**
 * Prompts for wallet name
 */
export async function promptWalletName(): Promise<string> {
  const { name } = await prompts({
    type: "text",
    name: "name",
    message: "Wallet name:",
    initial: `Wallet ${Date.now()}`,
    validate: (value) => (value.trim().length > 0 ? true : "Name cannot be empty"),
  });

  return name?.trim() || `Wallet ${Date.now()}`;
}

/**
 * Prompts to continue after a command completes
 */
export async function promptContinue(): Promise<boolean> {
  const { continue: shouldContinue } = await prompts({
    type: "confirm",
    name: "continue",
    message: "\nContinue?",
    initial: true,
  });

  return shouldContinue ?? false;
}

