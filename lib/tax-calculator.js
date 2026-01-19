const Decimal = require("decimal.js");

class TaxCalculator {
  constructor() {
    this.taxRates = new Map();
    this.taxLots = new Map(); // FIFO/LIFO tracking
    this.taxReports = new Map();
  }

  /**
   * Set user's tax configuration
   */
  setTaxConfig(userId, config) {
    this.taxRates.set(userId, {
      country: config.country || "US",
      method: config.method || "FIFO", // FIFO, LIFO, HIFO
      shortTermRate: config.shortTermRate || 0.37, // 37% for US
      longTermRate: config.longTermRate || 0.20, // 20% for US
      holdingPeriod: config.holdingPeriod || 365, // Days for long-term
    });
  }

  /**
   * Record purchase for tax lot tracking
   */
  recordPurchase(userId, asset, amount, price, timestamp = new Date()) {
    const key = `${userId}_${asset}`;
    if (!this.taxLots.has(key)) {
      this.taxLots.set(key, []);
    }

    this.taxLots.get(key).push({
      asset,
      amount: new Decimal(amount),
      costBasis: new Decimal(price),
      purchaseDate: timestamp,
      remaining: new Decimal(amount),
    });
  }

  /**
   * Calculate gain/loss on sale
   */
  calculateGainLoss(userId, asset, amount, salePrice, saleDate = new Date()) {
    const config = this.taxRates.get(userId) || { method: "FIFO" };
    const key = `${userId}_${asset}`;
    const lots = this.taxLots.get(key) || [];

    let remainingToSell = new Decimal(amount);
    const transactions = [];
    let totalGain = new Decimal(0);

    // Sort lots based on method
    const sortedLots = this.sortLots(lots, config.method);

    for (const lot of sortedLots) {
      if (remainingToSell.lessThanOrEqualTo(0)) break;
      if (lot.remaining.lessThanOrEqualTo(0)) continue;

      const sellAmount = Decimal.min(lot.remaining, remainingToSell);
      const proceeds = sellAmount.times(salePrice);
      const costBasis = sellAmount.times(lot.costBasis);
      const gain = proceeds.minus(costBasis);

      const holdingDays = Math.floor(
        (saleDate - lot.purchaseDate) / (1000 * 60 * 60 * 24)
      );
      const isLongTerm = holdingDays >= config.holdingPeriod;

      transactions.push({
        asset,
        amount: sellAmount.toString(),
        purchaseDate: lot.purchaseDate,
        saleDate,
        costBasis: costBasis.toString(),
        proceeds: proceeds.toString(),
        gain: gain.toString(),
        isLongTerm,
        holdingDays,
        taxRate: isLongTerm ? config.longTermRate : config.shortTermRate,
      });

      lot.remaining = lot.remaining.minus(sellAmount);
      remainingToSell = remainingToSell.minus(sellAmount);
      totalGain = totalGain.plus(gain);
    }

    return {
      transactions,
      totalGain: totalGain.toString(),
      shortTermGain: transactions
        .filter((t) => !t.isLongTerm)
        .reduce((sum, t) => sum.plus(t.gain), new Decimal(0))
        .toString(),
      longTermGain: transactions
        .filter((t) => t.isLongTerm)
        .reduce((sum, t) => sum.plus(t.gain), new Decimal(0))
        .toString(),
    };
  }

  /**
   * Sort tax lots based on method
   */
  sortLots(lots, method) {
    const sorted = [...lots];
    switch (method) {
      case "FIFO": // First In First Out
        return sorted.sort((a, b) => a.purchaseDate - b.purchaseDate);
      case "LIFO": // Last In First Out
        return sorted.sort((a, b) => b.purchaseDate - a.purchaseDate);
      case "HIFO": // Highest In First Out
        return sorted.sort((a, b) => b.costBasis.minus(a.costBasis));
      default:
        return sorted;
    }
  }

  /**
   * Generate annual tax report
   */
  generateAnnualReport(userId, year) {
    const config = this.taxRates.get(userId);
    if (!config) {
      throw new Error("Tax configuration not found");
    }

    // Collect all transactions for the year
    const transactions = [];
    for (const [key, lots] of this.taxLots) {
      if (!key.startsWith(`${userId}_`)) continue;

      // In production, would filter by actual sale transactions
      // This is simplified
    }

    const shortTermGains = transactions
      .filter((t) => !t.isLongTerm)
      .reduce((sum, t) => sum.plus(t.gain), new Decimal(0));

    const longTermGains = transactions
      .filter((t) => t.isLongTerm)
      .reduce((sum, t) => sum.plus(t.gain), new Decimal(0));

    const shortTermTax = shortTermGains.times(config.shortTermRate);
    const longTermTax = longTermGains.times(config.longTermRate);
    const totalTax = shortTermTax.plus(longTermTax);

    return {
      year,
      method: config.method,
      shortTermGains: shortTermGains.toString(),
      longTermGains: longTermGains.toString(),
      totalGains: shortTermGains.plus(longTermGains).toString(),
      shortTermTax: shortTermTax.toString(),
      longTermTax: longTermTax.toString(),
      totalTax: totalTax.toString(),
      transactionCount: transactions.length,
      transactions,
    };
  }

  /**
   * Identify tax loss harvesting opportunities
   */
  async identifyHarvestingOpportunities(userId, currentPrices) {
    const opportunities = [];
    
    for (const [key, lots] of this.taxLots) {
      if (!key.startsWith(`${userId}_`)) continue;
      
      const asset = key.split("_")[1];
      const currentPrice = currentPrices[asset];
      if (!currentPrice) continue;

      for (const lot of lots) {
        if (lot.remaining.lessThanOrEqualTo(0)) continue;

        const currentValue = lot.remaining.times(currentPrice);
        const costBasis = lot.remaining.times(lot.costBasis);
        const unrealizedLoss = costBasis.minus(currentValue);

        if (unrealizedLoss.greaterThan(0)) {
          const holdingDays = Math.floor(
            (new Date() - lot.purchaseDate) / (1000 * 60 * 60 * 24)
          );

          opportunities.push({
            asset,
            amount: lot.remaining.toString(),
            purchasePrice: lot.costBasis.toString(),
            currentPrice: currentPrice.toString(),
            unrealizedLoss: unrealizedLoss.toString(),
            lossPercentage: unrealizedLoss.dividedBy(costBasis).times(100).toFixed(2),
            holdingDays,
            purchaseDate: lot.purchaseDate,
          });
        }
      }
    }

    return opportunities.sort((a, b) => 
      new Decimal(b.unrealizedLoss).minus(a.unrealizedLoss)
    );
  }

  /**
   * Export tax report for tax software (TurboTax, etc.)
   */
  exportForTaxSoftware(userId, year, format = "CSV") {
    const report = this.generateAnnualReport(userId, year);

    if (format === "CSV") {
      let csv = "Date Acquired,Date Sold,Asset,Quantity,Cost Basis,Proceeds,Gain/Loss,Term\n";
      
      for (const tx of report.transactions) {
        csv += `${tx.purchaseDate.toLocaleDateString()},`;
        csv += `${tx.saleDate.toLocaleDateString()},`;
        csv += `${tx.asset},`;
        csv += `${tx.amount},`;
        csv += `${tx.costBasis},`;
        csv += `${tx.proceeds},`;
        csv += `${tx.gain},`;
        csv += `${tx.isLongTerm ? "Long-term" : "Short-term"}\n`;
      }
      
      return csv;
    }

    return JSON.stringify(report, null, 2);
  }

  /**
   * Get tax summary for current year
   */
  getCurrentYearSummary(userId) {
    const currentYear = new Date().getFullYear();
    return this.generateAnnualReport(userId, currentYear);
  }
}

module.exports = new TaxCalculator();
