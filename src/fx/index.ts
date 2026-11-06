// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import type { CurrencyCode } from "../core/types.ts";

export interface FxRateConfig {
  sourceCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  /** Exchange rate scaled by 1,000,000 (e.g., 1.0850 EUR/USD = 1,085,000) */
  microRate: number;
  /** Spread/conversion fee in basis points (e.g., 50 = 0.50%) */
  spreadBps?: number;
}

export interface FxConversionResult {
  sourceCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  sourceAmountCents: number;
  grossTargetCents: number;
  spreadFeeCents: number;
  netTargetCents: number;
  effectiveRate: number;
}

/**
 * FxExchangeSimulator
 * Offline deterministic foreign exchange rate simulator with integer math.
 */
export class FxExchangeSimulator {
  private readonly rates = new Map<string, FxRateConfig>();

  constructor() {
    this.registerStandardRates();
  }

  private registerStandardRates(): void {
    // Reference standard snapshot rates
    this.setRate("EUR", "USD", 1085000, 50); // 1.0850 USD/EUR, 0.50% spread
    this.setRate("USD", "EUR", 921659, 50);  // 0.9216 EUR/USD, 0.50% spread
    this.setRate("EUR", "GBP", 855000, 50);  // 0.8550 GBP/EUR, 0.50% spread
    this.setRate("GBP", "EUR", 1169590, 50); // 1.1695 EUR/GBP, 0.50% spread
    this.setRate("EUR", "CHF", 965000, 50);  // 0.9650 CHF/EUR, 0.50% spread
    this.setRate("CHF", "EUR", 1036269, 50); // 1.0362 EUR/CHF, 0.50% spread
  }

  public setRate(
    sourceCurrency: CurrencyCode,
    targetCurrency: CurrencyCode,
    microRate: number,
    spreadBps = 0
  ): void {
    const key = `${sourceCurrency}_${targetCurrency}`;
    this.rates.set(key, {
      sourceCurrency,
      targetCurrency,
      microRate: Math.trunc(microRate),
      spreadBps: Math.trunc(spreadBps),
    });
  }

  public getRate(
    sourceCurrency: CurrencyCode,
    targetCurrency: CurrencyCode
  ): FxRateConfig | undefined {
    if (sourceCurrency === targetCurrency) {
      return {
        sourceCurrency,
        targetCurrency,
        microRate: 1000000,
        spreadBps: 0,
      };
    }
    return this.rates.get(`${sourceCurrency}_${targetCurrency}`);
  }

  /**
   * Converts source cents to target cents with exact integer math
   */
  public convert(
    sourceAmountCents: number,
    sourceCurrency: CurrencyCode,
    targetCurrency: CurrencyCode,
    customSpreadBps?: number
  ): FxConversionResult {
    const safeSource = Math.trunc(sourceAmountCents);
    if (safeSource < 0) {
      throw new Error(`[FLWP-ERR-6001] Source amount cannot be negative: ${sourceAmountCents}`);
    }

    if (sourceCurrency === targetCurrency) {
      return {
        sourceCurrency,
        targetCurrency,
        sourceAmountCents: safeSource,
        grossTargetCents: safeSource,
        spreadFeeCents: 0,
        netTargetCents: safeSource,
        effectiveRate: 1.0,
      };
    }

    const rateConfig = this.getRate(sourceCurrency, targetCurrency);
    if (!rateConfig) {
      throw new Error(
        `[FLWP-ERR-6002] No exchange rate defined for pair ${sourceCurrency}/${targetCurrency}`
      );
    }

    const spreadBps = customSpreadBps !== undefined ? Math.trunc(customSpreadBps) : (rateConfig.spreadBps ?? 0);

    // Exact integer computation: (source * microRate) / 1,000,000
    const grossTargetCents = Math.floor((safeSource * rateConfig.microRate) / 1000000);
    const spreadFeeCents = Math.floor((grossTargetCents * spreadBps) / 10000);
    const netTargetCents = Math.max(0, grossTargetCents - spreadFeeCents);

    return {
      sourceCurrency,
      targetCurrency,
      sourceAmountCents: safeSource,
      grossTargetCents,
      spreadFeeCents,
      netTargetCents,
      effectiveRate: rateConfig.microRate / 1000000,
    };
  }
}
