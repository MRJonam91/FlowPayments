// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { FxExchangeSimulator } from "../src/fx/index.ts";

test("FxExchangeSimulator - identity conversion for identical currencies", () => {
  const fx = new FxExchangeSimulator();
  const res = fx.convert(10000, "EUR", "EUR");

  assert.equal(res.sourceAmountCents, 10000);
  assert.equal(res.grossTargetCents, 10000);
  assert.equal(res.spreadFeeCents, 0);
  assert.equal(res.netTargetCents, 10000);
  assert.equal(res.effectiveRate, 1.0);
});

test("FxExchangeSimulator - converts EUR to USD with integer math & spread deduction", () => {
  const fx = new FxExchangeSimulator();
  // 10000 cents (€100.00) at 1.085000 rate -> gross 10850 cents ($108.50)
  // Spread: 50 bps = 0.50% of 10850 = floor(54.25) = 54 cents
  // Net: 10850 - 54 = 10796 cents ($107.96)
  const res = fx.convert(10000, "EUR", "USD");

  assert.equal(res.sourceAmountCents, 10000);
  assert.equal(res.grossTargetCents, 10850);
  assert.equal(res.spreadFeeCents, 54);
  assert.equal(res.netTargetCents, 10796);
  assert.equal(res.effectiveRate, 1.085);
});

test("FxExchangeSimulator - custom rate configuration and custom spread", () => {
  const fx = new FxExchangeSimulator();
  fx.setRate("EUR", "CHF", 950000, 100); // 0.9500 with 1.00% spread

  const res = fx.convert(20000, "EUR", "CHF");
  // Gross: (20000 * 950000) / 1000000 = 19000
  // Fee: (19000 * 100) / 10000 = 190
  // Net: 19000 - 190 = 18810
  assert.equal(res.grossTargetCents, 19000);
  assert.equal(res.spreadFeeCents, 190);
  assert.equal(res.netTargetCents, 18810);
});

test("FxExchangeSimulator - throws on unsupported currency pair", () => {
  const fx = new FxExchangeSimulator();
  assert.throws(
    () => fx.convert(1000, "GBP", "CHF"),
    /\[FLWP-ERR-6002\]/
  );
});
