# BabylonJS AR Key Game Implementation Guide

## Overview

This guide outlines how to integrate BabylonJS AR functionality with your existing Agora video streaming application to create an interactive AR key game where:

1. The host shows an ArUco marker to the camera
2. A 3D key with text "Solve my riddle on it" appears in AR
3. The host can interact with the key by approaching it
4. Viewers watch the stream with the AR overlay but don't interact directly

## Implementation Steps

### 1. Install Required Packages

```bash
npm install @babylonjs/core @babylonjs/gui @babylonjs/loaders js-aruco
```

### 2. Project Structure

Create these new files:

```
/src
  /components
    /ar
      arEngine.js       # BabylonJS and AR setup
      keyManager.js     # Key/riddle management 
      arucoDetector.js  # ArUco marker detection
  /assets
    /models
      key.glb           # 3D key model
    /textures
      pressA.png        # Interaction prompt
  /data
    riddles.json        # Riddle content
```

### 3. Implementation Plan

#### Step 1: Set up ArUco detection

Create `src/components/ar/arucoDetector.js`:
```javascript
import AR from 'js-aruco';

export class ArucoDetector {
  constructor() {
    this.detector = new AR.Detector();
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.markerSize = 0.05; // 5cm marker size
  }

  // Process video frame and detect markers
  detectMarkers(videoElement) {
    if (!videoElement || videoElement.readyState !== 4) return [];
    
    // Set canvas dimensions to match video
    this.canvas.width = videoElement.videoWidth;
    this.canvas.height = videoElement.videoHeight;
    
    // Draw video frame to canvas
    this.context.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);
    
    // Get image data and detect markers
    const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const markers = this.detector.detect(imageData);
    
    return markers;
  }

  // Calculate 3D pose from marker corners
  calculatePose(marker, camera) {
    // Create a pose estimator
    const posit = new AR.Posit(this.markerSize, camera.focalLength);
    
    // Get marker corners
    const corners = marker.corners.map(corner => ({
      x: corner.x - (this.canvas.width / 2),
      y: (this.canvas.height / 2) - corner.y
    }));
    
    // Estimate pose
    const pose = posit.pose(corners);
    
    // Convert to 4x4 matrix for BabylonJS
    return this.createTransformMatrix(pose.bestRotation, pose.bestTranslation);
  }

  // Create transformation matrix from rotation and translation
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
    
    // Translation part (vector)
    matrix[12] = translation[0];
    matrix[13] = translation[1];
    matrix[14] = translation[2];
    matrix[15] = 1;
    
    return matrix;
  }
}
```

#### Step 2: Create BabylonJS AR Engine

Create `src/components/ar/arEngine.js`:
```javascript
import { 
  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, 
  Matrix, SceneLoader, Ray, MeshBuilder, Color3, StandardMaterial
} from '@babylonjs/core';
import { AdvancedDynamicTexture, Image, StackPanel, Button, TextBlock } from '@babylonjs/gui';
import { ArucoDetector } from './arucoDetector';

export class AREngine {
  constructor(videoElement) {
    this.videoElement = videoElement;
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    document.body.appendChild(this.canvas);
    
    // Initialize BabylonJS
    this.engine = new Engine(this.canvas, true);
    this.scene = new Scene(this.engine);
    
    // Create camera
    this.camera = new ArcRotateCamera('camera', 0, 0, 10, new Vector3(0, 0, 0), this.scene);
    this.camera.setPosition(new Vector3(0, 0, -0.5));
    this.camera.attachControl(this.canvas, true);
    
    // Add lighting
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.7;
    
    // Initialize AR detector
    this.arucoDetector = new ArucoDetector();
    
    // Initialize GUI
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI');
    
    // Key management
    this.keys = [];
    this.currentKeyId = null;
    this.isTargeted = false;
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Start render loop
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  // Load 3D key model
  async loadKeyModel() {
    const result = await SceneLoader.ImportMeshAsync('', '/assets/models/', 'key.glb', this.scene);
    const keyMesh = result.meshes[0];
    keyMesh.scaling = new Vector3(0.1, 0.1, 0.1); // Scale down the key
    keyMesh.setEnabled(false); // Hide initially
    
    // Add text to the key
    const textPlane = MeshBuilder.CreatePlane('textPlane', { width: 0.2, height: 0.1 }, this.scene);
    textPlane.parent = keyMesh;
    textPlane.position.y = 0.15;
    
    const textMaterial = new StandardMaterial('textMaterial', this.scene);
    textMaterial.diffuseColor = Color3.Black();
    textPlane.material = textMaterial;
    
    const textTexture = AdvancedDynamicTexture.CreateForMesh(textPlane);
    const text = new TextBlock();
    text.text = 'Solve my riddle';
    text.color = 'white';
    text.fontSize = 24;
    textTexture.addControl(text);
    
    return keyMesh;
  }

  // Add a new key with associated marker ID and riddle
  async addKey(markerId, riddleId) {
    const keyMesh = await this.loadKeyModel();
    keyMesh.id = `key-${markerId}`;
    
    // Create prompt for interaction
    const prompt = new Image('pressA', '/assets/textures/pressA.png');
    prompt.width = '150px';
    prompt.height = '100px';
    prompt.isVisible = false;
    this.guiTexture.addControl(prompt);
    
    this.keys.push({
      markerId,
      mesh: keyMesh,
      riddleId,
      prompt,
      collected: false
    });
  }

  // Process video frame and update AR elements
  update() {
    // Detect markers in the current video frame
    const markers = this.arucoDetector.detectMarkers(this.videoElement);
    
    // Process each detected marker
    markers.forEach(marker => {
      // Find corresponding key for this marker
      const key = this.keys.find(k => k.markerId === marker.id);
      if (!key || key.collected) return;
      
      // Calculate pose and update key position
      const pose = this.arucoDetector.calculatePose(marker, this.camera);
      key.mesh.setEnabled(true);
      key.mesh.setPreTransformMatrix(Matrix.FromArray(Array.from(pose)));
      
      // Check if key is targeted
      this.checkKeyTargeting(key);
    });
    
    // Hide keys for markers that are no longer visible
    this.keys.forEach(key => {
      const markerVisible = markers.some(m => m.id === key.markerId);
      if (!markerVisible && !key.collected) {
        key.mesh.setEnabled(false);
        key.prompt.isVisible = false;
      }
    });
    
    // Request next animation frame
    requestAnimationFrame(() => this.update());
  }

  // Check if a key is being targeted by the user
  checkKeyTargeting(key) {
    // Create ray from center of screen
    const ray = this.scene.createPickingRay(
      this.canvas.width / 2,
      this.canvas.height / 2,
      Matrix.Identity(),
      this.camera
    );
    
    // Check for intersection with key mesh
    const hit = ray.intersectsMesh(key.mesh);
    const isTargeted = hit.hit && hit.distance < 0.6; // Target within 60cm
    
    // Update prompt visibility
    key.prompt.isVisible = isTargeted;
    if (isTargeted) {
      key.prompt.linkWithMesh(key.mesh);
      this.currentKeyId = key.markerId;
      this.isTargeted = true;
    } else if (this.currentKeyId === key.markerId) {
      this.isTargeted = false;
    }
  }

  // Open riddle panel when key is interacted with
  openRiddle(keyId) {
    const key = this.keys.find(k => k.markerId === keyId);
    if (!key) return;
    
    // Create riddle panel
    const panel = new StackPanel();
    panel.width = '400px';
    panel.height = '300px';
    panel.background = 'black';
    panel.alpha = 0.8;
    this.guiTexture.addControl(panel);
    
    // Add title
    const title = new TextBlock();
    title.text = 'Solve the Riddle';
    title.height = '40px';
    title.color = 'white';
    title.fontSize = 24;
    panel.addControl(title);
    
    // Add riddle text
    const riddleText = new TextBlock();
    riddleText.text = this.getRiddleText(key.riddleId);
    riddleText.height = '80px';
    riddleText.color = 'white';
    riddleText.fontSize = 18;
    panel.addControl(riddleText);
    
    // Add answer buttons
    const answers = this.getRiddleAnswers(key.riddleId);
    answers.forEach((answer, index) => {
      const button = Button.CreateSimpleButton(`answer-${index}`, answer.text);
      button.width = '350px';
      button.height = '40px';
      button.color = 'white';
      button.background = '#333';
      button.onPointerUpObservable.add(() => {
        if (answer.correct) {
          this.collectKey(key);
        }
        this.guiTexture.removeControl(panel);
      });
      panel.addControl(button);
    });
    
    // Add close button
    const closeButton = Button.CreateSimpleButton('close', 'Close');
    closeButton.width = '100px';
    closeButton.height = '40px';
    closeButton.color = 'white';
    closeButton.background = '#555';
    closeButton.onPointerUpObservable.add(() => {
      this.guiTexture.removeControl(panel);
    });
    panel.addControl(closeButton);
  }

  // Get riddle text from riddleId
  getRiddleText(riddleId) {
    // This would be fetched from riddles.json
    return "What has keys but can't open locks?";
  }

  // Get riddle answers from riddleId
  getRiddleAnswers(riddleId) {
    // This would be fetched from riddles.json
    return [
      { text: "A piano", correct: true },
      { text: "A computer", correct: false },
      { text: "A treasure chest", correct: false }
    ];
  }

  // Collect a key when riddle is solved
  collectKey(key) {
    key.collected = true;
    key.mesh.setEnabled(false);
    key.prompt.isVisible = false;
    
    // Show collection animation/notification
    const notification = new TextBlock();
    notification.text = 'Key Collected!';
    notification.color = 'white';
    notification.fontSize = 36;
    notification.outlineWidth = 2;
    notification.outlineColor = 'black';
    this.guiTexture.addControl(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      this.guiTexture.removeControl(notification);
    }, 3000);
  }

  // Setup keyboard event listeners
  setupEventListeners() {
    window.addEventListener('keydown', e => {
      // 'A' key to interact with targeted key
      if (e.code === 'KeyA' && this.isTargeted) {
        this.openRiddle(this.currentKeyId);
      }
      
      // 'Escape' key to close riddle panel
      if (e.code === 'Escape') {
        // Logic to close any open panels
      }
    });
  }

  // Get the canvas stream for video output
  getCanvasStream() {
    return this.canvas.captureStream(30);
  }

  // Start the AR experience
  start() {
    this.update();
  }

  // Clean up resources
  dispose() {
    this.engine.dispose();
    document.body.removeChild(this.canvas);
  }
}
```

#### Step 3: Create Key Manager

Create `src/components/ar/keyManager.js`:
```javascript
export class KeyManager {
  constructor() {
    this.keys = [];
    this.collectedKeys = [];
  }

  // Load riddles from JSON file
  async loadRiddles() {
    try {
      const response = await fetch('/data/riddles.json');
      this.riddles = await response.json();
      return this.riddles;
    } catch (error) {
      console.error('Error loading riddles:', error);
      return [];
    }
  }

  // Get riddle by ID
  getRiddle(riddleId) {
    return this.riddles.find(riddle => riddle.id === riddleId);
  }

  // Add a key with associated marker and riddle
  addKey(markerId, riddleId) {
    this.keys.push({
      markerId,
      riddleId,
      collected: false
    });
  }

  // Mark key as collected
  collectKey(markerId) {
    const key = this.keys.find(k => k.markerId === markerId);
    if (key) {
      key.collected = true;
      key.collectedAt = new Date();
      this.collectedKeys.push(key);
    }
  }

  // Check if all keys have been collected
  allKeysCollected() {
    return this.keys.length > 0 && this.keys.every(key => key.collected);
  }
}
```

#### Step 4: Create Riddles Data

Create `src/data/riddles.json`:
```json
[
  {
    "id": 1,
    "text": "What has keys but can't open locks?",
    "answers": [
      { "text": "A piano", "correct": true },
      { "text": "A computer", "correct": false },
      { "text": "A treasure chest", "correct": false }
    ]
  },
  {
    "id": 2,
    "text": "I'm light as a feather, but the strongest person can't hold me for more than a few minutes. What am I?",
    "answers": [
      { "text": "Breath", "correct": true },
      { "text": "A thought", "correct": false },
      { "text": "A feather", "correct": false }
    ]
  },
  {
    "id": 3,
    "text": "What goes up but never comes down?",
    "answers": [
      { "text": "Age", "correct": true },
      { "text": "A balloon", "correct": false },
      { "text": "Temperature", "correct": false }
    ]
  }
]
```

### 4. Integration with Existing Agora Streaming

Update `src/main.js` to integrate the AR functionality:

1. Import the AR components at the top of the file
2. Initialize AR when the host joins a channel
3. Connect the AR canvas stream to the video stream

Here's a simplified example of the key changes:

```javascript
// Import AR components
import { AREngine } from './components/ar/arEngine.js';
import { KeyManager } from './components/ar/keyManager.js';

// Add these as global variables
let arEngine = null;
let keyManager = null;

// In the joinAndPublish function, after successfully joining the channel:
async function initializeARGame() {
  // Create key manager and load riddles
  keyManager = new KeyManager();
  await keyManager.loadRiddles();
  
  // Add keys with marker IDs and riddle IDs
  keyManager.addKey(0, 1); // Marker ID 0, Riddle ID 1
  keyManager.addKey(63, 2); // Marker ID 63, Riddle ID 2
  keyManager.addKey(91, 3); // Marker ID 91, Riddle ID 3
  
  // Initialize AR engine with local video element
  arEngine = new AREngine(localVideo);
  
  // Load key models
  for (const key of keyManager.keys) {
    await arEngine.addKey(key.markerId, key.riddleId);
  }
  
  // Start AR processing
  arEngine.start();
  
  // Use the AR canvas stream instead of the direct camera stream
  const arStream = arEngine.getCanvasStream();
  
  // Replace the track being published to Agora with the AR stream
  await rtcClient.unpublish([localVideoTrack]);
  localVideoTrack.close();
  
  // Create a new track from the AR canvas stream
  const arVideoTrack = AgoraRTC.createCustomVideoTrack({
    mediaStreamTrack: arStream.getVideoTracks()[0]
  });
  
  // Publish the AR video track
  await rtcClient.publish([arVideoTrack, localAudioTrack]);
  localVideoTrack = arVideoTrack;
}

// Call this after successfully joining the channel
// Add this to the joinAndPublish function
if (userRole === 'host') {
  initializeARGame().catch(console.error);
}

// In the leaveChannel function, clean up AR resources
if (arEngine) {
  arEngine.dispose();
  arEngine = null;
}
```

### 5. Testing the AR Key Game

1. Print ArUco markers with IDs 0, 63, and 91 (you can generate these online)
2. Start your application and join as a host
3. Show the markers to the camera
4. Interact with the 3D keys that appear by pressing 'A' when targeting them
5. Solve the riddles to collect the keys

## Optimization Tips

1. Ensure your lighting is good for reliable marker detection
2. Consider using WebWorkers for marker detection to avoid frame drops
3. For better performance, reduce the video resolution when processing frames for marker detection
4. Pre-load 3D models and textures to avoid delays during gameplay
5. Add visual feedback for viewers about which keys have been collected

## Future Enhancements

1. Add sound effects when interacting with keys
2. Create a timer or competitive element
3. Allow viewers to vote on which riddle to solve next
4. Implement different 3D models for different keys
5. Add particle effects when collecting keys

This implementation fully integrates with your existing Agora streaming setup while adding an interactive AR layer that only the host directly interacts with, but all viewers can see.
