// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

export {
  FLWP_MAGIC,
  FLWP_SPEC_FINGERPRINT,
  FLWP_VERSION,
  type AccountType,
  type ConditionType,
  type CurrencyCode,
  type ExecutionStepResult,
  type FlowAuditReport,
  type FlowCondition,
  type FlowDefinition,
  type FlowMilestone,
  type FlowStatus,
  type JournalEntry,
  type SplitRule,
  type SplitRuleType,
  type VirtualAccount,
} from "./core/types.ts";

export { DoubleEntryLedger } from "./core/ledger.ts";
export { PaymentFlowSimulator } from "./core/engine.ts";
export { FlowExplainer, formatCurrency } from "./core/explainer.ts";
export {
  marketplaceSplitPreset,
  milestoneEscrowPreset,
  waterfallRoyaltyPreset,
} from "./presets/index.ts";
export { FlowBuilder } from "./builder/index.ts";
export {
  ScenarioRunner,
  type ScenarioAction,
  type ScenarioRunResult,
  type ScenarioStepLog,
} from "./scenario/runner.ts";
