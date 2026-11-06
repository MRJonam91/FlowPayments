// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { createHash } from "node:crypto";
import { PaymentFlowSimulator } from "../core/engine.ts";
import type { CurrencyCode, FlowAuditReport, FlowDefinition } from "../core/types.ts";

export interface AggregatedPayout {
  recipientId: string;
  totalNetCents: number;
  flowCount: number;
  flowIds: string[];
}

export interface BatchSettlementSummary {
  batchId: string;
  timestamp: number;
  currency: CurrencyCode;
  totalFlowsCount: number;
  totalVolumeCents: number;
  aggregatedPayouts: AggregatedPayout[];
  flowAuditReports: FlowAuditReport[];
  isFullyBalanced: boolean;
  batchDigest: string;
}

/**
 * BatchSettlementEngine
 * Aggregates payouts across multiple independent payment flows into netted, verifiable batch disbursements.
 */
export class BatchSettlementEngine {
  private readonly flows: FlowDefinition[] = [];
  public readonly batchId: string;
  public readonly currency: CurrencyCode;

  constructor(batchId: string, currency: CurrencyCode = "EUR") {
    this.batchId = batchId;
    this.currency = currency;
  }

  public addFlow(flow: FlowDefinition): this {
    if (flow.currency !== this.currency) {
      throw new Error(
        `[FLWP-ERR-7001] Batch currency mismatch: flow ${flow.id} is in ${flow.currency}, batch requires ${this.currency}`
      );
    }
    this.flows.push(flow);
    return this;
  }

  /**
   * Executes all flows in the batch and computes netted payouts and cryptographic batch seal
   */
  public executeBatch(): BatchSettlementSummary {
    const reports: FlowAuditReport[] = [];
    const payoutMap = new Map<string, { totalNetCents: number; flowIds: string[] }>();
    let totalVolumeCents = 0;
    let isFullyBalanced = true;

    for (const flow of this.flows) {
      const sim = new PaymentFlowSimulator(flow);
      sim.depositSimulatedFunds();

      // If all conditions are already satisfied or none present, release
      if (sim.getUnmetConditionIds().length === 0) {
        sim.executeRelease();
      }

      const report = sim.generateAuditReport();
      reports.push(report);

      if (!report.isBalanced || report.discrepancyCents !== 0) {
        isFullyBalanced = false;
      }

      totalVolumeCents += flow.totalAmountCents;

      // Aggregate beneficiary payouts
      for (const acc of report.accounts) {
        if (acc.type === "payee" || acc.type === "platform") {
          if (acc.balanceCents > 0) {
            const existing = payoutMap.get(acc.id) ?? { totalNetCents: 0, flowIds: [] };
            existing.totalNetCents += acc.balanceCents;
            existing.flowIds.push(flow.id);
            payoutMap.set(acc.id, existing);
          }
        }
      }
    }

    const aggregatedPayouts: AggregatedPayout[] = Array.from(payoutMap.entries()).map(
      ([recipientId, data]) => ({
        recipientId,
        totalNetCents: data.totalNetCents,
        flowCount: data.flowIds.length,
        flowIds: data.flowIds,
      })
    );

    // Cryptographic batch digest (merkle-like SHA-256 combination of flow hashes)
    const combinedHashSource = reports.map((r) => `${r.flowId}:${r.tamperProofHash}`).join("|");
    const batchDigest = createHash("sha256")
      .update(`${this.batchId}:${totalVolumeCents}:${combinedHashSource}`)
      .digest("hex");

    return {
      batchId: this.batchId,
      timestamp: Date.now(),
      currency: this.currency,
      totalFlowsCount: this.flows.length,
      totalVolumeCents,
      aggregatedPayouts,
      flowAuditReports: reports,
      isFullyBalanced,
      batchDigest,
    };
  }
}
