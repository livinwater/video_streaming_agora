import { ThreeViewerEngine } from './threeViewerEngine.js';

/**
 * Bridge between ArUco marker detection and ThreeJS AR rendering for viewers
 */
export class ThreeViewerConnector {
  /**
   * Create a new connector for AR viewing with ThreeJS
   * @param {Function} logMessage - Function to log messages
   */
  constructor(logMessage) {
    this.logMessage = logMessage || console.log;
    this.arEngine = null;
    this.hostUid = null;
    this.hostVideo = null;
    this.initialized = false;
    this.markerCallbacks = [];
    
    // Keep track of active marker IDs
    this.activeMarkerIds = new Set();
  }
  
  /**
   * Initialize AR for viewing the host's markers using ThreeJS
   * @param {HTMLVideoElement} hostVideoElement - The host's video element in the viewer's DOM
   * @param {string} hostUid - The user ID of the host
   * @param {Object} options - Additional options
   * @returns {boolean} - Success status
   */
  async initializeThreeViewer(hostVideoElement, hostUid, options = {}) {
    if (this.initialized) {
      this.logMessage('ThreeJS AR Viewer already initialized');
      return true;
    }
    
    if (!hostVideoElement) {
      this.logMessage('Host video element is required for ThreeJS AR Viewer');
      return false;
    }
    
    try {
      this.hostVideo = hostVideoElement;
      this.hostUid = hostUid;
      
      // Create the AR engine for 3D rendering
      this.arEngine = new ThreeViewerEngine(hostVideoElement, this.logMessage, options);
      
      // Load assets (3D models)
      await this.arEngine.loadAssets();
      
      // Pre-create keys for the expected marker IDs if specified
      if (options.markerIds && Array.isArray(options.markerIds)) {
        for (const markerId of options.markerIds) {
          await this.arEngine.addKey(markerId);
          this.logMessage(`Added key for marker ID ${markerId} for ThreeJS viewer`);
        }
      }
      
      this.initialized = true;
      this.logMessage('ThreeJS AR Viewer initialized successfully');
      return true;
    } catch (error) {
      this.logMessage(`Failed to initialize ThreeJS AR Viewer: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Handle marker detection from arucoManager
   * @param {Array} markers - Array of detected markers with position data
   */
  handleMarkersDetected(markers) {
    if (!this.initialized || !this.arEngine) return;
    
    // Update the AR engine with detected markers
    this.arEngine.updateWithMarkers(markers);
    
    // Call any registered callbacks
    for (const callback of this.markerCallbacks) {
      try {
        callback(markers);
      } catch (error) {
        this.logMessage(`Error in marker callback: ${error.message}`);
      }
    }
  }
  
  /**
   * Register a callback for marker detection events
   * @param {Function} callback - Function to call when markers are detected
   */
  onMarkersDetected(callback) {
    if (typeof callback === 'function') {
      this.markerCallbacks.push(callback);
    }
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    if (this.arEngine) {
      this.arEngine.dispose();
      this.arEngine = null;
    }
    
    this.initialized = false;
    this.markerCallbacks = [];
    this.logMessage('ThreeJS AR Viewer Connector disposed');
  }
}
