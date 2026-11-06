// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { createHash } from "node:crypto";
import type {
  AccountType,
  CurrencyCode,
  JournalEntry,
  VirtualAccount,
} from "./types.ts";

/**
 * DoubleEntryLedger
 * Implements a strict, immutable, double-entry bookkeeping journal.
 * Every movement transfers integer cents between accounts with zero floating point drift.
 * All entries are cryptographically chained via SHA-256 hashes.
 */
export class DoubleEntryLedger {
  public readonly defaultCurrency: CurrencyCode;
  private readonly accounts = new Map<string, VirtualAccount>();
  private readonly journal: JournalEntry[] = [];
  private sequenceCounter = 0;
  private lastHash = "0000000000000000000000000000000000000000000000000000000000000000";

  constructor(defaultCurrency: CurrencyCode = "EUR") {
    this.defaultCurrency = defaultCurrency;
  }

  /**
   * Registers a virtual account or returns existing one
   */
  public registerAccount(
    id: string,
    name: string,
    type: AccountType,
    initialBalanceCents = 0,
    currency: CurrencyCode = this.defaultCurrency
  ): VirtualAccount {
    const existing = this.accounts.get(id);
    if (existing) {
      return existing;
    }

    const account: VirtualAccount = {
      id,
      name,
      type,
      currency,
      balanceCents: Math.trunc(initialBalanceCents),
    };
    this.accounts.set(id, account);
    return account;
  }

  public getAccount(id: string): VirtualAccount | undefined {
    return this.accounts.get(id);
  }

  public requireAccount(id: string): VirtualAccount {
    const acc = this.accounts.get(id);
    if (!acc) {
      throw new Error(`[FLWP-ERR-1002] Account not found in ledger: ${id}`);
    }
    return acc;
  }

  public getAllAccounts(): VirtualAccount[] {
    return Array.from(this.accounts.values()).map((acc) => ({ ...acc }));
  }

  public getJournal(): JournalEntry[] {
    return this.journal.map((j) => ({ ...j }));
  }

  /**
   * Records a transfer from debitAccount to creditAccount.
   * In accounting terminology:
   *  - Payer/Vault decreases: credited
   *  - Recipient increases: debited (or simplified cash flow: from -> to)
   * We treat:
   *  - debitAccount = Source (losing balance in funds transfer)
   *  - creditAccount = Destination (gaining balance in funds transfer)
   * Exact zero-sum movement: source -amount, dest +amount.
   */
  public transfer(
    flowId: string,
    sourceAccountId: string,
    destAccountId: string,
    amountCents: number,
    narrative: string,
    timestamp: number = Date.now()
  ): JournalEntry {
    const safeAmount = Math.trunc(amountCents);
    if (safeAmount <= 0) {
      throw new Error(
        `[FLWP-ERR-1003] Transfer amount must be positive integer cents, received: ${amountCents}`
      );
    }

    const source = this.requireAccount(sourceAccountId);
    const dest = this.requireAccount(destAccountId);

    if (source.currency !== dest.currency) {
      throw new Error(
        `[FLWP-ERR-1004] Currency mismatch: ${source.currency} vs ${dest.currency}`
      );
    }

    if (source.balanceCents < safeAmount && source.type !== "payer") {
      throw new Error(
        `[FLWP-ERR-1005] Insufficient balance in ${sourceAccountId}: available ${source.balanceCents}c, required ${safeAmount}c`
      );
    }

    source.balanceCents -= safeAmount;
    dest.balanceCents += safeAmount;

    this.sequenceCounter += 1;
    const entryId = `je_${flowId}_${this.sequenceCounter.toString().padStart(4, "0")}`;
    const payload = `${entryId}:${this.sequenceCounter}:${timestamp}:${flowId}:${sourceAccountId}:${destAccountId}:${safeAmount}:${this.lastHash}`;
    const currentHash = createHash("sha256").update(payload).digest("hex");

    const entry: JournalEntry = {
      entryId,
      sequence: this.sequenceCounter,
      timestamp,
      flowId,
      debitAccount: sourceAccountId,
      creditAccount: destAccountId,
      amountCents: safeAmount,
      narrative,
      prevHash: this.lastHash,
      hash: currentHash,
    };

    this.lastHash = currentHash;
    this.journal.push(entry);
    return entry;
  }

  /**
   * Validates cryptographic hash chaining and balance conservation.
   */
  public verifyIntegrity(): {
    isValid: boolean;
    brokenIndex?: number;
    totalDebitCents: number;
    totalCreditCents: number;
    discrepancyCents: number;
  } {
    let prev = "0000000000000000000000000000000000000000000000000000000000000000";
    let totalDebitCents = 0;
    let totalCreditCents = 0;

    for (let i = 0; i < this.journal.length; i++) {
      const e = this.journal[i];
      if (!e) continue;
      if (e.prevHash !== prev) {
        return {
          isValid: false,
          brokenIndex: i,
          totalDebitCents,
          totalCreditCents,
          discrepancyCents: Math.abs(totalDebitCents - totalCreditCents),
        };
      }

      const payload = `${e.entryId}:${e.sequence}:${e.timestamp}:${e.flowId}:${e.debitAccount}:${e.creditAccount}:${e.amountCents}:${e.prevHash}`;
      const expectedHash = createHash("sha256").update(payload).digest("hex");
      if (expectedHash !== e.hash) {
        return {
          isValid: false,
          brokenIndex: i,
          totalDebitCents,
          totalCreditCents,
          discrepancyCents: Math.abs(totalDebitCents - totalCreditCents),
        };
      }

      totalDebitCents += e.amountCents;
      totalCreditCents += e.amountCents;
      prev = e.hash;
    }

    return {
      isValid: true,
      totalDebitCents,
      totalCreditCents,
      discrepancyCents: 0,
    };
  }

  public getLatestHash(): string {
    return this.lastHash;
  }
}
