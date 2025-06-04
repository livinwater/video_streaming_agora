import jsAruco from 'js-aruco';

// ArUco specific variables
const ARUCO_MARKER_SIZE_MM = 50; // Physical marker size in millimeters for POSIT

// Store ArUco instances for remote users (key: uid string)
const arucoDetectors = {};

// Callback registry for marker detections
const markerCallbacks = {};

/**
 * Calculate the bounding box for a marker from its corners
 * @param {Array} corners - Array of corner objects with x, y properties
 * @returns {Object} - Bounding box with minX, maxX, minY, maxY, width, height
 */
function calculateMarkerBounds(corners) {
    if (!corners || corners.length === 0) {
        return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
    }
    
    const xs = corners.map(c => c.x);
    const ys = corners.map(c => c.y);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    return {
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX,
        height: maxY - minY
    };
}

/**
 * Calculate distance-based scale factor from marker pose and size
 * @param {Object} marker - Detected marker
 * @param {Object} pose - Pose estimation result
 * @param {number} imageWidth - Width of the image
 * @param {number} imageHeight - Height of the image
 * @returns {number} - Distance-based scale factor
 */
function calculateDistanceScale(marker, pose, imageWidth, imageHeight) {
    let distanceScale = 1.0;
    
    // Method 1: Use Z translation from pose (most accurate)
    if (pose && pose.bestTranslation && pose.bestTranslation[2]) {
        const zDistance = Math.abs(pose.bestTranslation[2]);
        // Typical range for ArUco detection: 50-500mm
        const normalizedDistance = Math.max(50, Math.min(500, zDistance));
        distanceScale = 500 / normalizedDistance; // Inverse relationship
    }
    // Method 2: Use marker apparent size as distance proxy
    else if (marker.corners) {
        const bounds = calculateMarkerBounds(marker.corners);
        const markerArea = bounds.width * bounds.height;
        const videoArea = imageWidth * imageHeight;
        const relativeSize = markerArea / videoArea;
        
        // Logarithmic scaling for natural perception
        const minRelativeSize = 0.001; // Very far
        const maxRelativeSize = 0.1;   // Very close
        const clampedSize = Math.max(minRelativeSize, Math.min(maxRelativeSize, relativeSize));
        distanceScale = Math.pow(clampedSize / minRelativeSize, 0.3);
    }
    
    // Clamp to reasonable bounds
    return Math.max(0.2, Math.min(3.0, distanceScale));
}

/**
 * Setup ArUco marker detection on a remote user's video stream
 * @param {string} uid - User ID of the remote stream
 * @param {HTMLVideoElement} videoElement - Video element of the remote stream
 * @param {HTMLCanvasElement} canvasElement - Canvas element for marker overlay
 * @param {HTMLElement} markerInfoElement - Element to display marker information
 * @param {Function} logMessage - Function to log messages
 */
export function setupArucoDetectionForRemoteStream(uid, videoElement, canvasElement, markerInfoElement, logMessage) {
    if (arucoDetectors[uid]) {
        logMessage(`ArUco detection already running for user ${uid}`);
        return;
    }

    if (!videoElement || !canvasElement || !markerInfoElement) {
        logMessage(`Required elements not found for ArUco setup (user ${uid})`);
        return;
    }

    const detector = new jsAruco.AR.Detector();
    // Initialize posit with default width, we'll update it when video dimensions are available
    const posit = new jsAruco.POS1.Posit(ARUCO_MARKER_SIZE_MM, 1280);
    const canvas = canvasElement;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match video
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;

    // Create detector instance
    arucoDetectors[uid] = {
        detector,
        posit,
        canvas,
        ctx,
        video: videoElement,
        markerInfo: markerInfoElement,
        interval: setInterval(() => updateArucoForRemoteStream(uid, logMessage), 100) // Run detection every 100ms
    };

    logMessage(`Started ArUco detection for user ${uid}`);
}

/**
 * Core ArUco detection loop for a specific remote stream
 * @param {string} uid - User ID of the remote stream
 * @param {Function} logMessage - Function to log messages
 */
function updateArucoForRemoteStream(uid, logMessage) {
    const instance = arucoDetectors[uid];
    if (!instance) return;

    const { detector, posit, canvas, ctx, video, markerInfo } = instance;

    // Check if video is playing and has valid dimensions
    if (video.paused || video.ended || !video.videoWidth) return;

    // Update canvas size if needed
    if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    try {
        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0);
        
        // Get image data for detection
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Detect markers
        const detectedMarkers = detector.detect(imageData);
        
        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Transform detected markers into 3D ready format with pose matrices
        const markers = [];
        
        if (detectedMarkers.length > 0) {
            let infoText = [];
            detectedMarkers.forEach(marker => {
                // Draw marker outline
                ctx.strokeStyle = 'green';
                ctx.lineWidth = 3;
                ctx.beginPath();
                marker.corners.forEach((corner, i) => {
                    if (i === 0) ctx.moveTo(corner.x, corner.y);
                    else ctx.lineTo(corner.x, corner.y);
                });
                ctx.closePath();
                ctx.stroke();

                // Estimate pose
                const cornersForPosit = marker.corners.map(p => ({
                    x: p.x - (imageData.width / 2),
                    y: (imageData.height / 2) - p.y
                }));
                const pose = posit.pose(cornersForPosit);
                let poseErrorText = 'N/A';
                
                // Create a pose matrix for 3D rendering
                if (pose) {
                    poseErrorText = pose.bestError !== undefined ? pose.bestError.toFixed(2) : 'N/A';
                    
                    // Calculate distance-based scale
                    const distanceScale = calculateDistanceScale(marker, pose, imageData.width, imageData.height);
                    
                    // Create 4x4 transformation matrix for BabylonJS
                    // Column-major format
                    const poseMatrix = [
                        pose.bestRotation[0][0], pose.bestRotation[1][0], pose.bestRotation[2][0], 0,
                        pose.bestRotation[0][1], pose.bestRotation[1][1], pose.bestRotation[2][1], 0,
                        pose.bestRotation[0][2], pose.bestRotation[1][2], pose.bestRotation[2][2], 0,
                        pose.bestTranslation[0], pose.bestTranslation[1], pose.bestTranslation[2], 1
                    ];
                    
                    // Add to markers array with full info
                    markers.push({
                        id: marker.id,
                        corners: marker.corners,
                        center: {
                            x: marker.corners.reduce((sum, corner) => sum + corner.x, 0) / 4,
                            y: marker.corners.reduce((sum, corner) => sum + corner.y, 0) / 4
                        },
                        bounds: calculateMarkerBounds(marker.corners),
                        distanceScale: distanceScale, // Add distance scaling factor
                        poseMatrix: poseMatrix,
                        error: pose.bestError
                    });
                }
                
                infoText.push(`ID: ${marker.id} (Err: ${poseErrorText})`);
            });
            
            // Update marker info display
            if (markerInfo) {
                markerInfo.textContent = infoText.join(' | ');
            }
        } else {
            // No markers found
            if (markerInfo) {
                markerInfo.textContent = 'Marker: None';
            }
        }
        
        // Call any registered callbacks with processed markers
        if (markerCallbacks[uid]) {
            try {
                markerCallbacks[uid](markers);
            } catch (error) {
                logMessage(`Error in marker callback for ${uid}: ${error.message}`);
            }
        }
        
    } catch (error) {
        logMessage(`ArUco detection error for user ${uid}: ${error.message}`);
    }
}

/**
 * Stop ArUco marker detection for a specific remote stream
 * @param {string} uid - User ID of the remote stream
 * @param {Function} logMessage - Function to log messages
 */
export function stopArucoDetectionForRemoteStream(uid, logMessage) {
    const instance = arucoDetectors[uid];
    if (!instance) return;

    clearInterval(instance.interval);
    if (instance.ctx) {
        instance.ctx.clearRect(0, 0, instance.canvas.width, instance.canvas.height);
    }
    if (instance.markerInfo) {
        instance.markerInfo.textContent = 'Marker: Off';
    }
    delete arucoDetectors[uid];
    delete markerCallbacks[uid];
    logMessage(`Stopped ArUco detection for user ${uid}`);
}

/**
 * Register a callback for marker detection events for a specific user
 * @param {string} uid - User ID of the remote stream
 * @param {Function} callback - Function to call when markers are detected
 * @param {Function} logMessage - Function to log messages
 */
export function registerMarkerCallback(uid, callback, logMessage) {
    if (typeof callback !== 'function') {
        if (logMessage) logMessage(`Invalid marker callback for user ${uid}`);
        return false;
    }
    
    markerCallbacks[uid] = callback;
    if (logMessage) logMessage(`Registered marker callback for user ${uid}`);
    return true;
}

/**
 * Unregister a marker detection callback for a specific user
 * @param {string} uid - User ID of the remote stream
 * @param {Function} logMessage - Function to log messages
 */
export function unregisterMarkerCallback(uid, logMessage) {
    if (markerCallbacks[uid]) {
        delete markerCallbacks[uid];
        if (logMessage) logMessage(`Unregistered marker callback for user ${uid}`);
        return true;
    }
    return false;
}
