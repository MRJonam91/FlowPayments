// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const cliPath = resolve("src/cli/index.ts");

test("CLI - trial command runs and verifies all invariants", () => {
  const output = execFileSync("node", [cliPath, "trial"], {
    encoding: "utf8",
    env: { ...process.env, NO_SPONSOR: "1" },
  });

  assert.ok(output.includes("VERIFIABLE TRIAL RESULT: PASSED"));
  assert.ok(output.includes("SCENARIO 1"));
  assert.ok(output.includes("SCENARIO 2"));
  assert.ok(output.includes("SCENARIO 3"));
  assert.ok(output.includes("Zero Floating-Point Discrepancy: Verified"));
});

test("CLI - presets command outputs JSON", () => {
  const output = execFileSync("node", [cliPath, "presets"], {
    encoding: "utf8",
    env: { ...process.env, NO_SPONSOR: "1" },
  });

  const parsed = JSON.parse(output);
  assert.ok(parsed.marketplace);
  assert.ok(parsed.milestone);
  assert.ok(parsed.waterfall);
});

test("CLI - version command", () => {
  const output = execFileSync("node", [cliPath, "--version"], {
    encoding: "utf8",
    env: { ...process.env, NO_SPONSOR: "1" },
  });

  assert.ok(output.includes("flowpayments v1.2.0-beta.1"));
});

test("CLI - fx conversion command", () => {
  const output = execFileSync("node", [cliPath, "fx", "10000", "EUR", "USD"], {
    encoding: "utf8",
    env: { ...process.env, NO_SPONSOR: "1" },
  });

  assert.ok(output.includes("FX Conversion:"));
  assert.ok(output.includes("$ 107.96"));
});

test("CLI - flowchart command", () => {
  const tmpFlowPath = resolve("tmp_flow.json");
  writeFileSync(
    tmpFlowPath,
    JSON.stringify({
      id: "cli_flow_test",
      title: "CLI Flow Test",
      description: "testing",
      currency: "EUR",
      totalAmountCents: 1000,
      payerId: "buyer_test",
      conditions: [],
      splits: [{ id: "s1", recipientId: "payee_test", type: "remainder", description: "all" }],
    })
  );

  try {
    const output = execFileSync("node", [cliPath, "flowchart", tmpFlowPath], {
      encoding: "utf8",
      env: { ...process.env, NO_SPONSOR: "1" },
    });
    assert.ok(output.includes("flowchart TD"));
    assert.ok(output.includes("buyer_test"));
  } finally {
    try {
      unlinkSync(tmpFlowPath);
    } catch {}
  }
});

test("CLI - inspect command", () => {
  const tmpFlowPath = resolve("tmp_inspect.json");
  writeFileSync(
    tmpFlowPath,
    JSON.stringify({
      id: "cli_inspect_test",
      title: "CLI Inspect Test",
      description: "inspecting",
      currency: "EUR",
      totalAmountCents: 5000,
      payerId: "p_inspect",
      conditions: [
        { id: "c1", type: "manual_approval", description: "Approval required", authorizedParties: ["admin"] }
      ],
      splits: [{ id: "s1", recipientId: "payee_inspect", type: "remainder", description: "all" }],
    })
  );

  try {
    const output = execFileSync("node", [cliPath, "inspect", tmpFlowPath], {
      encoding: "utf8",
      env: { ...process.env, NO_SPONSOR: "1" },
    });
    assert.ok(output.includes("FLOW EXPLANATION"));
    assert.ok(output.includes("CURRENT CONDITIONS STATUS"));
    assert.ok(output.includes("PENDING"));
  } finally {
    try {
      unlinkSync(tmpFlowPath);
    } catch {}
  }
});
