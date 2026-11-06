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
   - Politiche di timeout integrate (`refund_payer`, `freeze_dispute`, `release_remainder`).

3. **Composizione Fluida (`src/builder/index.ts`) e Scenari Scriptabili (`src/scenario/runner.ts`)**:
   - `FlowBuilder`: pattern fluente per costruire e validare contratti finanziari in poche righe di codice.
   - `ScenarioRunner`: motore di simulazione temporale con asserzioni su stati e saldi.

4. **Simulatore Multivaluta & FX (`src/fx/index.ts`)**:
   - Tassi di cambio con precisione a micro-unità ($10^6$) e detrazione spread/commissioni.

5. **Liquidazione a Lotti (`src/batch/index.ts`)**:
   - Consolidamento delle rimesse (*netted payouts*) tra flussi multipli con sigillo Merkle SHA-256.

6. **Spiegazione Umana e Trasparenza (`src/core/explainer.ts`)**:
   - Genera riepiloghi testuali ad alta leggibilità bilingui (IT/EN).
   - Genera diagrammi Mermaid Sequence e Flowchart TD.

7. **Confini Rigorosi**:
   - FlowPayments è esclusivamente un **simulatore offline**. Nessun wallet di custodia reale, nessun token speculativo, nessun trasferimento bancario diretto.

---

## 🇬🇧 Core Architecture

1. **Double-Entry Ledger Integrity (`src/core/ledger.ts`)**:
   - Atomic movements between debit and credit accounts using strict integer arithmetic (cents).
   - Cryptographically linked SHA-256 journal entries guarantee tamper-evident audit trails.

2. **Condition Engine & State Machine (`src/core/engine.ts`)**:
   - Formal state transitions from escrow lock to split releases.
   - Supports multi-signature quorum, event attestations, compound rules, and waterfall priorities.
   - Built-in dispute resolution paths simulate partial refunds and fee allocations.

3. **Fluent FlowBuilder & Scripted ScenarioRunner**:
   - Declarative fluent API with automated schema validation.
   - Scripted timeline execution engine with programmatic assertion checking.

4. **Multi-Currency FX & Batch Settlement Engines**:
   - Fixed-ratio micro-rate foreign exchange simulation with spread tracking.
   - High-throughput batch settlement engine producing netted payee balances and Merkle seals.

---

## 📋 Tabella Codici di Errore / Error Code Catalog

| Codice / Code | Descrizione / Description |
|---|---|
| `FLWP-ERR-1002` | Conto non trovato nel registro contabile / Account not found in ledger |
| `FLWP-ERR-1003` | Importo del trasferimento non valido (deve essere intero positivo) / Transfer amount must be positive integer cents |
| `FLWP-ERR-1004` | Discrepanza di valuta tra conti / Currency mismatch |
| `FLWP-ERR-1005` | Saldo insufficiente nel conto mittente / Insufficient balance in source account |
| `FLWP-ERR-1006` | Conto mittente e destinatario identici non ammessi / Source and destination account cannot be identical |
| `FLWP-ERR-2001` | Validazione fallita nel FlowBuilder / FlowBuilder validation failed |
| `FLWP-ERR-3091` | Somma degli scaglioni milestone diversa dal totale escrow / Milestone allocation sum mismatch |
| `FLWP-ERR-4022` | Condizione prerequisito non soddisfatta blocca il rilascio / Unmet condition blocks release |
| `FLWP-ERR-4023` | Milestone già rilasciata in precedenza / Milestone already released |
| `FLWP-ERR-4024` | Fondi del flusso già interamente rilasciati / Flow funds already fully released |
| `FLWP-ERR-4025` | Impossibile rilasciare fondi da stato rimborsato o annullato / Cannot release from refunded or cancelled status |
| `FLWP-ERR-4026` | Impossibile rilasciare fondi durante contenzioso attivo / Cannot release during active dispute |
| `FLWP-ERR-5001` | Asserzione di stato fallita nello scenario / Status assertion failed |
| `FLWP-ERR-5002` | Asserzione di saldo fallita nello scenario / Balance assertion failed |
| `FLWP-ERR-6001` | Importo negativo nella conversione FX / Negative amount in FX conversion |
| `FLWP-ERR-6002` | Coppia di valute non supportata / Unsupported FX currency pair |
| `FLWP-ERR-7001` | Discrepanza di valuta nella liquidazione a lotti / Batch currency mismatch |
