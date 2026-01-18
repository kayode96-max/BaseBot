class Watchlist {
  constructor(db) {
    this.db = db;
  }

  // Add asset to watchlist
  async addToWatchlist(userId, asset, notes = '') {
    const watchId = `watch_${userId}_${asset.toLowerCase()}`;
    const watchItem = {
      _id: watchId,
      userId,
      asset: asset.toLowerCase(),
      notes,
      addedAt: new Date().toISOString()
    };

    try {
      await this.db.put(watchItem);
      return watchItem;
    } catch (err) {
      if (err.status === 409) {
        throw new Error('Asset already in watchlist');
      }
      throw err;
    }
  }

  // Remove from watchlist
  async removeFromWatchlist(userId, asset) {
    try {
      const watchId = `watch_${userId}_${asset.toLowerCase()}`;
      const doc = await this.db.get(watchId);
      await this.db.remove(doc);
      return true;
    } catch (err) {
      return false;
    }
  }

  // Get user's watchlist
  async getWatchlist(userId) {
    try {
      const result = await this.db.allDocs({
        include_docs: true,
        startkey: `watch_${userId}_`,
        endkey: `watch_${userId}_\ufff0`
      });

      return result.rows.map(row => row.doc);
    } catch (err) {
      return [];
    }
  }

  // Update notes for watched asset
  async updateNotes(userId, asset, notes) {
    try {
      const watchId = `watch_${userId}_${asset.toLowerCase()}`;
      const doc = await this.db.get(watchId);
      await this.db.put({
        ...doc,
        notes,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (err) {
      return false;
    }
  }

  // Check if asset is watched
  async isWatched(userId, asset) {
    try {
      const watchId = `watch_${userId}_${asset.toLowerCase()}`;
      await this.db.get(watchId);
      return true;
    } catch (err) {
      return false;
    }
  }
}

module.exports = Watchlist;
