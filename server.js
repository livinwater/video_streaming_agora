import express from 'express';
import pkg from 'agora-access-token';
const { RtcTokenBuilder, RtcRole } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import cors from 'cors';

// Initialize dotenv
dotenv.config();

// ES module replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



const app = express();
const PORT = process.env.PORT || 8081; // Use a different port than Vite (which typically uses 5173)

// Configure CORS
const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Allow Vite dev server
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};

// Enable CORS for all routes
app.use(cors(corsOptions));

// Get Agora credentials from environment variables
const APP_ID = process.env.APP_ID;
const APP_CERTIFICATE = process.env.APP_CERTIFICATE;

// Verify credentials are available
if (!APP_ID || !APP_CERTIFICATE) {
  console.error('Error: Agora credentials missing. Please check your .env file.');
  console.error('APP_ID and APP_CERTIFICATE are required.');
  process.exit(1);
}

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Middleware to prevent caching
const nocache = (req, res, next) => {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
};

// API endpoint to generate RTC token
app.get('/token', nocache, (req, res) => {
  // Get query parameters
  const channelName = req.query.channelName;
  let uid = req.query.uid;
  const role = req.query.role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  
  // Check channel name
  if (!channelName) {
    return res.status(400).json({ error: 'Channel name is required' });
  }

  // If uid is not specified, generate a random one
  if (!uid || uid === '') {
    uid = Math.floor(Math.random() * 100000).toString();
  }

  // Set token expiry time (1 hour from now)
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  // Build the token
  let token;
  try {
    token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      parseInt(uid),
      role,
      privilegeExpiredTs
    );
  } catch (error) {
    console.error('Error generating token:', error);
    return res.status(500).json({ error: 'Failed to generate token' });
  }

  // Return the token
  return res.json({ token });
});

// For any other requests, send the Vue app's index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Token server running on port ${PORT}`);
});
