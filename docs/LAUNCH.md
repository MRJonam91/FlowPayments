# Checklist di Lancio / Launch Checklist — FlowPayments v1.0.0

Guida per la verifica di conformità e la pubblicazione di FlowPayments secondo lo standard `_repo-kit/REPO-STANDARDS.md`.

## Checklist di Rilascio

- [x] Licenza Apache-2.0 verificata e file `NOTICE` presente
- [x] File `LICENSING.md` bilingue con matrice di attribuzione e diritti
- [x] Canali di donazione attivi in `.github/FUNDING.yml` e nei `README`
- [x] Pipeline di Continuous Integration (GitHub Actions) configurata per Node.js 22 e 24
- [x] Guardia architetturale core verificata (< 1.500 LOC, attualmente 1.159 LOC)
- [x] Suite di test automatizzati completa (35/35 test passati al 100%, inclusi FX, Batch, Compound & Property tests)
- [x] Documentazione bilingue completa (Italiano / English)
- [x] Prova di laboratorio verificabile riproducibile (`flowpayments trial` / `npm run trial`)
- [x] Fluent FlowBuilder, ScenarioRunner, FxExchangeSimulator e BatchSettlementEngine integrati
- [x] Generazione diagrammi Mermaid (Sequence & Flowchart TD)
- [x] Comandi CLI completi: trial, sim, explain, flowchart, inspect, scenario, batch, fx, presets, validate
- [x] Nessuna dipendenza runtime esterna (zero third-party dependencies)
- [x] Anteprima visiva SVG (`docs/assets/demo.svg`) inclusa nei README
- [x] Audit di integrità del codice e firme di autenticità verificate
- [x] Inizializzazione repository locale e pubblicazione su GitHub (`MRJonam91/FlowPayments`)

## Canali di Promozione e Lancio

1. **Hacker News (Show HN)**:
   - Titolo: *Show HN: FlowPayments – Deterministic offline conditional & split payment simulator with double-entry audit*
   - Descrizione: Motore leggero in TypeScript zero-dipendenze per modellare escrow milestone, commissioni marketplace e cascate waterfall con quadratura contabile garantita.

2. **Reddit (r/fintech, r/typescript, r/node, r/selfhosted)**:
   - Condivisione dell'approccio offline-first con aritmetica sicura a numeri interi e journal immutabile SHA-256.

3. **Community Open Source & Fintech Architects**:
   - Dimostrazione di trasparenza contrattuale tramite spiegazioni automatiche bilingui e diagrammi Mermaid generati da DSL.
