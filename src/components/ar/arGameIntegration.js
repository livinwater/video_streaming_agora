/**
 * AR Game Integration Example
 * This file shows how to integrate the AR key game with the Agora streaming platform
 */
import { ArucoARConnector } from './arucoARConnector.js';
import { getLocalVideoTrack } from '../mediaManager.js';

let arConnector = null;
let arGameActive = false;

/**
 * Initialize the AR game
 * @param {Object} rtcClient - Agora RTC client
 * @param {HTMLVideoElement} localVideo - Local video element
 * @param {string} localUid - Local user ID
 * @param {Function} logMessage - Function to log messages
 * @returns {Promise<boolean>} - True if initialization succeeded
 */
export async function initializeARGame(rtcClient, localVideo, localUid, logMessage = console.log) {
    if (arConnector) {
        logMessage('AR game already initialized');
        return true;
    }

    try {
        // Create AR connector
        arConnector = new ArucoARConnector(rtcClient, logMessage);
        
        // Initialize AR game
        const success = await arConnector.initializeARGame(localVideo, localUid, {
            getLocalVideoTrack: getLocalVideoTrack,
            markerIds: [0, 63, 91],  // Marker IDs to recognize (using original ArUco ID 0)
            riddleIds: [1, 2, 3]      // Corresponding riddle IDs
        });
        
        if (success) {
            logMessage('AR game initialized successfully');
            return true;
        } else {
            logMessage('Failed to initialize AR game');
            return false;
        }
    } catch (error) {
        logMessage(`Error initializing AR game: ${error.message}`);
        return false;
    }
}

/**
 * Start the AR game
 * @param {Function} logMessage - Function to log messages
 * @returns {Promise<boolean>} - True if game started successfully
 */
export async function startARGame(logMessage = console.log) {
    if (!arConnector) {
        logMessage('AR game not initialized');
        return false;
    }

    try {
        const success = await arConnector.startARGame();
        if (success) {
            arGameActive = true;
            logMessage('AR game started');
            return true;
        } else {
            logMessage('Failed to start AR game');
            return false;
        }
    } catch (error) {
        logMessage(`Error starting AR game: ${error.message}`);
        return false;
    }
}

/**
 * Stop the AR game
 * @param {Function} logMessage - Function to log messages
 * @returns {Promise<boolean>} - True if game stopped successfully
 */
export async function stopARGame(logMessage = console.log) {
    if (!arConnector || !arGameActive) {
        logMessage('AR game not active');
        return false;
    }

    try {
        const success = await arConnector.stopARGame();
        if (success) {
            arGameActive = false;
            logMessage('AR game stopped');
            return true;
        } else {
            logMessage('Failed to stop AR game');
            return false;
        }
    } catch (error) {
        logMessage(`Error stopping AR game: ${error.message}`);
        return false;
    }
}

/**
 * Clean up AR game resources
 * @param {Function} logMessage - Function to log messages
 */
export function cleanupARGame(logMessage = console.log) {
    if (arConnector) {
        arConnector.dispose();
        arConnector = null;
        arGameActive = false;
        logMessage('AR game resources cleaned up');
    }
}

/**
 * Check if AR game is active
 * @returns {boolean} - True if game is active
 */
export function isARGameActive() {
    return arGameActive;
}
