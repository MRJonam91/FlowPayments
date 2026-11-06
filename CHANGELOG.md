# Changelog — FlowPayments

Tutte le modifiche rilevanti a questo progetto sono documentate in questo file.
Il formato è basato su [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) e aderisce al [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-06 — Stable Production Release

### 🇮🇹 Novità / Added
- **Motore di Simulazione Contabile a Partita Doppia (`src/core/ledger.ts`)**:
  - Aritmetica sicura basata esclusivamente su numeri interi (centesimi di valuta) con zero drift da floating-point.
  - Registro immutabile con concatenazione crittografica (SHA-256 ledger hash chain).
  - Controllo automatico dell'invariante di quadratura: $\sum \text{debiti} == \sum \text{crediti}$ (discrepanza 0.00c).
- **Motore di Valutazione Condizionale & Macchina a Stati (`src/core/engine.ts`)**:
  - Macchina a stati finiti: `DRAFT`, `SIMULATED_DEPOSIT`, `ESCROW_LOCKED`, `PENDING_CONDITIONS`, `RELEASE_ELIGIBLE`, `EXECUTED_SPLIT`, `DISPUTED`, `REFUNDED`, `CANCELLED`.
  - Condizioni supportate: quorum approvativo (M-of-N sign-off), time-lock relativo e assoluto, oracoli ed eventi esterni, condizioni composte (`all_of`, `any_of`).
  - Politiche di timeout integrate (`refund_payer`, `freeze_dispute`, `release_remainder`).
  - Gestione dispute con addebito spese arbitrali e transazione bilanciata.
  - Split multi-party: quote fisse, quote percentuali (lorde o nette residue), cascate a scaglioni (*waterfall*) e allocazione del resto esatto (*remainder*).
- **Fluent FlowBuilder (`src/builder/index.ts`)**:
  - API fluida e modulare per comporre e validare preventivamente contratti finanziari e flussi di escrow.
- **ScenarioRunner Scriptabile (`src/scenario/runner.ts`)**:
  - Esecutore di cronologie temporali scriptate con asserzioni su stati (`assert_status`) e saldi (`assert_balance`).
- **BatchSettlementEngine (`src/batch/index.ts`)**:
  - Consolidamento delle rimesse (*netted payouts*) tra flussi multipli con sigillo crittografico Merkle SHA-256.
- **FxExchangeSimulator (`src/fx/index.ts`)**:
  - Tassi di cambio deterministici (EUR, USD, GBP, CHF) su micro-scala $10^6$ con detrazione spread commissionale.
- **Motore di Spiegazione e Visualizzazione (`src/core/explainer.ts`)**:
  - Spiegazione testuale bilingue trasparente di ogni centesimo movimentato.
  - Generazione diagrammi Mermaid Sequence e Flowchart TD.
  - Ispezione diagnostica dell'albero delle condizioni in tempo reale.
- **Interfaccia CLI Completa (`src/cli/index.ts`)**:
  - 10 comandi operativi: `trial`, `sim`, `explain`, `flowchart`, `inspect`, `scenario`, `batch`, `fx`, `presets`, `validate`.
  - Zero dipendenze runtime esterne (solo Node.js nativo 22+).
