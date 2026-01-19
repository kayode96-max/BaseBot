const Web3 = require("web3");

class BasenameGenerator {
  constructor() {
    this.registeredNames = new Map();
    this.pendingRegistrations = new Map();
    this.nameRegistry = new Map();
    this.reservedNames = new Set([
      "coinbase", "base", "ethereum", "admin", "root", "test", "demo"
    ]);
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

    // Check if already taken
    if (this.isNameTaken(normalized)) {
      return {
        available: false,
        reason: "This basename is already taken",
        owner: this.getNameOwner(normalized),
      };
    }

    // Check if registration is pending
    if (this.pendingRegistrations.has(normalized)) {
      return {
        available: false,
        reason: "Registration pending for this basename",
      };
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
    
    // Shorter names cost more
    if (length === 3) return "0.1 ETH"; // Premium
    if (length === 4) return "0.05 ETH";
    if (length <= 6) return "0.01 ETH";
    return "0.005 ETH"; // Standard price
  }

  /**
   * Register basename
   */
  async registerBasename(userId, basename, duration = 1) {
    const availability = await this.checkAvailability(basename);
    
    if (!availability.available) {
      throw new Error(availability.reason);
    }

    const normalized = basename.toLowerCase().trim();
    const registrationId = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create pending registration
    this.pendingRegistrations.set(normalized, {
      id: registrationId,
      userId,
      basename: normalized,
      duration, // years
      cost: availability.estimatedCost,
      status: "pending",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + duration * 365 * 24 * 60 * 60 * 1000),
    });

    return {
      registrationId,
      basename: normalized,
      cost: availability.estimatedCost,
      duration,
      status: "pending",
    };
  }

  /**
   * Confirm registration
   */
  async confirmRegistration(registrationId, txHash) {
    let registration = null;
    let basename = null;

    for (const [name, reg] of this.pendingRegistrations) {
      if (reg.id === registrationId) {
        registration = reg;
        basename = name;
        break;
      }
    }

    if (!registration) {
      throw new Error("Registration not found");
    }

    // Mark as confirmed
    registration.status = "confirmed";
    registration.txHash = txHash;
    registration.confirmedAt = new Date();

    // Move to registered names
    this.nameRegistry.set(basename, {
      owner: registration.userId,
      basename,
      registeredAt: new Date(),
      expiresAt: registration.expiresAt,
      txHash,
    });

    if (!this.registeredNames.has(registration.userId)) {
      this.registeredNames.set(registration.userId, []);
    }
    this.registeredNames.get(registration.userId).push(basename);

    // Remove from pending
    this.pendingRegistrations.delete(basename);

    return {
      success: true,
      basename,
      txHash,
      expiresAt: registration.expiresAt,
    };
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
