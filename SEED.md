# FlowPayments: decision seed / punto di partenza

IT — Scopo: Pagamenti condizionali e ripartiti sono difficili da integrare e spiegare. Prima prova: Simulatore offline di istruzioni di pagamento, stati e ripartizioni senza fondi reali.

EN — Purpose: Conditional and split payments are hard to integrate and explain. First trial: Offline simulator of payment instructions, states and splits without real funds.

## Stato / Status

- [x] **Prima prova verificabile / First verifiable slice**: Completata con successo. Motore offline deterministico con 3 scenari (Marketplace split con oracolo di consegna, Milestone escrow per freelance con approvazione a quorum, Waterfall royalty cascade).
- [x] **Invarianti e Quadratura Contabile**: Registro a partita doppia a zero-drift in centesimi interi, verifica automatica $\sum \text{debiti} == \sum \text{crediti}$ e concatenazione SHA-256.
- [x] **Spiegazione Umana**: Motore bilingue IT/EN di spiegazione testuale e generazione diagrammi Mermaid.
- [x] **Repository e Standard**: Allineato agli standard `_repo-kit/REPO-STANDARDS.md` (Apache-2.0, NOTICE, LICENSING.md, FUNDING.yml, CI workflows, test 100% passati, core < 1.500 LOC).

## Confini / Boundaries

Nessun trasferimento reale, custodia, token speculativo o claim di conformità normativo-bancaria diretta in questo simulatore.
