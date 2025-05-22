import { AREngine } from './arEngine.js';
import { KeyManager } from './keyManager.js';
import AgoraRTC from 'agora-rtc-sdk-ng';

/**
 * AR Game Manager
 * Integrates ArUco detection, BabylonJS AR rendering, and Agora streaming
 */
export class ARGameManager {
  /**
   * Create a new AR game manager
   * @param {HTMLVideoElement} videoElement - Host's video element
   * @param {Object} rtcClient - Agora RTC client
   * @param {Object} options - Configuration options
   */
  constructor(videoElement, rtcClient, options = {}) {
    this.videoElement = videoElement;
    this.rtcClient = rtcClient;
    this.options = {
      logMessage: console.log,
      markerIds: [42, 63, 91], // Default marker IDs to detect
      riddleIds: [1, 2, 3],    // Default riddle IDs to use
      ...options
    };
    
    this.logMessage = this.options.logMessage;
    this.originalVideoTrack = null;
    this.arVideoTrack = null;
    this.keyManager = null;
    this.arEngine = null;
    this.initialized = false;
    this.gameActive = false;
  }

  /**
   * Initialize the AR game
   * @returns {Promise<boolean>} - True if initialization succeeded
   */
  async initialize() {
    try {
      this.logMessage('Initializing AR Game...');
      
      // Create key manager
      this.keyManager = new KeyManager();
      await this.keyManager.loadRiddles();
      
      // Create AR engine
      this.arEngine = new AREngine(this.videoElement, this.logMessage);
      
      // Connect key collection events
      this.arEngine.setOnKeyCollected((key) => {
        this.keyManager.collectKey(key.markerId);
        this.logMessage(`Key ${key.markerId} collected! (${this.keyManager.getCollectedCount()}/${this.keyManager.getTotalCount()})`);
      });
      
      // Setup riddle provider function
      this.arEngine.setupEventListeners((markerId) => {
        const key = this.keyManager.keys.find(k => k.markerId === markerId);
        if (key) {
          return this.keyManager.getRiddle(key.riddleId);
        }
        return null;
      });
      
      // Add keys with associated marker IDs and riddle IDs
      for (let i = 0; i < this.options.markerIds.length; i++) {
        const markerId = this.options.markerIds[i];
        const riddleId = this.options.riddleIds[i] || (i + 1);
        
        this.keyManager.addKey(markerId, riddleId);
        await this.arEngine.addKey(markerId, riddleId);
      }
      
      this.initialized = true;
      this.logMessage('AR Game initialized successfully');
      return true;
    } catch (error) {
      this.logMessage(`Error initializing AR Game: ${error.message}`);
      return false;
    }
  }

  /**
   * Process ArUco detection results and update AR
   * @param {Array} markers - Detected ArUco markers with pose information
   */
  processMarkers(markers) {
    if (!this.initialized || !this.gameActive) return;
    
    // Update AR engine with marker data
    this.arEngine.updateWithMarkers(markers);
  }

  /**
   * Start the AR game
   * @returns {Promise<boolean>} - True if game started successfully
   */
  async startGame() {
    if (!this.initialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }
    
    try {
      this.logMessage('Starting AR Game...');
      
      // Save reference to original video track
      this.originalVideoTrack = this.options.getLocalVideoTrack ? 
        this.options.getLocalVideoTrack() : null;
      
      // Get the AR canvas stream
      const arStream = this.arEngine.getCanvasStream(30);
      
      // Create a new track from the AR canvas stream
      this.arVideoTrack = AgoraRTC.createCustomVideoTrack({
        mediaStreamTrack: arStream.getVideoTracks()[0]
      });
      
      // Replace the track being published to Agora
      if (this.rtcClient && this.originalVideoTrack) {
        await this.rtcClient.unpublish([this.originalVideoTrack]);
        await this.rtcClient.publish([this.arVideoTrack]);
      }
      
      this.gameActive = true;
      this.logMessage('AR Game started');
      return true;
    } catch (error) {
      this.logMessage(`Error starting AR Game: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop the AR game and restore original video
   * @returns {Promise<boolean>} - True if game stopped successfully
   */
  async stopGame() {
    if (!this.initialized || !this.gameActive) return false;
    
    try {
      this.logMessage('Stopping AR Game...');
      
      // Unpublish AR video track
      if (this.rtcClient && this.arVideoTrack) {
        await this.rtcClient.unpublish([this.arVideoTrack]);
        this.arVideoTrack.close();
        this.arVideoTrack = null;
      }
      
      // Republish original video track
      if (this.rtcClient && this.originalVideoTrack) {
        await this.rtcClient.publish([this.originalVideoTrack]);
      }
      
      this.gameActive = false;
      this.logMessage('AR Game stopped');
      return true;
    } catch (error) {
      this.logMessage(`Error stopping AR Game: ${error.message}`);
      return false;
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stopGame();
    
    if (this.arEngine) {
      this.arEngine.dispose();
      this.arEngine = null;
    }
    
    this.initialized = false;
    this.gameActive = false;
  }
}
