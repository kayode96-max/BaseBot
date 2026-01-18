const Decimal = require("decimal.js");

class PortfolioManager {
  constructor(db) {
    this.db = db;
  }

  // Get user's complete portfolio
  async getPortfolio(userId) {
    try {
      const doc = await this.db.get(`portfolio_${userId}`);
      return doc;
    } catch (err) {
      if (err.status === 404) {
        return { assets: {}, totalValue: "0", lastUpdated: null };
      }
      throw err;
    }
  }

  // Update portfolio with current balances
  async updatePortfolio(userId, balances) {
    const portfolio = await this.getPortfolio(userId);
    const timestamp = new Date().toISOString();

    portfolio.assets = {};
    balances.forEach((balance, asset) => {
      portfolio.assets[asset] = {
        amount: balance.toString(),
        lastUpdated: timestamp
      };
    });

    portfolio.lastUpdated = timestamp;
    
    try {
      await this.db.put({
        _id: `portfolio_${userId}`,
        ...portfolio
      });
    } catch (err) {
      if (err.status === 409) {
        const existing = await this.db.get(`portfolio_${userId}`);
        await this.db.put({
          ...existing,
          ...portfolio
        });
      }
    }

    return portfolio;
  }

  // Get portfolio summary
  async getSummary(userId) {
    const portfolio = await this.getPortfolio(userId);
    const assetCount = Object.keys(portfolio.assets).length;
    
    return {
      totalAssets: assetCount,
      assets: portfolio.assets,
      lastUpdated: portfolio.lastUpdated
    };
  }
}

module.exports = PortfolioManager;
