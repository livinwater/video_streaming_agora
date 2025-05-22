// Agora credentials
export const APP_ID = '598a5efd867842b98ece817df8be08ee';
export const DEFAULT_CHANNEL = 'robotrumble-stream';

// Token management
let currentToken = null;
const tokenExpiryTime = 3600; // Token expiry in seconds (1 hour)
let tokenExpiryTimer = null;

// Token server URL
// In development, use the relative path that will be handled by Vercel dev
// In production, this will point to the deployed API route
const TOKEN_SERVER_URL = '/api/token';

// For development/testing, you can use this temporary token
export const TEMP_TOKEN = '007eJxTYHj0+rXm25QnAtfrOvO9nFSzNf/u716+/6KHvJbZPCdl0X0KDKaWFommqWkpFmbmFiZGSZYWqcmpFobmKWkWSakGFqmpET+1MhoCGRmijBcwMEIhiC/EUJSflF9SVJqblJOqW1xSlJqYy8AAAH3kJY0=';

/**
 * Fetch a token from the token server
 * @param {string} channelName - Name of the channel to get token for
 * @param {string} uid - User ID
 * @param {string} role - User role ('host' or 'viewer')
 * @param {Function} logMessage - Function to log messages
 * @returns {Promise<string>} The token
 */
export async function fetchToken(channelName, uid, role, logMessage) {
    try {
        logMessage(`Requesting token from server for channel: ${channelName}, uid: ${uid}, role: ${role}`);
        
        // Try to fetch from token server
        const response = await fetch(`${TOKEN_SERVER_URL}?channelName=${channelName}&uid=${uid}&role=${role}`);
        if (!response.ok) {
            throw new Error(`Token server error: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.token) {
            throw new Error('Token not found in response');
        }
        
        currentToken = data.token;
        
        // Set up token refresh before it expires
        const refreshTime = (tokenExpiryTime - 60) * 1000; // Refresh 1 minute before expiry
        clearTimeout(tokenExpiryTimer);
        tokenExpiryTimer = setTimeout(() => {
            logMessage('Token about to expire, refreshing...');
            fetchToken(channelName, uid, role, logMessage)
                .catch(error => logMessage(`Error refreshing token: ${error.message}`));
        }, refreshTime);
        
        logMessage('Successfully obtained token');
        return currentToken;
        
    } catch (error) {
        logMessage(`Error fetching token: ${error.message}`);
        // For development, fall back to temporary token
        logMessage('Using temporary token for development');
        return TEMP_TOKEN;
    }
}

/**
 * Get the current token
 * @returns {string|null} The current token or null if not set
 */
export function getCurrentToken() {
    return currentToken;
}

/**
 * Clear the current token and stop the expiry timer
 */
export function clearToken() {
    currentToken = null;
    if (tokenExpiryTimer) {
        clearTimeout(tokenExpiryTimer);
        tokenExpiryTimer = null;
    }
}
