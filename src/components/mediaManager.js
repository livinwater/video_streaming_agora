import AgoraRTC from 'agora-rtc-sdk-ng';

// State variables for media
let currentStream;
let localVideoTrack;
let localAudioTrack;

/**
 * Populate the video device dropdown list
 * @param {HTMLSelectElement} videoSelect - The select element for video devices
 * @param {Function} logMessage - Function to log messages
 */
export async function populateVideoDeviceList(videoSelect, logMessage) {
    try {
        // Get list of video input devices
        const devices = await AgoraRTC.getDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // Clear existing options
        videoSelect.innerHTML = '';
        
        // Add each video device as an option
        videoDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${videoSelect.length + 1}`;
            videoSelect.appendChild(option);
        });
        
        if (videoDevices.length === 0) {
            logMessage('No video devices found');
            const option = document.createElement('option');
            option.text = 'No cameras available';
            videoSelect.appendChild(option);
        } else {
            logMessage(`Found ${videoDevices.length} video devices`);
        }
    } catch (error) {
        logMessage(`Error getting video devices: ${error.message}`);
    }
}

/**
 * Populate the audio device dropdown list
 * @param {HTMLSelectElement} audioSelect - The select element for audio devices
 * @param {Function} logMessage - Function to log messages
 */
export async function populateAudioDeviceList(audioSelect, logMessage) {
    try {
        // Get list of audio input devices
        const devices = await AgoraRTC.getDevices();
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        
        // Clear existing options
        audioSelect.innerHTML = '';
        
        // Add each audio device as an option
        audioDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Microphone ${audioSelect.length + 1}`;
            audioSelect.appendChild(option);
        });
        
        if (audioDevices.length === 0) {
            logMessage('No audio devices found');
            const option = document.createElement('option');
            option.text = 'No microphones available';
            audioSelect.appendChild(option);
        } else {
            logMessage(`Found ${audioDevices.length} audio devices`);
        }
    } catch (error) {
        logMessage(`Error getting audio devices: ${error.message}`);
    }
}

/**
 * Start the local camera preview
 * @param {HTMLVideoElement} localVideo - The video element for local preview
 * @param {HTMLSelectElement} videoSelect - The select element for video devices
 * @param {HTMLButtonElement} startButton - Button to start camera
 * @param {HTMLButtonElement} micButton - Button to toggle microphone
 * @param {Function} logMessage - Function to log messages
 */
export async function startLocalCamera(localVideo, videoSelect, startButton, micButton, logMessage) {
    // Stop any existing stream
    await stopCurrentStream(logMessage);
    
    try {
        const deviceId = videoSelect.value;
        if (!deviceId) {
            throw new Error('No video device selected');
        }
        
        // Create media stream with selected device
        const constraints = {
            video: {
                deviceId: deviceId
            },
            audio: true
        };
        
        logMessage(`Requesting media with device ID: ${deviceId}`);
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Set video source and start playing
        localVideo.srcObject = currentStream;
        
        // Enable join button and mic toggle
        startButton.textContent = 'Camera Started';
        startButton.disabled = true;
        micButton.disabled = false;
        
        logMessage('Local camera started');
    } catch (error) {
        logMessage(`Error starting camera: ${error.message}`);
    }
}

/**
 * Create and return Agora tracks from local camera
 * @param {HTMLSelectElement} videoSelect - The select element for video devices
 * @param {HTMLSelectElement} audioSelect - The select element for audio devices
 * @param {HTMLSelectElement} videoProfileSelect - The select element for video profile
 * @param {HTMLInputElement} bitrateInput - The input for bitrate
 * @param {HTMLSelectElement} framerateSelect - The select element for framerate
 * @param {Function} logMessage - Function to log messages
 * @returns {Object} Object containing audio and video tracks
 */
export async function createLocalTracks(videoSelect, audioSelect, videoProfileSelect, bitrateInput, framerateSelect, logMessage) {
    try {
        // Get selected profile, bitrate, and framerate
        const videoProfile = videoProfileSelect.value;
        const bitrate = parseInt(bitrateInput.value, 10);
        const framerate = parseInt(framerateSelect.value, 10);
        
        logMessage(`Creating tracks with profile: ${videoProfile}, bitrate: ${bitrate}, framerate: ${framerate}`);
        
        // Create audio track with selected device if available
        const audioConfig = {};
        if (audioSelect && audioSelect.value) {
            audioConfig.microphoneId = audioSelect.value;
            logMessage(`Using selected microphone: ${audioSelect.options[audioSelect.selectedIndex].text}`);
        }
        
        localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack(audioConfig);
        
        // Create video track with selected device and encoding settings
        const cameraConfig = {
            encoderConfig: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: framerate,
                bitrateMin: bitrate,
                bitrateMax: bitrate * 1.5
            }
        };
        
        // Use selected device if available
        if (videoSelect.value) {
            cameraConfig.cameraId = videoSelect.value;
        }
        
        localVideoTrack = await AgoraRTC.createCameraVideoTrack(cameraConfig);
        
        logMessage('Local tracks created successfully');
        return {
            audioTrack: localAudioTrack,
            videoTrack: localVideoTrack
        };
    } catch (error) {
        logMessage(`Error creating local tracks: ${error.message}`);
        throw error;
    }
}

/**
 * Stop the current media stream
 * @param {Function} logMessage - Function to log messages
 */
export async function stopCurrentStream(logMessage) {
    if (currentStream) {
        // Stop all tracks in the stream
        currentStream.getTracks().forEach(track => {
            track.stop();
        });
        currentStream = null;
        logMessage('Stopped local media stream');
    }
    
    // Close any Agora tracks
    if (localAudioTrack) {
        await localAudioTrack.close();
        localAudioTrack = null;
    }
    
    if (localVideoTrack) {
        await localVideoTrack.close();
        localVideoTrack = null;
    }
}

/**
 * Toggle microphone on/off
 * @param {HTMLButtonElement} micButton - Button to toggle microphone
 * @param {Function} logMessage - Function to log messages
 */
export async function handleMicToggle(micButton, logMessage) {
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

/**
 * Get the local video track
 * @returns {Object|null} The local video track or null if not created
 */
export function getLocalVideoTrack() {
    return localVideoTrack;
}

/**
 * Get the local audio track
 * @returns {Object|null} The local audio track or null if not created
 */
export function getLocalAudioTrack() {
    return localAudioTrack;
}
