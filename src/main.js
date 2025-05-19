// CSS is now imported in _app.js instead
import AgoraRTC from 'agora-rtc-sdk-ng';
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
    
    <div class="video-container">
      <div id="local-video-container" class="hidden">
        <h3>Your Camera (Host View)</h3>
        <video id="localVideo" autoplay playsinline muted></video>
      </div>
      
      <div id="remote-video-container">
        <h3>Remote Stream</h3>
        <!-- Remote videos will be added here dynamically -->
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
const remoteVideoContainer = document.getElementById('remote-video-container');

// Get UI elements - Host controls
const videoSelect = document.getElementById('videoSource');
const startButton = document.getElementById('startButton');
const refreshButton = document.getElementById('refreshButton');
const channelNameInput = document.getElementById('channelName');
const joinButton = document.getElementById('joinButton');
const leaveButton = document.getElementById('leaveButton');
const localVideo = document.getElementById('localVideo');

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
let rtcClient;
let localVideoTrack;
let statsInterval;
let remoteUsers = {};
let userRole = null; // 'host' or 'audience'

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

startButton.addEventListener('click', () => {
  startLocalCamera();
});

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

// Helper function to log messages
function logMessage(message) {
  const p = document.createElement('p');
  p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logDiv.appendChild(p);
  logDiv.scrollTop = logDiv.scrollHeight; // Auto-scroll to latest message
  console.log(message);
}

/**
 * ArUco Marker Detection
 */

// Setup ArUco marker detection on a video element
function setupArucoDetection(uid, playerContainer) {
  // Find the video element
  const videoElement = playerContainer.querySelector('video');
  if (!videoElement) {
    console.error('Video element not found');
    return;
  }
  
  // Create processing canvas (hidden)
  const processingCanvas = document.createElement('canvas');
  const processingCtx = processingCanvas.getContext('2d', {
    willReadFrequently: true
  });
  
  // Create debug canvas (visible)
  const debugCanvas = document.createElement('canvas');
  debugCanvas.style.position = 'fixed';
  debugCanvas.style.bottom = '10px';
  debugCanvas.style.right = '10px';
  debugCanvas.style.border = '2px solid red';
  debugCanvas.style.zIndex = '1000';
  debugCanvas.width = 320; // Quarter size for debug
  debugCanvas.height = 180;
  const debugCtx = debugCanvas.getContext('2d', {
    willReadFrequently: true
  });
  document.body.appendChild(debugCanvas);
  
  // Create marker detector
  console.log('Initializing ArUco detector...', { jsAruco: !!jsAruco, AR: !!(jsAruco?.AR) });
  try {
    // Create detector
    const detector = new jsAruco.AR.Detector();
    console.log('Successfully created detector');
    
    // Initialize POSIT with marker size and default focal length
    const MARKER_SIZE_MM = 50; // Physical marker size in millimeters
    const posit = new jsAruco.POS1.Posit(MARKER_SIZE_MM, 640);
    console.log('Successfully created POSIT estimator');
  
    // Run detection at reasonable intervals
    const detectInterval = setInterval(() => {
      try {
        // Check if video is ready
        if (videoElement.videoWidth === 0 || videoElement.paused || videoElement.ended) return;
        
        // Set canvas size to match video
        processingCanvas.width = videoElement.videoWidth;
        processingCanvas.height = videoElement.videoHeight;
        
        // Capture frame
        processingCtx.drawImage(videoElement, 0, 0);
        
        // Get image data for processing
        const imageData = processingCtx.getImageData(0, 0, processingCanvas.width, processingCanvas.height);
        
        // Update POSIT focal length based on image width
        const updatedPosit = new jsAruco.POS1.Posit(MARKER_SIZE_MM, imageData.width);
        
        // Debug visualization - show what the detector sees
        debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
        debugCtx.save();
        debugCtx.scale(
          debugCanvas.width / imageData.width,
          debugCanvas.height / imageData.height
        );
        
        // Create temporary canvas for full-size image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.putImageData(imageData, 0, 0);
          // Draw original image
          debugCtx.drawImage(tempCanvas, 0, 0);
        }
        debugCtx.restore();
        
        // Add debug info
        debugCtx.fillStyle = 'red';
        debugCtx.font = '12px monospace';
        debugCtx.fillText(`Frame: ${imageData.width}x${imageData.height}`, 5, 15);
        
        // Detect markers
        const markers = detector.detect(imageData);
        
        // Debug visualization of detected markers
        if (markers.length > 0) {
          console.log(`Detected ${markers.length} ArUco markers:`, markers);
          updateMarkerInfo(uid, markers);
          
          debugCtx.strokeStyle = 'lime';
          debugCtx.lineWidth = 2;
          const scale = debugCanvas.width / imageData.width;
          
          markers.forEach(marker => {
            debugCtx.beginPath();
            marker.corners.forEach((corner, idx) => {
              const x = corner.x * scale;
              const y = corner.y * scale;
              if (idx === 0) {
                debugCtx.moveTo(x, y);
              } else {
                debugCtx.lineTo(x, y);
              }
            });
            debugCtx.closePath();
            debugCtx.stroke();
            
            // Display marker ID
            const center = marker.corners.reduce(
              (acc, corner) => ({ x: acc.x + corner.x, y: acc.y + corner.y }),
              { x: 0, y: 0 }
            );
            center.x = (center.x / 4) * scale;
            center.y = (center.y / 4) * scale;
            
            debugCtx.fillStyle = 'white';
            debugCtx.font = '16px Arial';
            debugCtx.fillText(`ID: ${marker.id}`, center.x - 12, center.y + 5);
            
            // Estimate pose if needed
            try {
              const corners = marker.corners.map(corner => ({ x: corner.x - (imageData.width / 2), y: (imageData.height / 2) - corner.y }));
              const pose = updatedPosit.pose(corners);
              
              // Store pose information for later use
              marker.pose = {
                bestError: pose.bestError,
                bestRotation: pose.bestRotation,
                bestTranslation: pose.bestTranslation,
                alternativeError: pose.alternativeError,
                alternativeRotation: pose.alternativeRotation,
                alternativeTranslation: pose.alternativeTranslation
              };
            } catch (error) {
              console.error('Error estimating pose:', error);
            }
          });
        }
      } catch (error) {
        console.error('Error in marker detection:', error);
      }
    }, 200); // Detection interval
  
    // Store references for cleanup
    if (remoteUsers[uid]) {
      remoteUsers[uid].arucoInterval = detectInterval;
      remoteUsers[uid].arucoCanvas = processingCanvas;
      remoteUsers[uid].debugCanvas = debugCanvas;
    }
  } catch (error) {
    console.error('Failed to initialize ArUco detection:', error);
  }
}

// Draw markers on the canvas for visualization
function drawMarkers(markers, ctx) {
  ctx.lineWidth = 2;
  
  markers.forEach(marker => {
    // Draw the marker outline
    ctx.strokeStyle = 'red';
    ctx.beginPath();
    
    // Draw the marker corners
    for (let i = 0; i < marker.corners.length; i++) {
      ctx.moveTo(marker.corners[i].x, marker.corners[i].y);
      ctx.lineTo(marker.corners[(i + 1) % 4].x, marker.corners[(i + 1) % 4].y);
    }
    
    ctx.stroke();
    ctx.closePath();
    
    // Draw the marker ID
    ctx.fillStyle = 'blue';
    ctx.font = '12px Arial';
    ctx.fillText(`ID: ${marker.id}`, marker.corners[0].x, marker.corners[0].y - 5);
  });
}

// Update the info display with marker information
function updateMarkerInfo(uid, markers) {
  if (remoteUsers[uid] && remoteUsers[uid].infoDisplay) {
    remoteUsers[uid].infoDisplay.textContent = `Stream from host (${markers.length} markers detected, IDs: ${markers.map(m => m.id).join(', ')})`;
  }
}

/**
 * Token Management Functions
 */

// Fetch a token from the token server
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
  
  return [videoTrack];
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
    await rtcClient.publish(tracks);
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
    
    // Initialize Agora client if not already done
    if (!rtcClient) {
      rtcClient = initializeAgoraClient();
      setupClientEvents();
    }
    
    const channelName = viewerChannelNameInput.value;
    if (!channelName) {
      errorMessage.textContent = 'Please enter a channel name.';
      logMessage('Channel name is empty.');
      return;
    }
    
    // UID: use a random uid for now
    const uid = Math.floor(Math.random() * 100000);
    
    logMessage(`Joining channel: ${channelName} as viewer...`);
    
    // Set client role to audience (viewer)
    await rtcClient.setClientRole('audience');
    
    // Get a token for this channel and role
    const token = await fetchToken(channelName, uid, 'audience');
    
    // Join the channel using APP_ID and token
    await rtcClient.join(APP_ID, channelName, token, uid);
    logMessage(`Successfully joined channel: ${channelName} with UID: ${uid}`);
    
    // Update UI
    viewerJoinButton.classList.add('hidden');
    viewerLeaveButton.classList.remove('hidden');
    
    // Start collecting stats for debugging
    startStatsInterval();
  } catch (err) {
    console.error('Error joining channel as viewer:', err);
    errorMessage.textContent = `Error joining channel: ${err.message}`;
    logMessage(`Error joining channel: ${err.message}`);
  }
}

// Subscribe to a remote user's video
async function subscribe(user, mediaType) {
  try {
    // Subscribe to the remote user
    const track = await rtcClient.subscribe(user, mediaType);
    logMessage(`Subscribed to ${mediaType} track from user: ${user.uid}`);

    // If it's a video track, play it in the remote container
    if (mediaType === 'video') {
      // Create a container for this video with explicit size
      const playerContainer = document.createElement('div');
      playerContainer.id = `player-${user.uid}`;
      playerContainer.style.width = '640px';
      playerContainer.style.height = '480px';
      playerContainer.style.backgroundColor = '#000';
      playerContainer.style.position = 'relative';
      playerContainer.style.margin = '10px 0';
      playerContainer.style.borderRadius = '5px';
      playerContainer.style.overflow = 'hidden';

      // Create an info display for this stream
      const infoDisplay = document.createElement('div');
      infoDisplay.id = `info-${user.uid}`;
      infoDisplay.className = 'remote-stream-info';
      infoDisplay.textContent = `Stream from host (loading...)`;

      // Add video player and info to container
      remoteVideoContainer.appendChild(playerContainer);
      remoteVideoContainer.appendChild(infoDisplay);

      // Play with explicit element method
      track.play(playerContainer, { fit: 'cover' });
      
      // Force a resize event to ensure the video renders
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 500);
      
      // Setup ArUco detection after a delay to ensure video is loaded
      setTimeout(() => {
        setupArucoDetection(user.uid, playerContainer);
      }, 1000);

      // Store the user's track info for stats updates
      remoteUsers[user.uid] = {
        videoTrack: track,
        infoDisplay: infoDisplay
      };
    }

    // If it's an audio track, just play it
    if (mediaType === 'audio') {
      track.play();
    }
  } catch (err) {
    logMessage(`Failed to subscribe to ${mediaType} track from user ${user.uid}: ${err.message}`);
    errorMessage.textContent = `Subscription error: ${err.message}`;
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
      await rtcClient.unpublish([localVideoTrack]);
      localVideoTrack.close();
      localVideoTrack = null;
    }
    
    // Leave the channel
    await rtcClient.leave();
    logMessage('Left the channel successfully.');
    
    // Clean up remote users and stop ArUco detection
    Object.keys(remoteUsers).forEach(uid => {
      // Clear any ArUco detection intervals
      if (remoteUsers[uid].arucoInterval) {
        clearInterval(remoteUsers[uid].arucoInterval);
      }
    });
    
    remoteVideoContainer.innerHTML = '';
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
    logMessage(`Remote user ${user.uid} published ${mediaType} stream`);
    await subscribe(user, mediaType);
  });
  
  // Stream events - remote user unpublished
  rtcClient.on('user-unpublished', (user, mediaType) => {
    logMessage(`Remote user ${user.uid} unpublished ${mediaType} stream`);
    if (mediaType === 'video') {
      // Remove the video container for this user
      const playerContainer = document.getElementById(`player-${user.uid}`);
      const infoDisplay = document.getElementById(`info-${user.uid}`);
      if (playerContainer) playerContainer.remove();
      if (infoDisplay) infoDisplay.remove();
      delete remoteUsers[user.uid];
    }
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
