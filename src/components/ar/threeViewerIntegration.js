import { ThreeViewerConnector } from './threeViewerConnector.js';
import { registerMarkerCallback, unregisterMarkerCallback } from '../arucoManager.js';

let threeViewerConnector = null;
let isInitialized = false;
let hostUid = null;

/**
 * Initialize the AR viewer system to render 3D key models on the viewer side using ThreeJS
 * @param {HTMLVideoElement} hostVideoElement - The host's video element in the viewer's DOM
 * @param {string} hostUserUid - The user ID of the host
 * @param {Function} logMessage - Function to log messages
 * @param {Object} options - Additional configuration options
 * @returns {boolean} - Success status
 */
export async function initializeThreeViewer(hostVideoElement, hostUserUid, logMessage, options = {}) {
    if (isInitialized) {
        logMessage('ThreeJS AR viewer is already initialized');
        return true;
    }
    
    if (!hostVideoElement || !hostUserUid) {
        logMessage('Missing required parameters for ThreeJS AR viewer initialization');
        return false;
    }
    
    try {
        // Create AR connector for the viewer
        threeViewerConnector = new ThreeViewerConnector(logMessage);
        
        // Initialize the connector
        const success = await threeViewerConnector.initializeThreeViewer(
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
                threeViewerConnector.handleMarkersDetected(markers);
            }, logMessage);
            
            hostUid = hostUserUid;
            isInitialized = true;
            logMessage('ThreeJS AR viewer initialized successfully');
            return true;
        } else {
            logMessage('Failed to initialize ThreeJS AR viewer');
            cleanupThreeViewer(logMessage);
            return false;
        }
    } catch (error) {
        logMessage(`Error initializing ThreeJS AR viewer: ${error.message}`);
        cleanupThreeViewer(logMessage);
        return false;
    }
}

/**
 * Clean up the ThreeJS AR viewer resources
 * @param {Function} logMessage - Function to log messages
 */
export function cleanupThreeViewer(logMessage) {
    if (threeViewerConnector) {
        threeViewerConnector.dispose();
        threeViewerConnector = null;
    }
    
    if (hostUid) {
        unregisterMarkerCallback(hostUid, logMessage);
        hostUid = null;
    }
    
    isInitialized = false;
    if (logMessage) logMessage('ThreeJS AR viewer cleaned up');
}

/**
 * Check if the ThreeJS AR viewer is active
 * @returns {boolean} - Whether the ThreeJS AR viewer is active
 */
export function isThreeViewerActive() {
    return isInitialized && threeViewerConnector !== null;
}

/**
 * Get the ThreeJS viewer connector instance
 * @returns {ThreeViewerConnector|null} - The ThreeJS AR viewer connector or null if not initialized
 */
export function getThreeViewerConnector() {
    return threeViewerConnector;
}
