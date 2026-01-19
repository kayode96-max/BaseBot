import { Telegram } from "puregram";
import dotenv from "dotenv";
const basenameGenerator = require("../lib/basename-generator");

dotenv.config();

const bot = new Telegram({
  token: process.env.BOT_TOKEN || "",
});

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
    `/mynames - View your registered basenames\n\n` +
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
      `💰 Estimated cost: ${availability.estimatedCost}\n\n` +
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
    const result = await basenameGenerator.registerBasename(userId, basename);
    await ctx.send(
      `🎉 *Registration Initiated!*\n\n` +
      `📝 Basename: \`${result.basename}.base\`\n` +
      `💰 Cost: ${result.cost}\n` +
      `⏱ Duration: ${result.duration} year(s)\n` +
      `🆔 Registration ID: \`${result.registrationId}\`\n\n` +
      `⚠️ *Note:* This is a demo. In production, you would need to complete the on-chain transaction.`,
      { parse_mode: "Markdown" }
    );
  } catch (error: any) {
    await ctx.send(`❌ Error: ${error.message}`);
  }
});

// Handle /mynames command
bot.command("mynames", async (ctx) => {
  const userId = ctx.from?.id;
  const userNames = basenameGenerator.getUserBasenames(userId);
  const primary = basenameGenerator.getPrimaryBasename(userId);
  
  if (userNames.length === 0) {
    await ctx.send("📝 You don't have any basenames registered yet.\n\nUse /generate to get suggestions!");
  } else {
    let message = "📝 *Your Basenames*\n\n";
    userNames.forEach((name: string) => {
      const isPrimary = name === primary;
      const info = basenameGenerator.getBasenameInfo(name);
      message += `${isPrimary ? "⭐" : "•"} \`${name}.base\`\n`;
      if (info) {
        message += `  └ Expires: ${info.expiresAt.toLocaleDateString()}\n`;
      }
    });
    
    await ctx.send(message, { parse_mode: "Markdown" });
  }
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
  ctx.send(`📝 You said: ${ctx.text}`);
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
    const userNames = basenameGenerator.getUserBasenames(userId);
    const primary = basenameGenerator.getPrimaryBasename(userId);
    
    if (userNames.length === 0) {
      await ctx.send("📝 You don't have any basenames registered yet.\n\nUse /generate to get suggestions!");
    } else {
      let message = "📝 *Your Basenames*\n\n";
      userNames.forEach((name: string) => {
        const isPrimary = name === primary;
        const info = basenameGenerator.getBasenameInfo(name);
        message += `${isPrimary ? "⭐" : "•"} \`${name}.base\`\n`;
        if (info) {
          message += `  └ Expires: ${info.expiresAt.toLocaleDateString()}\n`;
        }
      });
      
      await ctx.send(message, { parse_mode: "Markdown" });
    }
  } else if (data === "set_primary") {
    await ctx.answerCallbackQuery();
    const userNames = basenameGenerator.getUserBasenames(userId);
    
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
    basenameGenerator.setPrimaryBasename(userId, basename);
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
