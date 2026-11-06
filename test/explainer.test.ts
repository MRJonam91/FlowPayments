// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { FlowExplainer, formatCurrency } from "../src/core/explainer.ts";
import { marketplaceSplitPreset } from "../src/core/presets.ts";

test("FlowExplainer - formats currency accurately", () => {
  assert.equal(formatCurrency(10000, "EUR"), "€ 100.00");
  assert.equal(formatCurrency(150, "EUR"), "€ 1.50");
  assert.equal(formatCurrency(99, "USD"), "$ 0.99");
});

test("FlowExplainer - generates English and Italian explanation texts", () => {
  const enText = FlowExplainer.explainFlow(marketplaceSplitPreset, "en");
  const itText = FlowExplainer.explainFlow(marketplaceSplitPreset, "it");

  assert.ok(enText.includes("FLOW EXPLANATION"));
  assert.ok(enText.includes("Total Deposit: € 100.00"));

  assert.ok(itText.includes("SPIEGAZIONE DEL FLUSSO"));
  assert.ok(itText.includes("Importo Totale: € 100.00"));
});

test("FlowExplainer - generates valid Mermaid sequence diagram", () => {
  const mermaid = FlowExplainer.toMermaidSequence(marketplaceSplitPreset);
  assert.ok(mermaid.startsWith("sequenceDiagram"));
  assert.ok(mermaid.includes("buyer_alice->>vault_marketplace"));
});

test("FlowExplainer - generates valid Mermaid flowchart diagram", () => {
  const chart = FlowExplainer.toMermaidFlowchart(marketplaceSplitPreset);
  assert.ok(chart.startsWith("flowchart TD"));
  assert.ok(chart.includes("buyer_alice"));
  assert.ok(chart.includes("vault_marketplace"));
});
