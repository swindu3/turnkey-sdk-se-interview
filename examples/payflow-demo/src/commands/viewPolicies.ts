import { listMerchants, getMerchantDetails } from "../utils/merchants";
import { printHeader, createSpinner, warning, info } from "../cli/display";
import { promptSubOrgIdWithSelection } from "../cli/menu";
import { formatAddress } from "../utils";
import chalk from "chalk";
import prompts from "prompts";

/**
 * Formats a policy condition string for better readability
 */
function formatCondition(condition: string): string[] {
  if (!condition) return [];
  
  // Split by && to get individual conditions
  const parts = condition.split(" && ").map(part => part.trim());
  const formatted: string[] = [];
  
  parts.forEach((part, idx) => {
    // Parse different types of conditions
    if (part.includes("eth.tx.to ==")) {
      // Extract address
      const match = part.match(/eth\.tx\.to == '([^']+)'/);
      if (match) {
        const address = match[1];
        formatted.push(`   ${idx + 1}. Transaction Destination:`);
        formatted.push(`      eth.tx.to == '${address}'`);
        formatted.push(`      → Must be to USDC token contract (${formatAddress(address)})`);
      } else {
        formatted.push(`   ${idx + 1}. ${part}`);
      }
    } else if (part.includes("eth.tx.data[2..10] ==")) {
      // Function selector check
      const match = part.match(/eth\.tx\.data\[2\.\.10\] == '([^']+)'/);
      if (match) {
        const selector = match[1];
        formatted.push(`   ${idx + 1}. Function Selector:`);
        formatted.push(`      eth.tx.data[2..10] == '${selector}'`);
        formatted.push(`      → ERC-20 transfer() function (0x${selector})`);
      } else {
        formatted.push(`   ${idx + 1}. ${part}`);
      }
    } else if (part.includes("eth.tx.data[10..74] ==")) {
      // Treasury address in calldata
      const match = part.match(/eth\.tx\.data\[10\.\.74\] == '([^']+)'/);
      if (match) {
        const paddedAddress = match[1];
        // Extract the actual address (last 40 chars after padding)
        const actualAddress = "0x" + paddedAddress.slice(-40);
        formatted.push(`   ${idx + 1}. Transfer Destination:`);
        formatted.push(`      eth.tx.data[10..74] == '${paddedAddress}'`);
        formatted.push(`      → Treasury address: ${formatAddress(actualAddress)}`);
      } else {
        formatted.push(`   ${idx + 1}. ${part}`);
      }
    } else {
      // Generic condition
      formatted.push(`   ${idx + 1}. ${part}`);
    }
  });
  
  return formatted;
}

/**
 * Displays detailed policy information for all merchants or a specific merchant
 */
export async function runViewPolicies(): Promise<void> {
  printHeader("View Policy Configurations");

  // Ask user if they want to view all policies or for a specific merchant
  const { viewMode } = await prompts({
    type: "select",
    name: "viewMode",
    message: "What would you like to view?",
    choices: [
      { title: "All Policies (across all merchants)", value: "all" },
      { title: "Policies for a Specific Merchant", value: "specific" },
    ],
  });

  if (!viewMode) {
    return;
  }

  const spinner = createSpinner("Fetching policy information...");
  spinner.start();

  try {
    if (viewMode === "all") {
      await viewAllPolicies(spinner);
    } else {
      await viewSpecificMerchantPolicies(spinner);
    }
  } catch (err: any) {
    spinner.fail(`Failed to fetch policies: ${err.message}`);
    throw err;
  }
}

/**
 * View all policies across all merchants
 */
async function viewAllPolicies(spinner: any): Promise<void> {
  const merchants = await listMerchants();
  spinner.succeed(`Found ${merchants.length} merchant(s)`);

  const totalPolicies = merchants.reduce((sum, m) => sum + m.policies.length, 0);
  
  if (totalPolicies === 0) {
    console.log();
    warning("No policies found across any merchants.");
    console.log(chalk.gray("   Policies are created when you create a new merchant."));
    console.log(chalk.gray("   Policy creation code is located in: src/createPolicy.ts"));
    console.log();
    return;
  }

  console.log();
  info(`Total Policies Found: ${totalPolicies}`);
  console.log();

  // Policy source file path (relative to project root)
  const policySourceFile = "src/createPolicy.ts";

  merchants.forEach((merchant, merchantIdx) => {
    if (merchant.policies.length === 0) {
      return; // Skip merchants without policies
    }

    console.log(chalk.cyan(`\n${"=".repeat(70)}`));
    console.log(chalk.bold.cyan(`Merchant: ${merchant.subOrganizationName}`));
    console.log(chalk.gray(`   Sub-Organization ID: ${merchant.subOrganizationId}`));
    console.log(chalk.gray(`   Policies: ${merchant.policies.length}`));
    console.log();

    merchant.policies.forEach((policy, policyIdx) => {
      console.log(chalk.bold.white(`\nPolicy #${policyIdx + 1}: ${policy.policyName}`));
      console.log(chalk.gray(`   Policy ID: ${policy.policyId}`));
      console.log(chalk.gray(`   Effect: ${policy.effect}`));
      
      if (policy.condition) {
        console.log(chalk.blue(`\n   Condition:`));
        const formattedCondition = formatCondition(policy.condition);
        if (formattedCondition.length > 0) {
          formattedCondition.forEach((line, lineIdx) => {
            // Use different colors for labels vs values
            if (line.includes("→") || line.includes(":")) {
              if (line.startsWith("   ") && line.includes(":")) {
                // Section headers
                console.log(chalk.cyan(line));
              } else if (line.includes("→")) {
                // Descriptions
                console.log(chalk.gray(line));
              } else {
                // Condition lines
                console.log(chalk.white(line));
              }
            } else {
              console.log(chalk.white(line));
            }
          });
        } else {
          // Fallback to original if parsing fails
          console.log(chalk.white(`   ${policy.condition}`));
        }
      }
      
      if (policy.consensus) {
        console.log(chalk.blue(`\n   Consensus:`));
        console.log(chalk.white(`   ${policy.consensus}`));
      }
      
      if (policy.notes) {
        console.log(chalk.blue(`\n   Notes:`));
        // Split long notes into multiple lines if needed
        const notesLines = policy.notes.match(/.{1,70}/g) || [policy.notes];
        notesLines.forEach(line => {
          console.log(chalk.gray(`   ${line}`));
        });
      }

      // Show source file information
      console.log(chalk.blue(`\n   Source File:`));
      console.log(chalk.gray(`   ${policySourceFile}`));
      console.log(chalk.gray(`   Function: createUSDCOnlyPolicy()`));
    });
  });

  console.log(chalk.cyan(`\n${"=".repeat(70)}`));
  console.log();
  
  // Summary
  console.log(chalk.bold("Summary:"));
  const merchantsWithPolicies = merchants.filter(m => m.policies.length > 0).length;
  console.log(chalk.gray(`   - Total Merchants: ${merchants.length}`));
  console.log(chalk.gray(`   - Merchants with Policies: ${merchantsWithPolicies}`));
  console.log(chalk.gray(`   - Total Policies: ${totalPolicies}`));
  console.log();
  console.log(chalk.blue("Policy Configuration:"));
  console.log(chalk.gray(`   - Policy creation code: ${policySourceFile}`));
  console.log(chalk.gray(`   - Policies are stored in Turnkey (not in files)`));
  console.log(chalk.gray(`   - Each policy is scoped to its merchant's sub-organization`));
  console.log();
}

/**
 * View policies for a specific merchant
 */
async function viewSpecificMerchantPolicies(spinner: any): Promise<void> {
  const merchants = await listMerchants();
  spinner.succeed(`Found ${merchants.length} merchant(s)`);

  if (merchants.length === 0) {
    warning("No merchants found. Create one using 'Create New Merchant' option.");
    return;
  }

  console.log();
  const subOrgId = await promptSubOrgIdWithSelection(
    merchants.map(m => ({
      subOrganizationId: m.subOrganizationId,
      subOrganizationName: m.subOrganizationName,
    }))
  );

  if (!subOrgId) {
    return;
  }

  spinner.start("Fetching merchant policy details...");
  const merchant = await getMerchantDetails(subOrgId);
  spinner.stop();

  if (!merchant) {
    warning("Could not fetch merchant details.");
    return;
  }

  console.log();
  console.log(chalk.cyan(`\n${"=".repeat(70)}`));
  console.log(chalk.bold.cyan(`Merchant: ${merchant.subOrganizationName}`));
  console.log(chalk.gray(`   Sub-Organization ID: ${merchant.subOrganizationId}`));
  console.log();

  if (merchant.policies.length === 0) {
    warning("No policies found for this merchant.");
    console.log(chalk.gray("   Policies are created when you create a new merchant."));
    console.log(chalk.gray("   Policy creation code is located in: src/createPolicy.ts"));
    console.log();
    return;
  }

  // Policy source file path (relative to project root)
  const policySourceFile = "src/createPolicy.ts";

  info(`Found ${merchant.policies.length} policy/policies for this merchant\n`);

  merchant.policies.forEach((policy, policyIdx) => {
    console.log(chalk.bold.white(`\nPolicy #${policyIdx + 1}: ${policy.policyName}`));
    console.log(chalk.gray(`   Policy ID: ${policy.policyId}`));
    console.log(chalk.gray(`   Effect: ${policy.effect}`));
    
    if (policy.condition) {
      console.log(chalk.blue(`\n   Condition:`));
      const formattedCondition = formatCondition(policy.condition);
      if (formattedCondition.length > 0) {
        formattedCondition.forEach((line, lineIdx) => {
          // Use different colors for labels vs values
          if (line.includes("→") || line.includes(":")) {
            if (line.startsWith("   ") && line.includes(":")) {
              // Section headers
              console.log(chalk.cyan(line));
            } else if (line.includes("→")) {
              // Descriptions
              console.log(chalk.gray(line));
            } else {
              // Condition lines
              console.log(chalk.white(line));
            }
          } else {
            console.log(chalk.white(line));
          }
        });
      } else {
        // Fallback to original if parsing fails
        console.log(chalk.white(`   ${policy.condition}`));
      }
    }
    
    if (policy.consensus) {
      console.log(chalk.blue(`\n   Consensus:`));
      console.log(chalk.white(`   ${policy.consensus}`));
    }
    
    if (policy.notes) {
      console.log(chalk.blue(`\n   Notes:`));
      // Split long notes into multiple lines if needed
      const notesLines = policy.notes.match(/.{1,70}/g) || [policy.notes];
      notesLines.forEach(line => {
        console.log(chalk.gray(`   ${line}`));
      });
    }

    // Show source file information
    console.log(chalk.blue(`\n   Source File:`));
    console.log(chalk.gray(`   ${policySourceFile}`));
    console.log(chalk.gray(`   Function: createUSDCOnlyPolicy()`));
  });

  console.log(chalk.cyan(`\n${"=".repeat(70)}`));
  console.log();
  
  // Additional information
  console.log(chalk.blue("Policy Configuration:"));
  console.log(chalk.gray(`   - Policy creation code: ${policySourceFile}`));
  console.log(chalk.gray(`   - Policies are stored in Turnkey (not in files)`));
  console.log(chalk.gray(`   - This policy is scoped to: ${merchant.subOrganizationName}`));
  console.log();
}

