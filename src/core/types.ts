// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

/**
 * FlowPayments Core Domain Types & Specifications
 */

export const FLWP_MAGIC = 0x464c5750; // "FLWP" ASCII hex
export const FLWP_SPEC_FINGERPRINT = 0x012fe5fd; // Canonical fingerprint
export const FLWP_VERSION = "1.0.0";

export type CurrencyCode = "EUR" | "USD" | "GBP" | "CHF";

export type FlowStatus =
  | "DRAFT"
  | "SIMULATED_DEPOSIT"
  | "ESCROW_LOCKED"
  | "PENDING_CONDITIONS"
  | "RELEASE_ELIGIBLE"
  | "EXECUTED_SPLIT"
  | "DISPUTED"
  | "REFUNDED"
  | "CANCELLED";

export type AccountType =
  | "payer"
  | "payee"
  | "platform"
  | "escrow_vault"
  | "reserve"
  | "dispute_hold";

export interface VirtualAccount {
  id: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  balanceCents: number; // strictly integer cents
}

export type SplitRuleType = "fixed" | "percentage" | "waterfall" | "remainder";

export interface SplitRule {
  id: string;
  recipientId: string;
  type: SplitRuleType;
  /** Calculation basis: 'gross' (default) or 'net_remaining' */
  basis?: "gross" | "net_remaining";
  /** Percentage in basis points (e.g., 1000 = 10.00%, 10000 = 100%) or raw float percent if < 100 */
  value?: number;
  /** Fixed amount in cents if type === 'fixed' */
  amountCents?: number;
  /** Max ceiling in cents for waterfall rules */
  capCents?: number;
  /** Execution order priority (lower runs earlier) */
  priority?: number;
  description: string;
}

export type ConditionType =
  | "manual_approval"
  | "quorum_approval"
  | "time_lock"
  | "event_attestation"
  | "all_of"
  | "any_of";

export interface FlowCondition {
  id: string;
  type: ConditionType;
  description: string;
  /** For approvals: list of authorized party IDs */
  authorizedParties?: string[];
  /** Minimum number of required signatures */
  quorumRequired?: number;
  /** For time-lock: target UTC epoch timestamp in ms or relative duration from deposit in ms */
  releaseAfterMs?: number;
  /** For events: expected event key and value match */
  expectedEventKey?: string;
  expectedEventValue?: string | number | boolean;
  /** Sub-condition IDs for compound all_of / any_of */
  subConditionIds?: string[];
  /** Runtime evaluation state */
  isSatisfied?: boolean;
  satisfiedAt?: number;
  approvalsCollected?: string[];
}

export interface FlowMilestone {
  id: string;
  title: string;
  amountCents: number;
  conditionIds: string[];
  splits: SplitRule[];
  status: "PENDING" | "RELEASED" | "REFUNDED" | "DISPUTED";
  executedAt?: number;
}

export interface FlowDefinition {
  id: string;
  title: string;
  description: string;
  currency: CurrencyCode;
  totalAmountCents: number;
  payerId: string;
  escrowVaultId?: string;
  conditions: FlowCondition[];
  splits?: SplitRule[];
  milestones?: FlowMilestone[];
  timeoutAction?: "refund_payer" | "freeze_dispute" | "release_remainder";
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

export interface JournalEntry {
  entryId: string;
  sequence: number;
  timestamp: number;
  flowId: string;
  debitAccount: string;
  creditAccount: string;
  amountCents: number;
  narrative: string;
  prevHash: string;
  hash: string;
}

export interface ExecutionStepResult {
  step: string;
  timestamp: number;
  status: FlowStatus;
  journalEntries: JournalEntry[];
  unmetConditions: string[];
  notes: string;
}

export interface FlowAuditReport {
  flowId: string;
  currency: CurrencyCode;
  initialDepositCents: number;
  finalDistributedCents: number;
  status: FlowStatus;
  accounts: VirtualAccount[];
  journalEntries: JournalEntry[];
  isBalanced: boolean;
  tamperProofHash: string;
  discrepancyCents: number;
}
