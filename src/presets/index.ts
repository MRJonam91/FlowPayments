// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import type { FlowDefinition } from "../core/types.ts";

/**
 * Standard verifiable presets modeling real-world payment flows
 */

/**
 * Preset 1: Multi-party E-Commerce Marketplace Split
 * Buyer pays €100.00.
 * Splits:
 *  - Platform takes 10% commission + €1.50 fixed processing fee
 *  - Affiliate / referral gets 3% commission
 *  - Merchant receives exact remainder
 * Conditions:
 *  - Logistics carrier confirms package delivery via webhook/oracle event
 */
export const marketplaceSplitPreset: FlowDefinition = {
  id: "flow_marketplace_order_8821",
  title: "Marketplace Multi-Party Split with Carrier Attestation",
  description:
    "Simulates an e-commerce marketplace order where funds are held in escrow until shipping carrier confirms delivery, then distributed to platform fees, affiliate, and merchant.",
  currency: "EUR",
  totalAmountCents: 10000, // €100.00
  payerId: "buyer_alice",
  escrowVaultId: "vault_marketplace",
  conditions: [
    {
      id: "cond_delivery_attested",
      type: "event_attestation",
      description: "Logistics carrier webhook confirms order delivered",
      expectedEventKey: "carrier_status",
      expectedEventValue: "DELIVERED",
    },
  ],
  splits: [
    {
      id: "split_fixed_platform_fee",
      recipientId: "platform_treasury",
      type: "fixed",
      amountCents: 150, // €1.50 fixed transaction fee
      priority: 10,
      description: "Fixed platform processing fee",
    },
    {
      id: "split_platform_commission",
      recipientId: "platform_treasury",
      type: "percentage",
      value: 1000, // 10.00%
      priority: 20,
      description: "Marketplace variable sales commission (10%)",
    },
    {
      id: "split_affiliate_referral",
      recipientId: "affiliate_bob",
      type: "percentage",
      value: 300, // 3.00%
      priority: 30,
      description: "Partner affiliate referral bonus (3%)",
    },
    {
      id: "split_merchant_net",
      recipientId: "merchant_shop",
      type: "remainder",
      priority: 90,
      description: "Net merchant payout (exact remainder)",
    },
  ],
};

/**
 * Preset 2: Two-Phase Milestone Freelance Escrow
 * Total Contract: €3,000.00
 * Milestones:
 *  - Phase 1: Architecture & Prototype (€1,000.00), releases upon client approval
 *  - Phase 2: Production Deployment (€2,000.00), releases upon dual quorum (client + independent QA reviewer)
 */
export const milestoneEscrowPreset: FlowDefinition = {
  id: "flow_freelance_contract_401",
  title: "Two-Phase Milestone Freelance Escrow with Quorum",
  description:
    "Models professional software service engagement with phased milestone escrow, requiring client approval on milestone 1 and dual sign-off on milestone 2.",
  currency: "EUR",
  totalAmountCents: 300000, // €3,000.00
  payerId: "enterprise_client",
  escrowVaultId: "vault_freelance_escrow",
  conditions: [
    {
      id: "cond_phase1_approval",
      type: "manual_approval",
      description: "Client approves architecture & initial prototype",
      authorizedParties: ["enterprise_client"],
    },
    {
      id: "cond_phase2_quorum",
      type: "quorum_approval",
      description: "Dual sign-off from Client and Independent QA Auditor",
      authorizedParties: ["enterprise_client", "qa_auditor_dave"],
      quorumRequired: 2,
    },
  ],
  milestones: [
    {
      id: "milestone_phase_1",
      title: "Architecture & Prototype Delivery",
      amountCents: 100000, // €1,000.00
      conditionIds: ["cond_phase1_approval"],
      status: "PENDING",
      splits: [
        {
          id: "m1_platform_fee",
          recipientId: "platform_escrow_fee",
          type: "percentage",
          value: 800, // 8.00%
          description: "Platform escrow guarantee fee (8%)",
        },
        {
          id: "m1_dev_payout",
          recipientId: "developer_charlie",
          type: "remainder",
          description: "Contractor phase 1 net payout",
        },
      ],
    },
    {
      id: "milestone_phase_2",
      title: "Final Production Deployment & Acceptance",
      amountCents: 200000, // €2,000.00
      conditionIds: ["cond_phase2_quorum"],
      status: "PENDING",
      splits: [
        {
          id: "m2_platform_fee",
          recipientId: "platform_escrow_fee",
          type: "percentage",
          value: 800, // 8.00%
          description: "Platform escrow guarantee fee (8%)",
        },
        {
          id: "m2_dev_payout",
          recipientId: "developer_charlie",
          type: "remainder",
          description: "Contractor phase 2 net payout",
        },
      ],
    },
  ],
};

/**
 * Preset 3: Waterfall Royalty Payout
 * Total revenue: €5,000.00
 *  - Tier 1: Senior Investor recoups initial loan up to €2,000.00 cap
 *  - Tier 2: Content Creator receives 75% of remaining funds
 *  - Tier 3: Distribution platform retains remainder
 */
export const waterfallRoyaltyPreset: FlowDefinition = {
  id: "flow_waterfall_media_092",
  title: "Tiered Waterfall Royalty & Recoupment Distribution",
  description:
    "Simulates an entertainment royalty recoupment cascade where senior loan holders are satisfied first before net revenue splits to creators.",
  currency: "EUR",
  totalAmountCents: 500000, // €5,000.00
  payerId: "box_office_distributor",
  escrowVaultId: "vault_royalty_clearing",
  conditions: [],
  splits: [
    {
      id: "split_investor_senior_loan",
      recipientId: "senior_investor_fund",
      type: "waterfall",
      capCents: 200000, // €2,000.00 cap
      priority: 10,
      description: "Senior investor principal recoupment (capped at €2,000)",
    },
    {
      id: "split_creator_share",
      recipientId: "studio_creator",
      type: "percentage",
      basis: "net_remaining",
      value: 7500, // 75% of remaining amount
      priority: 20,
      description: "Creator revenue share (75% of post-recoupment pool)",
    },
    {
      id: "split_distributor_margin",
      recipientId: "distributor_reserve",
      type: "remainder",
      priority: 30,
      description: "Distributor net retention (exact remainder)",
    },
  ],
};
