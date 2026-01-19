# Basename Generation & Registration System

A fully functional basename generation and registration system integrated with the Basebot Telegram bot.

## Features

### 🎨 Name Generation
- **5 Generation Styles**: Cool, Professional, Creative, Gaming, Random
- **Customizable Length**: Short (3-5), Medium (6-10), Long (11-15)
- **Smart Suggestions**: Context-aware name generation with keyword support
- **Emoji Support**: Creative names with emoji prefixes

### ✅ Availability Checking
- Real-time availability validation
- Format validation (alphanumeric + hyphens only)
- Length validation (3-63 characters)
- Reserved name protection
- Duplicate checking with expiration tracking

### 💰 Dynamic Pricing
- Length-based pricing model:
  - 3-character names: 0.1 ETH (Premium)
  - 4-character names: 0.05 ETH (Premium)
  - 5-6 character names: 0.01 ETH
  - 7+ character names: 0.005 ETH (Standard)
- USD conversion included
- Wei calculations for on-chain transactions

### 📝 Registration System
- Multi-step registration with payment tracking
- 15-minute payment window
- Transaction hash confirmation
- On-chain verification support
- Automatic expiration (1 year default, renewable)

### 🗄️ Persistent Storage
- PouchDB integration for data persistence
- User basename tracking
- Registration history
- Transaction records
- Expiration management

### ⭐ Advanced Features
- Primary basename designation
- Multi-basename support per user
- Basename renewal system
- Transfer functionality
- Search and discovery
- Statistics and analytics

## Bot Commands

### Basic Commands
```
/generate - Generate basename suggestions
/check <name> - Check if a basename is available
/register <name> - Register a basename
/confirm <id> <tx> [block] - Confirm registration with transaction
/mynames - View your registered basenames
```

### Advanced Commands
```
/renew <name> [years] - Renew a basename
/search <query> - Search for basenames
/stats - View global basename statistics
```

### Interactive Menu
Access all features via `/menu`:
- 🏷️ Generate Basename (by style)
- ✅ Check Availability
- 📝 My Basenames
- ⭐ Set Primary Basename

## Usage Examples

### Generate Basename Suggestions
```
/generate
```
Returns 10 suggestions based on default "cool" style.

### Check Availability
```
/check myawesome
```
Response:
```
✅ myawesome.base is available!
💰 Estimated cost: 0.005 ETH (~$15.00)
Use /register myawesome to register it!
```

### Register a Basename
```
/register myawesome
```
Response:
```
🎉 Registration Initiated!
📝 Basename: myawesome.base
💰 Cost: 0.005 ETH (~$15.00)
⏱ Duration: 1 year(s)
🆔 Registration ID: reg_1234567890_abc123
⏰ Payment window expires in: 15 minutes

💡 Next Steps:
Send 0.005 ETH to register on-chain
Use /confirm reg_1234567890_abc123 <txhash> to complete
```

### Confirm Registration
```
/confirm reg_1234567890_abc123 0xabc123...def456 12345678
```
Response:
```
🎊 Registration Confirmed!
✅ myawesome.base is now yours!
🔗 TX: 0xabc123...def456
📅 Expires: 01/19/2027
⭐ Set as your primary basename

Use /mynames to view all your basenames
```

### View Your Basenames
```
/mynames
```
Response:
```
📝 Your Basenames

⭐ myawesome.base
  └ Expires: 01/19/2027 (365 days)
• myother.base
  └ Expires: 06/15/2026 (147 days)

💡 Total: 2 basename(s)
```

### Renew a Basename
```
/renew myawesome 2
```
Response:
```
♻️ Basename Renewal
✅ myawesome.base renewed for 2 year(s)
📅 New expiry: 01/19/2028
💰 Cost: 0.005 ETH (~$15.00)

💡 Complete the transaction to finalize renewal
```

### Search Basenames
```
/search awesome
```
Response:
```
🔍 Search Results for "awesome"

• myawesome.base
  └ Registered: 01/19/2026
• reallyawesome.base
  └ Registered: 01/10/2026
```

### View Statistics
```
/stats
```
Response:
```
📊 Basename Statistics

Total Registered: 1,234
Active: 987
Expired: 247
Average Length: 8.5 characters
```

## Technical Implementation

### Database Schema

#### Basename Document
```javascript
{
  _id: "basename:<name>",
  type: "registered_basename",
  basename: "myawesome",
  owner: 123456789,
  walletAddress: "0x...",
  registeredAt: "2026-01-19T00:00:00.000Z",
  expiresAt: "2027-01-19T00:00:00.000Z",
  duration: 1,
  txHash: "0x...",
  blockNumber: 12345678,
  registrationId: "reg_...",
  cost: "0.005",
  isPrimary: true,
  status: "active"
}
```

#### Pending Registration Document
```javascript
{
  _id: "pending:<name>",
  type: "pending_registration",
  registrationId: "reg_...",
  userId: 123456789,
  basename: "myawesome",
  walletAddress: "0x...",
  duration: 1,
  cost: "0.005",
  costWei: "5000000000000000",
  status: "pending_payment",
  createdAt: "2026-01-19T00:00:00.000Z",
  expiresAt: "2027-01-19T00:00:00.000Z",
  pendingUntil: "2026-01-19T00:15:00.000Z"
}
```

#### User Document
```javascript
{
  _id: "user:<userId>",
  type: "user_basenames",
  userId: 123456789,
  basenames: ["myawesome", "myother"],
  primaryBasename: "myawesome"
}
```

### Integration Points

1. **Coinbase SDK**: Ready for on-chain basename registration
2. **Web3**: Wei conversions and blockchain interactions
3. **PouchDB**: Persistent storage across bot restarts
4. **Decimal.js**: Precise financial calculations

### Future Enhancements

- [ ] On-chain contract integration for real Base network registration
- [ ] ENS resolver support
- [ ] Subdomain creation
- [ ] Reverse resolution (address → basename)
- [ ] Marketplace for basename trading
- [ ] Bulk registration discounts
- [ ] Auto-renewal subscriptions
- [ ] Custom TLD support
- [ ] IPFS integration for decentralized profiles
- [ ] NFT minting for registered basenames

## Security Considerations

- All basenames are normalized to lowercase
- Reserved names are protected
- Format validation prevents injection attacks
- Transaction verification before confirmation
- Expiration tracking prevents squatting
- User ownership verification on all operations

## Dependencies

```json
{
  "pouchdb": "^9.0.0",
  "web3": "^4.12.1",
  "decimal.js": "^10.4.3",
  "@coinbase/coinbase-sdk": "^0.2.0"
}
```

## License

ISC
