# Payflow - Turnkey Integration Customer Readout

**Prepared for:** Payflow CTO  
**Date:** December 2025
**Solution Engineer:** Samuel Wondimu


---

## Executive Summary

This proof-of-concept (PoC) demonstrates how Turnkey can automate merchant wallet management and fund sweeping for Payflow's stablecoin payment rails. The solution provides secure key management, automated wallet creation, and policy-enforced transaction restrictions.

---

## Problem Summary

### Customer Challenge

Payflow is building stablecoin payment rails for small businesses, where merchants receive hundreds of USDC deposits daily. Current challenges include:

1. **Manual Wallet Management**: Creating and managing deposit wallets for each merchant is time-consuming
2. **Fund Consolidation**: Manually sweeping USDC from merchant wallets to a central treasury is inefficient at scale
3. **Security & Compliance**: Ensuring funds can only move in approved ways (USDC-only, treasury-only) requires robust policy enforcement

### Business Goals

- Automate wallet creation for new merchants on demand
- Automate fund sweeping from merchant deposit wallets to treasury
- Enforce strict transaction policies to prevent unauthorized transfers
- Scale to handle hundreds of merchants and daily transactions

---

## Solution Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Payflow Parent Organization                     │
│              (Turnkey Organization)                           │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
                ▼           ▼           ▼
        ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
        │   Treasury    │ │  Merchant 1   │ │  Merchant 2   │
        │    Wallet     │ │  Sub-Org      │ │  Sub-Org      │
        │  (Omnibus)    │ └───────────────┘ └───────────────┘
        └───────────────┘         │                 │
                ▲                  │                 │
                │                  ▼                 ▼
                │          ┌───────────────┐ ┌───────────────┐
                │          │ Merchant 1    │ │ Merchant 2    │
                │          │ Wallet        │ │ Wallet        │
                │          │ + Policy      │ │ + Policy      │
                │          └───────────────┘ └───────────────┘
                │                  │                 │
                └──────────────────┴─────────────────┘
                           Sweep USDC
```

### Solution Components

#### 1. Merchant Sub-Organizations
- Each merchant gets an isolated sub-organization for security and access control
- Provides logical separation and independent policy management
- Enables per-merchant access controls and audit trails

#### 2. Automated Wallet Creation
- On-demand wallet generation for new merchants via interactive CLI
- Each merchant receives a dedicated Ethereum deposit wallet
- Wallets are automatically configured with restrictive policies

#### 3. Policy Engine
- **USDC-only**: Only allow ERC-20 transfers of USDC
- **Treasury-only**: Only allow transfers to the treasury wallet address
- **Calldata parsing**: Policy validates transaction data to ensure correct destination
- **Infrastructure-level enforcement**: Policies are enforced by Turnkey before signing

#### 4. Automated Fund Sweeping
- Monitors merchant wallet balances across all merchants
- Automatically transfers USDC from merchant wallets to treasury
- Supports one-time sweeps and scheduled batch operations
- Application-level threshold enforcement (minimum 0.03 USDC)

### Technical Implementation

**Turnkey Primitives Used:**
- **Sub-Organizations**: For merchant isolation
- **Wallets**: Ethereum wallets for deposits and treasury
- **Policies**: Transaction restrictions and approvals
- **API Integration**: Programmatic wallet and transaction management

**Key Features:**
- Interactive CLI for managing merchants and operations
- Automated sub-organization and wallet creation
- Policy-based transaction restrictions
- Automated USDC sweeping (one-time and scheduled)
- Secure key management (keys never leave Turnkey infrastructure)
- Audit trail for all transactions

---

## Demo Walkthrough

### Setup & Configuration

The demo requires Turnkey API credentials configured in environment variables:

```bash
API_PUBLIC_KEY=your_key
API_PRIVATE_KEY=your_key
ORGANIZATION_ID=your_org_id
NETWORK=sepolia
```

**Setup Steps:**
1. Install dependencies: `pnpm install -r`
2. Build workspace packages: `pnpm run build-all`
3. Configure environment variables in `.env.local`
4. Run the interactive CLI: `pnpm demo`

### Interactive CLI

The demo provides an interactive CLI with the following capabilities:

1. **Run Full Demo** - Complete end-to-end flow
2. **Create New Merchant** - On-demand merchant onboarding
3. **List All Merchants** - View all sub-organizations
4. **Add Wallet to Merchant** - Create additional deposit addresses
5. **Delete Merchant** - Remove merchant sub-organizations
6. **Sweep Funds to Treasury** - One-time batch sweep of all merchant wallets
7. **Scheduled Sweep Job** - Long-running automated sweeps at configurable intervals
8. **Send Funds to Merchant** - Test funding using treasury or external wallets
9. **Check Wallet Balance** - Query USDC and ETH balances

### Complete Demo Flow

```
Payflow Demo - Interactive CLI

============================================================
STEP 1: Setting up Treasury Wallet
============================================================
Treasury Address: 0x1234...5678
Wallet ID: wallet_abc123...

============================================================
STEP 2: Creating Merchant Sub-Organization & Wallet
============================================================
Sub-Organization ID: abc123...
Wallet ID: def456...
Merchant Address: 0xabcd...ef01
Threshold: Minimum 0.03 USDC (enforced at application level)

============================================================
STEP 3: Creating Restricted Policy
============================================================
Policy Created: USDC-Only Policy
Policy ID: policy_xyz789...
Restriction: USDC transfers only → 0x1234...5678

============================================================
STEP 4: Sweeping USDC to Treasury
============================================================
Merchant wallet has 500.0 USDC
Sweeping to treasury...
Sweep Success! 500.0 USDC transferred
Transaction: https://sepolia.etherscan.io/tx/0x...

============================================================
DEMO SUMMARY
============================================================
Treasury Wallet:     0x1234...5678
Merchant Wallet:      0xabcd...ef01
Policy Restriction:   USDC-only → 0x1234...5678
Sweep Status:         Success - 500.0 USDC transferred
============================================================
```

### Fund Sweeping Process

**Flow:**
1. CLI requests list of all merchants from Turnkey API
2. For each merchant:
   - Check USDC balance on Ethereum network
   - If balance >= 0.03 USDC (threshold):
     - Create transfer transaction via Turnkey API
     - Turnkey validates policy (USDC-only, treasury-only)
     - If policy allows: Sign and broadcast transaction
     - USDC is transferred to treasury wallet
     - Return transaction hash
   - If balance < threshold: Skip sweep

**Components:**
- **CLI Application**: Orchestrates the sweep process
- **Turnkey API**: Validates policies and signs transactions
- **Ethereum Network**: Executes transfers and maintains balances
- **Treasury Wallet**: Receives all swept USDC funds

---

## Benefits for Payflow

### 1. Automation & Scalability
- Eliminates manual wallet creation and management
- Scales to hundreds of merchants without additional operational overhead
- Automated sweeping reduces manual intervention
- Scheduled sweep jobs enable continuous fund consolidation

### 2. Security & Compliance
- Private keys never leave Turnkey's secure infrastructure
- Policy engine enforces business rules at the infrastructure level
- Sub-organization isolation limits security blast radius
- Audit trail for all transactions and policy changes

### 3. Operational Efficiency
- Reduced time-to-onboard for new merchants (minutes vs. hours)
- Automated fund consolidation reduces treasury management overhead
- Interactive CLI enables quick testing and operations
- Programmatic API enables integration with existing systems

### 4. Risk Mitigation
- Policies prevent unauthorized transactions at infrastructure level
- Application-level threshold enforcement prevents unnecessary gas costs
- Sub-organization isolation limits impact of potential breaches
- Turnkey's infrastructure provides enterprise-grade security

---

## Production Considerations

### Enhancements for Production

1. **Enhanced Monitoring**
   - Webhook integration for real-time deposit detection
   - Alerting for failed transactions or policy violations
   - Dashboard for monitoring sweep operations

2. **Multi-User Access**
   - Configure proper authentication (API keys, passkeys)
   - Implement quorum requirements for sensitive operations
   - Role-based access control

3. **Error Handling & Resilience**
   - Retry logic for failed transactions
   - Comprehensive error handling and logging
   - Transaction status tracking and reconciliation

4. **Integration Points**
   - REST API for wallet creation from your backend
   - Webhook callbacks for transaction events
   - Database integration for merchant wallet mapping

5. **Performance Optimization**
   - Batch processing for large numbers of merchants
   - Optimized gas management strategies
   - Rate limiting and throttling

---

## Next Steps

### Immediate Actions

1. **Review the PoC**: Test the demo with your Turnkey organization
2. **Evaluate Fit**: Assess how this solution meets your requirements
3. **Plan Integration**: Identify integration points with your existing systems

### Questions to Consider

1. **Scale**: How many merchants do you expect to onboard per month?
2. **Sweeping Frequency**: How often should funds be swept (real-time, hourly, daily)?
3. **Access Control**: Who needs access to create wallets and manage policies?
4. **Monitoring**: What alerts and notifications do you need?
5. **Compliance**: Are there additional regulatory requirements to consider?

### Support & Resources

- **Documentation**: [https://docs.turnkey.com](https://docs.turnkey.com)
- **Policy Examples**: [Ethereum Policy Examples](https://docs.turnkey.com/concepts/policies/examples/ethereum)
- **API Reference**: [Turnkey API Docs](https://docs.turnkey.com/api-reference)
- **Support**: [support@turnkey.com](mailto:support@turnkey.com)

---

## Conclusion

This PoC demonstrates that Turnkey can effectively address Payflow's requirements for automated wallet management and fund sweeping. The solution provides:

- Automated merchant wallet creation via interactive CLI
- Automated USDC fund sweeping (one-time and scheduled)
- Policy-enforced transaction restrictions at infrastructure level
- Scalable architecture for hundreds of merchants
- Secure key management with keys never leaving Turnkey infrastructure

The implementation is ready for testing and can be extended to meet production requirements. We're happy to discuss any questions, concerns, or customization needs.

---

**Ready to discuss?** Let's schedule a follow-up call to dive deeper into your specific requirements and answer any questions about the implementation.
