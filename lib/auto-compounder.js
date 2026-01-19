const Decimal = require("decimal.js");

class AutoCompounder {
  constructor() {
    this.strategies = new Map();
    this.compoundHistory = new Map();
  }

  /**
   * Set auto-compound strategy
   */
  setStrategy(userId, config) {
    this.strategies.set(userId, {
      enabled: true,
      minThreshold: config.minThreshold || "0.01", // Min ETH to compound
      frequency: config.frequency || "daily", // daily, weekly, monthly
      assets: config.assets || [], // Assets to compound
      reinvestPercentage: config.reinvestPercentage || 100, // % of profits to reinvest
      lastCompound: null,
      nextCompound: this.calculateNextCompound(config.frequency),
    });
  }

  /**
   * Check if compounding is due
   */
  shouldCompound(userId) {
    const strategy = this.strategies.get(userId);
    if (!strategy || !strategy.enabled) return false;

    const now = new Date();
    return now >= strategy.nextCompound;
  }

  /**
   * Execute auto-compounding
   */
  async compound(userAddress, userId) {
    const strategy = this.strategies.get(userId);
    if (!strategy) {
      throw new Error("No compounding strategy found");
    }

    const balances = await userAddress.listBalances();
    const compoundedAssets = [];

    for (const [asset, balance] of balances) {
      if (strategy.assets.length > 0 && !strategy.assets.includes(asset)) {
        continue;
      }

      const amount = new Decimal(balance);
      const threshold = new Decimal(strategy.minThreshold);

      if (amount.greaterThan(threshold)) {
        const reinvestAmount = amount
          .times(strategy.reinvestPercentage)
          .dividedBy(100);

        try {
          // Reinvest by buying more of the asset or staking
          const result = await this.reinvest(userAddress, asset, reinvestAmount);
          compoundedAssets.push({
            asset,
            amount: reinvestAmount.toString(),
            txHash: result.txHash,
          });
        } catch (error) {
          console.error(`Failed to compound ${asset}:`, error);
        }
      }
    }

    // Update strategy
    strategy.lastCompound = new Date();
    strategy.nextCompound = this.calculateNextCompound(strategy.frequency);

    // Record history
    this.recordCompound(userId, compoundedAssets);

    return {
      compounded: compoundedAssets,
      nextCompound: strategy.nextCompound,
    };
  }

  /**
   * Reinvest assets (simplified - would implement actual staking/LP logic)
   */
  async reinvest(userAddress, asset, amount) {
    // This would integrate with DeFi protocols for actual compounding
    // For now, return simulated result
    return {
      asset,
      amount: amount.toString(),
      txHash: "0x" + "0".repeat(64),
      timestamp: new Date(),
    };
  }

  /**
   * Calculate next compound time
   */
  calculateNextCompound(frequency) {
    const now = new Date();
    switch (frequency) {
      case "daily":
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case "weekly":
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case "monthly":
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Record compound history
   */
  recordCompound(userId, assets) {
    if (!this.compoundHistory.has(userId)) {
      this.compoundHistory.set(userId, []);
    }

    this.compoundHistory.get(userId).push({
      timestamp: new Date(),
      assets,
    });

    // Keep only last 100 records
    const history = this.compoundHistory.get(userId);
    if (history.length > 100) {
      this.compoundHistory.set(userId, history.slice(-100));
    }
  }

  /**
   * Get compound history
   */
  getHistory(userId, limit = 10) {
    const history = this.compoundHistory.get(userId) || [];
    return history.slice(-limit).reverse();
  }

  /**
   * Get strategy info
   */
  getStrategy(userId) {
    return this.strategies.get(userId);
  }

  /**
   * Disable auto-compound
   */
  disable(userId) {
    const strategy = this.strategies.get(userId);
    if (strategy) {
      strategy.enabled = false;
    }
  }

  /**
   * Calculate projected returns
   */
  projectReturns(principal, apr, days, compoundFrequency = "daily") {
    const periodsPerYear = {
      daily: 365,
      weekly: 52,
      monthly: 12,
    };

    const n = periodsPerYear[compoundFrequency] || 365;
    const t = days / 365;
    const r = apr / 100;

    // Compound interest formula: A = P(1 + r/n)^(nt)
    const amount = new Decimal(principal).times(
      new Decimal(1 + r / n).pow(n * t)
    );

    return {
      principal: principal,
      finalAmount: amount.toString(),
      profit: amount.minus(principal).toString(),
      apr: apr,
      days: days,
    };
  }
}

module.exports = new AutoCompounder();
