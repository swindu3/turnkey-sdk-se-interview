import { getTurnkeyClient, getTurnkeyClientForSubOrg } from "../provider";

export interface PolicyInfo {
  policyId: string;
  policyName: string;
  effect: string;
  condition?: string;
  consensus?: string;
  notes?: string;
}

export interface MerchantInfo {
  subOrganizationId: string;
  subOrganizationName: string;
  wallets: Array<{
    walletId: string;
    walletName: string;
    address: string;
  }>;
  policies: PolicyInfo[];
}

/**
 * Lists all sub-organizations (merchants) in the parent organization
 */
export async function listMerchants(): Promise<MerchantInfo[]> {
  const turnkeyClient = getTurnkeyClient();
  const organizationId = process.env.ORGANIZATION_ID!;

  try {
    // Get all sub-organizations
    const subOrgsResponse = await turnkeyClient.apiClient().getSubOrgIds({
      organizationId,
    });

    const subOrgIds = subOrgsResponse.organizationIds || [];

    // For each sub-org, get its details and wallets
    const merchants: MerchantInfo[] = [];

    for (const subOrgId of subOrgIds) {
      try {
        // Get sub-org details
        const subOrgClient = getTurnkeyClientForSubOrg(subOrgId);
        
        // Get all wallets in this sub-org first (we need this for name detection and processing)
        const walletsResponse = await subOrgClient.apiClient().getWallets({
          organizationId: subOrgId,
        });

        const wallets = walletsResponse.wallets || [];
        
        // Try to get the actual organization name from Turnkey API
        let subOrgName: string | null = null;
        try {
          const orgResponse = await subOrgClient.apiClient().getOrganization({
            organizationId: subOrgId,
          });
          // The organization name should be in the response
          subOrgName = (orgResponse.organization as any)?.organizationName || 
                       (orgResponse.organization as any)?.name || 
                       null;
        } catch (err: any) {
          // If getOrganization fails, fall through to wallet-based name detection
        }
        
        // If we couldn't get the name from getOrganization, try to derive it from wallets
        if (!subOrgName) {
          // Try to find the original wallet (the one that matches "{name} Wallet" pattern)
          // This is typically the first wallet created with the merchant
          // Look for wallet names that end with " Wallet" - the original wallet follows this pattern
          const originalWallet = wallets.find(w => 
            w.walletName && w.walletName.endsWith(" Wallet")
          ) || wallets[0];
          
          // Derive name from original wallet or use sub-org ID
          subOrgName = originalWallet?.walletName?.replace(" Wallet", "") || 
                       subOrgId.slice(0, 8) + "...";
        }

        // Get addresses for each wallet by fetching wallet accounts
        const merchantWallets = await Promise.all(
          wallets.map(async (wallet) => {
            try {
              // Get wallet accounts to retrieve the address
              const accountsResponse = await subOrgClient.apiClient().getWalletAccounts({
                organizationId: subOrgId,
                walletId: wallet.walletId,
              });

              // Get the first account's address (primary address)
              const primaryAddress = accountsResponse.accounts?.[0]?.address || "N/A";

              return {
                walletId: wallet.walletId,
                walletName: wallet.walletName || "Unnamed Wallet",
                address: primaryAddress,
              };
            } catch (error: any) {
              // If we can't get accounts, return wallet without address
              return {
                walletId: wallet.walletId,
                walletName: wallet.walletName || "Unnamed Wallet",
                address: "N/A",
              };
            }
          })
        );

        // Get policies for this sub-organization
        let policies: PolicyInfo[] = [];
        try {
          const policiesResponse = await subOrgClient.apiClient().getPolicies({
            organizationId: subOrgId,
          });
          
          policies = (policiesResponse.policies || []).map((policy: any) => ({
            policyId: policy.policyId || "",
            policyName: policy.policyName || "Unnamed Policy",
            effect: policy.effect || "UNKNOWN",
            condition: policy.condition,
            consensus: policy.consensus,
            notes: policy.notes,
          }));
        } catch (error: any) {
          // If we can't get policies, continue without them
          console.log(`[WARNING] Could not fetch policies for sub-org ${subOrgId}: ${error.message}`);
        }

        merchants.push({
          subOrganizationId: subOrgId,
          subOrganizationName: subOrgName,
          wallets: merchantWallets,
          policies,
        });
      } catch (error: any) {
        // Skip sub-orgs we can't access
        console.log(`[WARNING] Could not access sub-org ${subOrgId}: ${error.message}`);
      }
    }

    return merchants;
  } catch (error: any) {
    throw new Error(`Failed to list merchants: ${error.message || "Unknown error"}`);
  }
}

/**
 * Gets details for a specific merchant sub-organization
 */
export async function getMerchantDetails(subOrganizationId: string): Promise<MerchantInfo | null> {
  const subOrgClient = getTurnkeyClientForSubOrg(subOrganizationId);

  try {
    // Try to get the actual organization name from Turnkey API
    let subOrgName: string;
    try {
      const orgResponse = await subOrgClient.apiClient().getOrganization({
        organizationId: subOrganizationId,
      });
      subOrgName = (orgResponse.organization as any)?.organizationName || 
                   (orgResponse.organization as any)?.name || 
                   null;
    } catch (err: any) {
      subOrgName = null as any;
    }
    
    // Get all wallets in this sub-org
    const walletsResponse = await subOrgClient.apiClient().getWallets({
      organizationId: subOrganizationId,
    });

    const wallets = walletsResponse.wallets || [];
    
    // If we couldn't get the name from getOrganization, derive it from wallets
    if (!subOrgName) {
      // Try to find the original wallet (the one that matches "{name} Wallet" pattern)
      const originalWallet = wallets.find(w => 
        w.walletName && w.walletName.endsWith(" Wallet")
      ) || wallets[0];
      
      subOrgName = originalWallet?.walletName?.replace(" Wallet", "") || 
                   subOrganizationId.slice(0, 8) + "...";
    }

    // Get addresses for each wallet by fetching wallet accounts
    const merchantWallets = await Promise.all(
      wallets.map(async (wallet) => {
        try {
          // Get wallet accounts to retrieve the address
          const accountsResponse = await subOrgClient.apiClient().getWalletAccounts({
            organizationId: subOrganizationId,
            walletId: wallet.walletId,
          });

          // Get the first account's address (primary address)
          const primaryAddress = accountsResponse.accounts?.[0]?.address || "N/A";

          return {
            walletId: wallet.walletId,
            walletName: wallet.walletName || "Unnamed Wallet",
            address: primaryAddress,
          };
        } catch (error: any) {
          // If we can't get accounts, return wallet without address
          return {
            walletId: wallet.walletId,
            walletName: wallet.walletName || "Unnamed Wallet",
            address: "N/A",
          };
        }
      })
    );

    // Get policies for this sub-organization
    let policies: PolicyInfo[] = [];
    try {
      const policiesResponse = await subOrgClient.apiClient().getPolicies({
        organizationId: subOrganizationId,
      });
      
      policies = (policiesResponse.policies || []).map((policy: any) => ({
        policyId: policy.policyId || "",
        policyName: policy.policyName || "Unnamed Policy",
        effect: policy.effect || "UNKNOWN",
        condition: policy.condition,
        consensus: policy.consensus,
        notes: policy.notes,
      }));
    } catch (error: any) {
      // If we can't get policies, continue without them
    }

    return {
      subOrganizationId,
      subOrganizationName: subOrgName,
      wallets: merchantWallets,
      policies,
    };
  } catch (error: any) {
    return null;
  }
}

