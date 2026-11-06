# Architettura / Architecture — FlowPayments

```
                      ┌────────────────────────────────────────┐
                      │    Payer / Client Simulated Account    │
                      │       (Balance: e.g. 10,000 cents)     │
                      └───────────────────┬────────────────────┘
                                          │ 1. Initial Deposit (100%)
                                          ▼
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │                           FlowPayments Escrow Vault                             │
  │                         (Status: ESCROW_LOCKED)                                 │
  │                                                                                 │
  │  2. Condition Evaluation Engine:                                                │
  │     ├── Manual Approval & Quorum (M-of-N Sign-Offs)                            │
  │     ├── Time-Locks & Cooling-Off Windows                                        │
  │     ├── External Attestation (Carrier Webhooks / Oracles)                       │
  │     └── Compound Boolean Rules (all_of / any_of)                                │
  │                                                                                 │
  │  3. Double-Entry Immutable Ledger:                                              │
  │     ├── Integer-Only Cents Math (Zero Floating-Point Drift)                     │
  │     ├── Cryptographically Chained SHA-256 Journal Entries                       │
  │     └── Balance Invariant: Debit == Credit (Discrepancy == 0.00c)               │
  │                                                                                 │
  │  4. Split Allocation & Remainder Router:                                        │
  │     ├── Priority Order Execution (Waterfall Recoupment)                         │
  │     ├── Fixed Processing & Gateway Fees                                         │
  │     ├── Percentage Allocations (Gross or Net Remaining Pool)                    │
  │     └── Remainder Account (Guarantees 100% exact cent distribution)             │
  └───────────────────┬───────────────────┬───────────────────┬─────────────────────┘
                      │                   │                   │
                      ▼                   ▼                   ▼
           ┌────────────────────┐┌─────────────────┐┌────────────────────┐
           │   Platform Fee     ││ Affiliate Bonus ││   Merchant / Dev   │
           │  (e.g. 10% + €1.50)││   (e.g. 3%)     ││  (Exact Remainder) │
           └────────────────────┘└─────────────────┘└────────────────────┘
```

## 🇮🇹 Concetti Fondamentali

1. **Aritmetica Contabile a Partita Doppia (`src/core/ledger.ts`)**:
   - Qualsiasi movimento è registrato come trasferimento atomico da un conto di debito a uno di credito.
   - Tutti i valori monetari sono rappresentati in numeri interi positivi (centesimi di valuta, ad es. 10.000 centesimi = € 100,00).
   - È impossibile creare o distruggere denaro nel simulatore: l'invariante contabile $\sum \text{debiti} == \sum \text{crediti}$ viene verificato su ogni transizione.
   - Il giornale contabile è concatenato con hash crittografici SHA-256: qualsiasi manipolazione retroattiva rende invalido l'intero audit trail.

2. **Macchina a Stati e Valutatore di Condizioni (`src/core/engine.ts`)**:
   - Gli stati consentiti sono: `DRAFT`, `SIMULATED_DEPOSIT`, `ESCROW_LOCKED`, `PENDING_CONDITIONS`, `RELEASE_ELIGIBLE`, `EXECUTED_SPLIT`, `DISPUTED`, `REFUNDED`, `CANCELLED`.
   - I fondi restano bloccati nell'escrow vault finché tutti i requisiti (es. oracolo di consegna pacco, approvazione cliente, quorum QA) non sono soddisfatti.
   - Supporto a scenari di contenzioso (`DISPUTED`): congelamento immediato e composizione arbitrale con percentuali di rimborso all'acquirente e liquidazione al venditore.

3. **Spiegazione Umana e Trasparenza (`src/core/explainer.ts`)**:
   - Nessun "algoritmo a scatola chiusa": genera riepiloghi testuali ad alta leggibilità sia in italiano che in inglese.
   - Genera diagrammi Mermaid Sequence per documentare visivamente contratti intelligenti, flussi marketplace e accordi milestone.

4. **Confini Rigorosi**:
   - FlowPayments è esclusivamente un **simulatore offline**. Nessun wallet di custodia reale, nessun token speculativo, nessun trasferimento bancario diretto.

---

## 🇬🇧 Core Architecture

1. **Double-Entry Ledger Integrity (`src/core/ledger.ts`)**:
   - Transfers represent atomic movements between debit and credit accounts.
   - All balances and values use strict integer arithmetic (cents) preventing IEEE-754 floating point inaccuracies.
   - Cryptographically linked SHA-256 journal entries guarantee tamper-evident audit trails.

2. **Condition Engine & State Machine (`src/core/engine.ts`)**:
   - Manages formal state transitions from escrow lock to split releases.
   - Supports multi-signature quorum, event attestations, and waterfall priorities.
   - Built-in dispute resolution paths simulate partial refunds and fee allocations.

3. **Human Explainability (`src/core/explainer.ts`)**:
   - Translates raw financial parameters into plain language reports and Mermaid sequence diagrams.
