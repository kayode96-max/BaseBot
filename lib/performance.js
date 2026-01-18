const Decimal = require("decimal.js");

class PerformanceTracker {
  constructor(db) {
    this.db = db;
  }

  // Record snapshot of portfolio
  async recordSnapshot(userId, totalValue, allocations) {
    const snapshotId = `snapshot_${userId}_${Date.now()}`;
    const snapshot = {
      _id: snapshotId,
      userId,
      totalValue: totalValue.toString(),
      allocations,
      timestamp: new Date().toISOString()
    };

    await this.db.put(snapshot);
    return snapshot;
  }

  // Get historical snapshots
  async getSnapshots(userId, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      const result = await this.db.allDocs({
        include_docs: true,
        startkey: `snapshot_${userId}_`,
        endkey: `snapshot_${userId}_\ufff0`
      });

      return result.rows
        .map(row => row.doc)
        .filter(snap => new Date(snap.timestamp) >= cutoffDate)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (err) {
      return [];
    }
  }

  // Calculate performance metrics
  async calculatePerformance(userId, days = 30) {
    const snapshots = await this.getSnapshots(userId, days);
    
    if (snapshots.length < 2) {
      return {
        message: "Insufficient data for performance calculation",
        dataPoints: snapshots.length
      };
    }

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const firstValue = new Decimal(first.totalValue);
    const lastValue = new Decimal(last.totalValue);

    const absoluteChange = lastValue.minus(firstValue);
    const percentChange = firstValue.isZero()
      ? "0"
      : absoluteChange.div(firstValue).times(100).toFixed(2);

    // Calculate daily average
    const totalDays = Math.max(1, (new Date(last.timestamp) - new Date(first.timestamp)) / (1000 * 60 * 60 * 24));
    const dailyAvg = absoluteChange.div(totalDays);

    return {
      period: days + " days",
      startValue: firstValue.toString(),
      endValue: lastValue.toString(),
      absoluteChange: absoluteChange.toString(),
      percentChange: percentChange + "%",
      dailyAverage: dailyAvg.toString(),
      dataPoints: snapshots.length
    };
  }

  // Get best and worst performing days
  async getExtremes(userId, days = 30) {
    const snapshots = await this.getSnapshots(userId, days);
    
    if (snapshots.length < 2) return null;

    let maxGain = { value: new Decimal(-Infinity), date: null };
    let maxLoss = { value: new Decimal(Infinity), date: null };

    for (let i = 1; i < snapshots.length; i++) {
      const prev = new Decimal(snapshots[i - 1].totalValue);
      const curr = new Decimal(snapshots[i].totalValue);
      const change = curr.minus(prev);

      if (change.greaterThan(maxGain.value)) {
        maxGain = { value: change, date: snapshots[i].timestamp };
      }
      if (change.lessThan(maxLoss.value)) {
        maxLoss = { value: change, date: snapshots[i].timestamp };
      }
    }

    return {
      bestDay: {
        gain: maxGain.value.toString(),
        date: maxGain.date
      },
      worstDay: {
        loss: maxLoss.value.toString(),
        date: maxLoss.date
      }
    };
  }
}

module.exports = PerformanceTracker;
