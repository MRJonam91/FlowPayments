// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import type { FlowAuditReport, FlowCondition, FlowDefinition } from "./types.ts";

/**
 * Format integer cents into human currency string (e.g., 12550 -> "€ 125.50")
 */
export function formatCurrency(cents: number, currency = "EUR"): string {
  const symbol =
    currency === "EUR" ? "€" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency;
  const major = Math.floor(cents / 100);
  const minor = Math.abs(cents % 100).toString().padStart(2, "0");
  return `${symbol} ${major}.${minor}`;
}

/**
 * FlowExplainer
 * Translates complex conditional split rules and ledger journals into transparent, human explanations.
 */
export class FlowExplainer {
  /**
   * Generates bilingual human-readable summary of a payment flow definition
   */
  public static explainFlow(flow: FlowDefinition, lang: "it" | "en" = "en"): string {
    const isIt = lang === "it";
    const out: string[] = [];

    out.push(
      isIt
        ? `═══════════════════════════════════════════════════════════════\n SPIEGAZIONE DEL FLUSSO: ${flow.title.toUpperCase()}\n═══════════════════════════════════════════════════════════════`
        : `═══════════════════════════════════════════════════════════════\n FLOW EXPLANATION: ${flow.title.toUpperCase()}\n═══════════════════════════════════════════════════════════════`
    );

    out.push(
      isIt
        ? `• Importo Totale: ${formatCurrency(flow.totalAmountCents, flow.currency)}`
        : `• Total Deposit: ${formatCurrency(flow.totalAmountCents, flow.currency)}`
    );
    out.push(isIt ? `• Ordinante / Payer: ${flow.payerId}` : `• Payer: ${flow.payerId}`);
    out.push(
      isIt
        ? `• Destinazione Iniziale: Conto Escrow Vault (${flow.escrowVaultId ?? `vault_${flow.id}`})`
        : `• Initial Holding: Escrow Vault Account (${flow.escrowVaultId ?? `vault_${flow.id}`})`
    );
    out.push("");

    // Conditions
    out.push(isIt ? `── CONDIZIONI DI SBLOCCO ──` : `── RELEASE CONDITIONS ──`);
    if (flow.conditions.length === 0) {
      out.push(
        isIt
          ? `  (Nessuna condizione - rilascio immediato a richiesta)`
          : `  (No conditions - immediate release on demand)`
      );
    } else {
      flow.conditions.forEach((c, idx) => {
        let condDesc = "";
        if (c.type === "manual_approval" || c.type === "quorum_approval") {
          const quorum = c.quorumRequired ?? 1;
          const parties = c.authorizedParties?.join(", ") ?? "qualsiasi autorizzato";
          condDesc = isIt
            ? `Richiede ${quorum} firma/e da parte di: [${parties}]`
            : `Requires ${quorum} signature(s) from: [${parties}]`;
        } else if (c.type === "time_lock") {
          condDesc = isIt
            ? `Blocco temporale fino alla data/durata prevista`
            : `Time-lock until scheduled timestamp/duration`;
        } else if (c.type === "event_attestation") {
          condDesc = isIt
            ? `Attestazione evento: "${c.expectedEventKey}" = "${String(c.expectedEventValue)}"`
            : `Event attestation: "${c.expectedEventKey}" = "${String(c.expectedEventValue)}"`;
        } else {
          condDesc = `${c.type} (${c.subConditionIds?.join(", ")})`;
        }
        out.push(`  ${idx + 1}. [${c.id}] ${c.description} -> ${condDesc}`);
      });
    }
    out.push("");

    // Splits or Milestones
    if (flow.splits && flow.splits.length > 0) {
      out.push(isIt ? `── REGOLE DI RIPARTIZIONE (SPLITS) ──` : `── SPLIT ALLOCATION RULES ──`);
      flow.splits.forEach((s, idx) => {
        let ruleStr = "";
        if (s.type === "fixed") {
          ruleStr = isIt
            ? `Importo Fisso: ${formatCurrency(s.amountCents ?? 0, flow.currency)}`
            : `Fixed Amount: ${formatCurrency(s.amountCents ?? 0, flow.currency)}`;
        } else if (s.type === "percentage") {
          const pct = ((s.value ?? 0) <= 100 ? s.value ?? 0 : (s.value ?? 0) / 100).toFixed(2);
          ruleStr = isIt ? `Quota Percentuale: ${pct}%` : `Percentage Share: ${pct}%`;
        } else if (s.type === "waterfall") {
          ruleStr = isIt
            ? `Scaglione a Cascata (Cap: ${s.capCents ? formatCurrency(s.capCents, flow.currency) : "illimitato"})`
            : `Waterfall Tier (Cap: ${s.capCents ? formatCurrency(s.capCents, flow.currency) : "unlimited"})`;
        } else if (s.type === "remainder") {
          ruleStr = isIt
            ? `Resto Esatto (tutti i centesimi residui non allocati)`
            : `Exact Remainder (all leftover cents after rounding)`;
        }
        out.push(`  ${idx + 1}. -> Conto ${s.recipientId}: ${ruleStr} (${s.description})`);
      });
      out.push("");
    }

    if (flow.milestones && flow.milestones.length > 0) {
      out.push(isIt ? `── SCAGLIONI DI AVANZAMENTO (MILESTONES) ──` : `── PROGRESS MILESTONES ──`);
      flow.milestones.forEach((m, idx) => {
        out.push(
          `  ${idx + 1}. [${m.id}] "${m.title}" -> ${formatCurrency(m.amountCents, flow.currency)}`
        );
        out.push(
          isIt
            ? `     Vincolato a: [${m.conditionIds.join(", ")}]`
            : `     Gated by conditions: [${m.conditionIds.join(", ")}]`
        );
      });
      out.push("");
    }

    return out.join("\n");
  }

  /**
   * Generates a standard Mermaid Sequence Diagram representing the flow
   */
  public static toMermaidSequence(flow: FlowDefinition): string {
    const vaultId = flow.escrowVaultId ?? "EscrowVault";
    const participants = new Set<string>();
    participants.add(flow.payerId);
    participants.add(vaultId);

    if (flow.splits) {
      for (const s of flow.splits) participants.add(s.recipientId);
    }
    if (flow.milestones) {
      for (const m of flow.milestones) {
        for (const s of m.splits) participants.add(s.recipientId);
      }
    }

    const lines: string[] = ["sequenceDiagram", "  autonumber"];
    for (const p of participants) {
      lines.push(`  participant ${p.replace(/[^a-zA-Z0-9_]/g, "_")} as ${p}`);
    }

    const cleanPayer = flow.payerId.replace(/[^a-zA-Z0-9_]/g, "_");
    const cleanVault = vaultId.replace(/[^a-zA-Z0-9_]/g, "_");

    lines.push(
      `  ${cleanPayer}->>${cleanVault}: Deposit ${formatCurrency(flow.totalAmountCents, flow.currency)} (Escrow Lock)`
    );

    if (flow.conditions.length > 0) {
      lines.push(`  Note over ${cleanVault}: Evaluating: ${flow.conditions.map((c) => c.id).join(", ")}`);
    }

    if (flow.splits) {
      for (const s of flow.splits) {
        const cleanRec = s.recipientId.replace(/[^a-zA-Z0-9_]/g, "_");
        lines.push(`  ${cleanVault}->>${cleanRec}: Split Payout (${s.type})`);
      }
    }

    if (flow.milestones) {
      for (const m of flow.milestones) {
        lines.push(`  Note over ${cleanVault}: Milestone: ${m.title}`);
        for (const s of m.splits) {
          const cleanRec = s.recipientId.replace(/[^a-zA-Z0-9_]/g, "_");
          lines.push(`  ${cleanVault}->>${cleanRec}: Milestone Payout [${m.id}]`);
        }
      }
    }

    return lines.join("\n");
  }

  /**
   * Generates a Mermaid Flowchart diagram representing flow state and splits
   */
  public static toMermaidFlowchart(flow: FlowDefinition): string {
    const vaultId = flow.escrowVaultId ?? "EscrowVault";
    const cleanPayer = flow.payerId.replace(/[^a-zA-Z0-9_]/g, "_");
    const cleanVault = vaultId.replace(/[^a-zA-Z0-9_]/g, "_");
    const lines: string[] = ["flowchart TD"];

    lines.push(
      `  ${cleanPayer}["Payer: ${flow.payerId}"] -->|Deposit ${formatCurrency(flow.totalAmountCents, flow.currency)}| ${cleanVault}["Escrow Vault"]`
    );

    if (flow.conditions.length > 0) {
      lines.push(`  subgraph Conditions["Release Gate Conditions"]`);
      flow.conditions.forEach((c) => {
        const cleanC = c.id.replace(/[^a-zA-Z0-9_]/g, "_");
        lines.push(`    ${cleanC}["${c.id}: ${c.description}"]`);
      });
      lines.push(`  end`);
      lines.push(`  Conditions -.->|All Satisfied| ${cleanVault}`);
    }

    if (flow.splits) {
      lines.push(`  subgraph Payouts["Split Beneficiaries"]`);
      flow.splits.forEach((s) => {
        const cleanRec = s.recipientId.replace(/[^a-zA-Z0-9_]/g, "_");
        const detail =
          s.type === "percentage"
            ? `${(s.value ?? 0) <= 100 ? s.value ?? 0 : (s.value ?? 0) / 100}%`
            : s.type;
        lines.push(`    ${cleanVault} -->|Split: ${detail}| ${cleanRec}["${s.recipientId}"]`);
      });
      lines.push(`  end`);
    }

    return lines.join("\n");
  }

  /**
   * Formats execution audit summary
   */
  public static formatAuditReport(report: FlowAuditReport, lang: "it" | "en" = "en"): string {
    const isIt = lang === "it";
    const out: string[] = [];

    out.push(
      isIt
        ? `=================================================================\n CERTIFICATO DI AUDIT CONTABILE - FLOWPAYMENTS\n=================================================================`
        : `=================================================================\n FLOWPAYMENTS LEDGER AUDIT CERTIFICATE\n=================================================================`
    );
    out.push(isIt ? `ID Flusso: ${report.flowId}` : `Flow ID: ${report.flowId}`);
    out.push(isIt ? `Stato Finale: ${report.status}` : `Final Status: ${report.status}`);
    out.push(
      isIt
        ? `Deposito Iniziale: ${formatCurrency(report.initialDepositCents, report.currency)}`
        : `Initial Deposit: ${formatCurrency(report.initialDepositCents, report.currency)}`
    );
    out.push(
      isIt
        ? `Quadratura Bilancio: ${report.isBalanced ? "PERFETTA (Discrepanza: 0.00c)" : "ANOMALIA RILEVATA!"}`
        : `Ledger Balancing: ${report.isBalanced ? "PERFECT (Discrepancy: 0.00c)" : "DISCREPANCY DETECTED!"}`
    );
    out.push(isIt ? `Hash Immutabile SHA-256:` : `Immutable SHA-256 Hash:`);
    out.push(`  ${report.tamperProofHash}`);
    out.push("");

    out.push(isIt ? `── SALDI CONTI FINALI ──` : `── FINAL ACCOUNT BALANCES ──`);
    for (const acc of report.accounts) {
      out.push(
        `  • ${acc.name.padEnd(30)} [${acc.type.padEnd(12)}]: ${formatCurrency(acc.balanceCents, acc.currency)}`
      );
    }
    out.push("");

    out.push(
      isIt
        ? `── GIORNALE MOVIMENTI (${report.journalEntries.length} registrazioni) ──`
        : `── JOURNAL ENTRIES (${report.journalEntries.length} entries) ──`
    );
    for (const je of report.journalEntries) {
      out.push(
        `  #${je.sequence.toString().padStart(2, "0")} | ${je.debitAccount} -> ${je.creditAccount} | ${formatCurrency(je.amountCents, report.currency)} | ${je.narrative}`
      );
    }

    return out.join("\n");
  }

  /**
   * Formats a clear real-time diagnostic status tree of condition satisfaction
   */
  public static formatConditionStatus(
    conditions: FlowCondition[],
    lang: "it" | "en" = "en"
  ): string {
    const isIt = lang === "it";
    const out: string[] = [
      isIt ? "── STATO ATTUALE CONDIZIONI ──" : "── CURRENT CONDITIONS STATUS ──",
    ];
    for (const c of conditions) {
      const check = c.isSatisfied
        ? isIt
          ? "✔ SODDISFATTA"
          : "✔ SATISFIED"
        : isIt
          ? "⏳ IN ATTESA"
          : "⏳ PENDING";
      out.push(`  • [${c.id}] ${c.description} -> ${check}`);
      if (!c.isSatisfied && (c.type === "quorum_approval" || c.type === "manual_approval")) {
        const collected = c.approvalsCollected?.length ?? 0;
        const required = c.quorumRequired ?? 1;
        out.push(
          isIt
            ? `     Firme raccolte: ${collected}/${required}`
            : `     Signatures collected: ${collected}/${required}`
        );
      }
    }
    return out.join("\n");
  }
}
