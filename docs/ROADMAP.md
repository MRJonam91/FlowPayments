# Piano di Sviluppo / Roadmap — FlowPayments

Questo documento definisce la traiettoria evolutiva, i rilasci e gli obiettivi tecnici di FlowPayments.

---

## 📌 Release v1.0.0 (Stato Attuale / Current Stable)

La versione 1.0.0 stabilisce il nucleo fondativo del simulatore contabile deterministico e del motore di modellazione dei flussi:

- [x] **Aritmetica a Partita Doppia & Invarianti Rigorosi**: Integrità dei saldi con zero floating-point drift, basata solo su interi (centesimi).
- [x] **Audit Trail Crittografico**: Giornale immutabile con concatenazione hash SHA-256 (`tamper-evident`).
- [x] **Macchina a Stati Escrow**: Transizioni formali da deposito a sblocco, congelamento in contenzioso e rimborsi.
- [x] **Ripartizioni Avanzate (Splits)**: Quote fisse, percentuali lorde/nette, cascate a scaglioni (*waterfall*) e attribuzione del resto esatto (*remainder*).
- [x] **Condizioni Composte & Quorum**: Approvazioni multi-firma M-di-N, blocchi temporali (*time-locks*), oracoli/webhook di attestazione evento e combinazioni logiche `all_of`/`any_of`.
- [x] **Timeout Automatizzati**: Regole di scadenza automatica (`refund_payer`, `freeze_dispute`, `release_remainder`).
- [x] **Gestione Arbitrato e Dispute**: Addebito commissioni arbitrali e composizione con quadratura al centesimo.
- [x] **Fluent FlowBuilder**: API dichiarativa per comporre flussi con validazione schema automatica preventiva.
- [x] **Scripted ScenarioRunner**: Esecutore di cronologie temporali con asserzioni su stati e saldi.
- [x] **Simulatore FX Multivaluta**: Tassi di cambio deterministici e calcolo spread su EUR, USD, GBP, CHF.
- [x] **Batch Settlement Engine**: Aggregazione delle liquidazioni nette su ordini multipli con sigillo crittografico Merkle.
- [x] **Generazione Diagrammi Mermaid**: Esportazione automatica sia in `sequenceDiagram` che in `flowchart TD`.
- [x] **Interfaccia CLI Completa**: 10 comandi dedicati con zero dipendenze esterne a runtime.

---

## 🚀 Prossimi Traguardi / Future Horizons

### Versione 1.1 — Streaming & Continuous Amortization
- **Simulatore di Micropagamenti in Streaming**:
  - Modellazione di flussi continui al secondo (es. pay-as-you-go, noleggio risorse computazionali orarie, stipendi continui).
  - Meccanismo di accreditamento proporzionale al tempo con conservazione atomica del rateo non consumato.
- **Supporto Time-Travel Interattivo**:
  - Riproduzione temporale avanti/indietro (*scrubbing*) dello stato dell'escrow tramite snapshot sequenziali.

### Versione 1.2 — Abbonamenti Ricorrenti & Modelli di Rischio Churn
- **Simulatore Ciclo di Vita Sottoscrizioni**:
  - Modellazione di piani ricorrenti (mensili, annuali con sconti, periodi di prova gratuiti con conversione).
  - Simulazione stocastica di fallimenti di addebito (*smart retries*, *dunning*) e tassi di insoluto/chargeback.

### Versione 2.0 — WebAssembly & Adattatori Gateway
- **Compilazione Browser WASM**:
  - Playground web interattivo a zero dipendenze server, eseguibile direttamente nel browser dell'utente in modalità client-side protetta.
- **Adattatori di Esportazione per Gateway Reali**:
  - Generatori di configurazioni conformi per Stripe PaymentIntents con `transfer_data[destination]` e Adyen Split Payments DSL, consentendo di testare offline il modello e poi esportare le istruzioni esatte per l'integrazione con i gateway autorizzati.
