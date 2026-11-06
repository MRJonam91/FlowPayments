// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { FlowBuilder } from "../src/builder/index.ts";

test("FlowBuilder - builds a valid marketplace flow declaratively", () => {
  const flow = FlowBuilder.create("order-9912", "EUR")
    .title("E-Commerce Order with Carrier Gate")
    .description("Test description")
    .payer("buyer_123")
    .amount(25000) // €250.00
    .addEventCondition("cond_carrier", "Delivered confirmation", "status", "DELIVERED")
    .addFixedSplit("s_fixed", "platform_fee", 200, "Fixed processing fee", 10)
    .addPercentageSplit("s_commission", "platform_fee", 800, "8% commission", "gross", 20)
    .addRemainderSplit("s_merchant", "merchant_account", "Merchant net payout", 99)
    .withTimeout(86400000, "refund_payer")
    .metadata({ testMode: true })
    .build();

  assert.equal(flow.id, "order-9912");
  assert.equal(flow.currency, "EUR");
  assert.equal(flow.totalAmountCents, 25000);
  assert.equal(flow.payerId, "buyer_123");
  assert.equal(flow.splits?.length, 3);
  assert.equal(flow.conditions.length, 1);
  assert.equal(flow.timeoutMs, 86400000);
  assert.equal(flow.timeoutAction, "refund_payer");
});

test("FlowBuilder - throws error when building invalid configuration", () => {
  // Amount is 0
  assert.throws(
    () => FlowBuilder.create("invalid-zero").amount(0).build(),
    /\[FLWP-ERR-2001\]/
  );

  // Missing splits or milestones
  assert.throws(
    () => FlowBuilder.create("no-splits").amount(5000).build(),
    /\[FLWP-ERR-2001\]/
  );
});
