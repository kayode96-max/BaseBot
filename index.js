const { Bot, InlineKeyboard } = require("grammy");
const { Coinbase, Wallet } = require("@coinbase/coinbase-sdk");
const PouchDB = require('pouchdb');
const Decimal = require("decimal.js");
const Web3 = require("web3");
const crypto = require("crypto");

// Portfolio management modules
const PortfolioManager = require("./lib/portfolio");
const PortfolioAnalytics = require("./lib/analytics");
const TransactionHistory = require("./lib/transactions");
const AssetAllocation = require("./lib/allocation");
const PriceAlerts = require("./lib/alerts");
const Rebalancer = require("./lib/rebalancer");
const PerformanceTracker = require("./lib/performance");
const Watchlist = require("./lib/watchlist");
const PortfolioExporter = require("./lib/exporter");
const RiskManager = require("./lib/risk-manager");
const AutoCompounder = require("./lib/auto-compounder");
const DCAStrategy = require("./lib/dca-strategy");
const MultiWallet = require("./lib/multi-wallet");
const GasOptimizer = require("./lib/gas-optimizer");

// Ensure environment variables are set.
require("dotenv").config();

const requiredEnvVars = [
  "TELEGRAM_BOT_TOKEN",
  "COINBASE_API_KEY_NAME",
  "COINBASE_API_KEY_SECRET",
  "ENCRYPTION_KEY",
];

requiredEnvVars.forEach((env) => {
  if (!process.env[env]) {
    throw new Error(`missing ${env} environment variable`);
  }
});

// Create a bot object
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// In-memory storage for user states
const userStates = {};

// Local database for storing wallets.
const db = new PouchDB('myapp');

// Initialize portfolio management services
const portfolioManager = new PortfolioManager(db);
const analytics = new PortfolioAnalytics(db);
const txHistory = new TransactionHistory(db);
const allocation = new AssetAllocation(db);
const alerts = new PriceAlerts(db);
const rebalancer = new Rebalancer(db);
const performance = new PerformanceTracker(db);
const watchlist = new Watchlist(db);
const exporter = new PortfolioExporter(db);

// Initialize Coinbase SDK
new Coinbase({
  apiKeyName: process.env.COINBASE_API_KEY_NAME,
  privateKey: process.env.COINBASE_API_KEY_SECRET,
});

// Helper functions
const updateUserState = (user, state) => {
  userStates[user.id] = { ...userStates[user.id], ...state };
};

const clearUserState = (user) => {
  delete userStates[user.id];
};

const sendReply = async (ctx, text, options = {}) => {
  const message = await ctx.reply(text, options);
  updateUserState(ctx.from, { messageId: message.message_id });
};

const handleUserState = async (ctx, handler) => {
  const userState = userStates[ctx.from.id] || {};
  if (
    ctx.message.reply_to_message &&
    ctx.message.reply_to_message.message_id === userState.messageId
  ) {
    await handler(ctx);
  } else {
    await ctx.reply("Please select an option from the menu.");
  }
};

// Bot command handlers
bot.command("start", async (ctx) => {
  const { from: user } = ctx;
  updateUserState(user, {});
  userAddress = await getOrCreateAddress(user);

  const keyboard = new InlineKeyboard()
    .text("💰 Check Balance", "check_balance")
    .row()
    .text("📊 Portfolio", "portfolio")
    .text("📈 Analytics", "analytics")
    .row()
    .text("💸 Deposit ETH", "deposit_eth")
    .text("🏦 Withdraw ETH", "withdraw_eth")
    .row()
    .text("🔼 Buy", "buy")
    .text("🔽 Sell", "sell")
    .row()
    .text("🔔 Alerts", "manage_alerts")
    .text("👁 Watchlist", "watchlist")
    .row()
    .text("⚖️ Rebalance", "rebalance")
    .text("📤 Export", "export")
    .row()
    .text("🤖 DCA", "dca_menu")
    .text("⚡ Auto-Compound", "compound_menu")
    .row()
    .text("🛡️ Risk", "risk_menu")
    .text("⛽ Gas", "gas_menu")
    .row()
    .text("👛 Wallets", "wallet_menu")
    .text("🔑 Export Key", "export_key")
    .row()
    .text("📌 Pin", "pin_message");

  const welcomeMessage = `
*Welcome to your Advanced Portfolio Manager!*
Your Base address is ${userAddress.getId()}.

Select an option below:`;

  await sendReply(ctx, welcomeMessage, {
    reply_markup: keyboard,
    parse_mode: "Markdown",
  });
});

// Portfolio command
bot.command("portfolio", async (ctx) => {
  const userAddress = await getOrCreateAddress(ctx.from);
  const balances = await userAddress.listBalances();
  
  const portfolio = await portfolioManager.updatePortfolio(ctx.from.id, balances);
  const summary = await portfolioManager.getSummary(ctx.from.id);
  
  let message = "*📊 Your Portfolio*\n\n";
  message += `Total Assets: ${summary.totalAssets}\n`;
  message += `Last Updated: ${new Date(summary.lastUpdated).toLocaleString()}\n\n`;
  
  Object.entries(summary.assets).forEach(([asset, data]) => {
    message += `${asset}: ${data.amount}\n`;
  });
  
  await ctx.reply(message, { parse_mode: "Markdown" });
});

// Analytics command
bot.command("analytics", async (ctx) => {
  const userAddress = await getOrCreateAddress(ctx.from);
  const balances = await userAddress.listBalances();
  const metrics = await analytics.getMetrics(ctx.from.id, balances);
  
  let message = "*📈 Portfolio Analytics*\n\n";
  message += `Total Value: ${metrics.totalValue} ETH\n`;
  message += `P&L: ${metrics.absolute} ETH (${metrics.percentage}%)\n`;
  message += `ROI: ${metrics.roi}%\n`;
  message += `Assets: ${metrics.assetCount}\n`;
  
  await ctx.reply(message, { parse_mode: "Markdown" });
});
    .text("Sell", "sell")
    .row()
    .text("Export key", "export_key")
    .text("Pin message", "pin_message");

  const welcomeMessage = `
  *Welcome to your Onchain Trading Bot!*
  Your Base address is ${userAddress.getId()}.
  Select an option below:`;

  await sendReply(ctx, welcomeMessage, {
    reply_markup: keyboard,
    parse_mode: "Markdown",
  });
});

// Callback query handlers
const callbackHandlers = {
  check_balance: handleCheckBalance,
  deposit_eth: handleDeposit,
  withdraw_eth: handleInitialWithdrawal,
  buy: handleInitialBuy,
  sell: handleInitialSell,
  pin_message: handlePinMessage,
  export_key: handleExportKey,
  portfolio: handlePortfolio,
  analytics: handleAnalytics,
  manage_alerts: handleManageAlerts,
  watchlist: handleWatchlist,
  rebalance: handleRebalance,
  export: handleExport,
  dca_menu: handleDCAMenu,
  compound_menu: handleCompoundMenu,
  risk_menu: handleRiskMenu,
  gas_menu: handleGasMenu,
  wallet_menu: handleWalletMenu,
};

bot.on("callback_query:data", async (ctx) => {
  const handler = callbackHandlers[ctx.callbackQuery.data];
  if (handler) {
    await ctx.answerCallbackQuery();
    await handler(ctx);
  } else {
    await ctx.reply("Unknown button clicked!");
  }
  console.log(
    `User ID: ${ctx.from.id}, Username: ${ctx.from.username}, First Name: ${ctx.from.first_name}`,
  );
});

// Handle user messages
bot.on("message:text", async (ctx) =>
  handleUserState(ctx, async () => {
    const userState = userStates[ctx.from.id] || {};
    if (userState.withdrawalRequested) await handleWithdrawal(ctx);
    else if (userState.buyRequested) await handleBuy(ctx);
    else if (userState.sellRequested) await handleSell(ctx);
  }),
);

// Get or create the user's address
async function getOrCreateAddress(user) {
  if (userStates.address) {
    return userStates.address;
  }

  let wallet;
  try {
    const result = await db.get(user.id.toString());
    const { ivString, encryptedWalletData } = result;
    const iv = Buffer.from(ivString, "hex");
    const walletData = JSON.parse(decrypt(encryptedWalletData, iv));
    wallet = await Wallet.import(walletData);
  } catch (error) {
    if (err.name === 'not_found' || err.status === 404) {
      wallet = await Wallet.create({ networkId: "base-mainnet" });
      const iv = crypto.randomBytes(16);
      const encryptedWalletData = encrypt(JSON.stringify(wallet.export()), iv);
      await db.put({
        _id: user.id.toString(), 
        ivString: iv.toString("hex"),
        encryptedWalletData,
      });
    } else {
      console.log('Error fetching from local database: ', error);
    }   
  }

  updateUserState(user, { address: wallet.getDefaultAddress() });

  return wallet.getDefaultAddress();
}

// Handle checking balance
async function handleCheckBalance(ctx) {
  const userAddress = await getOrCreateAddress(ctx.from);
  const balanceMap = await userAddress.listBalances();
  const balancesString =
    balanceMap.size > 0
      ? balanceMap.toString().slice(11, -1)
      : "You have no balances.";
  await sendReply(
    ctx,
    `Your current balances are as follows:\n${balancesString}`,
  );
}

// Handle deposits
async function handleDeposit(ctx) {
  const userAddress = await getOrCreateAddress(ctx.from);
  await sendReply(
    ctx,
    "_Note: As this is a test app, make sure to deposit only small amounts of ETH!_",
    { parse_mode: "Markdown" },
  );
  await sendReply(
    ctx,
    "Please send your ETH to the following address on Base:",
  );
  await sendReply(ctx, `${userAddress.getId()}`, { parse_mode: "Markdown" });
}

// Handle initial withdrawal request
async function handleInitialWithdrawal(ctx) {
  updateUserState(ctx.from, { withdrawalRequested: true });
  await sendReply(
    ctx,
    "Please respond with the amount of ETH you want to withdraw.",
    { reply_markup: { force_reply: true } },
  );
}

// Handle withdrawals
async function handleWithdrawal(ctx) {
  const userState = userStates[ctx.from.id] || {};

  if (!userState.withdrawalAmount) {
    const withdrawalAmount = parseFloat(ctx.message.text);
    if (isNaN(withdrawalAmount)) {
      await ctx.reply("Invalid withdrawal amount. Please try again.");
      clearUserState(ctx.from);
    } else {
      const userAddress = await getOrCreateAddress(ctx.from);
      const currentBalance = await userAddress.getBalance(Coinbase.assets.Eth);
      if (new Decimal(withdrawalAmount).greaterThan(currentBalance)) {
        await ctx.reply("You do not have enough ETH to withdraw that amount.");
        clearUserState(ctx.from);
      } else {
        await sendReply(
          ctx,
          "Please respond with the address, ENS name, or Base name at which you would like to receive the ETH.",
          { reply_markup: { force_reply: true } },
        );
        updateUserState(ctx.from, {
          withdrawalAmount,
        });
      }
    }
  } else {
    const destination = ctx.message.text;
    if (!Web3.utils.isAddress(destination) && !destination.endsWith(".eth")) {
      await ctx.reply("Invalid destination address. Please try again.");
      clearUserState(ctx.from);
      return;
    }

    const userAddress = await getOrCreateAddress(ctx.from);

    try {
      await sendReply(ctx, "Initiating withdrawal...");
      const transfer = await userAddress.createTransfer({
        amount: userState.withdrawalAmount,
        assetId: Coinbase.assets.Eth,
        destination: destination,
      });
      await transfer.wait();
      await sendReply(
        ctx,
        `Successfully completed withdrawal: [Basescan Link](${transfer.getTransactionLink()})`,
        { parse_mode: "Markdown" },
      );
      clearUserState(ctx.from);
    } catch (error) {
      await ctx.reply("An error occurred while initiating the transfer.");
      console.error(error);
      clearUserState(ctx.from);
    }
  }
}

// Handle buy request
async function handleInitialBuy(ctx) {
  await handleTradeInit(ctx, "buy");
}
// Handle buys
async function handleBuy(ctx) {
  await executeTrade(ctx, "buy");
}
// Handle sell request
async function handleInitialSell(ctx) {
  await handleTradeInit(ctx, "sell");
}
// Handle sells
async function handleSell(ctx) {
  await executeTrade(ctx, "sell");
}

// Initialize trade (Buy/Sell)
async function handleTradeInit(ctx, type) {
  const prompt =
    type === "buy"
      ? "Please respond with the asset you would like to buy (ticker or contract address)."
      : "Please respond with the asset you would like to sell (ticker or contract address).";
  updateUserState(ctx.from, { [`${type}Requested`]: true });
  await sendReply(ctx, prompt, { reply_markup: { force_reply: true } });
}

// Generalized function to execute trades
async function executeTrade(ctx, type) {
  const userState = userStates[ctx.from.id] || {};
  if (!userState.asset) {
    // Prevent sale of ETH and log asset to user state
    if (ctx.message.text.toLowerCase() === "eth" && type === "sell") {
      await ctx.reply(
        "You cannot sell ETH, as it is the quote currency. Please try again.",
      );
      clearUserState(ctx.from);
      return;
    }

    updateUserState(ctx.from, { asset: ctx.message.text.toLowerCase() });

    const prompt =
      type === "buy"
        ? "Please respond with the amount of ETH you would like to spend."
        : "Please respond with the amount of the asset you would like to sell.";
    await sendReply(ctx, prompt, { reply_markup: { force_reply: true } });
  } else {
    const amount = new Decimal(parseFloat(ctx.message.text));
    const userAddress = await getOrCreateAddress(ctx.from);
    const currentBalance = await userAddress.getBalance(
      type === "buy" ? Coinbase.assets.Eth : userState.asset,
    );
    if (amount.isNaN() || amount.greaterThan(currentBalance)) {
      await ctx.reply(
        "Invalid amount or insufficient balance. Please try again.",
      );
      clearUserState(ctx.from);
    } else {
      const tradeType =
        type === "buy"
          ? { fromAssetId: Coinbase.assets.Eth, toAssetId: userState.asset }
          : { fromAssetId: userState.asset, toAssetId: Coinbase.assets.Eth };
      await sendReply(ctx, `Initiating ${type}...`);
      try {
        const userAddress = await getOrCreateAddress(ctx.from);
        const trade = await userAddress.createTrade({ amount, ...tradeType });
        await trade.wait();
        await sendReply(
          ctx,
          `Successfully completed ${type}: [Basescan Link](${trade.getTransaction().getTransactionLink()})`,
          { parse_mode: "Markdown" },
        );
        clearUserState(ctx.from);
      } catch (error) {
        await ctx.reply(`An error occurred while initiating the ${type}.`);
        console.error(error);
        clearUserState(ctx.from);
      }
    }
  }
}

// Handle pinning the start message
async function handlePinMessage(ctx) {
  try {
    await ctx.api.pinChatMessage(
      ctx.chat.id,
      userStates[ctx.from.id].messageId,
    );
    await ctx.reply("Message pinned successfully!");
  } catch (error) {
    console.error("Failed to pin the message:", error);
    await ctx.reply(
      "Failed to pin the message. Ensure the bot has the proper permissions.",
    );
  }
  clearUserState(ctx.from);
}

// Handle exporting the key
async function handleExportKey(ctx) {
  const userAddress = await getOrCreateAddress(ctx.from);
  const privateKey = userAddress.export();
  await sendReply(
    ctx,
    "Your private key will be in the next message. Do NOT share it with anyone, and make sure you store it in a safe place.",
  );
  await sendReply(ctx, privateKey);
}

// Portfolio management handlers
async function handlePortfolio(ctx) {
  const userAddress = await getOrCreateAddress(ctx.from);
  const balances = await userAddress.listBalances();
  const allocationData = await allocation.calculateAllocation(balances);
  
  let message = "*📊 Portfolio Overview*\n\n";
  message += `Total Value: ${allocationData.totalValue} ETH\n\n`;
  
  Object.entries(allocationData.allocations).forEach(([asset, data]) => {
    message += `${asset}: ${data.value} ETH (${data.percentage})\n`;
  });
  
  await sendReply(ctx, message, { parse_mode: "Markdown" });
}

async function handleAnalytics(ctx) {
  const userAddress = await getOrCreateAddress(ctx.from);
  const balances = await userAddress.listBalances();
  const metrics = await analytics.getMetrics(ctx.from.id, balances);
  const perf = await performance.calculatePerformance(ctx.from.id, 30);
  
  let message = "*📈 Analytics Dashboard*\n\n";
  message += `💰 Total Value: ${metrics.totalValue} ETH\n`;
  message += `📊 P&L: ${metrics.absolute} ETH (${metrics.percentage}%)\n`;
  message += `🎯 ROI: ${metrics.roi}%\n\n`;
  
  if (perf.percentChange) {
    message += `📆 30-Day Performance: ${perf.percentChange}\n`;
    message += `📈 Daily Avg: ${perf.dailyAverage} ETH\n`;
  }
  
  await sendReply(ctx, message, { parse_mode: "Markdown" });
}

async function handleManageAlerts(ctx) {
  const activeAlerts = await alerts.getActiveAlerts(ctx.from.id);
  
  let message = "*🔔 Price Alerts*\n\n";
  if (activeAlerts.length === 0) {
    message += "No active alerts.\n\n";
  } else {
    activeAlerts.forEach((alert, i) => {
      message += `${i + 1}. ${alert.asset.toUpperCase()} ${alert.condition} ${alert.targetPrice}\n`;
    });
  }
  message += "\nUse /setalert <asset> <price> <above|below> to create new alerts";
  
  await sendReply(ctx, message, { parse_mode: "Markdown" });
}

async function handleWatchlist(ctx) {
  const watched = await watchlist.getWatchlist(ctx.from.id);
  
  let message = "*👁 Watchlist*\n\n";
  if (watched.length === 0) {
    message += "No assets in watchlist.\n\n";
  } else {
    watched.forEach((item, i) => {
      message += `${i + 1}. ${item.asset.toUpperCase()}\n`;
      if (item.notes) message += `   Note: ${item.notes}\n`;
    });
  }
  message += "\nUse /watch <asset> to add to watchlist";
  
  await sendReply(ctx, message, { parse_mode: "Markdown" });
}

async function handleRebalance(ctx) {
  const userAddress = await getOrCreateAddress(ctx.from);
  const balances = await userAddress.listBalances();
  const currentAlloc = await allocation.calculateAllocation(balances);
  const targetAlloc = await allocation.getTargetAllocation(ctx.from.id);
  
  if (Object.keys(targetAlloc).length === 0) {
    await sendReply(ctx, "No target allocation set. Use /settarget to configure.");
    return;
  }
  
  const recommendations = await rebalancer.getRebalanceRecommendations(
    ctx.from.id,
    currentAlloc.allocations,
    targetAlloc,
    currentAlloc.totalValue
  );
  
  let message = "*⚖️ Rebalancing Recommendations*\n\n";
  if (recommendations.length === 0) {
    message += "✅ Portfolio is balanced!";
  } else {
    recommendations.forEach((rec, i) => {
      message += `${i + 1}. ${rec.action.toUpperCase()} ${rec.amount} ${rec.asset}\n`;
      message += `   Current: ${rec.currentPercent} → Target: ${rec.targetPercent}\n\n`;
    });
  }
  
  await sendReply(ctx, message, { parse_mode: "Markdown" });
}

async function handleExport(ctx) {
  const userAddress = await getOrCreateAddress(ctx.from);
  const balances = await userAddress.listBalances();
  const history = await txHistory.getHistory(ctx.from.id);
  const metrics = await analytics.getMetrics(ctx.from.id, balances);
  
  const summary = await exporter.exportSummary(
    ctx.from.id,
    balances,
    metrics.totalValue,
    { absolute: metrics.absolute, percentage: metrics.percentage, roi: metrics.roi }
  );
  
  await sendReply(ctx, "```\n" + summary + "\n```", { parse_mode: "Markdown" });
}

// DCA Menu Handler
async function handleDCAMenu(ctx) {
  const schedules = DCAStrategy.getSchedules(ctx.from.id);
  let message = "*🤖 Dollar Cost Averaging*\n\n";
  
  if (schedules.length === 0) {
    message += "No active DCA schedules.\n\n";
    message += "Create a new schedule with:\n";
    message += "`/dca_create ASSET AMOUNT FREQUENCY`\n";
    message += "Example: `/dca_create USDC 10 weekly`";
  } else {
    schedules.forEach((s, i) => {
      message += `${i + 1}. ${s.asset}\n`;
      message += `   Amount: ${s.amount} ETH\n`;
      message += `   Frequency: ${s.frequency}\n`;
      message += `   Status: ${s.enabled ? "Active" : "Paused"}\n`;
      message += `   Total Invested: ${s.totalInvested} ETH\n\n`;
    });
  }
  
  await sendReply(ctx, message, { parse_mode: "Markdown" });
}

// Compound Menu Handler
async function handleCompoundMenu(ctx) {
  const strategy = AutoCompounder.getStrategy(ctx.from.id);
  let message = "*⚡ Auto-Compounding*\n\n";
  
  if (!strategy) {
    message += "Auto-compounding not configured.\n\n";
    message += "Set up with:\n";
    message += "`/compound_setup FREQUENCY MIN_AMOUNT`\n";
    message += "Example: `/compound_setup daily 0.01`";
  } else {
    message += `Status: ${strategy.enabled ? "✅ Active" : "❌ Disabled"}\n`;
    message += `Frequency: ${strategy.frequency}\n`;
    message += `Min Threshold: ${strategy.minThreshold} ETH\n`;
    message += `Reinvest: ${strategy.reinvestPercentage}%\n`;
    message += `Next Compound: ${strategy.nextCompound.toLocaleString()}\n`;
  }
  
  await sendReply(ctx, message, { parse_mode: "Markdown" });
}

// Risk Menu Handler
async function handleRiskMenu(ctx) {
  const metrics = RiskManager.getRiskMetrics(ctx.from.id);
  let message = "*🛡️ Risk Management*\n\n";
  
  if (!metrics.profile) {
    message += "No risk profile set.\n\n";
    message += "Set profile with:\n";
    message += "`/risk_profile conservative|moderate|aggressive`";
  } else {
    message += `Max Position Size: ${(metrics.profile.maxPositionSize * 100).toFixed(0)}%\n`;
    message += `Max Drawdown: ${(metrics.profile.maxDrawdown * 100).toFixed(0)}%\n`;
    message += `Stop Loss: ${(metrics.profile.stopLoss * 100).toFixed(0)}%\n`;
    message += `Max Leverage: ${metrics.profile.maxLeverage}x\n`;
  }
  
  await sendReply(ctx, message, { parse_mode: "Markdown" });
}

// Gas Menu Handler
async function handleGasMenu(ctx) {
  const gasPrice = await GasOptimizer.getGasPrice("standard");
  const stats = GasOptimizer.getStatistics(7);
  const optimal = await GasOptimizer.getOptimalTime();
  
  let message = "*⛽ Gas Optimization*\n\n";
  message += "*Current Gas Prices:*\n";
  message += `Standard: ${gasPrice.maxFee} Gwei (${gasPrice.waitTime})\n\n`;
  
  if (!stats.noData) {
    message += "*7-Day Statistics:*\n`;
    message += `Transactions: ${stats.transactions}\n`;
    message += `Total Cost: ${stats.totalCost} ETH\n`;
    message += `Avg Gas: ${stats.averageGasUsed}\n\n`;
  }
  
  message += `*Timing:* ${optimal.optimal ? "✅ Good time" : "⚠️ " + optimal.reason}\n`;
  
  await sendReply(ctx, message, { parse_mode: "Markdown" });
}

// Wallet Menu Handler
async function handleWalletMenu(ctx) {
  const wallets = await MultiWallet.getUserWallets(ctx.from.id);
  let message = "*👛 Multi-Wallet Manager*\n\n";
  
  if (wallets.length === 0) {
    message += "No wallets found.\n";
  } else {
    wallets.forEach((w, i) => {
      message += `${i + 1}. ${w.label} ${w.isActive ? "✅" : ""}\n`;
      message += `   ${w.address.slice(0, 10)}...${w.address.slice(-8)}\n\n`;
    });
  }
  
  message += "\nCommands:\n";
  message += "`/wallet_add LABEL` - Add new wallet\n";
  message += "`/wallet_switch ID` - Switch active wallet";
  
  await sendReply(ctx, message, { parse_mode: "Markdown" });
}

// Encrypt and Decrypt functions
function encrypt(text, iv) {
  const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
  const cipher = crypto.createCipheriv("aes-256-cbc", encryptionKey, iv);
  return cipher.update(text, "utf8", "hex") + cipher.final("hex");
}

function decrypt(encrypted, iv) {
  const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", encryptionKey, iv);
  return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
}

// Start the bot (using long polling)
bot.start();
