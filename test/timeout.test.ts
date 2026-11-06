// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { FlowBuilder } from "../src/builder/index.ts";
import { PaymentFlowSimulator } from "../src/core/engine.ts";

test("Timeout - automated refund upon timeout expiration", () => {
  const flow = FlowBuilder.create("timeout-refund", "EUR")
    .payer("client_a")
    .amount(20000)
    .addApprovalCondition("c1", "Requires signoff", ["approver_b"])
    .addRemainderSplit("s1", "seller_c")
    .withTimeout(5000, "refund_payer")
    .build();

  const sim = new PaymentFlowSimulator(flow, 1000);
  sim.depositSimulatedFunds();
  assert.equal(sim.getStatus(), "ESCROW_LOCKED");

  // Advance time past timeout (from 1000 + 4500 = 5500 >= 5000)
  sim.advanceTime(4500);

  // Status must be REFUNDED automatically
  assert.equal(sim.getStatus(), "REFUNDED");
  const payer = sim.ledger.requireAccount("client_a");
  const vault = sim.ledger.requireAccount("vault_timeout-refund");

  assert.equal(payer.balanceCents, 20000);
  assert.equal(vault.balanceCents, 0);

  const report = sim.generateAuditReport();
  assert.equal(report.isBalanced, true);
  assert.equal(report.discrepancyCents, 0);
});

test("Timeout - automated freeze dispute upon timeout expiration", () => {
  const flow = FlowBuilder.create("timeout-freeze", "EUR")
    .payer("buyer_x")
    .amount(15000)
    .addApprovalCondition("c1", "Requires signoff", ["inspector_y"])
    .addRemainderSplit("s1", "seller_z")
    .withTimeout(10000, "freeze_dispute")
    .build();

  const sim = new PaymentFlowSimulator(flow, 0);
  sim.depositSimulatedFunds();
  sim.advanceTime(10000);

  assert.equal(sim.getStatus(), "DISPUTED");
});
