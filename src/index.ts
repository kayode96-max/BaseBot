import { Bot } from "grammy";
import dotenv from "dotenv";
const PouchDB = require("pouchdb");
const BasenameGenerator = require("../lib/basename-generator");

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN || "");

// Initialize basename generator with PouchDB
const basenameDB = new PouchDB("basenames");
const basenameGenerator = new BasenameGenerator(basenameDB);

// Handle /start command
bot.command("start", (ctx) => {
  ctx.send(
    `👋 *Welcome to Basebot!*\n\n` +
    `🏷️ Generate and manage your Base names with ease.\n\n` +
    `Try these commands:\n` +
    `/generate - Get basename suggestions\n` +
    `/help - Show all commands\n` +
    `/menu - Open the interactive menu`,
    { parse_mode: "Markdown" }
  );
});

// Handle /help command
bot.command("help", (ctx) => {
  ctx.send(
    `📋 *Available Commands:*\n\n` +
    `🏷️ *Basename Commands:*\n` +
    `/generate - Generate basename suggestions\n` +
    `/check <name> - Check if a basename is available\n` +
    `/register <name> - Register a basename\n` +
    `/confirm <id> <tx> - Confirm registration\n` +
    `/mynames - View your registered basenames\n` +
    `/renew <name> [years] - Renew a basename\n` +
    `/search <query> - Search for basenames\n` +
    `/stats - View basename statistics\n\n` +
    `⚙️ *Other Commands:*\n` +
    `/start - Welcome message\n` +
    `/help - Show this message\n` +
    `/menu - Open interactive menu\n` +
    `/echo <text> - Echo your message`,
    { parse_mode: "Markdown" }
  );
});

// Handle /echo command
bot.command("echo", (ctx) => {
  const text = ctx.text.replace("/echo", "").trim();
  if (text) {
    ctx.send(`🔊 Echo: ${text}`);
  } else {
    ctx.send("⚠️ Please provide text to echo. Usage: /echo <your text>");
  }
});

// Handle /generate command
bot.command("generate", async (ctx) => {
  const userId = ctx.from?.id;
  const suggestions = basenameGenerator.generateSuggestions(userId, {
    style: "cool",
    length: "medium",
  });
  
  let message = "🏷️ *Basename Suggestions*\n\n";
  suggestions.forEach((name: string, i: number) => {
    message += `${i + 1}. \`${name}.base\`\n`;
  });
  message += "\n💡 Use /check <basename> to check availability";
  
  await ctx.send(message, { parse_mode: "Markdown" });
});

// Handle /check command
bot.command("check", async (ctx) => {
  const basename = ctx.text.replace("/check", "").trim();
  
  if (!basename) {
    await ctx.send("⚠️ Please provide a basename. Usage: /check <basename>");
    return;
  }
  
  const availability = await basenameGenerator.checkAvailability(basename);
  
  if (availability.available) {
    await ctx.send(
      `✅ *${basename}.base* is available!\n\n` +
      `💰 Estimated cost: ${availability.estimatedCost.eth} ETH (~$${parseFloat(availability.estimatedCost.usd).toFixed(2)})\n\n` +
      `Use /register ${basename} to register it!`,
      { parse_mode: "Markdown" }
    );
  } else {
    await ctx.send(`❌ ${availability.reason}`, { parse_mode: "Markdown" });
  }
});

// Handle /register command
bot.command("register", async (ctx) => {
  const userId = ctx.from?.id;
  const basename = ctx.text.replace("/register", "").trim();
  
  if (!basename) {
    await ctx.send("⚠️ Please provide a basename. Usage: /register <basename>");
    return;
  }
  
  try {
    // Mock wallet address - in production, get from user's wallet
    const walletAddress = `0x${userId?.toString(16).padStart(40, '0')}`;
    
    const result = await basenameGenerator.registerBasename(userId, basename, walletAddress);
    await ctx.send(
      `🎉 *Registration Initiated!*\n\n` +
      `📝 Basename: \`${result.basename}.base\`\n` +
      `💰 Cost: ${result.cost} ETH (~$${parseFloat(result.costUsd).toFixed(2)})\n` +
      `⏱ Duration: ${result.duration} year(s)\n` +
      `🆔 Registration ID: \`${result.registrationId}\`\n\n` +
      `⏰ Payment window expires in: ${result.expiresIn}\n\n` +
      `💡 *Next Steps:*\n` +
      `Send ${result.cost} ETH to register on-chain\n` +
      `Use /confirm ${result.registrationId} <txhash> to complete`,
      { parse_mode: "Markdown" }
    );
  } catch (error: any) {
    await ctx.send(`❌ Error: ${error.message}`);
  }
});

// Handle /confirm command
bot.command("confirm", async (ctx) => {
  const userId = ctx.from?.id;
  const parts = ctx.text.replace("/confirm", "").trim().split(" ");
  
  if (parts.length < 2) {
    await ctx.send("⚠️ Usage: /confirm <registration_id> <tx_hash> [block_number]");
    return;
  }
  
  const [registrationId, txHash, blockNumber] = parts;
  
  try {
    const result = await basenameGenerator.confirmRegistration(
      registrationId, 
      txHash, 
      blockNumber ? parseInt(blockNumber) : undefined
    );
    
    await ctx.send(
      `🎊 *Registration Confirmed!*\n\n` +
      `✅ ${result.fullName} is now yours!\n` +
      `🔗 TX: \`${result.txHash}\`\n` +
      `📅 Expires: ${new Date(result.expiresAt).toLocaleDateString()}\n` +
      `${result.isPrimary ? '⭐ Set as your primary basename' : ''}\n\n` +
      `Use /mynames to view all your basenames`,
      { parse_mode: "Markdown" }
    );
  } catch (error: any) {
    await ctx.send(`❌ Error: ${error.message}`);
  }
});

// Handle /mynames command
bot.command("mynames", async (ctx) => {
  const userId = ctx.from?.id;
  const userNames = await basenameGenerator.getUserBasenames(userId);
  const primary = await basenameGenerator.getPrimaryBasename(userId);
  
  if (userNames.length === 0) {
    await ctx.send("📝 You don't have any basenames registered yet.\n\nUse /generate to get suggestions!");
  } else {
    let message = "📝 *Your Basenames*\n\n";
    
    for (const name of userNames) {
      const isPrimary = name === primary;
      const info = await basenameGenerator.getBasenameInfo(name);
      message += `${isPrimary ? "⭐" : "•"} \`${name}.base\`\n`;
      if (info) {
        message += `  └ Expires: ${new Date(info.expiresAt).toLocaleDateString()} (${info.daysUntilExpiry} days)\n`;
        if (info.isExpired) {
          message += `  └ ⚠️ EXPIRED - Use /renew ${name}\n`;
        }
      }
    }
    
    message += `\n💡 Total: ${userNames.length} basename(s)`;
    
    await ctx.send(message, { parse_mode: "Markdown" });
  }
});

// Handle /renew command
bot.command("renew", async (ctx) => {
  const userId = ctx.from?.id;
  const parts = ctx.text.replace("/renew", "").trim().split(" ");
  
  if (parts.length < 1 || !parts[0]) {
    await ctx.send("⚠️ Usage: /renew <basename> [years]");
    return;
  }
  
  const basename = parts[0];
  const years = parts[1] ? parseInt(parts[1]) : 1;
  
  try {
    const result = await basenameGenerator.renewBasename(userId, basename, years);
    await ctx.send(
      `♻️ *Basename Renewal*\n\n` +
      `✅ ${basename}.base renewed for ${years} year(s)\n` +
      `📅 New expiry: ${new Date(result.newExpiry).toLocaleDateString()}\n` +
      `💰 Cost: ${result.cost} ETH (~$${parseFloat(result.costUsd).toFixed(2)})\n\n` +
      `💡 Complete the transaction to finalize renewal`,
      { parse_mode: "Markdown" }
    );
  } catch (error: any) {
    await ctx.send(`❌ Error: ${error.message}`);
  }
});

// Handle /search command
bot.command("search", async (ctx) => {
  const query = ctx.text.replace("/search", "").trim();
  
  if (!query) {
    await ctx.send("⚠️ Usage: /search <query>");
    return;
  }
  
  const results = await basenameGenerator.searchBasenames(query, 10);
  
  if (results.length === 0) {
    await ctx.send(`🔍 No basenames found matching "${query}"`);
  } else {
    let message = `🔍 *Search Results for "${query}"*\n\n`;
    results.forEach((result: any) => {
      message += `• \`${result.fullName}\`\n`;
      message += `  └ Registered: ${new Date(result.registeredAt).toLocaleDateString()}\n`;
    });
    await ctx.send(message, { parse_mode: "Markdown" });
  }
});

// Handle /stats command  
bot.command("stats", async (ctx) => {
  const stats = await basenameGenerator.getStats();
  
  const message = 
    `📊 *Basename Statistics*\n\n` +
    `Total Registered: ${stats.total}\n` +
    `Active: ${stats.active}\n` +
    `Expired: ${stats.expired}\n` +
    `Average Length: ${stats.averageLength.toFixed(1)} characters`;
    
  await ctx.send(message, { parse_mode: "Markdown" });
});

// Handle /menu command
bot.command("menu", async (ctx) => {
  await ctx.send("📱 Main Menu", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🏷️ Generate Basename", callback_data: "generate_basename" }],
        [{ text: "✅ Check Availability", callback_data: "check_basename" }],
        [{ text: "📝 My Basenames", callback_data: "my_basenames" }],
        [{ text: "⭐ Set Primary", callback_data: "set_primary" }],
        [{ text: "📖 Tutorial", url: "https://core.telegram.org/bots/api" }],
      ],
    },
  });
});

// Handle text messages
bot.on("message", (ctx) => {
  const userName = ctx.from?.first_name || "User";
  console.log(`${userName} wrote: ${ctx.text}`);
  
  // Echo back the message
  ctx.reply(`📝 You said: ${ctx.msg?.text}`);
});

// Handle button clicks (callback queries)
bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery?.data;
  const userId = ctx.from?.id;
  
  if (data === "generate_basename") {
    await ctx.answerCallbackQuery();
    await ctx.send("🏷️ *Basename Generator*\n\nChoose a style:", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "😎 Cool", callback_data: "gen_cool" }, { text: "💼 Professional", callback_data: "gen_pro" }],
          [{ text: "🎨 Creative", callback_data: "gen_creative" }, { text: "🎮 Gaming", callback_data: "gen_gaming" }],
          [{ text: "🎲 Random", callback_data: "gen_random" }],
          [{ text: "⬅️ Back", callback_data: "back_menu" }],
        ],
      },
    });
  } else if (data?.startsWith("gen_")) {
    const style = data.replace("gen_", "");
    const styleMap: any = {
      cool: "cool",
      pro: "professional",
      creative: "creative",
      gaming: "gaming",
      random: "random",
    };
    
    const suggestions = basenameGenerator.generateSuggestions(userId, {
      style: styleMap[style],
      length: "medium",
      includeNumbers: style === "gaming",
      includeEmojis: style === "creative",
    });
    
    let message = `🏷️ *Basename Suggestions (${style})*\n\n`;
    suggestions.forEach((name: string, i: number) => {
      message += `${i + 1}. \`${name}.base\`\n`;
    });
    message += "\n💡 Use /check <basename> to check availability";
    
    await ctx.answerCallbackQuery();
    await ctx.send(message, { parse_mode: "Markdown" });
  } else if (data === "check_basename") {
    await ctx.answerCallbackQuery();
    await ctx.send("✅ *Check Basename Availability*\n\nSend me a basename to check (without .base extension)\n\nExample: `mycooldomain`", {
      parse_mode: "Markdown",
    });
  } else if (data === "my_basenames") {
    await ctx.answerCallbackQuery();
    const userNames = await basenameGenerator.getUserBasenames(userId);
    const primary = await basenameGenerator.getPrimaryBasename(userId);
    
    if (userNames.length === 0) {
      await ctx.send("📝 You don't have any basenames registered yet.\n\nUse /generate to get suggestions!");
    } else {
      let message = "📝 *Your Basenames*\n\n";
      for (const name of userNames) {
        const isPrimary = name === primary;
        const info = await basenameGenerator.getBasenameInfo(name);
        message += `${isPrimary ? "⭐" : "•"} \`${name}.base\`\n`;
        if (info) {
          message += `  └ Expires: ${new Date(info.expiresAt).toLocaleDateString()}\n`;
        }
      }
      
      await ctx.send(message, { parse_mode: "Markdown" });
    }
  } else if (data === "set_primary") {
    await ctx.answerCallbackQuery();
    const userNames = await basenameGenerator.getUserBasenames(userId);
    
    if (userNames.length === 0) {
      await ctx.send("You need to register a basename first!");
    } else {
      const buttons = userNames.map((name: string) => [
        { text: `${name}.base`, callback_data: `primary_${name}` }
      ]);
      buttons.push([{ text: "⬅️ Back", callback_data: "back_menu" }]);
      
      await ctx.send("⭐ Select your primary basename:", {
        reply_markup: { inline_keyboard: buttons },
      });
    }
  } else if (data?.startsWith("primary_")) {
    const basename = data.replace("primary_", "");
    await basenameGenerator.setPrimaryBasename(userId, basename);
    await ctx.answerCallbackQuery(`✅ ${basename}.base is now your primary basename!`);
  } else if (data === "back_menu") {
    await ctx.answerCallbackQuery();
    await ctx.send("📱 Main Menu", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🏷️ Generate Basename", callback_data: "generate_basename" }],
          [{ text: "✅ Check Availability", callback_data: "check_basename" }],
          [{ text: "📝 My Basenames", callback_data: "my_basenames" }],
          [{ text: "⭐ Set Primary", callback_data: "set_primary" }],
          [{ text: "📖 Tutorial", url: "https://core.telegram.org/bots/api" }],
        ],
      },
    });
  } else if (data === "opt1") {
    ctx.answerCallbackQuery("You selected Option 1!");
  } else if (data === "opt2") {
    ctx.answerCallbackQuery("You selected Option 2!");
  }
});

// Start the bot
bot.startPolling();
console.log("✅ Bot is running...");
