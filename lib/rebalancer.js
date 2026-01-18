const Decimal = require("decimal.js");

class Rebalancer {
  constructor(db) {
    this.db = db;
  }

  // Calculate rebalancing recommendations
  async getRebalanceRecommendations(userId, currentAllocation, targetAllocation, totalValue) {
    const recommendations = [];
    const total = new Decimal(totalValue);

    Object.keys(targetAllocation).forEach(asset => {
      const currentPercent = parseFloat(currentAllocation[asset]?.percentage || "0");
      const targetPercent = parseFloat(targetAllocation[asset]);
      const difference = targetPercent - currentPercent;

      if (Math.abs(difference) > 1) { // Only recommend if difference > 1%
        const targetValue = total.times(targetPercent).div(100);
        const currentValue = new Decimal(currentAllocation[asset]?.value || "0");
        const amountToAdjust = targetValue.minus(currentValue);

        recommendations.push({
          asset,
          currentPercent: currentPercent.toFixed(2) + "%",
          targetPercent: targetPercent + "%",
          difference: difference.toFixed(2) + "%",
          action: amountToAdjust.isPositive() ? "buy" : "sell",
          amount: amountToAdjust.abs().toString()
        });
      }
    });

    return recommendations.sort((a, b) => 
      Math.abs(parseFloat(b.difference)) - Math.abs(parseFloat(a.difference))
    );
  }

  // Generate rebalancing plan
  async createRebalancePlan(userId, recommendations) {
    const planId = `plan_${userId}_${Date.now()}`;
    const plan = {
      _id: planId,
      userId,
      recommendations,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    await this.db.put(plan);
    return plan;
  }

  // Get rebalancing history
  async getRebalanceHistory(userId) {
    try {
      const result = await this.db.allDocs({
        include_docs: true,
        startkey: `plan_${userId}_`,
        endkey: `plan_${userId}_\ufff0`,
        descending: true,
        limit: 10
      });

      return result.rows.map(row => row.doc);
    } catch (err) {
      return [];
    }
  }

  // Execute rebalancing plan
  async executePlan(planId, callback) {
    const plan = await this.db.get(planId);
    const results = [];

    for (const rec of plan.recommendations) {
      try {
        const result = await callback(rec);
        results.push({ ...rec, result, status: 'completed' });
      } catch (err) {
        results.push({ ...rec, error: err.message, status: 'failed' });
      }
    }

    await this.db.put({
      ...plan,
      status: 'executed',
      results,
      executedAt: new Date().toISOString()
    });

    return results;
  }
}

module.exports = Rebalancer;
