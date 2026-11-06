// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { PaymentFlowSimulator } from "../src/core/engine.ts";
import type { FlowDefinition } from "../src/core/types.ts";

test("Compound Conditions - all_of requires all sub-conditions satisfied", () => {
  const flow: FlowDefinition = {
    id: "compound_all_of",
    title: "Compound All Of Test",
    description: "Requires approval and event",
    currency: "EUR",
    totalAmountCents: 10000,
    payerId: "payer_1",
    conditions: [
      {
        id: "c_sub1",
        type: "manual_approval",
        description: "Manager approval",
        authorizedParties: ["manager_joe"],
      },
      {
        id: "c_sub2",
        type: "event_attestation",
        description: "Warehouse status",
        expectedEventKey: "status",
        expectedEventValue: "DISPATCHED",
      },
      {
        id: "c_compound",
        type: "all_of",
        description: "Both manager signoff AND dispatch required",
        subConditionIds: ["c_sub1", "c_sub2"],
      },
    ],
    splits: [
      { id: "s1", recipientId: "payee_1", type: "remainder", description: "All balance" },
    ],
  };

  const sim = new PaymentFlowSimulator(flow);
  sim.depositSimulatedFunds();

  // Satisfy only sub 1
  sim.recordApproval("c_sub1", "manager_joe");
  assert.equal(sim.getConditions().find((c) => c.id === "c_compound")?.isSatisfied, false);
  assert.equal(sim.getStatus(), "ESCROW_LOCKED");

  // Satisfy sub 2 -> triggers compound satisfaction
  sim.submitEvent("c_sub2", "status", "DISPATCHED");
  assert.equal(sim.getConditions().find((c) => c.id === "c_compound")?.isSatisfied, true);
  assert.equal(sim.getStatus(), "RELEASE_ELIGIBLE");

  sim.executeRelease();
  assert.equal(sim.getStatus(), "EXECUTED_SPLIT");
});

test("Compound Conditions - any_of satisfies on first sub-condition met", () => {
  const flow: FlowDefinition = {
    id: "compound_any_of",
    title: "Compound Any Of Test",
    description: "Either client OR supervisor can sign off",
    currency: "EUR",
    totalAmountCents: 5000,
    payerId: "payer_2",
    conditions: [
      {
        id: "c_client",
        type: "manual_approval",
        description: "Client signoff",
        authorizedParties: ["client_a"],
      },
      {
        id: "c_supervisor",
        type: "manual_approval",
        description: "Supervisor signoff",
        authorizedParties: ["supervisor_b"],
      },
      {
        id: "c_any",
        type: "any_of",
        description: "Either party approval unlocks escrow",
        subConditionIds: ["c_client", "c_supervisor"],
      },
    ],
    splits: [
      { id: "s1", recipientId: "payee_2", type: "remainder", description: "All balance" },
    ],
  };

  const sim = new PaymentFlowSimulator(flow);
  sim.depositSimulatedFunds();

  // Supervisor signs off alone
  sim.recordApproval("c_supervisor", "supervisor_b");
  assert.equal(sim.getConditions().find((c) => c.id === "c_any")?.isSatisfied, true);
});
