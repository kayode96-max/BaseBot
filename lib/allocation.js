const Decimal = require("decimal.js");

class AssetAllocation {
  constructor(db) {
    this.db = db;
  }

  // Calculate current allocation
  async calculateAllocation(balances, prices = {}) {
    let total = new Decimal(0);
    const allocations = {};

    // Calculate total value
    balances.forEach((balance, asset) => {
      let value;
      if (asset.toLowerCase() === 'eth') {
        value = new Decimal(balance.toString());
      } else if (prices[asset]) {
        value = new Decimal(balance.toString()).times(prices[asset]);
      } else {
        value = new Decimal(0);
      }
      
      allocations[asset] = value;
      total = total.plus(value);
    });

    // Calculate percentages
    const result = {};
    Object.keys(allocations).forEach(asset => {
      const percentage = total.isZero()
        ? "0"
        : allocations[asset].div(total).times(100).toFixed(2);
      
      result[asset] = {
        value: allocations[asset].toString(),
        percentage: percentage + "%"
      };
    });

    return { allocations: result, totalValue: total.toString() };
  }

  // Set target allocation
  async setTargetAllocation(userId, targets) {
    await this.db.put({
      _id: `target_${userId}`,
      targets,
      updatedAt: new Date().toISOString()
    });
  }

  // Get target allocation
  async getTargetAllocation(userId) {
    try {
      const doc = await this.db.get(`target_${userId}`);
      return doc.targets;
    } catch (err) {
      return {};
    }
  }

  // Compare current vs target allocation
  async compareWithTarget(userId, currentAllocation) {
    const targets = await this.getTargetAllocation(userId);
    const differences = {};

    Object.keys(targets).forEach(asset => {
      const current = parseFloat(currentAllocation[asset]?.percentage || "0");
      const target = parseFloat(targets[asset]);
      differences[asset] = {
        current: current + "%",
        target: target + "%",
        difference: (current - target).toFixed(2) + "%"
      };
    });

    return differences;
  }
}

module.exports = AssetAllocation;
