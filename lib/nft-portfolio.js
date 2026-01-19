const Decimal = require("decimal.js");

class NFTPortfolio {
  constructor() {
    this.nfts = new Map();
    this.collections = new Map();
    this.floorPrices = new Map();
  }

  /**
   * Add NFT to portfolio
   */
  addNFT(userId, nftData) {
    const key = `${userId}_${nftData.contractAddress}_${nftData.tokenId}`;
    
    const nft = {
      id: key,
      userId,
      contractAddress: nftData.contractAddress,
      tokenId: nftData.tokenId,
      name: nftData.name,
      collection: nftData.collection,
      imageUrl: nftData.imageUrl,
      purchasePrice: nftData.purchasePrice ? new Decimal(nftData.purchasePrice) : null,
      purchaseDate: nftData.purchaseDate || new Date(),
      currentFloorPrice: null,
      attributes: nftData.attributes || [],
      metadata: nftData.metadata || {},
    };

    this.nfts.set(key, nft);
    
    // Track collection
    if (!this.collections.has(nftData.collection)) {
      this.collections.set(nftData.collection, {
        name: nftData.collection,
        nfts: [],
        floorPrice: null,
      });
    }
    this.collections.get(nftData.collection).nfts.push(key);

    return nft;
  }

  /**
   * Get all NFTs for user
   */
  getUserNFTs(userId) {
    const userNFTs = [];
    for (const [key, nft] of this.nfts) {
      if (nft.userId === userId) {
        userNFTs.push({
          ...nft,
          purchasePrice: nft.purchasePrice ? nft.purchasePrice.toString() : null,
          currentFloorPrice: nft.currentFloorPrice ? nft.currentFloorPrice.toString() : null,
        });
      }
    }
    return userNFTs;
  }

  /**
   * Get NFTs by collection
   */
  getCollectionNFTs(userId, collection) {
    return this.getUserNFTs(userId).filter(nft => nft.collection === collection);
  }

  /**
   * Update floor prices
   */
  async updateFloorPrices(floorPriceData) {
    for (const [collection, price] of Object.entries(floorPriceData)) {
      this.floorPrices.set(collection, new Decimal(price));
      
      // Update collection
      if (this.collections.has(collection)) {
        this.collections.get(collection).floorPrice = new Decimal(price);
      }

      // Update individual NFTs
      for (const [key, nft] of this.nfts) {
        if (nft.collection === collection) {
          nft.currentFloorPrice = new Decimal(price);
        }
      }
    }
  }

  /**
   * Calculate NFT portfolio value
   */
  calculatePortfolioValue(userId) {
    const nfts = this.getUserNFTs(userId);
    let totalValue = new Decimal(0);
    let totalCost = new Decimal(0);
    let nftsWithPrice = 0;

    for (const nft of nfts) {
      if (nft.currentFloorPrice) {
        totalValue = totalValue.plus(nft.currentFloorPrice);
        nftsWithPrice++;
      }
      if (nft.purchasePrice) {
        totalCost = totalCost.plus(nft.purchasePrice);
      }
    }

    const profit = totalValue.minus(totalCost);
    const roi = totalCost.greaterThan(0) 
      ? profit.dividedBy(totalCost).times(100) 
      : new Decimal(0);

    return {
      totalNFTs: nfts.length,
      totalValue: totalValue.toString(),
      totalCost: totalCost.toString(),
      profit: profit.toString(),
      roi: roi.toFixed(2) + "%",
      nftsWithFloorPrice: nftsWithPrice,
    };
  }

  /**
   * Get collection summary
   */
  getCollectionSummary(userId) {
    const nfts = this.getUserNFTs(userId);
    const summary = new Map();

    for (const nft of nfts) {
      if (!summary.has(nft.collection)) {
        summary.set(nft.collection, {
          collection: nft.collection,
          count: 0,
          totalValue: new Decimal(0),
          totalCost: new Decimal(0),
          floorPrice: nft.currentFloorPrice,
        });
      }

      const data = summary.get(nft.collection);
      data.count++;
      
      if (nft.currentFloorPrice) {
        data.totalValue = data.totalValue.plus(nft.currentFloorPrice);
      }
      if (nft.purchasePrice) {
        data.totalCost = data.totalCost.plus(nft.purchasePrice);
      }
    }

    return Array.from(summary.values()).map(data => ({
      collection: data.collection,
      count: data.count,
      totalValue: data.totalValue.toString(),
      totalCost: data.totalCost.toString(),
      profit: data.totalValue.minus(data.totalCost).toString(),
      floorPrice: data.floorPrice ? data.floorPrice.toString() : null,
    }));
  }

  /**
   * Get top performing NFTs
   */
  getTopPerformers(userId, limit = 10) {
    const nfts = this.getUserNFTs(userId);
    
    return nfts
      .filter(nft => nft.purchasePrice && nft.currentFloorPrice)
      .map(nft => {
        const profit = new Decimal(nft.currentFloorPrice).minus(nft.purchasePrice);
        const roi = profit.dividedBy(nft.purchasePrice).times(100);
        
        return {
          ...nft,
          profit: profit.toString(),
          roi: roi.toFixed(2) + "%",
        };
      })
      .sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi))
      .slice(0, limit);
  }

  /**
   * Get underperforming NFTs
   */
  getUnderperformers(userId, limit = 10) {
    const nfts = this.getUserNFTs(userId);
    
    return nfts
      .filter(nft => nft.purchasePrice && nft.currentFloorPrice)
      .map(nft => {
        const profit = new Decimal(nft.currentFloorPrice).minus(nft.purchasePrice);
        const roi = profit.dividedBy(nft.purchasePrice).times(100);
        
        return {
          ...nft,
          profit: profit.toString(),
          roi: roi.toFixed(2) + "%",
        };
      })
      .sort((a, b) => parseFloat(a.roi) - parseFloat(b.roi))
      .slice(0, limit);
  }

  /**
   * Check for rare traits
   */
  analyzeRarity(userId, contractAddress, tokenId) {
    const key = `${userId}_${contractAddress}_${tokenId}`;
    const nft = this.nfts.get(key);
    
    if (!nft) return null;

    // Get all NFTs in collection
    const collectionNFTs = this.getCollectionNFTs(userId, nft.collection);
    const totalCount = collectionNFTs.length;

    // Analyze trait rarity
    const traitRarity = [];
    for (const attr of nft.attributes) {
      const countWithTrait = collectionNFTs.filter(n =>
        n.attributes.some(a => 
          a.trait_type === attr.trait_type && a.value === attr.value
        )
      ).length;

      const rarity = (countWithTrait / totalCount) * 100;
      traitRarity.push({
        trait: attr.trait_type,
        value: attr.value,
        count: countWithTrait,
        percentage: rarity.toFixed(2) + "%",
        isRare: rarity < 5,
      });
    }

    return {
      nft,
      traits: traitRarity,
      rarityScore: traitRarity.reduce((score, t) => 
        score + (100 - parseFloat(t.percentage)), 0
      ),
    };
  }

  /**
   * Remove NFT (sold or transferred)
   */
  removeNFT(userId, contractAddress, tokenId) {
    const key = `${userId}_${contractAddress}_${tokenId}`;
    const nft = this.nfts.get(key);
    
    if (!nft) return false;

    // Remove from collection tracking
    const collection = this.collections.get(nft.collection);
    if (collection) {
      collection.nfts = collection.nfts.filter(id => id !== key);
    }

    this.nfts.delete(key);
    return true;
  }

  /**
   * Get portfolio diversity score
   */
  getDiversityScore(userId) {
    const summary = this.getCollectionSummary(userId);
    const totalNFTs = summary.reduce((sum, c) => sum + c.count, 0);
    
    if (totalNFTs === 0) return 0;

    // Calculate Herfindahl-Hirschman Index for diversity
    const hhi = summary.reduce((sum, c) => {
      const share = c.count / totalNFTs;
      return sum + (share * share);
    }, 0);

    // Convert to diversity score (0-100, higher is more diverse)
    const diversityScore = (1 - hhi) * 100;

    return {
      score: diversityScore.toFixed(2),
      collections: summary.length,
      rating: diversityScore > 70 ? "Highly Diverse" :
              diversityScore > 40 ? "Moderately Diverse" :
              "Low Diversity",
    };
  }
}

module.exports = new NFTPortfolio();
