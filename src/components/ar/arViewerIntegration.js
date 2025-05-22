import { ArucoViewerConnector } from './arucoViewerConnector.js';
import { registerMarkerCallback, unregisterMarkerCallback } from '../arucoManager.js';

let arViewerConnector = null;
let isInitialized = false;
let hostUid = null;

/**
 * Initialize the AR viewer system to render 3D key models on the viewer side
 * @param {HTMLVideoElement} hostVideoElement - The host's video element in the viewer's DOM
 * @param {string} hostUserUid - The user ID of the host
 * @param {Function} logMessage - Function to log messages
 * @param {Object} options - Additional configuration options
 * @returns {boolean} - Success status
 */
export async function initializeARViewer(hostVideoElement, hostUserUid, logMessage, options = {}) {
    if (isInitialized) {
        logMessage('AR viewer is already initialized');
        return true;
    }
    
    if (!hostVideoElement || !hostUserUid) {
        logMessage('Missing required parameters for AR viewer initialization');
        return false;
    }
    
    try {
        // Create AR connector for the viewer
        arViewerConnector = new ArucoViewerConnector(logMessage);
        
        // Initialize the connector
        const success = await arViewerConnector.initializeARViewer(
            hostVideoElement,
            hostUserUid,
            {
                markerIds: options.markerIds || [0, 63, 91],
                keyScale: options.keyScale || 5.0
            }
        );
        
        if (success) {
            // Register callback to process markers from the host
            registerMarkerCallback(hostUserUid, (markers) => {
                arViewerConnector.handleMarkersDetected(markers);
            }, logMessage);
            
            hostUid = hostUserUid;
            isInitialized = true;
            logMessage('AR viewer initialized successfully');
            return true;
        } else {
            logMessage('Failed to initialize AR viewer');
            cleanupARViewer(logMessage);
            return false;
        }
    } catch (error) {
        logMessage(`Error initializing AR viewer: ${error.message}`);
        cleanupARViewer(logMessage);
        return false;
    }
}

/**
 * Clean up the AR viewer resources
 * @param {Function} logMessage - Function to log messages
 */
export function cleanupARViewer(logMessage) {
    if (arViewerConnector) {
        arViewerConnector.dispose();
        arViewerConnector = null;
    }
    
    if (hostUid) {
        unregisterMarkerCallback(hostUid, logMessage);
        hostUid = null;
    }
    
    isInitialized = false;
    if (logMessage) logMessage('AR viewer cleaned up');
}

/**
 * Check if the AR viewer is active
 * @returns {boolean} - Whether the AR viewer is active
 */
export function isARViewerActive() {
    return isInitialized && arViewerConnector !== null;
}

/**
 * Get the ArUco viewer connector instance
 * @returns {ArucoViewerConnector|null} - The AR viewer connector or null if not initialized
 */
export function getARViewerConnector() {
    return arViewerConnector;
}
