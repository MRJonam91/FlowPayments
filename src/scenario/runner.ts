// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { PaymentFlowSimulator } from "../core/engine.ts";
import type {
  ExecutionStepResult,
  FlowAuditReport,
  FlowDefinition,
  FlowStatus,
} from "../core/types.ts";

export type ScenarioAction =
  | { type: "deposit" }
  | { type: "advance_time"; ms: number }
  | { type: "approve"; conditionId: string; partyId: string }
  | { type: "event"; conditionId: string; key: string; value: unknown }
  | { type: "release"; milestoneId?: string }
  | { type: "refund"; reason: string; amountCents?: number }
  | { type: "dispute"; reason: string; feeCents?: number; feeRecipientId?: string }
  | { type: "resolve_dispute"; buyerRefundPct: number; sellerPayoutPct: number; sellerId: string }
  | { type: "assert_status"; expectedStatus: FlowStatus }
  | { type: "assert_balance"; accountId: string; expectedCents: number };

export interface ScenarioStepLog {
  actionIndex: number;
  action: ScenarioAction;
  timestamp: number;
  status: FlowStatus;
  notes: string;
  stepResult?: ExecutionStepResult;
}

export interface ScenarioRunResult {
  flowId: string;
  totalSteps: number;
  finalStatus: FlowStatus;
  stepLogs: ScenarioStepLog[];
  auditReport: FlowAuditReport;
  allAssertionsPassed: boolean;
}

/**
 * ScenarioRunner
 * Executes scripted timeline simulations and verifies assertions.
 */
export class ScenarioRunner {
  public readonly simulator: PaymentFlowSimulator;
  private readonly stepLogs: ScenarioStepLog[] = [];

  constructor(flow: FlowDefinition, startTimeMs: number = Date.now()) {
    this.simulator = new PaymentFlowSimulator(flow, startTimeMs);
  }

  public step(action: ScenarioAction): ScenarioStepLog {
    const idx = this.stepLogs.length;
    let stepRes: ExecutionStepResult | undefined;
    let note = "";

    switch (action.type) {
      case "deposit":
        stepRes = this.simulator.depositSimulatedFunds();
        note = `Deposited ${this.simulator.flow.totalAmountCents}c into escrow vault`;
        break;

      case "advance_time":
        this.simulator.advanceTime(action.ms);
        note = `Advanced time by ${action.ms}ms (clock: ${this.simulator.getCurrentTime()})`;
        break;

      case "approve":
        const satisfied = this.simulator.recordApproval(action.conditionId, action.partyId);
        note = `Party ${action.partyId} approved ${action.conditionId} (satisfied: ${satisfied})`;
        break;

      case "event":
        const evSat = this.simulator.submitEvent(action.conditionId, action.key, action.value);
        note = `Submitted event [${action.key}=${String(action.value)}] to ${action.conditionId} (satisfied: ${evSat})`;
        break;

      case "release":
        stepRes = this.simulator.executeRelease(action.milestoneId);
        note = action.milestoneId ? `Released milestone ${action.milestoneId}` : "Released all splits";
        break;

      case "refund":
        stepRes = this.simulator.executeRefund(action.reason, action.amountCents);
        note = `Refunded: ${action.reason}`;
        break;

      case "dispute":
        stepRes = this.simulator.executeDispute(action.reason, action.feeCents, action.feeRecipientId);
        note = `Dispute raised: ${action.reason}`;
        break;

      case "resolve_dispute":
        stepRes = this.simulator.resolveDispute(
          action.buyerRefundPct,
          action.sellerPayoutPct,
          action.sellerId
        );
        note = `Dispute resolved: ${action.buyerRefundPct}% buyer, ${action.sellerPayoutPct}% seller`;
        break;

      case "assert_status":
        const current = this.simulator.getStatus();
        if (current !== action.expectedStatus) {
          throw new Error(
            `[FLWP-ERR-5001] Status assertion failed at step #${idx}: expected ${action.expectedStatus}, got ${current}`
          );
        }
        note = `Assertion passed: status === ${current}`;
        break;

      case "assert_balance":
        const acc = this.simulator.ledger.requireAccount(action.accountId);
        if (acc.balanceCents !== action.expectedCents) {
          throw new Error(
            `[FLWP-ERR-5002] Balance assertion failed at step #${idx} for ${action.accountId}: expected ${action.expectedCents}c, got ${acc.balanceCents}c`
          );
        }
        note = `Assertion passed: ${action.accountId} balance === ${acc.balanceCents}c`;
        break;
    }

    const log: ScenarioStepLog = {
      actionIndex: idx,
      action,
      timestamp: this.simulator.getCurrentTime(),
      status: this.simulator.getStatus(),
      notes: note,
      stepResult: stepRes,
    };

    this.stepLogs.push(log);
    return log;
  }

  public runAll(actions: ScenarioAction[]): ScenarioRunResult {
    for (const a of actions) {
      this.step(a);
    }

    const auditReport = this.simulator.generateAuditReport();
    return {
      flowId: this.simulator.flow.id,
      totalSteps: this.stepLogs.length,
      finalStatus: this.simulator.getStatus(),
      stepLogs: [...this.stepLogs],
      auditReport,
      allAssertionsPassed: true,
    };
  }
}
