const PouchDB = require("pouchdb");

class MultiWalletManager {
  constructor() {
    this.db = new PouchDB("wallets");
    this.activeWallets = new Map();
  }

  /**
   * Add new wallet for user
   */
  async addWallet(userId, walletData, label = "Main") {
    const walletId = `${userId}_${Date.now()}`;
    
    await this.db.put({
      _id: walletId,
      userId,
      label,
      address: walletData.address,
      encryptedData: walletData.encrypted,
      iv: walletData.iv,
      createdAt: new Date().toISOString(),
      isActive: true,
    });

    return walletId;
  }

  /**
   * Get all wallets for user
   */
  async getUserWallets(userId) {
    try {
      const result = await this.db.allDocs({
        include_docs: true,
        startkey: `${userId}_`,
        endkey: `${userId}_\uffff`,
      });

      return result.rows.map((row) => ({
        id: row.doc._id,
        label: row.doc.label,
        address: row.doc.address,
        isActive: row.doc.isActive,
        createdAt: row.doc.createdAt,
      }));
    } catch (error) {
      console.error("Error getting user wallets:", error);
      return [];
    }
  }

  /**
   * Get wallet by ID
   */
  async getWallet(walletId) {
    try {
      return await this.db.get(walletId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Set active wallet
   */
  async setActiveWallet(userId, walletId) {
    const wallets = await this.getUserWallets(userId);
    
    for (const wallet of wallets) {
      const doc = await this.db.get(wallet.id);
      doc.isActive = wallet.id === walletId;
      await this.db.put(doc);
    }

    this.activeWallets.set(userId, walletId);
  }

  /**
   * Get active wallet
   */
  async getActiveWallet(userId) {
    // Check in-memory cache first
    if (this.activeWallets.has(userId)) {
      const walletId = this.activeWallets.get(userId);
      return await this.getWallet(walletId);
    }

    // Find active wallet in database
    const wallets = await this.getUserWallets(userId);
    const active = wallets.find((w) => w.isActive);
    
    if (active) {
      this.activeWallets.set(userId, active.id);
      return await this.getWallet(active.id);
    }

    return null;
  }

  /**
   * Update wallet label
   */
  async updateLabel(walletId, newLabel) {
    try {
      const wallet = await this.db.get(walletId);
      wallet.label = newLabel;
      await this.db.put(wallet);
      return true;
    } catch (error) {
      console.error("Error updating wallet label:", error);
      return false;
    }
  }

  /**
   * Delete wallet
   */
  async deleteWallet(walletId) {
    try {
      const wallet = await this.db.get(walletId);
      await this.db.remove(wallet);
      
      // Remove from cache
      for (const [userId, cachedWalletId] of this.activeWallets) {
        if (cachedWalletId === walletId) {
          this.activeWallets.delete(userId);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error deleting wallet:", error);
      return false;
    }
  }

  /**
   * Get combined portfolio across all wallets
   */
  async getCombinedPortfolio(userId, getBalancesFn) {
    const wallets = await this.getUserWallets(userId);
    const combined = new Map();

    for (const wallet of wallets) {
      try {
        const balances = await getBalancesFn(wallet.address);
        
        for (const [asset, balance] of balances) {
          const current = combined.get(asset) || 0;
          combined.set(asset, current + parseFloat(balance));
        }
      } catch (error) {
        console.error(`Error getting balances for wallet ${wallet.id}:`, error);
      }
    }

    return combined;
  }

  /**
   * Import wallet from seed phrase
   */
  async importWallet(userId, seedPhrase, label, encryptionFn) {
    // This would use the actual wallet import logic
    // For now, return simulated result
    const walletData = {
      address: "0x" + "0".repeat(40),
      encrypted: encryptionFn(seedPhrase),
      iv: "random-iv",
    };

    return await this.addWallet(userId, walletData, label);
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(userId) {
    const wallets = await this.getUserWallets(userId);
    
    return {
      total: wallets.length,
      active: wallets.filter((w) => w.isActive).length,
      oldest: wallets.reduce((oldest, w) => 
        !oldest || new Date(w.createdAt) < new Date(oldest.createdAt) ? w : oldest, null
      ),
      newest: wallets.reduce((newest, w) => 
        !newest || new Date(w.createdAt) > new Date(newest.createdAt) ? w : newest, null
      ),
    };
  }
}

module.exports = new MultiWalletManager();
