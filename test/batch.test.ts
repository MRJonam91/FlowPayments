// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { BatchSettlementEngine } from "../src/batch/index.ts";
import { FlowBuilder } from "../src/builder/index.ts";

test("BatchSettlementEngine - nets payouts across multiple independent flows", () => {
  const flow1 = FlowBuilder.create("order-1", "EUR")
    .payer("buyer_1")
    .amount(10000) // €100.00
    .addFixedSplit("f1", "platform", 100, "Fee")
    .addRemainderSplit("r1", "merchant_alpha", "Net payout")
    .build();

  const flow2 = FlowBuilder.create("order-2", "EUR")
    .payer("buyer_2")
    .amount(20000) // €200.00
    .addFixedSplit("f2", "platform", 200, "Fee")
    .addRemainderSplit("r2", "merchant_alpha", "Net payout")
    .build();

  const flow3 = FlowBuilder.create("order-3", "EUR")
    .payer("buyer_3")
    .amount(5000) // €50.00
    .addFixedSplit("f3", "platform", 50, "Fee")
    .addRemainderSplit("r3", "merchant_beta", "Net payout")
    .build();

  const batch = new BatchSettlementEngine("batch_2026_11_06", "EUR");
  batch.addFlow(flow1).addFlow(flow2).addFlow(flow3);

  const summary = batch.executeBatch();

  assert.equal(summary.batchId, "batch_2026_11_06");
  assert.equal(summary.totalFlowsCount, 3);
  assert.equal(summary.totalVolumeCents, 35000); // 10000 + 20000 + 5000
  assert.equal(summary.isFullyBalanced, true);
  assert.ok(summary.batchDigest.length === 64); // SHA-256

  // Netted payouts verification:
  // Merchant Alpha: (10000 - 100) + (20000 - 200) = 9900 + 19800 = 29700 cents (€297.00) in 2 flows
  const alphaPayout = summary.aggregatedPayouts.find((p) => p.recipientId === "merchant_alpha");
  assert.ok(alphaPayout);
  assert.equal(alphaPayout.totalNetCents, 29700);
  assert.equal(alphaPayout.flowCount, 2);

  // Merchant Beta: 5000 - 50 = 4950 cents (€49.50) in 1 flow
  const betaPayout = summary.aggregatedPayouts.find((p) => p.recipientId === "merchant_beta");
  assert.ok(betaPayout);
  assert.equal(betaPayout.totalNetCents, 4950);
  assert.equal(betaPayout.flowCount, 1);

  // Platform: 100 + 200 + 50 = 350 cents (€3.50)
  const platformPayout = summary.aggregatedPayouts.find((p) => p.recipientId === "platform");
  assert.ok(platformPayout);
  assert.equal(platformPayout.totalNetCents, 350);
  assert.equal(platformPayout.flowCount, 3);

  // Total netted matches total volume exactly
  assert.equal(
    alphaPayout.totalNetCents + betaPayout.totalNetCents + platformPayout.totalNetCents,
    35000
  );
});

test("BatchSettlementEngine - rejects currency mismatch", () => {
  const flowUsd = FlowBuilder.create("order-usd", "USD")
    .payer("p1")
    .amount(1000)
    .addRemainderSplit("r1", "m1")
    .build();

  const batch = new BatchSettlementEngine("batch_eur", "EUR");
  assert.throws(
    () => batch.addFlow(flowUsd),
    /\[FLWP-ERR-7001\]/
  );
});
