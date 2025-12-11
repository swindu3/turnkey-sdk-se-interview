# Turnkey Hierarchy

Understanding the organizational structure in Turnkey is crucial for building secure, scalable applications. This guide explains how organizations, sub-organizations, wallets, and policies fit together.

## Overview

Turnkey uses a hierarchical structure that enables:
- **Isolation**: Separate security contexts for different entities
- **Scalability**: Manage thousands of merchants efficiently
- **Access Control**: Granular permissions at each level
- **Policy Enforcement**: Rules that apply to specific scopes

## Hierarchy Structure

```mermaid
graph TD
    A[Parent Organization] --> B[Sub-Organization 1<br/>Merchant A]
    A --> C[Sub-Organization 2<br/>Merchant B]
    A --> D[Sub-Organization 3<br/>Merchant C]
    
    A --> E[Treasury Wallet<br/>Parent Org]
    
    B --> F[Merchant A Wallet]
    B --> G[Merchant A Policy]
    
    C --> H[Merchant B Wallet]
    C --> I[Merchant B Policy]
    
    D --> J[Merchant C Wallet]
    D --> K[Merchant C Policy]
    
    style A fill:#4A90E2
    style B fill:#7ED321
    style C fill:#7ED321
    style D fill:#7ED321
    style E fill:#F5A623
    style F fill:#BD10E0
    style G fill:#9013FE
    style H fill:#BD10E0
    style I fill:#9013FE
    style J fill:#BD10E0
    style K fill:#9013FE
```

## Components

### 1. Parent Organization

The **parent organization** is your main Turnkey account. In the Payflow demo, this represents Payflow's organization.

**Characteristics:**
- Contains all sub-organizations
- Houses the treasury wallet
- Manages API credentials for sub-organization access
- Provides the root of trust

**In the Code:**
```typescript
// Parent organization client
const turnkeyClient = new TurnkeySDKServer({
  apiPublicKey: process.env.API_PUBLIC_KEY!,
  apiPrivateKey: process.env.API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.ORGANIZATION_ID!, // Parent org ID
});
```

### 2. Sub-Organizations

**Sub-organizations** are isolated child organizations created under the parent. Each merchant gets their own sub-organization.

**Characteristics:**
- Complete isolation from other sub-orgs
- Independent wallet management
- Scoped policy enforcement
- Can have their own users and authentication

**Why Sub-Organizations?**

```mermaid
graph LR
    A[Without Sub-Orgs] --> B[All Wallets in One Org]
    B --> C[Security Risk:<br/>One Breach = All Exposed]
    
    D[With Sub-Orgs] --> E[Isolated Per Merchant]
    E --> F[Security Benefit:<br/>Breach Isolated to One Merchant]
    
    style C fill:#D0021B
    style F fill:#7ED321
```

**Benefits:**
1. **Security Isolation**: A compromise in one merchant's sub-org doesn't affect others
2. **Access Control**: Each merchant can have independent user management
3. **Policy Scoping**: Policies apply only to their sub-organization
4. **Scalability**: Easy to add/remove merchants without affecting others

**In the Code:**
```typescript
// Creating a sub-organization
const subOrgResponse = await turnkeyClient.apiClient().createSubOrganization({
  subOrganizationName: merchantName,
  rootUsers: [/* ... */],
  wallet: {
    walletName: `${merchantName} Wallet`,
    accounts: DEFAULT_ETHEREUM_ACCOUNTS,
  },
});
```

### 3. Wallets

**Wallets** are cryptographic key containers that generate and manage blockchain addresses.

**Types in Payflow Demo:**

#### Treasury Wallet
- Lives in the **parent organization**
- Receives all swept USDC funds
- Single omnibus wallet for all merchants

#### Merchant Wallets
- Live in **merchant sub-organizations**
- Receive customer deposits
- Subject to restrictive policies

**Wallet Structure:**

```mermaid
graph TD
    A[Wallet] --> B[Private Keys]
    A --> C[Public Keys]
    A --> D[Addresses]
    
    B --> E[Ethereum Private Key]
    C --> F[Ethereum Public Key]
    D --> G[0x... Ethereum Address]
    
    style A fill:#4A90E2
    style B fill:#D0021B
    style C fill:#7ED321
    style D fill:#F5A623
```

### 4. Policies

**Policies** are rules that restrict what transactions can be executed from wallets.

**Key Properties:**
- Policies are **scoped to sub-organizations**
- They enforce restrictions at the **infrastructure level**
- They use a **declarative language** to express conditions
- They can parse **transaction calldata** to validate transfers

**Policy Flow:**

```mermaid
sequenceDiagram
    participant App as Application
    participant Client as Turnkey Client
    participant Policy as Policy Engine
    participant Wallet as Wallet
    
    App->>Client: Request Transaction
    Client->>Policy: Validate Transaction
    Policy->>Policy: Check Conditions
    alt Conditions Met
        Policy->>Wallet: Approve & Sign
        Wallet->>App: Transaction Hash
    else Conditions Not Met
        Policy->>App: Reject Transaction
    end
```

## Access Control Flow

Understanding how API keys work across the hierarchy:

```mermaid
graph TD
    A[Parent API Keys] --> B[Can Access Parent Org]
    A --> C[Can Access Sub-Orgs<br/>via Root User Registration]
    
    D[Sub-Org Root User] --> E[Uses Parent API Keys]
    E --> F[Can Manage Sub-Org]
    E --> G[Can Sign Transactions]
    
    style A fill:#4A90E2
    style E fill:#7ED321
```

**Important**: In the Payflow demo, sub-organizations are created with the parent's API keys registered as root users. This allows the parent organization to manage sub-orgs while maintaining isolation.

## Real-World Example: Payflow

Here's how the hierarchy maps to Payflow's business model:

```mermaid
graph TD
    A[Payflow Organization] --> B[Merchant: Acme Corp]
    A --> C[Merchant: Beta Inc]
    A --> D[Merchant: Gamma LLC]
    A --> E[Treasury Wallet]
    
    B --> F[Acme Deposit Wallet]
    B --> G[Acme Policy:<br/>USDC → Treasury Only]
    
    C --> H[Beta Deposit Wallet]
    C --> I[Beta Policy:<br/>USDC → Treasury Only]
    
    D --> J[Gamma Deposit Wallet]
    D --> K[Gamma Policy:<br/>USDC → Treasury Only]
    
    F -.Sweep.-> E
    H -.Sweep.-> E
    J -.Sweep.-> E
    
    style A fill:#4A90E2
    style E fill:#F5A623
    style B fill:#7ED321
    style C fill:#7ED321
    style D fill:#7ED321
```

## Client Configuration

When working with different levels of the hierarchy, you need different client configurations:

### Parent Organization Client

```typescript
// For parent org operations (treasury, creating sub-orgs)
const parentClient = new TurnkeySDKServer({
  apiPublicKey: process.env.API_PUBLIC_KEY!,
  apiPrivateKey: process.env.API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.ORGANIZATION_ID!, // Parent org
});
```

### Sub-Organization Client

```typescript
// For sub-org operations (signing transactions, creating policies)
const subOrgClient = new TurnkeySDKServer({
  apiPublicKey: process.env.API_PUBLIC_KEY!, // Same keys
  apiPrivateKey: process.env.API_PRIVATE_KEY!, // Same keys
  defaultOrganizationId: merchantSubOrgId, // Sub-org ID
});
```

**Critical**: When signing transactions from a sub-organization wallet, you **must** use a client configured with the sub-organization ID. Otherwise, Turnkey won't be able to resolve the wallet correctly.

## Best Practices

1. **Always use sub-organizations for multi-tenant scenarios**
   - Provides security isolation
   - Enables independent policy management

2. **Store sub-organization IDs in your database**
   - Don't rely on names (they can change)
   - Use IDs for all API calls

3. **Use the correct client for each operation**
   - Parent client for parent org operations
   - Sub-org client for sub-org operations

4. **Leverage policy scoping**
   - Policies in sub-orgs only affect that sub-org
   - Parent org policies don't affect sub-orgs

## Next Steps

- Learn how to create and manage [Sub-Organizations](03-sub-organizations.md)
- Understand how [Policies](04-policies.md) enforce restrictions
- See how [Fund Sweeping](05-fund-sweeping.md) works across the hierarchy

