# Contributing to FlowPayments / Linee Guida di Contributo

## 🇮🇹 Come contribuire

Grazie per l'interesse a contribuire a FlowPayments!

### Regole d'oro:
1. **DCO (Developer Certificate of Origin)**: Ogni commit deve essere firmato digitalmente con l'opzione `-s` (`git commit -s -m "feat: ..."`), attestando la paternità del codice secondo [developercertificate.org](https://developercertificate.org/).
2. **Confini Operativi**: FlowPayments è un **simulatore offline** deterministico. Nessun modulo deve gestire denaro reale, wallet con chiavi di custodia o claim di conformità bancaria diretta.
3. **Guardia Architetturale (< 1.500 LOC)**: Il core contabile e decisionale in `src/core/` deve rimanere snello, trasparente e leggibile in meno di un'ora.
4. **Precisione e Invarianti**: Tutti i conteggi monetari avvengono in numeri interi (centesimi o centesimi di base point). Non sono ammessi arrotondamenti a virgola mobile non bilanciati.

### Flusso di sviluppo:
```bash
npm install
npm run typecheck
npm test
npm run trial
```

---

## 🇬🇧 How to contribute

Thank you for your interest in improving FlowPayments!

### Core rules:
1. **DCO (Developer Certificate of Origin)**: Every commit must be signed-off using `-s` (`git commit -s -m "feat: ..."`), confirming code authorship per [developercertificate.org](https://developercertificate.org/).
2. **Operational Boundaries**: FlowPayments is an **offline simulator**. Modules must never manage real funds, live custody keys, or assert unverified banking compliance.
3. **Core Size Guard (< 1,500 LOC)**: The core engine in `src/core/` must remain concise, readable, and auditable in under one hour.
4. **Precision & Invariants**: All currency calculations use strict integer arithmetic (cents). Floating-point drift and unbalanced allocations are rejected by invariants.

### Development commands:
```bash
npm install
npm run typecheck
npm test
npm run trial
```
