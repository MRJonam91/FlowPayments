// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { PaymentFlowSimulator } from "../core/engine.ts";
import type {
  CurrencyCode,
  FlowCondition,
  FlowDefinition,
  FlowMilestone,
  SplitRule,
} from "../core/types.ts";

/**
 * FlowBuilder
 * Fluent builder API for declaratively designing validated payment flows.
 */
export class FlowBuilder {
  private _id: string;
  private _title = "";
  private _description = "";
  private _currency: CurrencyCode;
  private _totalAmountCents = 0;
  private _payerId = "";
  private _escrowVaultId?: string;
  private _conditions: FlowCondition[] = [];
  private _splits: SplitRule[] = [];
  private _milestones: FlowMilestone[] = [];
  private _timeoutMs?: number;
  private _timeoutAction?: "refund_payer" | "freeze_dispute" | "release_remainder";
  private _metadata: Record<string, unknown> = {};

  private constructor(id: string, currency: CurrencyCode = "EUR") {
    this._id = id;
    this._currency = currency;
  }

  public static create(id: string, currency: CurrencyCode = "EUR"): FlowBuilder {
    return new FlowBuilder(id, currency);
  }

  public title(title: string): this {
    this._title = title;
    return this;
  }

  public description(desc: string): this {
    this._description = desc;
    return this;
  }

  public payer(payerId: string): this {
    this._payerId = payerId;
    return this;
  }

  public escrowVault(vaultId: string): this {
    this._escrowVaultId = vaultId;
    return this;
  }

  public amount(amountCents: number): this {
    this._totalAmountCents = Math.trunc(amountCents);
    return this;
  }

  public addApprovalCondition(
    id: string,
    description: string,
    authorizedParties: string[],
    quorum = 1
  ): this {
    this._conditions.push({
      id,
      type: quorum > 1 ? "quorum_approval" : "manual_approval",
      description,
      authorizedParties,
      quorumRequired: quorum,
    });
    return this;
  }

  public addTimeLockCondition(id: string, description: string, releaseAfterMs: number): this {
    this._conditions.push({
      id,
      type: "time_lock",
      description,
      releaseAfterMs,
    });
    return this;
  }

  public addEventCondition(
    id: string,
    description: string,
    eventKey: string,
    expectedValue: unknown
  ): this {
    this._conditions.push({
      id,
      type: "event_attestation",
      description,
      expectedEventKey: eventKey,
      expectedEventValue: expectedValue as string | number | boolean,
    });
    return this;
  }

  public addFixedSplit(
    id: string,
    recipientId: string,
    amountCents: number,
    description = "",
    priority = 50
  ): this {
    this._splits.push({
      id,
      recipientId,
      type: "fixed",
      amountCents: Math.trunc(amountCents),
      priority,
      description,
    });
    return this;
  }

  public addPercentageSplit(
    id: string,
    recipientId: string,
    basisPointsOrPercent: number,
    description = "",
    basis: "gross" | "net_remaining" = "gross",
    priority = 50
  ): this {
    this._splits.push({
      id,
      recipientId,
      type: "percentage",
      value: basisPointsOrPercent,
      basis,
      priority,
      description,
    });
    return this;
  }

  public addWaterfallSplit(
    id: string,
    recipientId: string,
    capCents: number,
    description = "",
    priority = 10
  ): this {
    this._splits.push({
      id,
      recipientId,
      type: "waterfall",
      capCents: Math.trunc(capCents),
      priority,
      description,
    });
    return this;
  }

  public addRemainderSplit(
    id: string,
    recipientId: string,
    description = "",
    priority = 99
  ): this {
    this._splits.push({
      id,
      recipientId,
      type: "remainder",
      priority,
      description,
    });
    return this;
  }

  public withTimeout(
    timeoutMs: number,
    timeoutAction: "refund_payer" | "freeze_dispute" | "release_remainder"
  ): this {
    this._timeoutMs = timeoutMs;
    this._timeoutAction = timeoutAction;
    return this;
  }

  public addMilestone(milestone: FlowMilestone): this {
    this._milestones.push(milestone);
    return this;
  }

  public metadata(meta: Record<string, unknown>): this {
    this._metadata = { ...this._metadata, ...meta };
    return this;
  }

  /**
   * Finalizes and strictly validates the constructed flow
   */
  public build(): FlowDefinition {
    const flow: FlowDefinition = {
      id: this._id,
      title: this._title || this._id,
      description: this._description,
      currency: this._currency,
      totalAmountCents: this._totalAmountCents,
      payerId: this._payerId || "payer_default",
      escrowVaultId: this._escrowVaultId,
      conditions: this._conditions,
      splits: this._splits.length > 0 ? this._splits : undefined,
      milestones: this._milestones.length > 0 ? this._milestones : undefined,
      timeoutMs: this._timeoutMs,
      timeoutAction: this._timeoutAction,
      metadata: Object.keys(this._metadata).length > 0 ? this._metadata : undefined,
    };

    const validation = PaymentFlowSimulator.validate(flow);
    if (!validation.isValid) {
      throw new Error(
        `[FLWP-ERR-2001] FlowBuilder validation failed:\n  ${validation.errors.join("\n  ")}`
      );
    }

    return flow;
  }
}
