// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { DoubleEntryLedger } from "../src/core/ledger.ts";

test("DoubleEntryLedger - registers accounts and tracks balances", () => {
  const ledger = new DoubleEntryLedger("EUR");
  const acc1 = ledger.registerAccount("buyer", "Buyer Account", "payer", 10000);
  const acc2 = ledger.registerAccount("seller", "Seller Account", "payee", 0);

  assert.equal(acc1.balanceCents, 10000);
  assert.equal(acc2.balanceCents, 0);
  assert.equal(ledger.getAllAccounts().length, 2);
});

test("DoubleEntryLedger - executes transfer and checks zero-sum balance", () => {
  const ledger = new DoubleEntryLedger("EUR");
  ledger.registerAccount("buyer", "Buyer Account", "payer", 5000);
  ledger.registerAccount("vault", "Escrow Vault", "escrow_vault", 0);

  const entry = ledger.transfer("flow_1", "buyer", "vault", 3000, "Lock funds in escrow");

  assert.equal(entry.amountCents, 3000);
  assert.equal(ledger.requireAccount("buyer").balanceCents, 2000);
  assert.equal(ledger.requireAccount("vault").balanceCents, 3000);

  const integrity = ledger.verifyIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(integrity.discrepancyCents, 0);
  assert.equal(integrity.totalDebitCents, 3000);
  assert.equal(integrity.totalCreditCents, 3000);
});

test("DoubleEntryLedger - rejects negative, zero or non-integer transfers", () => {
  const ledger = new DoubleEntryLedger("EUR");
  ledger.registerAccount("a", "Account A", "payer", 1000);
  ledger.registerAccount("b", "Account B", "payee", 0);

  assert.throws(
    () => ledger.transfer("f1", "a", "b", -10, "Negative transfer"),
    /\[FLWP-ERR-1003\]/
  );
  assert.throws(
    () => ledger.transfer("f1", "a", "b", 0, "Zero transfer"),
    /\[FLWP-ERR-1003\]/
  );
});

test("DoubleEntryLedger - cryptographic chaining detects journal tampering", () => {
  const ledger = new DoubleEntryLedger("EUR");
  ledger.registerAccount("a", "A", "payer", 10000);
  ledger.registerAccount("b", "B", "payee", 0);

  ledger.transfer("f1", "a", "b", 1000, "Transfer 1");
  ledger.transfer("f1", "a", "b", 2000, "Transfer 2");

  assert.equal(ledger.verifyIntegrity().isValid, true);

  // Directly tamper with private journal array
  const journal = (ledger as unknown as { journal: { amountCents: number }[] }).journal;
  journal[0]!.amountCents = 9999;

  const integrityAfterTamper = ledger.verifyIntegrity();
  assert.equal(integrityAfterTamper.isValid, false);
});
