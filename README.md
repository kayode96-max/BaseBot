"# Basebot - Telegram Bot with TypeScript

A modern Telegram bot built with TypeScript and the PureGram library.

## Prerequisites

- Node.js (v16 or higher)
- A Telegram Bot Token (get from [@BotFather](https://t.me/botfather))

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (copy from `.env.example`):
```bash
cp .env.example .env
```

Edit `.env` and add your bot token and username:
```
BOT_TOKEN=your_actual_token_here
BOT_USERNAME=YourBotUsername
```

### 3. Development

Run in development mode with auto-reload:
```bash
npm run dev
```

### 4. Build & Run

Build the TypeScript code:
```bash
npm run build
```

Run the compiled bot:
```bash
npm start
```

## Project Structure

```
basebot/
├── src/
│   ├── index.ts      # Main entry point with basic bot setup
│   └── bot.ts        # Extended Bot class for better organization
├── dist/             # Compiled JavaScript output
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Bot Commands

- `/start` - Welcome message
- `/help` - Show all available commands
- `/scream` - Activate scream mode
- `/whisper` - Activate whisper mode
- `/menu` - Open interactive menu

## Features

✅ Command handling (`/start`, `/help`, etc.)
✅ Message echoing
✅ Inline buttons and keyboards
✅ Callback query handling
✅ TypeScript support with full type safety
✅ Environment variable configuration
✅ Organized bot structure

## Next Steps

- Add database integration (SQLite, MongoDB, etc.)
- Implement user state management
- Add more commands and features
- Deploy to a VPS or cloud service

## Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [PureGram Documentation](https://puregram.dev/)
- [BotFather - Create your bot](https://t.me/botfather)

## License

MIT
" 
