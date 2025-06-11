# GRID.WTF Telegram Demo

Full working version can be found here: [https://grid.wtf](https://grid.wtf)

## What's Included

- ✅ **Authentication**: Complete Telegram authentication flow (send code, verify, logout)
- ✅ **UI Components**: React components for login screens and user interface
- ✅ **Session Management**: Session handling and state management
- ✅ **API Client**: Type-safe API client for Telegram operations
- ✅ **Utils**: Utility functions for Telegram operations

## What's NOT Included (For Privacy/Security)

- ❌ Message retrieval and sending
- ❌ User data access and management
- ❌ Chat/channel data access
- ❌ Participant information
- ❌ Any routes that could access private data

## Prerequisites

1. **Telegram App Credentials**: You need to obtain `api_id` and `api_hash` from [my.telegram.org](https://my.telegram.org)
2. **Node.js**: Version 18 or higher
3. **npm/yarn**: Package manager

## Setup Instructions

1. **Clone and Install**:
   ```bash
   cd telegram-opensource
   npm install
   # or
   yarn install
   ```

2. **Environment Setup**:
   Create a `.env.local` file:
   ```env
   TELEGRAM_API_ID=your_api_id_here
   TELEGRAM_API_HASH=your_api_hash_here
   ```

3. **Run the Development Server**:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open in Browser**:
   Navigate to `http://localhost:3000`

## Features

### Authentication Flow
- Phone number input
- SMS code verification
- Two-factor authentication support
- Session persistence
- Logout functionality

### Components
- `LoginScreen`: Complete authentication UI
- `UserProfilePill`: User display component
- Session management utilities
- API client with TypeScript support

## API Endpoints

### `/api/telegram/auth`
- **GET**: Check session status
- **POST**: Handle authentication actions (`send-code`, `verify-code`, `logout`)

### Example Usage

```typescript
import { telegramAPI } from './lib/apiClient'

// Check if user is authenticated
const session = await telegramAPI.checkSession()

// Send verification code
await telegramAPI.sendCode('+1234567890')

// Verify code and login
await telegramAPI.verifyCode(phoneNumber, phoneCodeHash, code)
```

## Security Notes

- Sessions are stored locally and encrypted
- No message or user data is accessed in this version
- All sensitive routes have been removed
- API credentials are required but not included

## Contributing

This is a demonstration project. Feel free to:
- Fork and modify for your own use
- Submit bug fixes
- Improve documentation
- Add non-sensitive features

## License

MIT License - See LICENSE file for details

## Support

This is provided as-is for educational and demonstration purposes. For production use, please ensure you comply with Telegram's Terms of Service and implement appropriate security measures. 