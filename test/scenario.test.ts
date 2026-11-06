// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { FlowBuilder } from "../src/builder/index.ts";
import { ScenarioRunner } from "../src/scenario/runner.ts";

test("ScenarioRunner - executes full scripted scenario with assertions", () => {
  const flow = FlowBuilder.create("sc-test-1", "EUR")
    .title("Scripted Scenario Test")
    .payer("payer_alice")
    .amount(10000)
    .addApprovalCondition("c_approval", "Client Sign-off", ["payer_alice"])
    .addFixedSplit("s_fee", "platform_fee", 500, "Fixed fee")
    .addRemainderSplit("s_net", "seller_bob", "Net balance")
    .build();

  const runner = new ScenarioRunner(flow, 1000);

  const res = runner.runAll([
    { type: "assert_status", expectedStatus: "DRAFT" },
    { type: "deposit" },
    { type: "assert_status", expectedStatus: "ESCROW_LOCKED" },
    { type: "assert_balance", accountId: "vault_sc-test-1", expectedCents: 10000 },
    { type: "approve", conditionId: "c_approval", partyId: "payer_alice" },
    { type: "assert_status", expectedStatus: "RELEASE_ELIGIBLE" },
    { type: "release" },
    { type: "assert_status", expectedStatus: "EXECUTED_SPLIT" },
    { type: "assert_balance", accountId: "platform_fee", expectedCents: 500 },
    { type: "assert_balance", accountId: "seller_bob", expectedCents: 9500 },
    { type: "assert_balance", accountId: "vault_sc-test-1", expectedCents: 0 },
  ]);

  assert.equal(res.allAssertionsPassed, true);
  assert.equal(res.totalSteps, 11);
  assert.equal(res.auditReport.isBalanced, true);
});

test("ScenarioRunner - catches failed assertion", () => {
  const flow = FlowBuilder.create("sc-fail", "EUR")
    .payer("p1")
    .amount(5000)
    .addRemainderSplit("s1", "b1")
    .build();

  const runner = new ScenarioRunner(flow);
  assert.throws(
    () => runner.step({ type: "assert_status", expectedStatus: "EXECUTED_SPLIT" }),
    /\[FLWP-ERR-5001\]/
  );
});
