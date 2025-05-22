import { setupArucoDetectionForRemoteStream, stopArucoDetectionForRemoteStream } from '../arucoManager.js';
import { ARGameManager } from './arGameManager.js';
import jsAruco from 'js-aruco';

/**
 * ArUco AR Connector
 * Connects ArUco marker detection with the AR game system
 */
export class ArucoARConnector {
  /**
   * Create a new ArUco AR connector
   * @param {Object} rtcClient - Agora RTC client
   * @param {Function} logMessage - Function to log messages
   */
  constructor(rtcClient, logMessage = console.log) {
    this.rtcClient = rtcClient;
    this.logMessage = logMessage;
    this.arGameManager = null;
    this.localUid = null;
    this.markerDetectionInterval = null;
    this.videoElement = null;
    this.detectionCanvas = null;
    this.arCanvas = null;
    this.markerInfoElement = null;
    
    // ArUco specific variables
    this.MARKER_SIZE_MM = 50; // Physical marker size in millimeters
    this.detector = null;
    this.posit = null;
  }

  /**
   * Initialize the AR game with specified options
   * @param {HTMLVideoElement} localVideo - Local video element
   * @param {string} localUid - UID of the local user
   * @param {Object} options - AR game options
   * @returns {Promise<boolean>} - True if initialization succeeded
   */
  async initializeARGame(localVideo, localUid, options = {}) {
    this.localUid = localUid;
    this.videoElement = localVideo;
    
    // Setup ArUco detection
    this.setupArUcoDetection();
    
    // Create AR game manager
    this.arGameManager = new ARGameManager(localVideo, this.rtcClient, {
      logMessage: this.logMessage,
      getLocalVideoTrack: options.getLocalVideoTrack,
      ...options
    });
    
    // Initialize AR game
    return await this.arGameManager.initialize();
  }
  
  /**
   * Setup ArUco marker detection
   */
  setupArUcoDetection() {
    // Create detection canvas if not provided
    if (!this.detectionCanvas) {
      this.detectionCanvas = document.createElement('canvas');
      this.detectionCanvas.style.display = 'none';
      document.body.appendChild(this.detectionCanvas);
    }
    
    // Create info element if not provided
    if (!this.markerInfoElement) {
      this.markerInfoElement = document.createElement('div');
      this.markerInfoElement.style.display = 'none';
      document.body.appendChild(this.markerInfoElement);
    }
    
    // Initialize ArUco detector
    this.detector = new jsAruco.AR.Detector();
    this.posit = new jsAruco.POS1.Posit(this.MARKER_SIZE_MM, 1280);
  }
  
  /**
   * Start marker detection
   * @param {number} interval - Detection interval in milliseconds
   */
  startMarkerDetection(interval = 100) {
    if (this.markerDetectionInterval) {
      clearInterval(this.markerDetectionInterval);
    }
    
    this.markerDetectionInterval = setInterval(() => {
      this.detectMarkersAndUpdateAR();
    }, interval);
    
    this.logMessage('Started AR marker detection');
  }
  
  /**
   * Detect markers and update AR visualization
   */
  detectMarkersAndUpdateAR() {
    if (!this.videoElement || !this.detector || !this.arGameManager) return;
    
    // Check if video is ready
    if (this.videoElement.paused || this.videoElement.ended || !this.videoElement.videoWidth) return;
    
    // Set canvas size to match video
    if (this.detectionCanvas.width !== this.videoElement.videoWidth) {
      this.detectionCanvas.width = this.videoElement.videoWidth;
      this.detectionCanvas.height = this.videoElement.videoHeight;
    }
    
    try {
      const ctx = this.detectionCanvas.getContext('2d');
      
      // Draw current video frame to canvas
      ctx.drawImage(this.videoElement, 0, 0);
      
      // Get image data for detection
      const imageData = ctx.getImageData(0, 0, this.detectionCanvas.width, this.detectionCanvas.height);
      
      // Detect markers
      const markers = this.detector.detect(imageData);
      
      if (markers.length > 0) {
        // Debug log for marker detection
        this.logMessage(`Detected ${markers.length} markers: ${markers.map(m => m.id).join(', ')}`);
        
        // Process each marker to add pose information
        const processedMarkers = markers.map(marker => {
          // Calculate pose for BabylonJS
          const corners = marker.corners.map(corner => ({
            x: corner.x - (this.detectionCanvas.width / 2),
            y: (this.detectionCanvas.height / 2) - corner.y
          }));
          
          const pose = this.posit.pose(corners);
          
          // Create pose matrix for 3D rendering
          const poseMatrix = this.createTransformMatrix(
            pose.bestRotation, 
            pose.bestTranslation
          );
          
          this.logMessage(`Marker ID ${marker.id} detected with position (${pose.bestTranslation[0].toFixed(2)}, ${pose.bestTranslation[1].toFixed(2)}, ${pose.bestTranslation[2].toFixed(2)})`);
          
          return {
            ...marker,
            poseMatrix
          };
        });
        
        // Draw marker outlines for debugging
        ctx.strokeStyle = 'lime';
        ctx.lineWidth = 4;
        markers.forEach(marker => {
          ctx.beginPath();
          marker.corners.forEach((corner, i) => {
            if (i === 0) ctx.moveTo(corner.x, corner.y);
            else ctx.lineTo(corner.x, corner.y);
          });
          ctx.closePath();
          ctx.stroke();
          
          // Add marker ID text
          ctx.fillStyle = 'red';
          ctx.font = '24px Arial';
          ctx.fillText(`ID: ${marker.id}`, marker.corners[0].x, marker.corners[0].y - 10);
        });
        
        // Send processed markers to AR game manager
        this.arGameManager.processMarkers(processedMarkers);
        
        // Update marker info text
        const infoText = processedMarkers.map(m => `ID: ${m.id}`).join(' | ');
        this.markerInfoElement.textContent = infoText;
        
        // Make detection canvas visible for debugging
        this.detectionCanvas.style.display = 'block';
        this.detectionCanvas.style.position = 'absolute';
        this.detectionCanvas.style.top = '0';
        this.detectionCanvas.style.right = '0';
        this.detectionCanvas.style.width = '200px';
        this.detectionCanvas.style.height = 'auto';
        this.detectionCanvas.style.border = '2px solid red';
        this.detectionCanvas.style.zIndex = '1001';
      } else {
        this.markerInfoElement.textContent = 'No markers detected';
      }
    } catch (error) {
      this.logMessage(`Error in marker detection: ${error.message}`);
    }
  }
  
  /**
   * Create transformation matrix from rotation and translation
   * @param {Array} rotation - Rotation matrix (3x3)
   * @param {Array} translation - Translation vector
   * @returns {Float32Array} - Transformation matrix (4x4)
   */
  createTransformMatrix(rotation, translation) {
    const matrix = new Float32Array(16);
    
    // Rotation part (3x3)
    matrix[0] = rotation[0][0];
    matrix[1] = rotation[1][0];
    matrix[2] = rotation[2][0];
    matrix[3] = 0;
    
    matrix[4] = rotation[0][1];
    matrix[5] = rotation[1][1];
    matrix[6] = rotation[2][1];
    matrix[7] = 0;
    
    matrix[8] = rotation[0][2];
    matrix[9] = rotation[1][2];
    matrix[10] = rotation[2][2];
    matrix[11] = 0;
    
    // Translation part
    matrix[12] = translation[0];
    matrix[13] = translation[1];
    matrix[14] = translation[2];
    matrix[15] = 1;
    
    return matrix;
  }

  /**
   * Start the AR game
   * @returns {Promise<boolean>} - True if game started successfully
   */
  async startARGame() {
    if (!this.arGameManager) {
      this.logMessage('AR game manager not initialized');
      return false;
    }
    
    // Start marker detection
    this.startMarkerDetection();
    
    // Start AR game
    return await this.arGameManager.startGame();
  }

  /**
   * Stop the AR game
   * @returns {Promise<boolean>} - True if game stopped successfully
   */
  async stopARGame() {
    if (!this.arGameManager) {
      this.logMessage('AR game manager not initialized');
      return false;
    }
    
    // Stop marker detection
    if (this.markerDetectionInterval) {
      clearInterval(this.markerDetectionInterval);
      this.markerDetectionInterval = null;
    }
    
    // Stop AR game
    return await this.arGameManager.stopGame();
  }

  /**
   * Clean up resources
   */
  dispose() {
    // Stop marker detection
    if (this.markerDetectionInterval) {
      clearInterval(this.markerDetectionInterval);
      this.markerDetectionInterval = null;
    }
    
    // Remove created DOM elements
    if (this.detectionCanvas && this.detectionCanvas.parentNode) {
      this.detectionCanvas.parentNode.removeChild(this.detectionCanvas);
    }
    
    if (this.markerInfoElement && this.markerInfoElement.parentNode) {
      this.markerInfoElement.parentNode.removeChild(this.markerInfoElement);
    }
    
    // Dispose AR game manager
    if (this.arGameManager) {
      this.arGameManager.dispose();
      this.arGameManager = null;
    }
    
    this.detector = null;
    this.posit = null;
  }
}
