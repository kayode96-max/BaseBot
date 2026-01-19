const Decimal = require("decimal.js");

class RiskManager {
  constructor() {
    this.riskProfiles = new Map();
    this.positionLimits = new Map();
  }

  /**
   * Set risk profile for user
   */
  setRiskProfile(userId, profile) {
    const profiles = {
      conservative: {
        maxPositionSize: 0.1, // 10% max per position
        maxDrawdown: 0.05, // 5% max loss
        stopLoss: 0.02, // 2% stop loss
        maxLeverage: 1,
      },
      moderate: {
        maxPositionSize: 0.2,
        maxDrawdown: 0.10,
        stopLoss: 0.05,
        maxLeverage: 2,
      },
      aggressive: {
        maxPositionSize: 0.3,
        maxDrawdown: 0.20,
        stopLoss: 0.10,
        maxLeverage: 5,
      },
    };

    this.riskProfiles.set(userId, profiles[profile] || profiles.moderate);
  }

  /**
   * Validate trade against risk limits
   */
  async validateTrade(userId, tradeAmount, portfolioValue) {
    const profile = this.riskProfiles.get(userId);
    if (!profile) {
      this.setRiskProfile(userId, "moderate");
      return { valid: true };
    }

    const amount = new Decimal(tradeAmount);
    const totalValue = new Decimal(portfolioValue);
    const positionSize = amount.dividedBy(totalValue);

    if (positionSize.greaterThan(profile.maxPositionSize)) {
      return {
        valid: false,
        reason: `Position size ${positionSize.times(100).toFixed(2)}% exceeds limit of ${profile.maxPositionSize * 100}%`,
      };
    }

    return { valid: true };
  }

  /**
   * Calculate stop loss price
   */
  calculateStopLoss(userId, entryPrice) {
    const profile = this.riskProfiles.get(userId) || this.riskProfiles.get("default");
    const price = new Decimal(entryPrice);
    return price.times(1 - profile.stopLoss).toString();
  }

  /**
   * Monitor portfolio health
   */
  async checkPortfolioHealth(userId, currentValue, peakValue) {
    const profile = this.riskProfiles.get(userId);
    if (!profile) return { healthy: true };

    const current = new Decimal(currentValue);
    const peak = new Decimal(peakValue);
    const drawdown = peak.minus(current).dividedBy(peak);

    if (drawdown.greaterThan(profile.maxDrawdown)) {
      return {
        healthy: false,
        drawdown: drawdown.times(100).toFixed(2),
        maxDrawdown: profile.maxDrawdown * 100,
        action: "Consider reducing positions",
      };
    }

    return { healthy: true, drawdown: drawdown.times(100).toFixed(2) };
  }

  /**
   * Set position limit for specific asset
   */
  setAssetLimit(userId, asset, maxAmount) {
    if (!this.positionLimits.has(userId)) {
      this.positionLimits.set(userId, new Map());
    }
    this.positionLimits.get(userId).set(asset, maxAmount);
  }

  /**
   * Check if position exceeds limit
   */
  checkAssetLimit(userId, asset, amount) {
    const userLimits = this.positionLimits.get(userId);
    if (!userLimits) return { valid: true };

    const limit = userLimits.get(asset);
    if (!limit) return { valid: true };

    const currentAmount = new Decimal(amount);
    const maxAmount = new Decimal(limit);

    if (currentAmount.greaterThan(maxAmount)) {
      return {
        valid: false,
        reason: `Amount ${amount} exceeds limit of ${limit} for ${asset}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get risk metrics
   */
  getRiskMetrics(userId) {
    const profile = this.riskProfiles.get(userId);
    const limits = this.positionLimits.get(userId);
    
    return {
      profile,
      assetLimits: limits ? Object.fromEntries(limits) : {},
    };
  }
}

module.exports = new RiskManager();
