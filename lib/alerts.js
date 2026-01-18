class PriceAlerts {
  constructor(db) {
    this.db = db;
  }

  // Create price alert
  async createAlert(userId, asset, targetPrice, condition = 'above') {
    const alertId = `alert_${userId}_${Date.now()}`;
    const alert = {
      _id: alertId,
      userId,
      asset,
      targetPrice: targetPrice.toString(),
      condition, // 'above' or 'below'
      active: true,
      createdAt: new Date().toISOString()
    };

    await this.db.put(alert);
    return alert;
  }

  // Get active alerts for user
  async getActiveAlerts(userId) {
    try {
      const result = await this.db.allDocs({
        include_docs: true,
        startkey: `alert_${userId}_`,
        endkey: `alert_${userId}_\ufff0`
      });

      return result.rows
        .map(row => row.doc)
        .filter(alert => alert.active);
    } catch (err) {
      return [];
    }
  }

  // Check alerts against current prices
  async checkAlerts(userId, prices) {
    const alerts = await this.getActiveAlerts(userId);
    const triggered = [];

    for (const alert of alerts) {
      const currentPrice = prices[alert.asset];
      if (!currentPrice) continue;

      const target = parseFloat(alert.targetPrice);
      const current = parseFloat(currentPrice);

      const isTriggered = 
        (alert.condition === 'above' && current >= target) ||
        (alert.condition === 'below' && current <= target);

      if (isTriggered) {
        triggered.push(alert);
        // Deactivate triggered alert
        await this.deactivateAlert(alert._id);
      }
    }

    return triggered;
  }

  // Deactivate alert
  async deactivateAlert(alertId) {
    try {
      const alert = await this.db.get(alertId);
      await this.db.put({
        ...alert,
        active: false,
        triggeredAt: new Date().toISOString()
      });
    } catch (err) {
      // Alert doesn't exist
    }
  }

  // Delete alert
  async deleteAlert(alertId) {
    try {
      const alert = await this.db.get(alertId);
      await this.db.remove(alert);
    } catch (err) {
      // Alert doesn't exist
    }
  }
}

module.exports = PriceAlerts;
