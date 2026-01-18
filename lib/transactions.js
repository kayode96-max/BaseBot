class TransactionHistory {
  constructor(db) {
    this.db = db;
  }

  // Record a transaction
  async recordTransaction(userId, transaction) {
    const txId = `tx_${userId}_${Date.now()}`;
    const txData = {
      _id: txId,
      userId,
      ...transaction,
      timestamp: new Date().toISOString()
    };

    await this.db.put(txData);
    return txData;
  }

  // Get transaction history
  async getHistory(userId, limit = 50) {
    try {
      const result = await this.db.allDocs({
        include_docs: true,
        startkey: `tx_${userId}_`,
        endkey: `tx_${userId}_\ufff0`,
        limit,
        descending: true
      });

      return result.rows.map(row => row.doc);
    } catch (err) {
      return [];
    }
  }

  // Get transactions by type
  async getByType(userId, type) {
    const history = await this.getHistory(userId, 1000);
    return history.filter(tx => tx.type === type);
  }

  // Get transactions by asset
  async getByAsset(userId, asset) {
    const history = await this.getHistory(userId, 1000);
    return history.filter(tx => 
      tx.fromAsset === asset || tx.toAsset === asset
    );
  }

  // Calculate total volume
  async getTotalVolume(userId) {
    const history = await this.getHistory(userId, 10000);
    const buys = history.filter(tx => tx.type === 'buy');
    const sells = history.filter(tx => tx.type === 'sell');

    return {
      totalTrades: history.length,
      buys: buys.length,
      sells: sells.length,
      transfers: history.filter(tx => tx.type === 'transfer').length
    };
  }
}

module.exports = TransactionHistory;
