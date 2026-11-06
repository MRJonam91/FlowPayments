// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { FlowBuilder } from "../src/builder/index.ts";
import { PaymentFlowSimulator } from "../src/core/engine.ts";

test("Property-based - 1-cent total amount divided among 3 recipients preserves exact cent", () => {
  const flow = FlowBuilder.create("one-cent", "EUR")
    .payer("micro_payer")
    .amount(1) // 1 single cent (€0.01)
    .addPercentageSplit("s1", "beneficiary_1", 3333, "33.33%")
    .addPercentageSplit("s2", "beneficiary_2", 3333, "33.33%")
    .addRemainderSplit("s3", "beneficiary_remainder", "Remainder cent")
    .build();

  const sim = new PaymentFlowSimulator(flow);
  sim.depositSimulatedFunds();
  sim.executeRelease();

  const b1 = sim.ledger.requireAccount("beneficiary_1");
  const b2 = sim.ledger.requireAccount("beneficiary_2");
  const b3 = sim.ledger.requireAccount("beneficiary_remainder");

  // In integer cents: floor(1 * 3333 / 10000) = 0c
  assert.equal(b1.balanceCents, 0);
  assert.equal(b2.balanceCents, 0);
  // Remainder absorbs the 1 cent so not a single cent is lost
  assert.equal(b3.balanceCents, 1);
  assert.equal(b1.balanceCents + b2.balanceCents + b3.balanceCents, 1);

  const report = sim.generateAuditReport();
  assert.equal(report.isBalanced, true);
  assert.equal(report.discrepancyCents, 0);
});

test("Property-based - 1,000 randomized amounts maintain strict double-entry zero-sum invariant", () => {
  for (let i = 0; i < 1000; i++) {
    // Random amount from 100 cents (€1.00) to €100,000.00 (10,000,000 cents)
    const randomAmount = Math.floor(Math.random() * 10000000) + 100;
    // Bps: 500 to 3500 (5.00% to 35.00%)
    const bps1 = Math.floor(Math.random() * 3000) + 500;
    const bps2 = Math.floor(Math.random() * 3000) + 500;
    // Fixed fee: 10 to 50 cents
    const fixed = Math.floor(Math.random() * 40) + 10;

    const flow = FlowBuilder.create(`rand-${i}`, "EUR")
      .payer(`p_${i}`)
      .amount(randomAmount)
      .addFixedSplit("s_fix", "acc_fixed", fixed, "Fixed fee", 10)
      .addPercentageSplit("s_pct1", "acc_p1", bps1, "Pct 1", "gross", 20)
      .addPercentageSplit("s_pct2", "acc_p2", bps2, "Pct 2", "gross", 30)
      .addRemainderSplit("s_rem", "acc_rem", "Remainder", 90)
      .build();

    const sim = new PaymentFlowSimulator(flow);
    sim.depositSimulatedFunds();
    sim.executeRelease();

    const report = sim.generateAuditReport();
    assert.equal(report.isBalanced, true);
    assert.equal(report.discrepancyCents, 0);
    assert.equal(report.finalDistributedCents, randomAmount);
  }
});
