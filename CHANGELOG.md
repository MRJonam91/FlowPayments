# Changelog — FlowPayments

Tutte le modifiche rilevanti a questo progetto sono documentate in questo file.
Il formato è basato su [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) e aderisce al [Semantic Versioning](https://semver.org/).

## [1.1.0-alpha.1] - 2026-11-06

### 🇮🇹 Novità / Added
- **FlowBuilder (`src/builder/index.ts`)**:
  - API fluida per la composizione dichiarativa di flussi di pagamento, condizioni di sblocco e regole di split con validazione integrata preventiva.
- **ScenarioRunner (`src/scenario/runner.ts`)**:
  - Esecutore di scenari temporali scriptati con supporto per asserzioni atomiche su stati (`assert_status`) e saldi di conto (`assert_balance`).
- **Politiche di Timeout Automatizzate**:
  - Gestione scadenze con azioni configurabili su timeout (`refund_payer`, `freeze_dispute`, `release_remainder`).
- **Contenziosi & Arbitrato con Trattenuta**:
  - Supporto per tariffe di arbitrato/mediazione detratte dall'escrow e risoluzione bilanciata al 100%.
- **Diagrammi di Flusso Mermaid Flowchart (`toMermaidFlowchart`)**:
  - Esportazione visiva sia in `sequenceDiagram` che in `flowchart TD`.
- **Suite di Test Property-Based**:
  - Validazione invarianti su 1.000 importi casuali e test di conservazione su split da 1 centesimo (€0,01).

---

## [1.0.0] - 2026-11-06

### 🇮🇹 Novità / Added
- **Motore di Simulazione Contabile a Partita Doppia (`src/core/ledger.ts`)**:
  - Aritmetica sicura basata esclusivamente su interi (centesimi di valuta) con zero drift di floating point.
  - Registro immutabile con concatenazione crittografica (SHA-256 ledger hash chain).
  - Controllo automatico dell'invariante di quadratura: $\sum \text{debiti} == \sum \text{crediti}$ per ogni transizione di stato.
- **Motore di Valutazione Condizionale (`src/core/engine.ts`)**:
  - Macchina a stati finiti con gestione transizioni: `DRAFT`, `SIMULATED_DEPOSIT`, `ESCROW_LOCKED`, `PENDING_CONDITIONS`, `RELEASE_ELIGIBLE`, `EXECUTED_SPLIT`, `DISPUTED`, `REFUNDED`.
  - Condizioni supportate: quorum approvativo (M-of-N sign-off), time-lock relativo e assoluto, trigger di eventi esterni/oracoli.
  - Split multi-party avanzati: percentuali con gestione automatica del resto (cent remainder), importi fissi, waterfall a scaglioni con cap.
- **Motore di Spiegazione e Visualizzazione (`src/core/explainer.ts`)**:
  - Spiegazione testuale umana, dettagliata e trasparente di ogni centesimo movimentato (bilingue IT/EN).
  - Generatore di diagrammi Mermaid (sequenza ed evoluzione degli stati).
  - Generatore di ricevute di audit con digest crittografico.
- **CLI & Prova di Laboratorio Verificabile (`src/cli/index.ts`)**:
  - Comandi `trial`, `run`, `explain`, `validate`.
  - Presets integrati per Marketplace, Milestone Escrow e Waterfall Royaties.
  - Test suite completa con 100% test passati e zero dipendenze esterne a runtime.
