const Decimal = require("decimal.js");

class PortfolioAnalytics {
  constructor(db) {
    this.db = db;
  }

  // Calculate total portfolio value in ETH
  async calculateTotalValue(userId, balances, prices = {}) {
    let total = new Decimal(0);
    
    balances.forEach((balance, asset) => {
      if (asset.toLowerCase() === 'eth') {
        total = total.plus(new Decimal(balance.toString()));
      } else if (prices[asset]) {
        const value = new Decimal(balance.toString()).times(prices[asset]);
        total = total.plus(value);
      }
    });

    return total.toString();
  }

  // Calculate profit/loss
  async calculatePnL(userId, currentValue) {
    try {
      const history = await this.db.get(`pnl_${userId}`);
      const initialValue = new Decimal(history.initialInvestment || "0");
      const current = new Decimal(currentValue);
      
      const pnl = current.minus(initialValue);
      const pnlPercent = initialValue.isZero() 
        ? "0" 
        : pnl.div(initialValue).times(100).toFixed(2);

      return {
        absolute: pnl.toString(),
        percentage: pnlPercent,
        roi: pnlPercent
      };
    } catch (err) {
      return { absolute: "0", percentage: "0", roi: "0" };
    }
  }

  // Set initial investment for P&L tracking
  async setInitialInvestment(userId, amount) {
    try {
      await this.db.put({
        _id: `pnl_${userId}`,
        initialInvestment: amount,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      if (err.status === 409) {
        const existing = await this.db.get(`pnl_${userId}`);
        await this.db.put({
          ...existing,
          initialInvestment: amount,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  // Get portfolio metrics
  async getMetrics(userId, balances, prices = {}) {
    const totalValue = await this.calculateTotalValue(userId, balances, prices);
    const pnl = await this.calculatePnL(userId, totalValue);
    
    return {
      totalValue,
      ...pnl,
      assetCount: balances.size,
      lastCalculated: new Date().toISOString()
    };
  }
}

module.exports = PortfolioAnalytics;
