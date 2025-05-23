// CSS is now imported in _app.js instead
import AgoraRTC from 'agora-rtc-sdk-ng';
import { createInstance, LOG_FILTER_ERROR } from 'agora-rtm-sdk'; // Using named imports
import { setupArucoDetectionForRemoteStream, stopArucoDetectionForRemoteStream } from './components/arucoManager.js';
import { initializeARGame, startARGame, stopARGame, cleanupARGame, isARGameActive } from './components/ar/arGameIntegration.stub.js';
import { initializeThreeViewer, cleanupThreeViewer, isThreeViewerActive } from './components/ar/threeViewerIntegration.js';
import { APP_ID, DEFAULT_CHANNEL, fetchToken, getCurrentToken, clearToken } from './components/authManager.js';
import {
  populateVideoDeviceList,
  populateAudioDeviceList,
  startLocalCamera,
  stopCurrentStream,
  createLocalTracks,
  handleMicToggle,
  getLocalVideoTrack,
  getLocalAudioTrack
} from './components/mediaManager.js';

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

// Track references retrieved from mediaManager
let currentStream;
let localVideoTrack;
let localAudioTrack;

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
      
      <div style="margin-top: 10px;">
        <label for="audioSource">Select Microphone:</label>
        <select id="audioSource"></select>
        <button id="refreshAudioButton" class="btn-secondary">Refresh List</button>
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
        <div id="local-video-container-wrapper" style="position: relative;">
          <div id="local-video-element" class="video-element" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
          <img id="local-avatar" src="/assets/images/avatar.png" class="avatar" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"/>
          <canvas id="local-canvas" class="marker-canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"></canvas>
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

// Get UI elements - Broadcasting controls
const videoSourceSelect = document.getElementById('videoSource');
const audioSourceSelect = document.getElementById('audioSource');
const refreshButton = document.getElementById('refreshButton');
const refreshAudioButton = document.getElementById('refreshAudioButton');
const startButton = document.getElementById('startButton');
const micButton = document.getElementById('micButton');
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
let statsInterval;

// Store detector instances and intervals per UID to manage them
const arucoDetectors = {};

import { createParticipantTileHTML } from './components/participantTile.js';

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
        
        // Set up ArUco detection for the host's own video
        const canvasElement = document.getElementById(`canvas-${localUidStr}`);
        const markerInfoElement = document.getElementById(`marker-info-${localUidStr}`);
        
        if (canvasElement && markerInfoElement) {
          logMessage(`Setting up ArUco detection for host's own video (${localUidStr})`);
          setupArucoDetectionForRemoteStream(localUidStr, localVideoElement, canvasElement, markerInfoElement, logMessage);
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
  
  // Add AR game toggle button
  if (!document.getElementById('arGameButton')) {
    const arGameButton = document.createElement('button');
    arGameButton.id = 'arGameButton';
    arGameButton.innerText = 'Start AR Game';
    arGameButton.className = 'btn-secondary';
    arGameButton.style.marginTop = '15px';
    arGameButton.style.marginLeft = '10px';
    hostControls.appendChild(arGameButton);
    
    // Add event listener
    arGameButton.addEventListener('click', async () => {
      if (isARGameActive()) {
        await stopARGame(logMessage);
        arGameButton.innerText = 'Start AR Game';
        arGameButton.classList.add('btn-secondary');
        arGameButton.classList.remove('btn-success');
        logMessage('AR game stopped');
      } else {
        await startARGame(logMessage);
        arGameButton.innerText = 'Stop AR Game';
        arGameButton.classList.remove('btn-secondary');
        arGameButton.classList.add('btn-success');
        logMessage('AR game started');
      }
    });
  }
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

// Add event listeners for the main UI buttons
refreshButton.addEventListener('click', loadVideoDevices);
refreshAudioButton.addEventListener('click', loadAudioDevices);

startButton.addEventListener('click', initLocalCamera);

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
micButton.addEventListener('click', toggleMicrophoneState);
function logMessage(message) {
  const p = document.createElement('p');
  p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logDiv.appendChild(p);
  logDiv.scrollTop = logDiv.scrollHeight; // Auto-scroll to latest message
  console.log(message);
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  logMessage('Application initialized');
  loadVideoDevices();
  loadAudioDevices();
});

// Initialize Agora Client with mode="live" for lowest latency
function initializeAgoraClient() {
  return AgoraRTC.createClient({ mode: 'live', codec: 'h264' });
}

// Stop current stream
async function stopMediaStream() {
  await stopCurrentStream(logMessage);
  localVideo.srcObject = null;
}

// Populate video device list
async function loadVideoDevices() {
  try {
    errorMessage.textContent = 'Enumerating video devices...';
    await populateVideoDeviceList(videoSourceSelect, logMessage);
    errorMessage.textContent = '';
  } catch (err) {
    console.error('Error populating video device list:', err);
    errorMessage.textContent = `Error populating video device list: ${err.name} - ${err.message}. Ensure camera permissions are granted.`;
  }
}

// Populate audio device list
async function loadAudioDevices() {
  try {
    errorMessage.textContent = 'Enumerating audio devices...';
    await populateAudioDeviceList(audioSourceSelect, logMessage);
    errorMessage.textContent = '';
  } catch (err) {
    console.error('Error populating audio device list:', err);
    errorMessage.textContent = `Error populating audio device list: ${err.name} - ${err.message}. Ensure microphone permissions are granted.`;
  }
}

// Start local camera
async function initLocalCamera() {
  errorMessage.textContent = '';
  
  try {
    await startLocalCamera(localVideo, videoSourceSelect, startButton, micButton, logMessage);
    errorMessage.textContent = '';
    // After successful camera start, enable UI elements
    startButton.textContent = 'Camera Started';
    startButton.disabled = true;
    micButton.disabled = false;
    return true;
  } catch (err) {
    console.error('Error accessing media devices:', err);
    errorMessage.textContent = `Error starting video: ${err.name} - ${err.message}.`;
    logMessage(`Error starting local camera: ${err.message}`);
    return false;
  }
}

// Create and publish Agora tracks from local camera
async function setupLocalTracks() {
  try {
    logMessage('Creating local tracks for publishing...');
    
    // Use the imported function to create local tracks
    const tracks = await createLocalTracks(
      videoSourceSelect,
      audioSourceSelect,
      videoProfileSelect, 
      bitrateInput, 
      framerateSelect, 
      logMessage
    );
    
    // Return the tracks in the expected format for main.js
    return [tracks.videoTrack, tracks.audioTrack];
  } catch (error) {
    logMessage(`Error creating local tracks: ${error.message}`);
    throw error;
  }
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
    const token = await fetchToken(channelName, uid, 'host', logMessage);
    
    // Join the channel using APP_ID and token
    await rtcClient.join(APP_ID, channelName, token, uid);
    logMessage(`Successfully joined channel: ${channelName} with UID: ${uid}`);
    
    // Set localUid for the entire application
    localUid = uid;
    
    // Set localUsername for the tile
    const usernameInputElement = document.getElementById('username-input');
    if (usernameInputElement && usernameInputElement.value.trim() !== "") {
        localUsername = usernameInputElement.value.trim();
    } else {
        localUsername = `Host ${localUid.toString()}`;
    }
    logMessage(`Host details: UID=${localUid}, Username=${localUsername}`);
    
    // Create and publish local tracks
    const tracks = await setupLocalTracks();
    localVideoTrack = tracks[0];
    localAudioTrack = tracks[1];
    
    // We can also retrieve the tracks if needed using getLocalVideoTrack() and getLocalAudioTrack()
    
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
    
    // Create local participant tile for the host to see themselves
    createLocalParticipantTile();
    logMessage('Created local participant tile for host.');
    
    // Initialize and start AR game for host
    if (userRole === 'host') {
      try {
        // Initialize AR game
        await initializeARGame(rtcClient, localVideo, localUid, logMessage);
        
        // Start AR game
        await startARGame(logMessage);
        logMessage('AR game initialized and started');
      } catch (arError) {
        logMessage(`Warning: Could not initialize AR game: ${arError.message}`);
      }
    }
    
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
    const rtcTokenForViewer = await fetchToken(channelName, localUid, 'publisher', logMessage);
    
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
      
      // Clean up AR game
      try {
        await stopARGame(logMessage);
        cleanupARGame(logMessage);
        logMessage('AR game stopped and cleaned up');
      } catch (arError) {
        logMessage(`Warning: Error cleaning up AR game: ${arError.message}`);
      }
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
  
  // User joined event - triggers when a user joins the channel, even before publishing
  rtcClient.on('user-joined', (user) => {
    logMessage(`New user joined: ${user.uid}`);
    remoteUsers[user.uid] = user;
    
    // Create a placeholder tile for the user immediately when they join
    let tileElement = document.getElementById(`participant-${user.uid.toString()}`);
    if (!tileElement) {
      const tileHTML = createParticipantTileHTML(user.uid.toString(), `User ${user.uid.toString()}`);
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = tileHTML.trim();
      
      if (tempContainer.firstChild) {
        tileElement = tempContainer.firstChild;
        participantGrid.appendChild(tileElement);
        logMessage(`Created placeholder tile for user ${user.uid} who just joined`);
      }
    }
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
        const canvasElement = document.getElementById(`canvas-${user.uid}`);
        const markerInfoElement = document.getElementById(`marker-info-${user.uid}`);
        
        // Setup ArUco marker detection on the remote stream
        setupArucoDetectionForRemoteStream(user.uid.toString(), videoElement, canvasElement, markerInfoElement, logMessage);
        
        // If this user is a host and we are a viewer, initialize the ThreeJS AR viewer
        if (userRole === 'viewer') {
          // Check if the user is a host by checking if they're publishing video
          initializeThreeViewer(videoElement, user.uid.toString(), logMessage, {
            markerIds: [0, 63, 91] // Same marker IDs as used in the host AR game
          }).then(success => {
            if (success) {
              logMessage(`ThreeJS AR viewer initialized for host ${user.uid}`);
            } else {
              logMessage(`Failed to initialize ThreeJS AR viewer for host ${user.uid}`);
            }
          });
        }
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
    
    // Clean up any resources for this user
    stopArucoDetectionForRemoteStream(user.uid.toString(), logMessage);
    
    // If we're a viewer, clean up any active AR viewers
    if (userRole === 'viewer') {
      // Clean up ThreeJS AR viewer if active
      if (isThreeViewerActive()) {
        cleanupThreeViewer(logMessage);
        logMessage(`ThreeJS AR viewer cleaned up after host ${user.uid} left`);
      }
    }
    
    delete remoteUsers[user.uid];
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
async function toggleMicrophoneState() {
  // Use imported function to handle microphone toggling
  await handleMicToggle(micButton, logMessage);
}
