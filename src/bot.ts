import { Telegram, Context } from "puregram";

/**
 * Extended bot class for better organization
 */
export class Bot {
  private telegram: Telegram;
  private botToken: string;
  private botUsername: string;

  constructor(token: string, username: string) {
    this.botToken = token;
    this.botUsername = username;
    this.telegram = new Telegram({ token });
    this.setupHandlers();
  }

  /**
   * Setup all bot event handlers
   */
  private setupHandlers(): void {
    // Commands
    this.telegram.command("start", this.handleStart.bind(this));
    this.telegram.command("help", this.handleHelp.bind(this));
    this.telegram.command("scream", this.handleScream.bind(this));
    this.telegram.command("whisper", this.handleWhisper.bind(this));

    // Messages
    this.telegram.on("message", this.handleMessage.bind(this));

    // Callbacks
    this.telegram.on("callback_query", this.handleCallback.bind(this));
  }

  /**
   * Handle /start command
   */
  private handleStart(ctx: Context): void {
    ctx.send(`👋 Welcome to ${this.botUsername}!\n\nI'm a Telegram bot built with TypeScript.\n\nUse /help to see available commands.`);
  }

  /**
   * Handle /help command
   */
  private handleHelp(ctx: Context): void {
    ctx.send(`📋 Available Commands:\n/start - Welcome message\n/help - Show this message\n/scream - Make me SCREAM!\n/whisper - Make me whisper\n/menu - Open interactive menu`);
  }

  /**
   * Handle /scream command
   */
  private handleScream(ctx: Context): void {
    ctx.send("🔊 SCREAM MODE ACTIVATED! Everything I say will be in UPPERCASE!");
  }

  /**
   * Handle /whisper command
   */
  private handleWhisper(ctx: Context): void {
    ctx.send("🤫 whisper mode activated... i'll be speaking softly now...");
  }

  /**
   * Handle regular messages
   */
  private handleMessage(ctx: Context): void {
    const user = ctx.from?.first_name || "User";
    const text = ctx.text || "";

    console.log(`${user} wrote: ${text}`);
    ctx.send(`📝 Echo: ${text}`);
  }

  /**
   * Handle button clicks
   */
  private handleCallback(ctx: Context): void {
    const data = ctx.callbackQuery?.data;
    console.log(`Button pressed: ${data}`);
    ctx.answerCallbackQuery(`You pressed: ${data}`);
  }

  /**
   * Start the bot
   */
  public start(): void {
    this.telegram.startPolling();
    console.log(`✅ ${this.botUsername} is running...`);
  }

  /**
   * Get bot instance (for advanced usage)
   */
  public getInstance(): Telegram {
    return this.telegram;
  }
}
