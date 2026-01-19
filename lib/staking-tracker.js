const Decimal = require("decimal.js");

class StakingTracker {
  constructor() {
    this.stakes = new Map();
    this.rewards = new Map();
    this.validators = new Map();
  }

  /**
   * Add staking position
   */
  addStake(userId, config) {
    const stakeId = `stake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const stake = {
      id: stakeId,
      userId,
      asset: config.asset,
      amount: new Decimal(config.amount),
      validator: config.validator || null,
      apr: config.apr ? new Decimal(config.apr) : null,
      startDate: new Date(),
      endDate: config.endDate || null,
      lockPeriod: config.lockPeriod || null, // Days
      status: "active",
      rewards: new Decimal(0),
      claimedRewards: new Decimal(0),
      txHash: config.txHash || null,
    };

    if (!this.stakes.has(userId)) {
      this.stakes.set(userId, new Map());
    }
    this.stakes.get(userId).set(stakeId, stake);

    return stake;
  }

  /**
   * Calculate current rewards
   */
  calculateRewards(stake, currentDate = new Date()) {
    if (!stake.apr || stake.status !== "active") {
      return new Decimal(0);
    }

    const daysStaked = (currentDate - stake.startDate) / (1000 * 60 * 60 * 24);
    const apr = stake.apr.dividedBy(100);
    const dailyRate = apr.dividedBy(365);
    
    const rewards = stake.amount.times(dailyRate).times(daysStaked);
    return rewards;
  }

  /**
   * Update stake rewards
   */
  updateRewards(userId, stakeId) {
    const stake = this.getStake(userId, stakeId);
    if (!stake) return null;

    const currentRewards = this.calculateRewards(stake);
    stake.rewards = currentRewards;

    return {
      stakeId,
      rewards: currentRewards.toString(),
      unclaimed: currentRewards.minus(stake.claimedRewards).toString(),
    };
  }

  /**
   * Claim rewards
   */
  async claimRewards(userId, stakeId, claimFn) {
    const stake = this.getStake(userId, stakeId);
    if (!stake) {
      throw new Error("Stake not found");
    }

    const unclaimed = stake.rewards.minus(stake.claimedRewards);
    if (unclaimed.lessThanOrEqualTo(0)) {
      throw new Error("No rewards to claim");
    }

    try {
      const result = await claimFn(stake, unclaimed);
      
      stake.claimedRewards = stake.claimedRewards.plus(unclaimed);
      
      // Record claim
      this.recordClaim(userId, {
        stakeId,
        amount: unclaimed.toString(),
        timestamp: new Date(),
        txHash: result.txHash,
      });

      return {
        amount: unclaimed.toString(),
        txHash: result.txHash,
      };
    } catch (error) {
      throw new Error(`Failed to claim rewards: ${error.message}`);
    }
  }

  /**
   * Unstake position
   */
  async unstake(userId, stakeId, unstakeFn) {
    const stake = this.getStake(userId, stakeId);
    if (!stake) {
      throw new Error("Stake not found");
    }

    if (stake.status !== "active") {
      throw new Error("Stake is not active");
    }

    // Check lock period
    if (stake.lockPeriod) {
      const lockEnd = new Date(stake.startDate);
      lockEnd.setDate(lockEnd.getDate() + stake.lockPeriod);
      
      if (new Date() < lockEnd) {
        throw new Error(`Stake is locked until ${lockEnd.toLocaleDateString()}`);
      }
    }

    try {
      const result = await unstakeFn(stake);
      
      stake.status = "unstaked";
      stake.endDate = new Date();
      
      return {
        amount: stake.amount.toString(),
        rewards: stake.rewards.toString(),
        totalReturned: stake.amount.plus(stake.rewards).toString(),
        txHash: result.txHash,
      };
    } catch (error) {
      throw new Error(`Failed to unstake: ${error.message}`);
    }
  }

  /**
   * Get user's stakes
   */
  getUserStakes(userId, status = null) {
    const userStakes = this.stakes.get(userId);
    if (!userStakes) return [];

    return Array.from(userStakes.values())
      .filter(s => !status || s.status === status)
      .map(s => ({
        ...s,
        amount: s.amount.toString(),
        apr: s.apr ? s.apr.toString() : null,
        rewards: s.rewards.toString(),
        claimedRewards: s.claimedRewards.toString(),
      }));
  }

  /**
   * Get stake by ID
   */
  getStake(userId, stakeId) {
    const userStakes = this.stakes.get(userId);
    return userStakes ? userStakes.get(stakeId) : null;
  }

  /**
   * Get total staked by asset
   */
  getTotalStaked(userId, asset = null) {
    const stakes = this.getUserStakes(userId, "active");
    
    return stakes
      .filter(s => !asset || s.asset === asset)
      .reduce((total, s) => total.plus(s.amount), new Decimal(0))
      .toString();
  }

  /**
   * Get total rewards earned
   */
  getTotalRewards(userId, asset = null) {
    const stakes = this.getUserStakes(userId);
    
    return stakes
      .filter(s => !asset || s.asset === asset)
      .reduce((total, s) => total.plus(s.rewards), new Decimal(0))
      .toString();
  }

  /**
   * Get staking summary
   */
  getSummary(userId) {
    const stakes = this.getUserStakes(userId);
    const activeStakes = stakes.filter(s => s.status === "active");
    
    const totalStaked = activeStakes.reduce(
      (sum, s) => sum.plus(s.amount), 
      new Decimal(0)
    );

    const totalRewards = stakes.reduce(
      (sum, s) => sum.plus(s.rewards), 
      new Decimal(0)
    );

    const claimedRewards = stakes.reduce(
      (sum, s) => sum.plus(s.claimedRewards), 
      new Decimal(0)
    );

    const unclaimedRewards = totalRewards.minus(claimedRewards);

    // Calculate weighted average APR
    let weightedAPR = new Decimal(0);
    if (totalStaked.greaterThan(0)) {
      for (const stake of activeStakes) {
        if (stake.apr) {
          const weight = new Decimal(stake.amount).dividedBy(totalStaked);
          weightedAPR = weightedAPR.plus(new Decimal(stake.apr).times(weight));
        }
      }
    }

    return {
      activeStakes: activeStakes.length,
      totalStakes: stakes.length,
      totalStaked: totalStaked.toString(),
      totalRewards: totalRewards.toString(),
      claimedRewards: claimedRewards.toString(),
      unclaimedRewards: unclaimedRewards.toString(),
      averageAPR: weightedAPR.toFixed(2) + "%",
    };
  }

  /**
   * Record reward claim
   */
  recordClaim(userId, claim) {
    if (!this.rewards.has(userId)) {
      this.rewards.set(userId, []);
    }

    this.rewards.get(userId).push(claim);

    // Keep only last 100 claims
    const claims = this.rewards.get(userId);
    if (claims.length > 100) {
      this.rewards.set(userId, claims.slice(-100));
    }
  }

  /**
   * Get claim history
   */
  getClaimHistory(userId, limit = 20) {
    const claims = this.rewards.get(userId) || [];
    return claims.slice(-limit).reverse();
  }

  /**
   * Get staking by validator
   */
  getValidatorSummary(userId) {
    const stakes = this.getUserStakes(userId, "active");
    const summary = new Map();

    for (const stake of stakes) {
      const validator = stake.validator || "Unknown";
      
      if (!summary.has(validator)) {
        summary.set(validator, {
          validator,
          stakes: 0,
          totalStaked: new Decimal(0),
          totalRewards: new Decimal(0),
        });
      }

      const data = summary.get(validator);
      data.stakes++;
      data.totalStaked = data.totalStaked.plus(stake.amount);
      data.totalRewards = data.totalRewards.plus(stake.rewards);
    }

    return Array.from(summary.values()).map(data => ({
      validator: data.validator,
      stakes: data.stakes,
      totalStaked: data.totalStaked.toString(),
      totalRewards: data.totalRewards.toString(),
    }));
  }

  /**
   * Project future rewards
   */
  projectRewards(userId, stakeId, days) {
    const stake = this.getStake(userId, stakeId);
    if (!stake || !stake.apr) return null;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const projectedRewards = this.calculateRewards(stake, futureDate);
    const currentRewards = this.calculateRewards(stake);
    const additionalRewards = projectedRewards.minus(currentRewards);

    return {
      days,
      currentRewards: currentRewards.toString(),
      projectedRewards: projectedRewards.toString(),
      additionalRewards: additionalRewards.toString(),
      apr: stake.apr.toString() + "%",
    };
  }
}

module.exports = new StakingTracker();
