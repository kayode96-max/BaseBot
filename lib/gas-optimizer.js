const Decimal = require("decimal.js");

class GasOptimizer {
  constructor() {
    this.gasHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Get current gas price recommendation
   */
  async getGasPrice(priority = "standard") {
    // In production, this would fetch from gas oracle
    const prices = {
      low: { maxFee: "20", maxPriority: "1", waitTime: "5-10 min" },
      standard: { maxFee: "30", maxPriority: "2", waitTime: "1-3 min" },
      fast: { maxFee: "50", maxPriority: "3", waitTime: "< 1 min" },
    };

    return prices[priority] || prices.standard;
  }

  /**
   * Estimate transaction cost
   */
  async estimateCost(gasLimit, priority = "standard") {
    const gasPrice = await this.getGasPrice(priority);
    const cost = new Decimal(gasLimit)
      .times(gasPrice.maxFee)
      .dividedBy(1e9); // Convert to ETH

    return {
      gasLimit,
      gasPrice: gasPrice.maxFee,
      estimatedCost: cost.toString(),
      waitTime: gasPrice.waitTime,
    };
  }

  /**
   * Find optimal transaction time
   */
  async getOptimalTime() {
    // Analyze historical data to find best time
    const now = new Date();
    const hour = now.getHours();

    // Generally, gas is lower during off-peak hours (UTC)
    if (hour >= 0 && hour <= 6) {
      return {
        optimal: true,
        reason: "Off-peak hours (low gas)",
        savings: "15-30%",
      };
    } else if (hour >= 14 && hour <= 18) {
      return {
        optimal: false,
        reason: "Peak hours (high gas)",
        recommendation: "Wait 4-6 hours for better rates",
      };
    }

    return {
      optimal: true,
      reason: "Moderate gas prices",
    };
  }

  /**
   * Batch transactions for gas savings
   */
  async batchTransactions(transactions) {
    // Group similar transactions
    const batches = new Map();

    for (const tx of transactions) {
      const key = `${tx.to}_${tx.method}`;
      if (!batches.has(key)) {
        batches.set(key, []);
      }
      batches.get(key).push(tx);
    }

    const savings = this.calculateBatchSavings(transactions.length, batches.size);

    return {
      originalCount: transactions.length,
      batchCount: batches.size,
      batches: Array.from(batches.values()),
      estimatedSavings: savings,
    };
  }

  /**
   * Calculate batch savings
   */
  calculateBatchSavings(originalCount, batchCount) {
    // Assume ~21k base gas per tx, batching saves ~15k per tx
    const savedGas = (originalCount - batchCount) * 15000;
    const avgGasPrice = 30; // Gwei
    const savings = new Decimal(savedGas)
      .times(avgGasPrice)
      .dividedBy(1e9);

    return {
      gasUnits: savedGas,
      eth: savings.toString(),
      percentage: ((originalCount - batchCount) / originalCount * 100).toFixed(1),
    };
  }

  /**
   * Record gas usage
   */
  recordGasUsage(txHash, gasUsed, gasPrice) {
    this.gasHistory.push({
      txHash,
      gasUsed,
      gasPrice,
      cost: new Decimal(gasUsed).times(gasPrice).dividedBy(1e9).toString(),
      timestamp: new Date(),
    });

    // Maintain history size
    if (this.gasHistory.length > this.maxHistorySize) {
      this.gasHistory.shift();
    }
  }

  /**
   * Get gas usage statistics
   */
  getStatistics(days = 7) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recent = this.gasHistory.filter((h) => h.timestamp >= cutoff);

    if (recent.length === 0) {
      return { noData: true };
    }

    const totalCost = recent.reduce(
      (sum, h) => sum.plus(h.cost),
      new Decimal(0)
    );
    const avgGas = recent.reduce((sum, h) => sum + parseInt(h.gasUsed), 0) / recent.length;
    const avgPrice = recent.reduce((sum, h) => sum + parseInt(h.gasPrice), 0) / recent.length;

    return {
      transactions: recent.length,
      totalCost: totalCost.toString(),
      averageGasUsed: Math.round(avgGas),
      averageGasPrice: Math.round(avgPrice),
      period: `${days} days`,
    };
  }

  /**
   * Suggest gas optimization strategies
   */
  async getSuggestions(userAddress) {
    const suggestions = [];

    // Check pending transactions
    const optimalTime = await this.getOptimalTime();
    if (!optimalTime.optimal) {
      suggestions.push({
        type: "timing",
        priority: "high",
        message: optimalTime.reason,
        action: optimalTime.recommendation,
      });
    }

    // Check transaction history
    const stats = this.getStatistics(7);
    if (!stats.noData && stats.averageGasPrice > 50) {
      suggestions.push({
        type: "price",
        priority: "medium",
        message: "High average gas prices detected",
        action: "Consider using 'low' priority for non-urgent transactions",
      });
    }

    return suggestions;
  }
}

module.exports = new GasOptimizer();
