const Decimal = require("decimal.js");

class LimitOrderManager {
  constructor() {
    this.orders = new Map();
    this.orderHistory = new Map();
    this.nextOrderId = 1;
  }

  /**
   * Create limit order
   */
  createOrder(userId, config) {
    const orderId = `order_${this.nextOrderId++}`;
    
    const order = {
      id: orderId,
      userId,
      type: config.type, // 'buy' or 'sell'
      asset: config.asset,
      amount: new Decimal(config.amount),
      limitPrice: new Decimal(config.limitPrice),
      currentPrice: config.currentPrice ? new Decimal(config.currentPrice) : null,
      stopLoss: config.stopLoss ? new Decimal(config.stopLoss) : null,
      takeProfit: config.takeProfit ? new Decimal(config.takeProfit) : null,
      expiresAt: config.expiresAt || null,
      status: "pending",
      createdAt: new Date(),
      filledAt: null,
      filledPrice: null,
      filledAmount: new Decimal(0),
      partialFills: [],
    };

    if (!this.orders.has(userId)) {
      this.orders.set(userId, new Map());
    }
    this.orders.get(userId).set(orderId, order);

    return order;
  }

  /**
   * Check and execute orders based on current price
   */
  async checkOrders(userId, asset, currentPrice, executeFn) {
    const userOrders = this.orders.get(userId);
    if (!userOrders) return { executed: [] };

    const price = new Decimal(currentPrice);
    const executed = [];

    for (const [orderId, order] of userOrders) {
      if (order.asset !== asset || order.status !== "pending") continue;

      // Check expiration
      if (order.expiresAt && new Date() > order.expiresAt) {
        order.status = "expired";
        this.recordHistory(userId, order);
        continue;
      }

      let shouldExecute = false;
      let reason = "";

      // Check limit price
      if (order.type === "buy" && price.lessThanOrEqualTo(order.limitPrice)) {
        shouldExecute = true;
        reason = "Limit price reached (buy)";
      } else if (order.type === "sell" && price.greaterThanOrEqualTo(order.limitPrice)) {
        shouldExecute = true;
        reason = "Limit price reached (sell)";
      }

      // Check stop loss
      if (order.stopLoss && order.currentPrice) {
        if (order.type === "sell" && price.lessThanOrEqualTo(order.stopLoss)) {
          shouldExecute = true;
          reason = "Stop loss triggered";
        }
      }

      // Check take profit
      if (order.takeProfit && order.currentPrice) {
        if (order.type === "sell" && price.greaterThanOrEqualTo(order.takeProfit)) {
          shouldExecute = true;
          reason = "Take profit triggered";
        }
      }

      if (shouldExecute) {
        try {
          const result = await executeFn(order, price);
          
          order.status = "filled";
          order.filledAt = new Date();
          order.filledPrice = price;
          order.filledAmount = order.amount;
          
          executed.push({
            orderId,
            order,
            reason,
            result,
          });

          this.recordHistory(userId, order);
          userOrders.delete(orderId);
        } catch (error) {
          console.error(`Failed to execute order ${orderId}:`, error);
          order.status = "failed";
          order.failReason = error.message;
        }
      }
    }

    return { executed };
  }

  /**
   * Get user's active orders
   */
  getActiveOrders(userId, asset = null) {
    const userOrders = this.orders.get(userId);
    if (!userOrders) return [];

    return Array.from(userOrders.values())
      .filter(o => o.status === "pending")
      .filter(o => !asset || o.asset === asset)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get order by ID
   */
  getOrder(userId, orderId) {
    const userOrders = this.orders.get(userId);
    return userOrders ? userOrders.get(orderId) : null;
  }

  /**
   * Cancel order
   */
  cancelOrder(userId, orderId) {
    const userOrders = this.orders.get(userId);
    if (!userOrders) return false;

    const order = userOrders.get(orderId);
    if (!order || order.status !== "pending") return false;

    order.status = "cancelled";
    order.cancelledAt = new Date();
    
    this.recordHistory(userId, order);
    userOrders.delete(orderId);
    
    return true;
  }

  /**
   * Cancel all orders
   */
  cancelAllOrders(userId, asset = null) {
    const userOrders = this.orders.get(userId);
    if (!userOrders) return 0;

    let cancelled = 0;
    for (const [orderId, order] of userOrders) {
      if (order.status !== "pending") continue;
      if (asset && order.asset !== asset) continue;

      order.status = "cancelled";
      order.cancelledAt = new Date();
      this.recordHistory(userId, order);
      userOrders.delete(orderId);
      cancelled++;
    }

    return cancelled;
  }

  /**
   * Update order (modify limit price or amount)
   */
  updateOrder(userId, orderId, updates) {
    const order = this.getOrder(userId, orderId);
    if (!order || order.status !== "pending") {
      return { success: false, reason: "Order not found or not pending" };
    }

    if (updates.limitPrice) {
      order.limitPrice = new Decimal(updates.limitPrice);
    }
    if (updates.amount) {
      order.amount = new Decimal(updates.amount);
    }
    if (updates.stopLoss !== undefined) {
      order.stopLoss = updates.stopLoss ? new Decimal(updates.stopLoss) : null;
    }
    if (updates.takeProfit !== undefined) {
      order.takeProfit = updates.takeProfit ? new Decimal(updates.takeProfit) : null;
    }
    if (updates.expiresAt !== undefined) {
      order.expiresAt = updates.expiresAt;
    }

    order.updatedAt = new Date();
    return { success: true, order };
  }

  /**
   * Record order history
   */
  recordHistory(userId, order) {
    if (!this.orderHistory.has(userId)) {
      this.orderHistory.set(userId, []);
    }

    this.orderHistory.get(userId).push({
      ...order,
      amount: order.amount.toString(),
      limitPrice: order.limitPrice.toString(),
      filledPrice: order.filledPrice ? order.filledPrice.toString() : null,
      filledAmount: order.filledAmount.toString(),
    });

    // Keep only last 1000 orders
    const history = this.orderHistory.get(userId);
    if (history.length > 1000) {
      this.orderHistory.set(userId, history.slice(-1000));
    }
  }

  /**
   * Get order history
   */
  getHistory(userId, limit = 50) {
    const history = this.orderHistory.get(userId) || [];
    return history.slice(-limit).reverse();
  }

  /**
   * Get order statistics
   */
  getStatistics(userId) {
    const history = this.orderHistory.get(userId) || [];
    const activeOrders = this.getActiveOrders(userId);

    const filled = history.filter(o => o.status === "filled");
    const cancelled = history.filter(o => o.status === "cancelled");
    const expired = history.filter(o => o.status === "expired");
    const failed = history.filter(o => o.status === "failed");

    return {
      active: activeOrders.length,
      filled: filled.length,
      cancelled: cancelled.length,
      expired: expired.length,
      failed: failed.length,
      total: history.length,
      fillRate: history.length > 0 
        ? ((filled.length / history.length) * 100).toFixed(2) + "%" 
        : "N/A",
    };
  }

  /**
   * Create OCO (One-Cancels-Other) order
   */
  createOCO(userId, asset, amount, limitPrice, stopPrice, executeFn) {
    // Create two linked orders - when one fills, cancel the other
    const buyOrder = this.createOrder(userId, {
      type: "buy",
      asset,
      amount,
      limitPrice,
    });

    const stopOrder = this.createOrder(userId, {
      type: "sell",
      asset,
      amount,
      limitPrice: stopPrice,
      stopLoss: stopPrice,
    });

    buyOrder.linkedOrderId = stopOrder.id;
    stopOrder.linkedOrderId = buyOrder.id;

    return { buyOrder, stopOrder };
  }

  /**
   * Create trailing stop order
   */
  createTrailingStop(userId, asset, amount, trailAmount, trailPercent = null) {
    const order = this.createOrder(userId, {
      type: "sell",
      asset,
      amount,
      limitPrice: 0, // Will be calculated dynamically
    });

    order.isTrailing = true;
    order.trailAmount = trailAmount ? new Decimal(trailAmount) : null;
    order.trailPercent = trailPercent ? new Decimal(trailPercent) : null;
    order.highestPrice = null;

    return order;
  }
}

module.exports = new LimitOrderManager();
