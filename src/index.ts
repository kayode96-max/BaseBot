import { Telegram } from "puregram";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegram({
  token: process.env.BOT_TOKEN || "",
});

// Handle /start command
bot.command("start", (ctx) => {
  ctx.send(`👋 Welcome! I'm a Telegram bot built with TypeScript.\n\nTry these commands:\n/help - Show all commands\n/menu - Open the menu`);
});

// Handle /help command
bot.command("help", (ctx) => {
  ctx.send(`📋 Available Commands:\n/start - Welcome message\n/help - Show this message\n/menu - Open interactive menu\n/echo <text> - Echo your message`);
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

// Handle /menu command
bot.command("menu", async (ctx) => {
  await ctx.send("📱 Main Menu", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📖 Tutorial", url: "https://core.telegram.org/bots/api" }],
        [{ text: "Option 1", callback_data: "opt1" }, { text: "Option 2", callback_data: "opt2" }],
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
bot.on("callback_query", (ctx) => {
  const data = ctx.callbackQuery?.data;
  
  if (data === "opt1") {
    ctx.answerCallbackQuery("You selected Option 1!");
  } else if (data === "opt2") {
    ctx.answerCallbackQuery("You selected Option 2!");
  }
});

// Start the bot
bot.startPolling();
console.log("✅ Bot is running...");
