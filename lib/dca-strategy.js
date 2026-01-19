const Decimal = require("decimal.js");

class DCAStrategy {
  constructor() {
    this.schedules = new Map();
    this.executionHistory = new Map();
  }

  /**
   * Create DCA schedule
   */
  createSchedule(userId, config) {
    const schedule = {
      id: Date.now().toString(),
      asset: config.asset,
      amount: config.amount, // ETH amount per purchase
      frequency: config.frequency, // daily, weekly, biweekly, monthly
      startDate: config.startDate || new Date(),
      endDate: config.endDate || null,
      enabled: true,
      nextExecution: this.calculateNextExecution(config.frequency, config.startDate),
      totalInvested: "0",
      totalPurchased: "0",
      executionCount: 0,
    };

    if (!this.schedules.has(userId)) {
      this.schedules.set(userId, []);
    }
    this.schedules.get(userId).push(schedule);

    return schedule;
  }

  /**
   * Execute DCA purchase
   */
  async executeDCA(userAddress, userId, scheduleId) {
    const schedules = this.schedules.get(userId) || [];
    const schedule = schedules.find((s) => s.id === scheduleId);

    if (!schedule || !schedule.enabled) {
      throw new Error("Schedule not found or disabled");
    }

    // Check if execution is due
    if (new Date() < schedule.nextExecution) {
      return { executed: false, reason: "Not yet due" };
    }

    try {
      // Execute trade
      const trade = await userAddress.createTrade({
        fromAssetId: "ETH",
        toAssetId: schedule.asset,
        amount: schedule.amount,
      });
      await trade.wait();

      // Update schedule
      const purchasedAmount = new Decimal(trade.getToAmount || schedule.amount);
      schedule.totalInvested = new Decimal(schedule.totalInvested)
        .plus(schedule.amount)
        .toString();
      schedule.totalPurchased = new Decimal(schedule.totalPurchased)
        .plus(purchasedAmount)
        .toString();
      schedule.executionCount++;
      schedule.nextExecution = this.calculateNextExecution(
        schedule.frequency,
        schedule.nextExecution
      );

      // Record execution
      this.recordExecution(userId, scheduleId, {
        timestamp: new Date(),
        amount: schedule.amount,
        purchased: purchasedAmount.toString(),
        txHash: trade.getTransaction().getTransactionHash(),
        price: new Decimal(schedule.amount).dividedBy(purchasedAmount).toString(),
      });

      // Check if schedule should end
      if (schedule.endDate && new Date() >= schedule.endDate) {
        schedule.enabled = false;
      }

      return {
        executed: true,
        schedule,
        execution: {
          amount: schedule.amount,
          purchased: purchasedAmount.toString(),
          txHash: trade.getTransaction().getTransactionHash(),
        },
      };
    } catch (error) {
      console.error(`DCA execution failed for schedule ${scheduleId}:`, error);
      return { executed: false, error: error.message };
    }
  }

  /**
   * Calculate next execution time
   */
  calculateNextExecution(frequency, fromDate = new Date()) {
    const date = new Date(fromDate);
    switch (frequency) {
      case "daily":
        date.setDate(date.getDate() + 1);
        break;
      case "weekly":
        date.setDate(date.getDate() + 7);
        break;
      case "biweekly":
        date.setDate(date.getDate() + 14);
        break;
      case "monthly":
        date.setMonth(date.getMonth() + 1);
        break;
      default:
        date.setDate(date.getDate() + 7);
    }
    return date;
  }

  /**
   * Record execution history
   */
  recordExecution(userId, scheduleId, execution) {
    const key = `${userId}_${scheduleId}`;
    if (!this.executionHistory.has(key)) {
      this.executionHistory.set(key, []);
    }
    this.executionHistory.get(key).push(execution);

    // Keep only last 100 executions
    const history = this.executionHistory.get(key);
    if (history.length > 100) {
      this.executionHistory.set(key, history.slice(-100));
    }
  }

  /**
   * Get all schedules for user
   */
  getSchedules(userId) {
    return this.schedules.get(userId) || [];
  }

  /**
   * Get schedule by ID
   */
  getSchedule(userId, scheduleId) {
    const schedules = this.schedules.get(userId) || [];
    return schedules.find((s) => s.id === scheduleId);
  }

  /**
   * Pause schedule
   */
  pauseSchedule(userId, scheduleId) {
    const schedule = this.getSchedule(userId, scheduleId);
    if (schedule) {
      schedule.enabled = false;
    }
  }

  /**
   * Resume schedule
   */
  resumeSchedule(userId, scheduleId) {
    const schedule = this.getSchedule(userId, scheduleId);
    if (schedule) {
      schedule.enabled = true;
      schedule.nextExecution = this.calculateNextExecution(schedule.frequency);
    }
  }

  /**
   * Delete schedule
   */
  deleteSchedule(userId, scheduleId) {
    const schedules = this.schedules.get(userId) || [];
    const filtered = schedules.filter((s) => s.id !== scheduleId);
    this.schedules.set(userId, filtered);
  }

  /**
   * Get execution history
   */
  getHistory(userId, scheduleId, limit = 10) {
    const key = `${userId}_${scheduleId}`;
    const history = this.executionHistory.get(key) || [];
    return history.slice(-limit).reverse();
  }

  /**
   * Calculate DCA performance
   */
  calculatePerformance(userId, scheduleId, currentPrice) {
    const schedule = this.getSchedule(userId, scheduleId);
    if (!schedule) return null;

    const totalInvested = new Decimal(schedule.totalInvested);
    const totalPurchased = new Decimal(schedule.totalPurchased);
    const avgPrice = totalInvested.dividedBy(totalPurchased);
    const currentValue = totalPurchased.times(currentPrice);
    const profit = currentValue.minus(totalInvested);
    const roi = profit.dividedBy(totalInvested).times(100);

    return {
      totalInvested: totalInvested.toString(),
      totalPurchased: totalPurchased.toString(),
      averagePrice: avgPrice.toString(),
      currentPrice: currentPrice,
      currentValue: currentValue.toString(),
      profit: profit.toString(),
      roi: roi.toFixed(2) + "%",
      executionCount: schedule.executionCount,
    };
  }

  /**
   * Check all schedules for execution
   */
  async checkAndExecuteAll(userAddress, userId) {
    const schedules = this.getSchedules(userId);
    const results = [];

    for (const schedule of schedules) {
      if (schedule.enabled && new Date() >= schedule.nextExecution) {
        const result = await this.executeDCA(userAddress, userId, schedule.id);
        results.push(result);
      }
    }

    return results;
  }
}

module.exports = new DCAStrategy();
