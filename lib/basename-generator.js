const Web3 = require("web3");
const PouchDB = require("pouchdb");
const { Coinbase } = require("@coinbase/coinbase-sdk");
const Decimal = require("decimal.js");

class BasenameGenerator {
  constructor(db) {
    this.db = db || new PouchDB("basenames");
    this.web3 = new Web3();
    this.reservedNames = new Set([
      "coinbase", "base", "ethereum", "admin", "root", "test", "demo", "www", "mail", "ftp"
    ]);
    
    // Basename registrar contract on Base (placeholder - replace with actual contract)
    this.registrarAddress = "0x0000000000000000000000000000000000000000"; // TODO: Update with real contract
    this.registrationFee = new Decimal("0.001"); // Base fee in ETH
  }

  /**
   * Generate basename suggestions
   */
  generateSuggestions(userId, preferences = {}) {
    const suggestions = [];
    const { 
      style = "random", // random, cool, professional, creative, gaming
      length = "medium", // short (3-5), medium (6-10), long (11-15)
      includeNumbers = false,
      includeEmojis = false,
      keywords = []
    } = preferences;

    const lengthRange = {
      short: [3, 5],
      medium: [6, 10],
      long: [11, 15]
    };

    const [minLen, maxLen] = lengthRange[length] || [6, 10];

    // Generate based on style
    switch (style) {
      case "cool":
        suggestions.push(...this.generateCoolNames(minLen, maxLen, includeNumbers));
        break;
      case "professional":
        suggestions.push(...this.generateProfessionalNames(keywords, minLen, maxLen));
        break;
      case "creative":
        suggestions.push(...this.generateCreativeNames(minLen, maxLen, includeEmojis));
        break;
      case "gaming":
        suggestions.push(...this.generateGamingNames(minLen, maxLen, includeNumbers));
        break;
      default:
        suggestions.push(...this.generateRandomNames(minLen, maxLen, includeNumbers));
    }

    // Filter out reserved and taken names
    return suggestions
      .filter(name => !this.reservedNames.has(name.toLowerCase()))
      .filter(name => !this.isNameTaken(name))
      .slice(0, 10);
  }

  /**
   * Generate cool/trendy names
   */
  generateCoolNames(minLen, maxLen, includeNumbers) {
    const prefixes = ["cyber", "nova", "zen", "neo", "flux", "vibe", "echo", "pulse"];
    const suffixes = ["wave", "verse", "core", "lab", "hub", "zone", "net", "pro"];
    const names = [];

    for (let i = 0; i < 15; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      let name = prefix + suffix;
      
      if (includeNumbers) {
        name += Math.floor(Math.random() * 999);
      }

      if (name.length >= minLen && name.length <= maxLen) {
        names.push(name);
      }
    }

    return names;
  }

  /**
   * Generate professional names
   */
  generateProfessionalNames(keywords, minLen, maxLen) {
    const titles = ["pro", "expert", "official", "certified", "verified"];
    const domains = ["finance", "tech", "crypto", "blockchain", "defi"];
    const names = [];

    // Use keywords if provided
    if (keywords.length > 0) {
      for (const keyword of keywords) {
        for (const title of titles) {
          const name = keyword.toLowerCase() + title;
          if (name.length >= minLen && name.length <= maxLen) {
            names.push(name);
          }
        }
      }
    }

    // Generate from domains
    for (let i = 0; i < 10; i++) {
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const title = titles[Math.floor(Math.random() * titles.length)];
      const name = domain + title;
      
      if (name.length >= minLen && name.length <= maxLen) {
        names.push(name);
      }
    }

    return names;
  }

  /**
   * Generate creative names with emojis
   */
  generateCreativeNames(minLen, maxLen, includeEmojis) {
    const adjectives = ["happy", "bright", "swift", "clever", "mighty", "cosmic"];
    const nouns = ["moon", "star", "cloud", "wave", "spark", "dream"];
    const emojis = ["🚀", "💎", "⚡", "🌟", "🔥", "💫"];
    const names = [];

    for (let i = 0; i < 15; i++) {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      let name = adj + noun;
      
      if (includeEmojis) {
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        name = emoji + name;
      }

      if (name.length >= minLen && name.length <= maxLen) {
        names.push(name);
      }
    }

    return names;
  }

  /**
   * Generate gaming names
   */
  generateGamingNames(minLen, maxLen, includeNumbers) {
    const prefixes = ["shadow", "dark", "silent", "deadly", "phantom", "ghost"];
    const suffixes = ["killer", "slayer", "hunter", "master", "lord", "king"];
    const names = [];

    for (let i = 0; i < 15; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      let name = prefix + suffix;
      
      if (includeNumbers) {
        name += Math.floor(Math.random() * 9999);
      }

      if (name.length >= minLen && name.length <= maxLen) {
        names.push(name);
      }
    }

    return names;
  }

  /**
   * Generate random names
   */
  generateRandomNames(minLen, maxLen, includeNumbers) {
    const consonants = "bcdfghjklmnpqrstvwxyz";
    const vowels = "aeiou";
    const names = [];

    for (let i = 0; i < 20; i++) {
      let name = "";
      const targetLen = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
      
      for (let j = 0; j < targetLen; j++) {
        if (j % 2 === 0) {
          name += consonants[Math.floor(Math.random() * consonants.length)];
        } else {
          name += vowels[Math.floor(Math.random() * vowels.length)];
        }
      }

      if (includeNumbers) {
        name += Math.floor(Math.random() * 999);
      }

      names.push(name);
    }

    return names;
  }

  /**
   * Check if basename is available
   */
  async checkAvailability(basename) {
    // Normalize basename
    const normalized = basename.toLowerCase().trim();

    // Check length (3-63 characters for basenames)
    if (normalized.length < 3 || normalized.length > 63) {
      return {
        available: false,
        reason: "Basename must be between 3 and 63 characters",
      };
    }

    // Check format (alphanumeric and hyphens only)
    if (!/^[a-z0-9-]+$/.test(normalized)) {
      return {
        available: false,
        reason: "Basename can only contain lowercase letters, numbers, and hyphens",
      };
    }

    // Check reserved names
    if (this.reservedNames.has(normalized)) {
      return {
        available: false,
        reason: "This basename is reserved",
      };
    }

    // Check if already taken in database
    try {
      const existing = await this.db.get(`basename:${normalized}`);
      if (existing && !existing.expired) {
        return {
          available: false,
          reason: "This basename is already taken",
          owner: existing.owner,
          expiresAt: existing.expiresAt,
        };
      }
    } catch (err) {
      // Not found - it's available
    }

    // Check if registration is pending
    try {
      const pending = await this.db.get(`pending:${normalized}`);
      if (pending && new Date(pending.expiresAt) > new Date()) {
        return {
          available: false,
          reason: "Registration pending for this basename",
          pendingUntil: pending.expiresAt,
        };
      }
    } catch (err) {
      // No pending registration
    }

    return {
      available: true,
      basename: normalized,
      estimatedCost: this.estimateRegistrationCost(normalized),
    };
  }

  /**
   * Estimate registration cost
   */
  estimateRegistrationCost(basename) {
    const length = basename.length;
    
    // Shorter names cost more (premium pricing)
    let baseCost;
    if (length === 3) baseCost = new Decimal("0.1"); // Premium 3-char
    else if (length === 4) baseCost = new Decimal("0.05"); // Premium 4-char
    else if (length <= 6) baseCost = new Decimal("0.01"); // Short names
    else baseCost = new Decimal("0.005"); // Standard price
    
    return {
      eth: baseCost.toString(),
      usd: baseCost.mul(3000).toString(), // Approximate ETH price
      wei: this.web3.utils.toWei(baseCost.toString(), "ether"),
    };
  }

  /**
   * Register basename
   */
  async registerBasename(userId, basename, walletAddress, duration = 1) {
    const availability = await this.checkAvailability(basename);
    
    if (!availability.available) {
      throw new Error(availability.reason);
    }

    const normalized = basename.toLowerCase().trim();
    const registrationId = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cost = this.estimateRegistrationCost(normalized);

    // Create pending registration in database
    const pendingDoc = {
      _id: `pending:${normalized}`,
      type: "pending_registration",
      registrationId,
      userId,
      basename: normalized,
      walletAddress,
      duration, // years
      cost: cost.eth,
      costWei: cost.wei,
      status: "pending_payment",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + duration * 365 * 24 * 60 * 60 * 1000).toISOString(),
      // 15 minute timeout for payment
      pendingUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };

    try {
      await this.db.put(pendingDoc);
    } catch (err) {
      throw new Error(`Failed to create registration: ${err.message}`);
    }

    return {
      registrationId,
      basename: normalized,
      cost: cost.eth,
      costUsd: cost.usd,
      costWei: cost.wei,
      duration,
      status: "pending_payment",
      paymentAddress: this.registrarAddress,
      expiresIn: "15 minutes",
    };
  }

  /**
   * Confirm registration with transaction hash
   */
  async confirmRegistration(registrationId, txHash, blockNumber) {
    // Find pending registration
    const allDocs = await this.db.allDocs({ include_docs: true, startkey: "pending:", endkey: "pending:\uffff" });
    let pendingDoc = null;
    let basename = null;

    for (const row of allDocs.rows) {
      if (row.doc.registrationId === registrationId) {
        pendingDoc = row.doc;
        basename = row.doc.basename;
        break;
      }
    }

    if (!pendingDoc) {
      throw new Error("Registration not found");
    }

    // Check if still valid
    if (new Date(pendingDoc.pendingUntil) < new Date()) {
      throw new Error("Registration timeout expired. Please start a new registration.");
    }

    // Create confirmed registration
    const registrationDoc = {
      _id: `basename:${basename}`,
      type: "registered_basename",
      basename,
      owner: pendingDoc.userId,
      walletAddress: pendingDoc.walletAddress,
      registeredAt: new Date().toISOString(),
      expiresAt: pendingDoc.expiresAt,
      duration: pendingDoc.duration,
      txHash,
      blockNumber,
      registrationId,
      cost: pendingDoc.cost,
      isPrimary: false,
      status: "active",
    };

    try {
      // Save registered basename
      await this.db.put(registrationDoc);

      // Add to user's basename list
      let userDoc;
      try {
        userDoc = await this.db.get(`user:${pendingDoc.userId}`);
      } catch (err) {
        userDoc = {
          _id: `user:${pendingDoc.userId}`,
          type: "user_basenames",
          userId: pendingDoc.userId,
          basenames: [],
          primaryBasename: null,
        };
      }

      if (!userDoc.basenames.includes(basename)) {
        userDoc.basenames.push(basename);
      }

      // Set as primary if it's the first one
      if (!userDoc.primaryBasename) {
        userDoc.primaryBasename = basename;
        registrationDoc.isPrimary = true;
        await this.db.put(registrationDoc);
      }

      await this.db.put(userDoc);

      // Remove pending registration
      await this.db.remove(pendingDoc);

      return {
        success: true,
        basename,
        fullName: `${basename}.base`,
        txHash,
        blockNumber,
        expiresAt: registrationDoc.expiresAt,
        isPrimary: registrationDoc.isPrimary,
      };
    } catch (err) {
      throw new Error(`Failed to confirm registration: ${err.message}`);
    }
  }

  /**
   * Get user's basenames
   */
  getUserBasenames(userId) {
    return this.registeredNames.get(userId) || [];
  }

  /**
   * Check if name is taken
   */
  isNameTaken(basename) {
    return this.nameRegistry.has(basename.toLowerCase());
  }

  /**
   * Get name owner
   */
  getNameOwner(basename) {
    const record = this.nameRegistry.get(basename.toLowerCase());
    return record ? record.owner : null;
  }

  /**
   * Set primary basename
   */
  setPrimaryBasename(userId, basename) {
    const userNames = this.getUserBasenames(userId);
    
    if (!userNames.includes(basename)) {
      throw new Error("You don't own this basename");
    }

    // Store primary name preference
    if (!this.registeredNames.has(`${userId}_primary`)) {
      this.registeredNames.set(`${userId}_primary`, basename);
    } else {
      this.registeredNames.set(`${userId}_primary`, basename);
    }

    return { success: true, primaryBasename: basename };
  }

  /**
   * Get primary basename
   */
  getPrimaryBasename(userId) {
    return this.registeredNames.get(`${userId}_primary`) || null;
  }

  /**
   * Renew basename
   */
  async renewBasename(userId, basename, years = 1) {
    const record = this.nameRegistry.get(basename);
    
    if (!record) {
      throw new Error("Basename not found");
    }

    if (record.owner !== userId) {
      throw new Error("You don't own this basename");
    }

    const newExpiry = new Date(record.expiresAt);
    newExpiry.setFullYear(newExpiry.getFullYear() + years);

    record.expiresAt = newExpiry;

    return {
      success: true,
      basename,
      newExpiry,
      cost: this.estimateRegistrationCost(basename),
    };
  }

  /**
   * Transfer basename
   */
  async transferBasename(fromUserId, toUserId, basename) {
    const record = this.nameRegistry.get(basename);
    
    if (!record) {
      throw new Error("Basename not found");
    }

    if (record.owner !== fromUserId) {
      throw new Error("You don't own this basename");
    }

    // Update owner
    record.owner = toUserId;

    // Update user lists
    const fromNames = this.registeredNames.get(fromUserId) || [];
    this.registeredNames.set(
      fromUserId,
      fromNames.filter(n => n !== basename)
    );

    if (!this.registeredNames.has(toUserId)) {
      this.registeredNames.set(toUserId, []);
    }
    this.registeredNames.get(toUserId).push(basename);

    return {
      success: true,
      basename,
      from: fromUserId,
      to: toUserId,
    };
  }

  /**
   * Get basename info
   */
  getBasenameInfo(basename) {
    const record = this.nameRegistry.get(basename);
    
    if (!record) {
      return null;
    }

    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (record.expiresAt - now) / (1000 * 60 * 60 * 24)
    );

    return {
      basename: record.basename,
      owner: record.owner,
      registeredAt: record.registeredAt,
      expiresAt: record.expiresAt,
      daysUntilExpiry,
      isExpired: now > record.expiresAt,
      txHash: record.txHash,
    };
  }
}

module.exports = new BasenameGenerator();
