// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { PaymentFlowSimulator } from "../src/core/engine.ts";
import {
  marketplaceSplitPreset,
  milestoneEscrowPreset,
  waterfallRoyaltyPreset,
} from "../src/core/presets.ts";
import type { FlowDefinition } from "../src/core/types.ts";

test("PaymentFlowSimulator - marketplace split with exact remainder handling", () => {
  const sim = new PaymentFlowSimulator(marketplaceSplitPreset);
  assert.equal(sim.getStatus(), "DRAFT");

  sim.depositSimulatedFunds();
  assert.equal(sim.getStatus(), "ESCROW_LOCKED");

  // Releasing before condition throws anti-plagiarism guard error
  assert.throws(
    () => sim.executeRelease(),
    /\[FLWP-ERR-4022\]/
  );

  // Submit delivery webhook event
  const isSatisfied = sim.submitEvent("cond_delivery_attested", "carrier_status", "DELIVERED");
  assert.equal(isSatisfied, true);
  assert.equal(sim.getStatus(), "RELEASE_ELIGIBLE");

  // Execute release
  sim.executeRelease();
  assert.equal(sim.getStatus(), "EXECUTED_SPLIT");

  const report = sim.generateAuditReport();
  assert.equal(report.isBalanced, true);
  assert.equal(report.discrepancyCents, 0);

  // Breakdown verification:
  // Deposit: 10000c (€100.00)
  // Fixed platform fee: 150c (€1.50)
  // Platform commission (10%): 1000c (€10.00)
  // Total platform: 1150c (€11.50)
  // Affiliate (3%): 300c (€3.00)
  // Merchant remainder: 10000 - 1150 - 300 = 8550c (€85.50)
  const platformAcc = sim.ledger.requireAccount("platform_treasury");
  const affiliateAcc = sim.ledger.requireAccount("affiliate_bob");
  const merchantAcc = sim.ledger.requireAccount("merchant_shop");

  assert.equal(platformAcc.balanceCents, 1150);
  assert.equal(affiliateAcc.balanceCents, 300);
  assert.equal(merchantAcc.balanceCents, 8550);
  assert.equal(platformAcc.balanceCents + affiliateAcc.balanceCents + merchantAcc.balanceCents, 10000);
});

test("PaymentFlowSimulator - milestone freelance escrow with quorum approvals", () => {
  const sim = new PaymentFlowSimulator(milestoneEscrowPreset);
  sim.depositSimulatedFunds();

  // Milestone 1 release fails without approval
  assert.throws(
    () => sim.executeRelease("milestone_phase_1"),
    /\[FLWP-ERR-4022\]/
  );

  // Sign Milestone 1
  sim.recordApproval("cond_phase1_approval", "enterprise_client");
  sim.executeRelease("milestone_phase_1");

  const devAcc = sim.ledger.requireAccount("developer_charlie");
  const feeAcc = sim.ledger.requireAccount("platform_escrow_fee");

  // Milestone 1 is 100000c: fee 8% = 8000c, dev remainder = 92000c
  assert.equal(feeAcc.balanceCents, 8000);
  assert.equal(devAcc.balanceCents, 92000);

  // Milestone 2 requires 2 approvals
  sim.recordApproval("cond_phase2_quorum", "enterprise_client");
  assert.throws(
    () => sim.executeRelease("milestone_phase_2"),
    /\[FLWP-ERR-4022\]/
  );

  // Second approval completes quorum
  sim.recordApproval("cond_phase2_quorum", "qa_auditor_dave");
  sim.executeRelease("milestone_phase_2");

  assert.equal(sim.getStatus(), "EXECUTED_SPLIT");
  // Total dev: 92000 + (200000 - 16000) = 92000 + 184000 = 276000c
  assert.equal(devAcc.balanceCents, 276000);
  assert.equal(feeAcc.balanceCents, 24000);
  assert.equal(devAcc.balanceCents + feeAcc.balanceCents, 300000);

  // Attempting to release an already released milestone throws error
  assert.throws(
    () => sim.executeRelease("milestone_phase_2"),
    /\[FLWP-ERR-4023\]/
  );
});

test("PaymentFlowSimulator - waterfall recoupment tiers", () => {
  const sim = new PaymentFlowSimulator(waterfallRoyaltyPreset);
  sim.depositSimulatedFunds();
  sim.executeRelease();

  // Total: 500000c (€5,000.00)
  // Senior investor cap: 200000c (€2,000.00)
  // Leftover: 300000c
  // Creator 75%: 225000c
  // Distributor remainder: 75000c
  const senior = sim.ledger.requireAccount("senior_investor_fund");
  const creator = sim.ledger.requireAccount("studio_creator");
  const distributor = sim.ledger.requireAccount("distributor_reserve");

  assert.equal(senior.balanceCents, 200000);
  assert.equal(creator.balanceCents, 225000);
  assert.equal(distributor.balanceCents, 75000);
  assert.equal(senior.balanceCents + creator.balanceCents + distributor.balanceCents, 500000);
});

test("PaymentFlowSimulator - refund and dispute resolution", () => {
  const flow: FlowDefinition = {
    id: "dispute_test",
    title: "Dispute Flow",
    description: "Testing dispute mechanisms",
    currency: "EUR",
    totalAmountCents: 10000,
    payerId: "buyer_1",
    conditions: [],
    splits: [
      { id: "s1", recipientId: "seller_1", type: "remainder", description: "Seller net" }
    ]
  };

  const sim = new PaymentFlowSimulator(flow);
  sim.depositSimulatedFunds();
  sim.executeDispute("Goods damaged in transit");
  assert.equal(sim.getStatus(), "DISPUTED");

  // Resolve with 60% refund to buyer, 40% payout to seller
  sim.resolveDispute(60, 40, "seller_1");
  assert.equal(sim.getStatus(), "EXECUTED_SPLIT");

  const buyer = sim.ledger.requireAccount("buyer_1");
  const seller = sim.ledger.requireAccount("seller_1");

  assert.equal(buyer.balanceCents, 6000);
  assert.equal(seller.balanceCents, 4000);
});

test("PaymentFlowSimulator.validate - catches mismatched milestone sums", () => {
  const invalidMilestoneFlow: FlowDefinition = {
    id: "invalid_m",
    title: "Invalid Flow",
    description: "Sum mismatch",
    currency: "EUR",
    totalAmountCents: 10000,
    payerId: "p1",
    conditions: [],
    milestones: [
      {
        id: "m1",
        title: "Only 40 EUR",
        amountCents: 4000,
        conditionIds: [],
        status: "PENDING",
        splits: [{ id: "s1", recipientId: "b1", type: "remainder", description: "All" }]
      }
    ]
  };

  const val = PaymentFlowSimulator.validate(invalidMilestoneFlow);
  assert.equal(val.isValid, false);
  assert.ok(val.errors.some(e => e.includes("[FLWP-ERR-3091]")));
});
