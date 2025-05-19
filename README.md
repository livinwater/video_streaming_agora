# Agora WebRTC Streaming for Robot Rumble

This project implements a low-latency video streaming solution using Agora's WebRTC SDK. It includes both publisher (host) and viewer functionality with token-based authentication using serverless functions.

## Features

- Host broadcasting with configurable video quality settings
- Multiple viewer support
- Token-based authentication for secure connections
- Auto token refresh before expiry
- Fallback to temporary tokens for development

## Project Structure

- `src/main.js` - Main application logic with host and viewer functionality
- `src/style.css` - Application styles
- `index.html` - Main HTML entry point
- `server.js` - Token server for generating secure Agora tokens

## Setup & Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. For development (using temporary tokens):
   ```bash
   npm run dev
   ```

3. For production deployment with token authentication:
   - Get your App Certificate from the Agora Console
   - Set up environment variables (see below)
   - Build and start the server:
     ```bash
     npm run start
     ```

## Environment Variables for Production

For secure token generation, you'll need to set these environment variables:

- `APP_ID`: Your Agora App ID
- `APP_CERTIFICATE`: Your Agora App Certificate 
- `PORT`: (Optional) Port to run the server on (default: 8080)

You can set these variables in a `.env` file (for local development) or through your hosting platform for production.

## Token Authentication

This implementation:

1. Uses a temporary token for development
2. Requests new tokens from the token server in production
3. Automatically refreshes tokens before they expire
4. Handles fallback logic if token server is unavailable

## Testing NAT Traversal

The base implementation should work for most standard home networks. If users have trouble connecting:

1. Deploy the application and test with real users
2. Monitor connection issues
3. Consider enabling Agora's Cloud Proxy only if necessary (additional cost)

## Deployment with Vercel (Serverless)

This project is configured for serverless deployment with Vercel, where the token server runs as API routes:

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Log in to Vercel:
   ```bash
   vercel login
   ```

3. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

4. Set up environment variables in the Vercel dashboard:
   - `APP_ID`: Your Agora App ID
   - `APP_CERTIFICATE`: Your Agora App Certificate

5. For local development with Vercel dev:
   ```bash
   npm run vercel-dev
   ```

The token server API endpoint is now a serverless function at `/api/token`

## Production Considerations

1. Always use environment variables for sensitive information (APP_ID, APP_CERTIFICATE)
2. Ensure your token server is secure and has proper rate limiting
3. Monitor token usage and implement user authentication if needed
4. Consider implementing a token server with database storage for advanced use cases
