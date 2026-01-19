const Decimal = require("decimal.js");

class NotificationManager {
  constructor() {
    this.notifications = new Map();
    this.channels = new Map();
    this.templates = new Map();
    this.history = new Map();
  }

  /**
   * Set notification preferences
   */
  setPreferences(userId, preferences) {
    this.channels.set(userId, {
      telegram: preferences.telegram !== false,
      email: preferences.email || false,
      discord: preferences.discord || false,
      slack: preferences.slack || false,
      priority: preferences.priority || "normal", // low, normal, high, urgent
      quiet_hours: preferences.quietHours || null, // {start: 22, end: 8}
      enabled: preferences.enabled !== false,
    });
  }

  /**
   * Create notification
   */
  async createNotification(userId, notification) {
    const prefs = this.channels.get(userId);
    if (!prefs || !prefs.enabled) return null;

    // Check quiet hours
    if (prefs.quiet_hours && this.isQuietHours(prefs.quiet_hours)) {
      if (notification.priority !== "urgent") {
        return this.queueForLater(userId, notification);
      }
    }

    const notif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      priority: notification.priority || "normal",
      channels: this.selectChannels(prefs, notification.priority),
      createdAt: new Date(),
      sent: false,
      sentAt: null,
    };

    // Store notification
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }
    this.notifications.get(userId).push(notif);

    return notif;
  }

  /**
   * Check if current time is in quiet hours
   */
  isQuietHours(quietHours) {
    const now = new Date().getHours();
    const { start, end } = quietHours;

    if (start < end) {
      return now >= start && now < end;
    } else {
      return now >= start || now < end;
    }
  }

  /**
   * Select channels based on priority
   */
  selectChannels(prefs, priority) {
    const channels = [];
    
    if (prefs.telegram) channels.push("telegram");
    
    if (priority === "high" || priority === "urgent") {
      if (prefs.email) channels.push("email");
      if (prefs.discord) channels.push("discord");
    }

    return channels;
  }

  /**
   * Queue notification for later
   */
  queueForLater(userId, notification) {
    // Would implement queue logic here
    return { queued: true, notification };
  }

  /**
   * Send notification
   */
  async send(userId, notificationId, sendFn) {
    const notifs = this.notifications.get(userId);
    if (!notifs) return null;

    const notif = notifs.find(n => n.id === notificationId);
    if (!notif || notif.sent) return null;

    try {
      const results = {};
      
      for (const channel of notif.channels) {
        try {
          results[channel] = await sendFn(channel, notif);
        } catch (error) {
          console.error(`Failed to send to ${channel}:`, error);
          results[channel] = { error: error.message };
        }
      }

      notif.sent = true;
      notif.sentAt = new Date();
      notif.results = results;

      this.recordHistory(userId, notif);

      return { success: true, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create price alert notification
   */
  priceAlert(userId, asset, currentPrice, triggerPrice, direction) {
    const emoji = direction === "above" ? "🚀" : "📉";
    const action = direction === "above" ? "risen above" : "fallen below";
    
    return this.createNotification(userId, {
      type: "price_alert",
      title: `${emoji} Price Alert: ${asset}`,
      message: `${asset} has ${action} ${triggerPrice}!\nCurrent price: ${currentPrice}`,
      priority: "high",
      data: { asset, currentPrice, triggerPrice, direction },
    });
  }

  /**
   * Create trade notification
   */
  tradeNotification(userId, trade) {
    const emoji = trade.type === "buy" ? "🔼" : "🔽";
    
    return this.createNotification(userId, {
      type: "trade_execution",
      title: `${emoji} Trade Executed`,
      message: `${trade.type.toUpperCase()}: ${trade.amount} ${trade.asset} at ${trade.price}`,
      priority: "normal",
      data: trade,
    });
  }

  /**
   * Create rebalance notification
   */
  rebalanceNotification(userId, summary) {
    return this.createNotification(userId, {
      type: "rebalance",
      title: "⚖️ Portfolio Rebalanced",
      message: `Portfolio rebalanced with ${summary.trades} trades\nTotal value: ${summary.totalValue}`,
      priority: "normal",
      data: summary,
    });
  }

  /**
   * Create risk alert
   */
  riskAlert(userId, warning) {
    return this.createNotification(userId, {
      type: "risk_alert",
      title: "⚠️ Risk Alert",
      message: warning.message,
      priority: "urgent",
      data: warning,
    });
  }

  /**
   * Create DCA execution notification
   */
  dcaNotification(userId, execution) {
    return this.createNotification(userId, {
      type: "dca_execution",
      title: "🤖 DCA Executed",
      message: `Purchased ${execution.purchased} ${execution.asset} for ${execution.amount} ETH`,
      priority: "low",
      data: execution,
    });
  }

  /**
   * Create compound notification
   */
  compoundNotification(userId, result) {
    return this.createNotification(userId, {
      type: "auto_compound",
      title: "⚡ Auto-Compound Complete",
      message: `Compounded ${result.assets} assets\nNext compound: ${result.nextCompound}`,
      priority: "low",
      data: result,
    });
  }

  /**
   * Create gas alert
   */
  gasAlert(userId, gasData) {
    return this.createNotification(userId, {
      type: "gas_alert",
      title: "⛽ Gas Price Alert",
      message: `Gas prices are ${gasData.status}\nCurrent: ${gasData.currentPrice} Gwei`,
      priority: "normal",
      data: gasData,
    });
  }

  /**
   * Create milestone notification
   */
  milestoneNotification(userId, milestone) {
    return this.createNotification(userId, {
      type: "milestone",
      title: "🎯 Milestone Reached!",
      message: milestone.message,
      priority: "normal",
      data: milestone,
    });
  }

  /**
   * Get user notifications
   */
  getUserNotifications(userId, limit = 50) {
    const notifs = this.notifications.get(userId) || [];
    return notifs.slice(-limit).reverse();
  }

  /**
   * Get unread notifications
   */
  getUnread(userId) {
    const notifs = this.notifications.get(userId) || [];
    return notifs.filter(n => !n.read);
  }

  /**
   * Mark as read
   */
  markAsRead(userId, notificationId) {
    const notifs = this.notifications.get(userId);
    if (!notifs) return false;

    const notif = notifs.find(n => n.id === notificationId);
    if (notif) {
      notif.read = true;
      notif.readAt = new Date();
      return true;
    }

    return false;
  }

  /**
   * Mark all as read
   */
  markAllAsRead(userId) {
    const notifs = this.notifications.get(userId);
    if (!notifs) return 0;

    let count = 0;
    for (const notif of notifs) {
      if (!notif.read) {
        notif.read = true;
        notif.readAt = new Date();
        count++;
      }
    }

    return count;
  }

  /**
   * Record notification history
   */
  recordHistory(userId, notif) {
    if (!this.history.has(userId)) {
      this.history.set(userId, []);
    }

    this.history.get(userId).push({
      id: notif.id,
      type: notif.type,
      title: notif.title,
      sentAt: notif.sentAt,
      channels: notif.channels,
    });

    // Keep only last 200 records
    const history = this.history.get(userId);
    if (history.length > 200) {
      this.history.set(userId, history.slice(-200));
    }
  }

  /**
   * Get notification statistics
   */
  getStatistics(userId) {
    const notifs = this.notifications.get(userId) || [];
    const history = this.history.get(userId) || [];

    const byType = {};
    for (const notif of notifs) {
      byType[notif.type] = (byType[notif.type] || 0) + 1;
    }

    return {
      total: notifs.length,
      unread: notifs.filter(n => !n.read).length,
      sent: notifs.filter(n => n.sent).length,
      byType,
      totalHistory: history.length,
    };
  }

  /**
   * Clear old notifications
   */
  clearOld(userId, daysOld = 30) {
    const notifs = this.notifications.get(userId);
    if (!notifs) return 0;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const before = notifs.length;
    const filtered = notifs.filter(n => n.createdAt > cutoff);
    this.notifications.set(userId, filtered);

    return before - filtered.length;
  }
}

module.exports = new NotificationManager();
