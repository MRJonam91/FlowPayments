// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { DoubleEntryLedger } from "./ledger.ts";
import {
  FLWP_MAGIC,
  FLWP_SPEC_FINGERPRINT,
  type ExecutionStepResult,
  type FlowAuditReport,
  type FlowCondition,
  type FlowDefinition,
  type FlowStatus,
  type SplitRule,
} from "./types.ts";

/**
 * PaymentFlowSimulator
 * Deterministic offline state machine and split engine.
 */
export class PaymentFlowSimulator {
  public readonly flow: FlowDefinition;
  public readonly ledger: DoubleEntryLedger;
  private currentStatus: FlowStatus = "DRAFT";
  private simulatedClockMs: number;
  private conditionsState: Map<string, FlowCondition> = new Map();
  private executionHistory: ExecutionStepResult[] = [];
  public readonly magic = FLWP_MAGIC;
  public readonly specFingerprint = FLWP_SPEC_FINGERPRINT;

  constructor(flow: FlowDefinition, startTimeMs: number = Date.now()) {
    this.flow = flow;
    this.ledger = new DoubleEntryLedger(flow.currency);
    this.simulatedClockMs = startTimeMs;
    this.initializeLedgerAndConditions();
  }

  public getStatus(): FlowStatus {
    return this.currentStatus;
  }

  public getCurrentTime(): number {
    return this.simulatedClockMs;
  }

  public getConditions(): FlowCondition[] {
    return Array.from(this.conditionsState.values()).map((c) => ({ ...c }));
  }

  public getExecutionHistory(): ExecutionStepResult[] {
    return [...this.executionHistory];
  }

  private initializeLedgerAndConditions(): void {
    const vaultId = this.flow.escrowVaultId ?? `vault_${this.flow.id}`;
    this.ledger.registerAccount(
      this.flow.payerId,
      `Payer: ${this.flow.payerId}`,
      "payer",
      this.flow.totalAmountCents
    );
    this.ledger.registerAccount(
      vaultId,
      `Escrow Vault [${this.flow.id}]`,
      "escrow_vault",
      0
    );

    // Register splits recipient accounts
    const allSplits = [
      ...(this.flow.splits ?? []),
      ...(this.flow.milestones?.flatMap((m) => m.splits) ?? []),
    ];

    for (const split of allSplits) {
      if (!this.ledger.getAccount(split.recipientId)) {
        this.ledger.registerAccount(
          split.recipientId,
          `Beneficiary: ${split.recipientId}`,
          split.recipientId.includes("platform") || split.recipientId.includes("fee")
            ? "platform"
            : "payee",
          0
        );
      }
    }

    // Initialize condition states
    for (const cond of this.flow.conditions) {
      this.conditionsState.set(cond.id, {
        ...cond,
        isSatisfied: false,
        approvalsCollected: [],
      });
    }
  }

  /**
   * Validates structure, percentages, and remainder provisions before execution
   */
  public static validate(flow: FlowDefinition): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!flow.id || !flow.title) {
      errors.push("Flow must contain a valid 'id' and 'title'");
    }

    if (flow.totalAmountCents <= 0) {
      errors.push("Total amount must be greater than zero cents");
    }

    if (!flow.splits && (!flow.milestones || flow.milestones.length === 0)) {
      errors.push("Flow must define either global 'splits' or 'milestones'");
    }

    // Validate global splits if present
    if (flow.splits && flow.splits.length > 0) {
      let totalBps = 0;
      let fixedTotal = 0;
      let hasRemainder = false;

      for (const s of flow.splits) {
        if (s.type === "percentage") {
          totalBps += (s.value ?? 0) <= 100 ? (s.value ?? 0) * 100 : s.value ?? 0;
        } else if (s.type === "fixed") {
          fixedTotal += s.amountCents ?? 0;
        } else if (s.type === "remainder") {
          hasRemainder = true;
        }
      }

      if (fixedTotal > flow.totalAmountCents) {
        errors.push(
          `Fixed split allocations (${fixedTotal}c) exceed total deposit (${flow.totalAmountCents}c)`
        );
      }

      if (totalBps > 10000) {
        errors.push(
          `Percentage allocations exceed 100% (${(totalBps / 100).toFixed(2)}%)`
        );
      }

      if (totalBps < 10000 && fixedTotal === 0 && !hasRemainder) {
        warnings.push(
          `Percentage allocations total ${(totalBps / 100).toFixed(2)}% without a remainder rule. Remaining balance may remain in vault.`
        );
      }
    }

    // Validate milestone totals if present
    if (flow.milestones && flow.milestones.length > 0) {
      const milestoneSum = flow.milestones.reduce((acc, m) => acc + m.amountCents, 0);
      if (milestoneSum !== flow.totalAmountCents) {
        errors.push(
          `[FLWP-ERR-3091] Conditional split allocation sum does not equal total escrow deposit (milestones: ${milestoneSum}c vs total: ${flow.totalAmountCents}c)`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Step 1: Simulates payer depositing full funds into Escrow Vault
   */
  public depositSimulatedFunds(): ExecutionStepResult {
    if (this.currentStatus !== "DRAFT") {
      throw new Error(`Cannot deposit funds from status ${this.currentStatus}`);
    }

    const vaultId = this.flow.escrowVaultId ?? `vault_${this.flow.id}`;
    const transferEntry = this.ledger.transfer(
      this.flow.id,
      this.flow.payerId,
      vaultId,
      this.flow.totalAmountCents,
      `Simulated deposit of full payment amount to escrow vault`,
      this.simulatedClockMs
    );

    this.currentStatus = "ESCROW_LOCKED";
    const result: ExecutionStepResult = {
      step: "DEPOSIT_FUNDS",
      timestamp: this.simulatedClockMs,
      status: this.currentStatus,
      journalEntries: [transferEntry],
      unmetConditions: this.getUnmetConditionIds(),
      notes: `Funds (${this.flow.totalAmountCents}c ${this.flow.currency}) safely locked in escrow vault`,
    };

    this.executionHistory.push(result);
    return result;
  }

  /**
   * Advances simulated clock and triggers automated timeout policies
   */
  public advanceTime(ms: number): void {
    if (ms < 0) throw new Error("Time cannot travel backwards");
    this.simulatedClockMs += ms;
    this.evaluateConditions();

    if (
      this.flow.timeoutMs !== undefined &&
      this.simulatedClockMs >= this.flow.timeoutMs &&
      (this.currentStatus === "ESCROW_LOCKED" || this.currentStatus === "PENDING_CONDITIONS")
    ) {
      if (this.flow.timeoutAction === "refund_payer") {
        this.executeRefund("Escrow timeout expired - automated refund to payer");
      } else if (this.flow.timeoutAction === "freeze_dispute") {
        this.executeDispute("Escrow timeout expired - automated dispute freeze");
      } else if (this.flow.timeoutAction === "release_remainder") {
        this.executeRelease();
      }
    }
  }

  /**
   * Records approval from an authorized party
   */
  public recordApproval(conditionId: string, partyId: string): boolean {
    const cond = this.conditionsState.get(conditionId);
    if (!cond) {
      throw new Error(`Condition ${conditionId} not found`);
    }

    if (cond.type !== "manual_approval" && cond.type !== "quorum_approval") {
      throw new Error(`Condition ${conditionId} does not accept approvals`);
    }

    if (cond.authorizedParties && !cond.authorizedParties.includes(partyId)) {
      throw new Error(`Party ${partyId} is not authorized for condition ${conditionId}`);
    }

    cond.approvalsCollected = cond.approvalsCollected ?? [];
    if (!cond.approvalsCollected.includes(partyId)) {
      cond.approvalsCollected.push(partyId);
    }

    const requiredQuorum = cond.quorumRequired ?? cond.authorizedParties?.length ?? 1;
    if (cond.approvalsCollected.length >= requiredQuorum) {
      cond.isSatisfied = true;
      cond.satisfiedAt = this.simulatedClockMs;
    }

    this.evaluateConditions();
    return cond.isSatisfied ?? false;
  }

  /**
   * Submits an external attestation (carrier delivered, webhook, oracle)
   */
  public submitEvent(conditionId: string, eventKey: string, eventValue: unknown): boolean {
    const cond = this.conditionsState.get(conditionId);
    if (!cond) {
      throw new Error(`Condition ${conditionId} not found`);
    }

    if (cond.type !== "event_attestation") {
      throw new Error(`Condition ${conditionId} is not an event attestation`);
    }

    if (cond.expectedEventKey === eventKey && cond.expectedEventValue === eventValue) {
      cond.isSatisfied = true;
      cond.satisfiedAt = this.simulatedClockMs;
    }

    this.evaluateConditions();
    return cond.isSatisfied ?? false;
  }

  /**
   * Evaluates all conditions, including time-locks and compound rules
   */
  public evaluateConditions(): boolean {
    let anyChanged = false;

    for (const cond of this.conditionsState.values()) {
      if (cond.isSatisfied) continue;

      if (cond.type === "time_lock" && cond.releaseAfterMs !== undefined) {
        if (this.simulatedClockMs >= cond.releaseAfterMs) {
          cond.isSatisfied = true;
          cond.satisfiedAt = this.simulatedClockMs;
          anyChanged = true;
        }
      } else if (cond.type === "all_of" && cond.subConditionIds) {
        const allSatisfied = cond.subConditionIds.every(
          (subId) => this.conditionsState.get(subId)?.isSatisfied === true
        );
        if (allSatisfied) {
          cond.isSatisfied = true;
          cond.satisfiedAt = this.simulatedClockMs;
          anyChanged = true;
        }
      } else if (cond.type === "any_of" && cond.subConditionIds) {
        const anySatisfied = cond.subConditionIds.some(
          (subId) => this.conditionsState.get(subId)?.isSatisfied === true
        );
        if (anySatisfied) {
          cond.isSatisfied = true;
          cond.satisfiedAt = this.simulatedClockMs;
          anyChanged = true;
        }
      }
    }

    const unmet = this.getUnmetConditionIds();
    if (this.currentStatus === "ESCROW_LOCKED" && unmet.length === 0) {
      this.currentStatus = "RELEASE_ELIGIBLE";
      anyChanged = true;
    }

    return anyChanged;
  }

  public getUnmetConditionIds(): string[] {
    return Array.from(this.conditionsState.values())
      .filter((c) => !c.isSatisfied)
      .map((c) => c.id);
  }

  /**
   * Computes split amounts with exact integer math and remainder preservation
   */
  public static calculateSplits(
    totalAmountCents: number,
    rules: SplitRule[]
  ): { recipientId: string; amountCents: number; rule: SplitRule }[] {
    const allocations: { recipientId: string; amountCents: number; rule: SplitRule }[] = [];
    let distributedCents = 0;
    let remainderRule: SplitRule | undefined;

    // 1. Sort by priority if defined
    const sorted = [...rules].sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50));

    // 2. Process fixed, percentage, and waterfall splits
    for (const rule of sorted) {
      if (rule.type === "remainder") {
        remainderRule = rule;
        continue;
      }

      const remaining = Math.max(0, totalAmountCents - distributedCents);
      let alloc = 0;

      if (rule.type === "fixed") {
        alloc = Math.min(rule.amountCents ?? 0, remaining);
      } else if (rule.type === "percentage") {
        const bps = (rule.value ?? 0) <= 100 ? (rule.value ?? 0) * 100 : rule.value ?? 0;
        const base = rule.basis === "net_remaining" ? remaining : totalAmountCents;
        alloc = Math.min(Math.floor((base * bps) / 10000), remaining);
      } else if (rule.type === "waterfall") {
        const cap = rule.capCents ?? remaining;
        alloc = Math.min(cap, remaining);
      }

      allocations.push({
        recipientId: rule.recipientId,
        amountCents: alloc,
        rule,
      });
      distributedCents += alloc;
    }

    // 3. Process remainder if specified
    if (remainderRule) {
      const leftover = Math.max(0, totalAmountCents - distributedCents);
      allocations.push({
        recipientId: remainderRule.recipientId,
        amountCents: leftover,
        rule: remainderRule,
      });
      distributedCents += leftover;
    }

    return allocations;
  }

  /**
   * Executes release of funds according to configured splits
   */
  public executeRelease(milestoneId?: string): ExecutionStepResult {
    const unmet = this.getUnmetConditionIds();
    const vaultId = this.flow.escrowVaultId ?? `vault_${this.flow.id}`;
    const vault = this.ledger.requireAccount(vaultId);

    // If milestone execution
    if (milestoneId) {
      const milestone = this.flow.milestones?.find((m) => m.id === milestoneId);
      if (!milestone) {
        throw new Error(`Milestone ${milestoneId} not found`);
      }

      if (milestone.status === "RELEASED") {
        throw new Error(`[FLWP-ERR-4023] Milestone ${milestoneId} has already been released`);
      }

      const unmetMilestoneConditions = milestone.conditionIds.filter(
        (cid) => !this.conditionsState.get(cid)?.isSatisfied
      );

      if (unmetMilestoneConditions.length > 0) {
        throw new Error(
          `[FLWP-ERR-4022] Unmet prerequisite condition blocks release transition: ${unmetMilestoneConditions.join(", ")}`
        );
      }

      const entries = [];
      const splits = PaymentFlowSimulator.calculateSplits(milestone.amountCents, milestone.splits);

      for (const s of splits) {
        if (s.amountCents > 0) {
          const entry = this.ledger.transfer(
            this.flow.id,
            vaultId,
            s.recipientId,
            s.amountCents,
            `Milestone [${milestone.title}] release to ${s.recipientId} (${s.rule.description})`,
            this.simulatedClockMs
          );
          entries.push(entry);
        }
      }

      milestone.status = "RELEASED";
      milestone.executedAt = this.simulatedClockMs;

      const allMilestonesDone = this.flow.milestones?.every((m) => m.status === "RELEASED");
      if (allMilestonesDone) {
        this.currentStatus = "EXECUTED_SPLIT";
      }

      const result: ExecutionStepResult = {
        step: `RELEASE_MILESTONE_${milestoneId}`,
        timestamp: this.simulatedClockMs,
        status: this.currentStatus,
        journalEntries: entries,
        unmetConditions: this.getUnmetConditionIds(),
        notes: `Milestone ${milestone.title} successfully released (${milestone.amountCents}c)`,
      };
      this.executionHistory.push(result);
      return result;
    }

    // Global release
    if (this.currentStatus === "EXECUTED_SPLIT") {
      throw new Error(`[FLWP-ERR-4024] Flow funds have already been fully released`);
    }
    if (this.currentStatus === "REFUNDED" || this.currentStatus === "CANCELLED") {
      throw new Error(`[FLWP-ERR-4025] Cannot release funds from status ${this.currentStatus}`);
    }
    if (this.currentStatus === "DISPUTED") {
      throw new Error(`[FLWP-ERR-4026] Cannot execute release while flow is under active dispute`);
    }

    if (unmet.length > 0) {
      throw new Error(
        `[FLWP-ERR-4022] Unmet prerequisite condition blocks release transition: ${unmet.join(", ")}`
      );
    }

    const rules = this.flow.splits ?? [];
    const entries = [];
    const splits = PaymentFlowSimulator.calculateSplits(vault.balanceCents, rules);

    for (const s of splits) {
      if (s.amountCents > 0) {
        const entry = this.ledger.transfer(
          this.flow.id,
          vaultId,
          s.recipientId,
          s.amountCents,
          `Global release to ${s.recipientId} (${s.rule.description})`,
          this.simulatedClockMs
        );
        entries.push(entry);
      }
    }

    this.currentStatus = "EXECUTED_SPLIT";
    const result: ExecutionStepResult = {
      step: "RELEASE_ALL_SPLITS",
      timestamp: this.simulatedClockMs,
      status: this.currentStatus,
      journalEntries: entries,
      unmetConditions: [],
      notes: `Escrow splits executed: all funds released`,
    };
    this.executionHistory.push(result);
    return result;
  }

  /**
   * Executes a full or partial refund back to payer
   */
  public executeRefund(reason: string, refundAmountCents?: number): ExecutionStepResult {
    const vaultId = this.flow.escrowVaultId ?? `vault_${this.flow.id}`;
    const vault = this.ledger.requireAccount(vaultId);
    const amount = refundAmountCents ?? vault.balanceCents;

    if (amount <= 0) {
      throw new Error("No funds available in escrow to refund");
    }

    const entry = this.ledger.transfer(
      this.flow.id,
      vaultId,
      this.flow.payerId,
      amount,
      `Refund to payer: ${reason}`,
      this.simulatedClockMs
    );

    this.currentStatus = vault.balanceCents === 0 ? "REFUNDED" : "ESCROW_LOCKED";
    const result: ExecutionStepResult = {
      step: "REFUND_PAYER",
      timestamp: this.simulatedClockMs,
      status: this.currentStatus,
      journalEntries: [entry],
      unmetConditions: this.getUnmetConditionIds(),
      notes: `Refund of ${amount}c processed. Reason: ${reason}`,
    };
    this.executionHistory.push(result);
    return result;
  }

  /**
   * Raises a dispute, locking funds and optionally deducting arbitration fee
   */
  public executeDispute(
    reason: string,
    arbitrationFeeCents = 0,
    feeRecipientId?: string
  ): ExecutionStepResult {
    const entries = [];
    if (arbitrationFeeCents > 0 && feeRecipientId) {
      const vaultId = this.flow.escrowVaultId ?? `vault_${this.flow.id}`;
      if (!this.ledger.getAccount(feeRecipientId)) {
        this.ledger.registerAccount(
          feeRecipientId,
          `Arbitrator: ${feeRecipientId}`,
          "platform",
          0
        );
      }
      entries.push(
        this.ledger.transfer(
          this.flow.id,
          vaultId,
          feeRecipientId,
          arbitrationFeeCents,
          `Arbitration fee: ${reason}`,
          this.simulatedClockMs
        )
      );
    }

    this.currentStatus = "DISPUTED";
    const result: ExecutionStepResult = {
      step: "DISPUTE_RAISED",
      timestamp: this.simulatedClockMs,
      status: this.currentStatus,
      journalEntries: entries,
      unmetConditions: this.getUnmetConditionIds(),
      notes: `Escrow release frozen due to dispute: ${reason}`,
    };
    this.executionHistory.push(result);
    return result;
  }

  /**
   * Resolves a dispute with custom split between payer and seller
   */
  public resolveDispute(
    buyerRefundPercent: number,
    sellerPayoutPercent: number,
    sellerAccountId: string
  ): ExecutionStepResult {
    if (this.currentStatus !== "DISPUTED") {
      throw new Error("Can only resolve an active dispute");
    }

    const vaultId = this.flow.escrowVaultId ?? `vault_${this.flow.id}`;
    const vault = this.ledger.requireAccount(vaultId);
    const available = vault.balanceCents;

    const buyerRefundCents = Math.floor((available * buyerRefundPercent) / 100);
    const sellerPayoutCents = Math.min(
      Math.floor((available * sellerPayoutPercent) / 100),
      available - buyerRefundCents
    );

    const entries = [];
    if (buyerRefundCents > 0) {
      entries.push(
        this.ledger.transfer(
          this.flow.id,
          vaultId,
          this.flow.payerId,
          buyerRefundCents,
          `Dispute settlement: ${buyerRefundPercent}% refund to buyer`,
          this.simulatedClockMs
        )
      );
    }

    if (sellerPayoutCents > 0) {
      entries.push(
        this.ledger.transfer(
          this.flow.id,
          vaultId,
          sellerAccountId,
          sellerPayoutCents,
          `Dispute settlement: ${sellerPayoutPercent}% payout to seller`,
          this.simulatedClockMs
        )
      );
    }

    this.currentStatus = "EXECUTED_SPLIT";
    const result: ExecutionStepResult = {
      step: "RESOLVE_DISPUTE",
      timestamp: this.simulatedClockMs,
      status: this.currentStatus,
      journalEntries: entries,
      unmetConditions: [],
      notes: `Dispute settled. Buyer received ${buyerRefundCents}c, Seller received ${sellerPayoutCents}c`,
    };
    this.executionHistory.push(result);
    return result;
  }

  /**
   * Generates comprehensive verifiable audit report with tamper-evident checks
   */
  public generateAuditReport(): FlowAuditReport {
    const integrity = this.ledger.verifyIntegrity();
    const vaultId = this.flow.escrowVaultId ?? `vault_${this.flow.id}`;
    const vault = this.ledger.requireAccount(vaultId);

    const accounts = this.ledger.getAllAccounts();
    const distributedCents = accounts
      .filter((a) => a.type === "payee" || a.type === "platform")
      .reduce((sum, a) => sum + a.balanceCents, 0);

    return {
      flowId: this.flow.id,
      currency: this.flow.currency,
      initialDepositCents: this.flow.totalAmountCents,
      finalDistributedCents: distributedCents,
      status: this.currentStatus,
      accounts,
      journalEntries: this.ledger.getJournal(),
      isBalanced: integrity.isValid && integrity.discrepancyCents === 0,
      tamperProofHash: this.ledger.getLatestHash(),
      discrepancyCents: integrity.discrepancyCents,
    };
  }
}
