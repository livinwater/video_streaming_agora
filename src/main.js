// CSS is now imported in _app.js instead
import AgoraRTC from 'agora-rtc-sdk-ng';
import { createInstance, LOG_FILTER_ERROR } from 'agora-rtm-sdk'; // Using named imports
import jsAruco from 'js-aruco';

// Agora credentials
const APP_ID = '598a5efd867842b98ece817df8be08ee';
const DEFAULT_CHANNEL = 'robotrumble-stream';

// Token management
let currentToken = null;
const tokenExpiryTime = 3600; // Token expiry in seconds (1 hour)
let tokenExpiryTimer = null;

// Token server URL
// In development, use the relative path that will be handled by Vercel dev
// In production, this will point to the deployed API route
const TOKEN_SERVER_URL = '/api/token';

// RTC and RTM clients and instances
let rtcClient = null;
let rtmClient = null;
let channelInstance = null; // For RTM channel

// Local user details
let localUid = null;
let localUsername = '';
let userRole = ''; // Can be 'host' or 'viewer'
let localProfilePicUrl = 'default-avatar.png'; // Default or fetched user avatar

// Remote users collection
let remoteUsers = {};

// For development/testing, you can use this temporary token
const TEMP_TOKEN = '007eJxTYHj0+rXm25QnAtfrOvO9nFSzNf/u716+/6KHvJbZPCdl0X0KDKaWFommqWkpFmbmFiZGSZYWqcmpFobmKWkWSakGFqmpET+1MhoCGRmijBcwMEIhiC/EUJSflF9SVJqblJOqW1xSlJqYy8AAAH3kJY0=';

// Initialize the app UI
document.querySelector('#app').innerHTML = `
  <div class="container">
    <h1>Agora Live Streaming</h1>
    
    <div class="role-selection">
      <h2>Select Your Role</h2>
      <button id="hostBtn" class="btn-success">Join as Host</button>
      <button id="viewerBtn" class="btn-secondary">Join as Viewer</button>
    </div>

    <div id="hostControls" class="hidden">
      <h2>Broadcasting Controls</h2>
      <div>
        <label for="videoSource">Select Camera:</label>
        <select id="videoSource"></select>
        <button id="refreshButton" class="btn-secondary">Refresh List</button>
        <button id="startButton">Start Camera</button>
        <button id="micButton" disabled>Mute Mic</button>
      </div>

      <div style="margin-top: 15px;">
        <label for="channelName">Channel Name:</label>
        <input type="text" id="channelName" value="${DEFAULT_CHANNEL}">
        <button id="joinButton" class="btn-success">Start Broadcasting</button>
        <button id="leaveButton" class="btn-danger hidden">Stop Broadcasting</button>
      </div>
      
      <div class="settings-section">
        <div class="settings-title">Stream Quality Settings</div>
        
        <div class="setting-row">
          <label for="videoProfile">Resolution:</label>
          <select id="videoProfile">
            <option value="120p_1">120p (160×120) @ 15fps - Lowest</option>
            <option value="180p_4">180p (320×180) @ 15fps - Very Low</option>
            <option value="240p_4">240p (424×240) @ 15fps - Low</option>
            <option value="360p_8">360p (640×360) @ 30fps - Medium</option>
            <option value="480p_2">480p (640×480) @ 30fps - Medium High</option>
            <option value="720p_3" selected>720p (1280×720) @ 30fps - High</option>
            <option value="1080p_1">1080p (1920×1080) @ 30fps - Very High</option>
          </select>
        </div>
        
        <div class="setting-row">
          <label for="bitrate">Bitrate (Kbps):</label>
          <input type="number" id="bitrate" min="100" max="5000" value="1000">
        </div>

        <div class="setting-row">
          <label for="framerate">Framerate:</label>
          <select id="framerate">
            <option value="15">15 fps</option>
            <option value="24">24 fps</option>
            <option value="30" selected>30 fps</option>
            <option value="60">60 fps</option>
          </select>
        </div>

        <div class="setting-row">
          <label for="latencyLevel">Latency Level:</label>
          <select id="latencyLevel">
            <option value="1">Ultra Low Latency (level 1)</option>
            <option value="2" selected>Low Latency (level 2)</option>
            <option value="3">Standard Latency (level 3)</option>
          </select>
        </div>
      </div>
    </div>

    <div id="viewerControls" class="hidden">
      <h2>Viewing Stream</h2>
      <div style="margin-top: 15px;">
        <label for="viewerChannelName">Channel Name:</label>
        <input type="text" id="viewerChannelName" value="${DEFAULT_CHANNEL}">
        <button id="viewerJoinButton" class="btn-success">Join Stream</button>
        <button id="viewerLeaveButton" class="btn-danger hidden">Leave Stream</button>
      </div>
    </div>
    
    <div class="video-area">
      <div id="local-video-container" class="hidden">
        <h3>Your Camera (Host View)</h3>
        <div class="video-wrapper local-wrapper">
          <video id="localVideo" autoplay playsinline muted></video>
        </div>
      </div>
      
      <div id="participant-grid-container">
        <h3>Participants</h3>
        <div id="participant-grid" class="grid-layout">
          <!-- Participant tiles will be dynamically added here by JavaScript -->
        </div>
      </div>
    </div>
    
    <div class="stats" id="statsInfo">Status: Waiting for connection...</div>
    <p id="errorMessage" class="error"></p>
    <div id="log"></div>
  </div>
`;

// Get UI elements - Role selection
const hostBtn = document.getElementById('hostBtn');
const viewerBtn = document.getElementById('viewerBtn');
const hostControls = document.getElementById('hostControls');
const viewerControls = document.getElementById('viewerControls');
const localVideoContainer = document.getElementById('local-video-container');
const participantGrid = document.getElementById('participant-grid');

// Get UI elements - Host controls
const videoSelect = document.getElementById('videoSource');
const startButton = document.getElementById('startButton');
const refreshButton = document.getElementById('refreshButton');
const channelNameInput = document.getElementById('channelName');
const joinButton = document.getElementById('joinButton');
const leaveButton = document.getElementById('leaveButton');
const localVideo = document.getElementById('localVideo');
const micButton = document.getElementById('micButton');

// Get UI elements - Viewer controls
const viewerChannelNameInput = document.getElementById('viewerChannelName');
const viewerJoinButton = document.getElementById('viewerJoinButton');
const viewerLeaveButton = document.getElementById('viewerLeaveButton');

// Common UI elements
const errorMessage = document.getElementById('errorMessage');
const logDiv = document.getElementById('log');
const statsInfo = document.getElementById('statsInfo');

// Stream Quality Settings Elements
const videoProfileSelect = document.getElementById('videoProfile');
const bitrateInput = document.getElementById('bitrate');
const framerateSelect = document.getElementById('framerate');
const latencyLevelSelect = document.getElementById('latencyLevel');

// State variables
let currentStream;
let localVideoTrack;
let localAudioTrack;
let statsInterval;

// Store detector instances and intervals per UID to manage them
const arucoDetectors = {};

// Helper function to create HTML for a participant tile
function createParticipantTileHTML(uid, username = "User", profilePicUrl = 'default-avatar.png') {
  return `
    <div class="participant-tile" id="participant-${uid}">
      <div class="video-wrapper">
        <video id="video-${uid}" autoplay playsinline class="hidden"></video> 
        <canvas id="canvas-${uid}" class="marker-canvas-overlay"></canvas>
        <img id="avatar-${uid}" src="${profilePicUrl}" class="avatar">
      </div>
      <div class="participant-meta">
        <span id="name-${uid}" class="username">${username}</span>
        <div id="marker-info-${uid}" class="marker-info-overlay">Marker: None</div>
        <div class="media-controls">
          <button id="mic-btn-${uid}" class="media-btn control-btn-off hidden" title="Unmute Microphone"> Mic Off</button>
          <button id="cam-btn-${uid}" class="media-btn control-btn-off hidden" title="Start Camera"> Cam Off</button>
        </div>
      </div>
    </div>
  `;
}

// Create local participant tile
function createLocalParticipantTile() {
  try {
    if (!localUid) { 
        console.error("createLocalParticipantTile: localUid is not set!");
        logMessage("Error: Cannot create local tile, local UID is missing.");
        return;
    }
    const localUidStr = localUid.toString();
    logMessage(`Attempting to create local participant tile for UID: ${localUidStr}. Current global localUsername: ${localUsername}`);

    if (document.getElementById(`participant-${localUidStr}`)) {
        logMessage(`Local participant tile for ${localUidStr} already exists. Skipping creation.`);
        return; 
    }

    // Ensure localUsername is up-to-date from input field if available, otherwise use a good default
    const usernameInputElement = document.getElementById('username-input');
    let currentDisplayName = localUsername; // Default to existing global localUsername

    if (usernameInputElement && usernameInputElement.value.trim() !== "") {
        currentDisplayName = usernameInputElement.value.trim();
        localUsername = currentDisplayName; // Update global localUsername if changed via input
    } else {
        // If no input or input is empty, ensure localUsername (global) is at least 'User <UID>'
        if (!localUsername || localUsername.startsWith('User ')) { // Check if it's still the initial random or needs UID
             localUsername = `User ${localUidStr}`;
        }
        currentDisplayName = localUsername; // Use the potentially updated global localUsername
    }
    logMessage(`Using display name: "${currentDisplayName}" for local tile ${localUidStr}`);
    
    // Create HTML for tile
    const tileHTML = createParticipantTileHTML(
      localUidStr, 
      currentDisplayName,
      localProfilePicUrl
    );
    
    // Add to participant grid
    participantGrid.insertAdjacentHTML('beforeend', tileHTML);
    
    // Get media control buttons so we can show/hide them
    const micButton = document.getElementById(`mic-btn-${localUidStr}`);
    const camButton = document.getElementById(`cam-btn-${localUidStr}`);
    
    if (micButton && camButton) {
      // For local user, always show the control buttons
      micButton.classList.remove('hidden');
      camButton.classList.remove('hidden');
      
      // Init as off
      micButton.textContent = '🎤 Mic Off';
      micButton.className = 'media-btn control-btn-off';
      camButton.textContent = '📷 Cam Off';
      camButton.className = 'media-btn control-btn-off';
      
      // Add event listeners for local user's media controls
      micButton.addEventListener('click', toggleMicrophone);
      camButton.addEventListener('click', toggleCamera);
    }

    // If we're a host with active video, play local video in the tile
    if (userRole === 'host' && localVideoTrack) {
      const localVideoElement = document.getElementById(`video-${localUidStr}`);
      const localAvatar = document.getElementById(`avatar-${localUidStr}`);
      
      if (localVideoElement && localAvatar) {
        localVideoTrack.play(localVideoElement);
        // Show video, hide avatar
        localVideoElement.classList.remove('hidden');
        localAvatar.classList.add('hidden');
        
        // Update button state for video
        if (camButton) {
          camButton.textContent = '📷 Cam On';
          camButton.className = 'media-btn control-btn-on';
        }
      }
      
      // Update mic button if we have audio
      if (localAudioTrack && micButton) {
        micButton.textContent = '🎤 Mic On';
        micButton.className = 'media-btn control-btn-on';
      }
    }
    
    logMessage(`Local participant tile created successfully for UID: ${localUid}`);
  } catch (err) {
    console.error('Error creating local participant tile:', err);
    logMessage(`Error creating local participant tile: ${err.message}`);
  }
}

// Toggle microphone for viewers
async function toggleMicrophone() {
  try {
    if (!rtcClient) {
      logMessage('RTC client not initialized');
      return;
    }
    
    const localUidStr = localUid.toString();
    const micButton = document.getElementById(`mic-btn-${localUidStr}`);
    if (!micButton) {
      logMessage(`Mic button for ${localUidStr} not found`);
      return;
    }
    
    // Check if we already have a microphone track
    if (!localAudioTrack) {
      // Create audio track
      logMessage('Creating microphone track...');
      localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      
      // Publish audio track
      await rtcClient.publish(localAudioTrack);
      logMessage('Microphone track published successfully');
      
      // Update button
      micButton.textContent = '🎤 Mic On';
      micButton.className = 'media-btn control-btn-on';
    } else {
      // Toggle existing track
      if (localAudioTrack.muted) {
        // Unmute
        await localAudioTrack.setMuted(false);
        logMessage('Microphone unmuted');
        micButton.textContent = '🎤 Mic On';
        micButton.className = 'media-btn control-btn-on';
      } else {
        // Mute
        await localAudioTrack.setMuted(true);
        logMessage('Microphone muted');
        micButton.textContent = '🎤 Mic Off';
        micButton.className = 'media-btn control-btn-off';
      }
    }
  } catch (err) {
    console.error('Error toggling microphone:', err);
    logMessage(`Error toggling microphone: ${err.message}`);
  }
}

// Toggle camera for viewers
async function toggleCamera() {
  try {
    if (!rtcClient) {
      logMessage('RTC client not initialized');
      return;
    }
    
    const localUidStr = localUid.toString();
    const camButton = document.getElementById(`cam-btn-${localUidStr}`);
    const videoElement = document.getElementById(`video-${localUidStr}`);
    const avatarElement = document.getElementById(`avatar-${localUidStr}`);
    
    if (!camButton || !videoElement || !avatarElement) {
      logMessage(`Required elements not found for toggleCamera (${localUidStr})`);
      return;
    }
    
    // Check if we already have a video track
    if (!localVideoTrack) {
      // Create video track
      logMessage('Creating camera track...');
      localVideoTrack = await AgoraRTC.createCameraVideoTrack();
      
      // Publish video track
      await rtcClient.publish(localVideoTrack);
      logMessage('Camera track published successfully');
      
      // Play video in local element
      localVideoTrack.play(videoElement);
      
      // Show video element, hide avatar
      videoElement.classList.remove('hidden');
      avatarElement.classList.add('hidden');
      
      // Update button
      camButton.textContent = '📷 Cam On';
      camButton.className = 'media-btn control-btn-on';
    } else {
      // Toggle existing track
      if (localVideoTrack.muted) {
        // Unmute video
        await localVideoTrack.setMuted(false);
        logMessage('Camera unmuted');
        camButton.textContent = '📷 Cam On';
        camButton.className = 'media-btn control-btn-on';
        
        // Show video element, hide avatar
        videoElement.classList.remove('hidden');
        avatarElement.classList.add('hidden');
      } else {
        // Mute video
        await localVideoTrack.setMuted(true);
        logMessage('Camera muted');
        camButton.textContent = '📷 Cam Off';
        camButton.className = 'media-btn control-btn-off';
        
        // Hide video element, show avatar
        videoElement.classList.add('hidden');
        avatarElement.classList.remove('hidden');
      }
    }
  } catch (err) {
    console.error('Error toggling camera:', err);
    logMessage(`Error toggling camera: ${err.message}`);
  }
}

// Add event listeners for role selection
hostBtn.addEventListener('click', () => {
  userRole = 'host';
  hostControls.classList.remove('hidden');
  viewerControls.classList.add('hidden');
  localVideoContainer.classList.remove('hidden');
  hostBtn.classList.add('btn-success');
  hostBtn.classList.remove('btn-secondary');
  viewerBtn.classList.remove('btn-success');
  viewerBtn.classList.add('btn-secondary');
  logMessage('Selected role: Host');
});

viewerBtn.addEventListener('click', () => {
  userRole = 'audience';
  viewerControls.classList.remove('hidden');
  hostControls.classList.add('hidden');
  localVideoContainer.classList.add('hidden');
  viewerBtn.classList.add('btn-success');
  viewerBtn.classList.remove('btn-secondary');
  hostBtn.classList.remove('btn-success');
  hostBtn.classList.add('btn-secondary');
  logMessage('Selected role: Viewer');
});

// Add event listeners for the host UI buttons
refreshButton.addEventListener('click', () => {
  populateVideoDeviceList();
});

startButton.addEventListener('click', startLocalCamera);

joinButton.addEventListener('click', () => {
  joinAndPublish();
});

leaveButton.addEventListener('click', () => {
  leaveChannel();
});

// Add event listeners for the viewer UI buttons
viewerJoinButton.addEventListener('click', () => {
  joinAsViewer();
});

viewerLeaveButton.addEventListener('click', () => {
  leaveChannel();
});

// Add event listener for mic button
micButton.addEventListener('click', handleMicToggle);

// Helper function to log messages
function logMessage(message) {
  const p = document.createElement('p');
  p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logDiv.appendChild(p);
  logDiv.scrollTop = logDiv.scrollHeight; // Auto-scroll to latest message
  console.log(message);
}

// ArUco specific variables
const ARUCO_MARKER_SIZE_MM = 50; // Physical marker size in millimeters for POSIT

// Store ArUco instances for remote users (key: uid string)
const remoteArucoDetectors = {};

// Setup ArUco marker detection on a remote user's video stream
function setupArucoDetectionForRemoteStream(uid) {
  if (!remoteArucoDetectors[uid]) {
    const videoElement = document.getElementById(`video-${uid}`);
    const displayCanvas = document.getElementById(`canvas-${uid}`);
    const infoDiv = document.getElementById(`marker-info-${uid}`);

    if (!videoElement || !displayCanvas || !infoDiv) {
      console.error(`DOM elements for ArUco detection on remote stream ${uid} not found.`);
      return;
    }

    try {
      const detector = new jsAruco.AR.Detector();
      const posit = new jsAruco.POS1.Posit(ARUCO_MARKER_SIZE_MM, videoElement.videoWidth || 1280); // Default to 1280 if videoWidth not ready
      const processingCanvas = document.createElement('canvas'); // In-memory canvas
      const displayCtx = displayCanvas.getContext('2d');

      remoteArucoDetectors[uid] = {
        detector,
        posit,
        processingCanvas,
        displayCanvas,
        displayCtx,
        infoDiv,
        markerSizeMM: ARUCO_MARKER_SIZE_MM,
        intervalId: null,
      };

      // Start the detection loop
      remoteArucoDetectors[uid].intervalId = setInterval(() => {
        updateArucoForRemoteStream(uid);
      }, 100); // Detect roughly 10 times per second

      console.log(`ArUco detection setup for remote stream: ${uid}`);
    } catch (error) {
      console.error(`Error initializing ArUco for remote stream ${uid}:`, error);
      if (remoteArucoDetectors[uid]) delete remoteArucoDetectors[uid]; // Clean up partial setup
    }
  }
}

// Core ArUco detection loop for a specific remote stream
function updateArucoForRemoteStream(uid) {
  const arucoContext = remoteArucoDetectors[uid];
  if (!arucoContext) return;

  const {
    detector,
    posit,
    processingCanvas,
    displayCanvas,
    displayCtx,
    infoDiv,
    markerSizeMM
  } = arucoContext;

  const videoElement = document.getElementById(`video-${uid}`);
  if (!videoElement || videoElement.readyState < videoElement.HAVE_METADATA || videoElement.paused || videoElement.ended || videoElement.videoWidth === 0) {
    return; // Video not ready or not playing
  }

  // Ensure canvases match video dimensions
  if (processingCanvas.width !== videoElement.videoWidth || processingCanvas.height !== videoElement.videoHeight) {
    processingCanvas.width = videoElement.videoWidth;
    processingCanvas.height = videoElement.videoHeight;
    displayCanvas.width = videoElement.videoWidth;
    displayCanvas.height = videoElement.videoHeight;
    // Update posit focal length with new width
    arucoContext.posit = new jsAruco.POS1.Posit(markerSizeMM, videoElement.videoWidth);
  }

  const processingCtx = processingCanvas.getContext('2d', { willReadFrequently: true });
  processingCtx.drawImage(videoElement, 0, 0, processingCanvas.width, processingCanvas.height);
  
  try {
    const imageData = processingCtx.getImageData(0, 0, processingCanvas.width, processingCanvas.height);
    const markers = detector.detect(imageData);

    displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    infoDiv.textContent = 'Marker: None';

    if (markers.length > 0) {
      let infoText = [];
      markers.forEach(marker => {
        // Draw marker outline
        displayCtx.strokeStyle = 'green';
        displayCtx.lineWidth = 3;
        displayCtx.beginPath();
        marker.corners.forEach((corner, i) => {
          if (i === 0) displayCtx.moveTo(corner.x, corner.y);
          else displayCtx.lineTo(corner.x, corner.y);
        });
        displayCtx.closePath();
        displayCtx.stroke();

        // Estimate pose
        const cornersForPosit = marker.corners.map(p => ({ x: p.x - (imageData.width / 2), y: (imageData.height / 2) - p.y }));
        const pose = posit.pose(cornersForPosit);
        let poseErrorText = 'N/A';
        if (pose) {
          poseErrorText = pose.bestError !== undefined ? pose.bestError.toFixed(2) : 'N/A';
        }
        infoText.push(`ID: ${marker.id} (Err: ${poseErrorText})`);
      });
      infoDiv.textContent = infoText.join(' | ');
    } else {
        infoDiv.textContent = 'Marker: None';
    }
  } catch (error) {
    console.error(`Error during ArUco detection for ${uid}:`, error);
    displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    infoDiv.textContent = 'Marker: Error';
  }
}

// Stop ArUco marker detection for a specific remote stream
function stopArucoDetectionForRemoteStream(uid) {
  const arucoContext = remoteArucoDetectors[uid];
  if (arucoContext) {
    clearInterval(arucoContext.intervalId);
    if (arucoContext.displayCtx) {
        arucoContext.displayCtx.clearRect(0, 0, arucoContext.displayCanvas.width, arucoContext.displayCanvas.height);
    }
    if (arucoContext.infoDiv) {
        arucoContext.infoDiv.textContent = 'Marker: Off';
    }
    delete remoteArucoDetectors[uid];
    console.log(`ArUco detection stopped for remote stream: ${uid}`);
  }
}

// Token management
async function fetchToken(channelName, uid, role) {
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
      fetchToken(channelName, uid, role);
    }, refreshTime);
    
    logMessage('Token fetched successfully');
    return data.token;
  } catch (err) {
    logMessage(`Error fetching token: ${err.message}`);
    errorMessage.textContent = `Token error: ${err.message}`;
    
    // Fallback to temporary token if configured
    if (TEMP_TOKEN) {
      logMessage('Falling back to temporary token');
      currentToken = TEMP_TOKEN;
      return TEMP_TOKEN;
    }
    throw err;
  }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  logMessage('Application initialized');
  populateVideoDeviceList();
});

// Initialize Agora Client with mode="live" for lowest latency
function initializeAgoraClient() {
  return AgoraRTC.createClient({ mode: 'live', codec: 'h264' });
}

// Stop current stream
function stopCurrentStream() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => {
      track.stop();
    });
    localVideo.srcObject = null;
    currentStream = null;
  }
}

// Populate video device list
async function populateVideoDeviceList() {
  try {
    errorMessage.textContent = 'Enumerating devices...';
    
    // Ensure permissions are fresh before enumerating
    const tempStream = await navigator.mediaDevices.getUserMedia({video: true, audio: false}); 
    tempStream.getTracks().forEach(track => track.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    videoSelect.innerHTML = ''; 
    if (videoDevices.length === 0) {
      errorMessage.textContent = 'No video input devices found.';
      return;
    }

    videoDevices.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Camera ${videoSelect.options.length + 1} (ID: ${device.deviceId.substring(0,8)}...)`;
      videoSelect.appendChild(option);
    });
    errorMessage.textContent = '';
    logMessage('Device list populated successfully');
  } catch (err) {
    console.error('Error populating device list:', err);
    errorMessage.textContent = `Error populating device list: ${err.name} - ${err.message}. Ensure camera permissions are granted.`;
  }
}

// Start local camera
async function startLocalCamera() {
  stopCurrentStream();
  errorMessage.textContent = '';

  const deviceId = videoSelect.value;
  if (!deviceId) {
    errorMessage.textContent = 'Please select a video source from the list.';
    return;
  }

  // Get quality settings
  const framerate = parseInt(framerateSelect.value);
  
  const constraints = {
    video: { 
      deviceId: { exact: deviceId },
      width: { ideal: 1280 }, 
      height: { ideal: 720 },
      frameRate: { ideal: framerate }
    }
  };

  try {
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    localVideo.srcObject = currentStream;
    localVideo.muted = true;
    logMessage('Local camera started successfully.');
    errorMessage.textContent = '';

    return currentStream;
  } catch (err) {
    console.error('Error accessing media devices:', err);
    errorMessage.textContent = `Error starting video: ${err.name} - ${err.message}.`;
    logMessage(`Error starting local camera: ${err.message}`);
    return null;
  }
}

// Create and publish Agora tracks from local camera
async function createLocalTracks() {
  if (!currentStream) {
    await startLocalCamera();
    if (!currentStream) {
      throw new Error('Failed to start local camera');
    }
  }
  
  // Get Agora SDK's device ID format
  const devices = await AgoraRTC.getDevices();
  const videoDevices = devices.filter(device => device.kind === 'videoinput');
  const selectedDevice = videoDevices.find(device => device.deviceId === videoSelect.value);
  
  // Configure video encoder settings for low latency
  const videoEncoderConfig = {
    width: 1280,
    height: 720,
    frameRate: parseInt(framerateSelect.value),
    bitrateMin: parseInt(bitrateInput.value) * 0.7, // Min bitrate (70% of target)
    bitrateMax: parseInt(bitrateInput.value) * 1.3, // Max bitrate (130% of target)
    orientationMode: 'adaptative'
  };
  
  // Create video track with optimized settings
  const videoTrack = await AgoraRTC.createCameraVideoTrack({
    cameraId: selectedDevice ? selectedDevice.deviceId : undefined,
    encoderConfig: videoEncoderConfig,
    optimizationMode: 'motion' // Prioritize motion over quality for low latency
  });
  
  // Create audio track
  const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();

  return [videoTrack, audioTrack];
}

// Join channel as host and publish local tracks
async function joinAndPublish() {
  try {
    logMessage('Attempting to join channel and publish as host...');
    
    // Initialize Agora client if not already done
    if (!rtcClient) {
      rtcClient = initializeAgoraClient();
      setupClientEvents();
    }
    
    const channelName = channelNameInput.value;
    if (!channelName) {
      errorMessage.textContent = 'Please enter a channel name.';
      logMessage('Channel name is empty.');
      return;
    }
    
    // UID: use a random uid for now
    const uid = Math.floor(Math.random() * 100000);
    
    logMessage(`Joining channel: ${channelName} as host...`);
    
    // Set client role to host (publisher)
    await rtcClient.setClientRole('host');
    
    // Configure low latency settings
    await rtcClient.setLowStreamParameter({
      width: 160,
      height: 120,
      framerate: 15,
      bitrate: 200
    });
    
    // Get a token for this channel and role
    const token = await fetchToken(channelName, uid, 'host');
    
    // Join the channel using APP_ID and token
    await rtcClient.join(APP_ID, channelName, token, uid);
    logMessage(`Successfully joined channel: ${channelName} with UID: ${uid}`);
    
    // Create and publish local tracks
    const tracks = await createLocalTracks();
    localVideoTrack = tracks[0];
    localAudioTrack = tracks[1];
    
    // Set stream fallback options for weak network
    await rtcClient.setStreamFallbackOption(uid, 1); // Enable stream fallback
    
    // Configure latency level through encoder parameters
    try {
      // Use appropriate stream optimization mode
      await localVideoTrack.setOptimizationMode('motion');
      
      // Set appropriate encoder configuration based on latency preference
      const latencyLevel = parseInt(latencyLevelSelect.value);
      if (latencyLevel === 1) {
        // Ultra-low latency: Lower quality, framerate priority
        await localVideoTrack.setEncoderConfiguration({
          frameRate: parseInt(framerateSelect.value),
          bitrateMin: parseInt(bitrateInput.value) * 0.6,
          bitrateMax: parseInt(bitrateInput.value) * 0.9
        });
      }
      logMessage(`Configured for low-latency streaming, level: ${latencyLevel}`);
    } catch (err) {
      // Non-fatal error, just log it
      logMessage(`Warning: Could not set some low-latency options: ${err.message}`);
    }
    
    // Publish tracks
    await rtcClient.publish([localVideoTrack, localAudioTrack]);
    logMessage('Local tracks published successfully. You are now broadcasting!');
    
    // Update UI
    joinButton.classList.add('hidden');
    leaveButton.classList.remove('hidden');
    
    // Start collecting stats for debugging
    startStatsInterval();
  } catch (err) {
    console.error('Error joining channel as host:', err);
    errorMessage.textContent = `Error joining channel: ${err.message}`;
    logMessage(`Error joining channel: ${err.message}`);
  }
}

// Join channel as viewer
async function joinAsViewer() {
  try {
    logMessage('Attempting to join channel as viewer...');
    userRole = 'viewer'; // Set application-level role
    
    // Initialize Agora RTC client if not already done
    if (!rtcClient) {
      rtcClient = initializeAgoraClient(); 
      setupClientEvents(); 
    }
    
    const channelName = viewerChannelNameInput.value.trim();
    if (!channelName) {
      errorMessage.textContent = 'Please enter a channel name.';
      logMessage('Channel name is empty for viewer.');
      return;
    }
    
    // Generate UID for the viewer
    const newUid = Math.floor(Math.random() * 100000);
    localUid = newUid; 

    // Set localUsername for the tile
    const usernameInputElement = document.getElementById('username-input');
    if (usernameInputElement && usernameInputElement.value.trim() !== "") {
        localUsername = usernameInputElement.value.trim();
    } else {
        localUsername = `User ${localUid.toString()}`;
    }
    logMessage(`Viewer details: UID=${localUid}, Username=${localUsername}`);

    logMessage(`Joining RTC channel: ${channelName} as viewer (SDK role host)...`);
    
    // Set client role to 'host' to allow publishing later
    await rtcClient.setClientRole('host'); 
    
    // Get an RTC token
    const rtcTokenForViewer = await fetchToken(channelName, localUid, 'publisher'); 
    
    // Join the RTC channel
    await rtcClient.join(APP_ID, channelName, rtcTokenForViewer, localUid);
    logMessage(`Successfully joined RTC channel: ${channelName} with UID: ${localUid}`);

    // SIMPLIFIED: Skip RTM setup for now - directly create local participant tile
    // This should show the viewer in their own participant grid
    createLocalParticipantTile();
    logMessage('Created local participant tile for viewer.');
    
    // Update UI - with safety checks for elements that might not exist
    const roleSelection = document.getElementById('role-selection');
    if (roleSelection) roleSelection.classList.add('hidden');
    
    const viewerControls = document.getElementById('viewer-controls-div');
    if (viewerControls) viewerControls.classList.remove('hidden');
    
    const channelInfo = document.getElementById('channel-info');
    if (channelInfo) channelInfo.textContent = `Channel: ${channelName}`;
    
    // Also check for viewer buttons that might be used
    const viewerJoinButton = document.getElementById('viewerBtn') || document.getElementById('viewerJoinButton');
    if (viewerJoinButton) viewerJoinButton.classList.add('hidden');
    
    const viewerLeaveButton = document.getElementById('viewerLeaveButton');
    if (viewerLeaveButton) viewerLeaveButton.classList.remove('hidden');
    
    startStatsInterval();
  } catch (err) {
    console.error('Error joining channel as viewer:', err);
    errorMessage.textContent = `Error joining channel: ${err.message}`;
    logMessage(`Error joining channel as viewer: ${err.message}`);
  }
}

// Subscribe to a remote user's video
async function subscribe(user, mediaType) {
  try {
    await rtcClient.subscribe(user, mediaType);
    logMessage(`Subscribed to ${mediaType} from ${user.uid}`);

    if (mediaType === 'video') {
      // Create participant tile HTML
      const tileHTML = createParticipantTileHTML(user.uid.toString(), `User ${user.uid}`);
      participantGrid.insertAdjacentHTML('beforeend', tileHTML);

      const videoElement = document.getElementById(`video-${user.uid.toString()}`);
      if (videoElement) {
        user.videoTrack.play(videoElement);
        logMessage(`Playing video for ${user.uid} in tile.`);
        setupArucoDetectionForRemoteStream(user.uid.toString());
      } else {
        logMessage(`Error: Video element for ${user.uid} not found after adding tile.`);
      }
    }

    if (mediaType === 'audio') {
      user.audioTrack.play();
      logMessage(`Playing audio for ${user.uid}`);
    }
  } catch (e) {
    logMessage(`Subscription failed for ${user.uid}: ${e.message}`);
    console.error(`Failed to subscribe to ${user.uid}`, e);
  }
}

// Leave channel and clean up
async function leaveChannel() {
  if (rtcClient) {
    // Stop collecting stats
    clearInterval(statsInterval);
    statsInfo.textContent = 'Status: Disconnected';
    
    // Unpublish and close tracks if we're a host
    if (userRole === 'host' && localVideoTrack) {
      await rtcClient.unpublish([localVideoTrack, localAudioTrack]);
      localVideoTrack.close();
      localVideoTrack = null;
      localAudioTrack.close();
      localAudioTrack = null;
    }
    
    // Leave the channel
    await rtcClient.leave();
    logMessage('Left the channel successfully.');
    
    // Clean up remote users
    Object.keys(remoteUsers).forEach(uid => {
      const userTile = document.getElementById(`participant-${uid}`);
      if (userTile) userTile.remove();
    });
    
    participantGrid.innerHTML = ''; 
    remoteUsers = {};
    
    // Update UI based on role
    if (userRole === 'host') {
      leaveButton.classList.add('hidden');
      joinButton.classList.remove('hidden');
    } else {
      viewerLeaveButton.classList.add('hidden');
      viewerJoinButton.classList.remove('hidden');
    }
  }
}

// Set up client event handlers
function setupClientEvents() {
  if (!rtcClient) return;
  
  // Connection state change events
  rtcClient.on('connection-state-change', (curState, prevState) => {
    logMessage(`Connection state changed from ${prevState} to ${curState}`);
  });
  
  // Stream events - remote user published
  rtcClient.on('user-published', async (user, mediaType) => {
    await rtcClient.subscribe(user, mediaType);
    logMessage(`Subscribed to ${mediaType} from user ${user.uid}`);
    remoteUsers[user.uid] = user;

    // Check if a tile for this user already exists, if not create it
    let tileElement = document.getElementById(`participant-${user.uid.toString()}`);
    if (!tileElement) {
        const tileHTML = createParticipantTileHTML(user.uid.toString(), `User ${user.uid.toString()}`);
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = tileHTML.trim(); // Use trim to avoid issues with whitespace
        
        if (tempContainer.firstChild) {
            tileElement = tempContainer.firstChild;
            participantGrid.appendChild(tileElement);
            logMessage(`Created tile for user ${user.uid}`);
        } else {
            logMessage(`Error: Could not create tile element from HTML for user ${user.uid}`);
            return; // Don't proceed if tile couldn't be created
        }
    } else {
        logMessage(`Tile already exists for user ${user.uid}`);
    }
    
    // Get the actual video/avatar elements from within the tileElement
    const videoElement = tileElement.querySelector(`#video-${user.uid.toString()}`); // More robust query within the tile
    const avatarImg = tileElement.querySelector(`#avatar-${user.uid.toString()}`);   // More robust query within the tile

    if (mediaType === 'video') {
      if (videoElement && avatarImg) {
        user.videoTrack.play(videoElement);
        
        // Show video element and hide avatar
        videoElement.classList.remove('hidden');
        avatarImg.classList.add('hidden');
        
        logMessage(`Playing video for ${user.uid} in tile. (Video shown, avatar hidden)`);
        setupArucoDetectionForRemoteStream(user.uid.toString());
      } else {
        logMessage(`Error: Video or avatar element not found for user ${user.uid} after adding tile.`);
      }
    }

    if (mediaType === 'audio') {
      user.audioTrack.play();
      logMessage(`Playing audio for ${user.uid}`);
    }
  });
  
  // Stream events - remote user unpublished
  rtcClient.on('user-unpublished', (user, mediaType) => {
    logMessage(`Remote user ${user.uid} unpublished ${mediaType} stream`);
    if (mediaType === 'video') {
      // Remove the video container for this user
      const playerContainer = document.getElementById(`participant-${user.uid.toString()}`);
      if (playerContainer) playerContainer.remove();
      delete remoteUsers[user.uid];
    }
    logMessage(`User ${user.uid} unpublished video.`);
  });

  // Stream events - remote user left
  rtcClient.on('user-left', (user) => {
    logMessage(`Remote user ${user.uid} left the channel`);
    // Remove the user's tile from the DOM
    const userTile = document.getElementById(`participant-${user.uid.toString()}`);
    if (userTile) {
      userTile.remove();
    }
    updateStats(); // Update stats if needed
  });

  // Network quality events
  rtcClient.on('network-quality', (stats) => {
    const quality = stats.downlinkNetworkQuality;
    let qualityText = 'Excellent';
    if (quality === 1) qualityText = 'Excellent';
    else if (quality === 2) qualityText = 'Good';
    else if (quality === 3) qualityText = 'Fair';
    else if (quality === 4) qualityText = 'Poor';
    else if (quality === 5) qualityText = 'Very Poor';
    else qualityText = 'Unknown';
    
    statsInfo.textContent = `Network Quality: ${qualityText}`;
  });
  
  // Exception handling
  rtcClient.on('exception', (event) => {
    logMessage(`Exception: ${event.code}, ${event.msg}`);
    errorMessage.textContent = `Error: ${event.msg}`;
  });
}

// Start collecting stats for debugging
function startStatsInterval() {
  if (statsInterval) {
    clearInterval(statsInterval);
  }
  
  statsInterval = setInterval(async () => {
    if (rtcClient) {
      if (userRole === 'host' && localVideoTrack) {
        // Get host stats
        const stats = await rtcClient.getLocalVideoStats();
        const localStats = stats[localVideoTrack.getTrackId()];
        
        if (localStats) {
          statsInfo.textContent = `Broadcasting: ${localStats.sendResolution.width}x${localStats.sendResolution.height} @ ${localStats.sendFrameRate}fps, ${(localStats.sendBitrate/1000).toFixed(2)} Mbps`;
        }
      } else if (userRole === 'audience' && Object.keys(remoteUsers).length > 0) {
        // Get viewer stats
        const remoteStats = await rtcClient.getRemoteVideoStats();
        
        // Update info for each remote user
        Object.keys(remoteUsers).forEach(uid => {
          const userStats = remoteStats[uid];
          const infoDisplay = remoteUsers[uid].infoDisplay;
          
          if (userStats && infoDisplay) {
            // Safely access potentially undefined properties
            try {
              const width = userStats.receiveResolution?.width || 'unknown';
              const height = userStats.receiveResolution?.height || 'unknown';
              const fps = userStats.receiveFrameRate || 'unknown';
              const bitrate = userStats.receiveBitrate ? (userStats.receiveBitrate/1000).toFixed(2) : 'unknown';
              
              infoDisplay.textContent = `Receiving: ${width}x${height} @ ${fps}fps, ${bitrate} Mbps`;
              statsInfo.textContent = `Viewing stream | Latency: ~150-250ms`;
            } catch (err) {
              // Fallback for when stats aren't fully available yet
              infoDisplay.textContent = `Viewing stream from host`;
            }
          }
        });
      }
    }
  }, 1000);
}

// Handle Microphone Toggle
async function handleMicToggle() {
  if (!localAudioTrack) {
    logMessage("Audio track not available to toggle.");
    micButton.disabled = true; // Should not happen if logic is correct
    return;
  }
  try {
    await localAudioTrack.setEnabled(!localAudioTrack.enabled);
    const micStatus = localAudioTrack.enabled ? 'unmuted' : 'muted';
    micButton.textContent = localAudioTrack.enabled ? 'Mute Mic' : 'Unmute Mic';
    logMessage(`Microphone ${micStatus}.`);
  } catch (error) {
    console.error("Error toggling microphone:", error);
    logMessage("Error toggling microphone state.");
  }
}
