import { 
  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, 
  Matrix, SceneLoader, Ray, MeshBuilder, Color3, StandardMaterial,
  TransformNode, Quaternion
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { AdvancedDynamicTexture, Image, StackPanel, Button, TextBlock } from '@babylonjs/gui';

/**
 * BabylonJS AR Engine
 * Handles 3D rendering for the AR key game
 */
export class AREngine {
  /**
   * Create a new AR engine
   * @param {HTMLVideoElement} videoElement - The host's video element
   * @param {Function} logMessage - Function to log messages
   */
  constructor(videoElement, logMessage, options = {}) {
    this.videoElement = videoElement;
    this.logMessage = logMessage || console.log;
    this.options = Object.assign({
      useDebugKey: false,  // Disable debug key by default
      debugKeyScale: 0.5, // Default scale for debug key
      debugKeyPosition: new Vector3(0, 0, -1.5) // Position in front of camera
    }, options);
    
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'ar-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '1000';
    
    // Append canvas to the document
    document.body.appendChild(this.canvas);
    
    // Initialize BabylonJS with alpha (transparency) enabled
    this.engine = new Engine(this.canvas, true, { alpha: true, premultipliedAlpha: false });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color3(0, 0, 0);
    this.scene.clearColor.a = 0; // Make background fully transparent
    
    // Create camera matching video aspect ratio
    this.setupCamera();
    
    // Add lighting
    this.setupLighting();
    
    // Initialize GUI
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI');
    
    // Key management
    this.keys = [];
    this.currentKeyId = null;
    this.isTargeted = false;
    
    // Assets state
    this.assetsLoaded = false;
    this.keyModelTemplate = null;
    this.debugKey = null;
    
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
    
    this.logMessage('AR Engine initialized');
  }

  /**
   * Setup camera matching video properties
   */
  setupCamera() {
    // Use ArcRotateCamera for now
    this.camera = new ArcRotateCamera(
      'camera', 
      Math.PI / 2, 
      Math.PI / 2, 
      2, 
      Vector3.Zero(), 
      this.scene
    );
    
    // Disable controls as we'll position via ArUco
    this.camera.inputs.clear();
    
    // Match camera to video aspect ratio
    const updateCameraAspect = () => {
      if (this.videoElement && this.videoElement.videoWidth && this.videoElement.videoHeight) {
        const aspectRatio = this.videoElement.videoWidth / this.videoElement.videoHeight;
        this.engine.setHardwareScalingLevel(1.0);
        this.engine.resize();
        this.scene.getEngine().setSize(
          this.videoElement.videoWidth,
          this.videoElement.videoHeight
        );
      }
    };
    
    // Initial setup and check for video ready
    updateCameraAspect();
    this.videoElement.addEventListener('loadedmetadata', updateCameraAspect);
  }

  /**
   * Setup scene lighting
   */
  setupLighting() {
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.7;
  }

  /**
   * Preload assets
   * @returns {Promise} - Resolves when assets are loaded
   */
  /**
   * Initialize the debug key
   */
  initializeDebugKey() {
    if (this.options.useDebugKey && !this.debugKey) {
      this.logMessage('Creating debug key for visibility testing');
      this.debugKey = addDebugKey(this.scene, {
        position: this.options.debugKeyPosition,
        scale: this.options.debugKeyScale
      });
      
      // Make it initially visible
      this.debugKey.show();
      
      // Set up a small animation to make the debug key more noticeable
      this.scene.registerBeforeRender(() => {
        if (this.debugKey && this.debugKey.node) {
          // Make it slowly rotate
          this.debugKey.node.rotation.y += 0.01;
        }
      });
      
      this.logMessage('Debug key created and visible');
    }
  }
  
  /**
   * Preload assets
   * @returns {Promise} - Resolves when assets are loaded
   */
  async loadAssets() {
    try {
      this.logMessage('Loading 3D key model...');
      
      // Try to load model using various paths
      const paths = [
        // Try direct path
        { root: '', filename: '/public/assets/models/key.glb' },
        // Try relative paths
        { root: '/', filename: 'public/assets/models/key.glb' },
        { root: '', filename: 'assets/models/key.glb' },
        { root: '', filename: 'models/key.glb' },
        // Original paths as fallback
        { root: '/assets/models/', filename: 'key.glb' },
        { root: '/public/models/', filename: 'key.glb' },
        { root: '/models/', filename: 'key.glb' }
      ];
      
      // Create a fallback key if model isn't available
      const createFallbackKey = () => {
        this.logMessage('Creating fallback key model - this will be very visible for debugging');
        const keyNode = new TransformNode('key-template', this.scene);
        
        // Create a simple key-like shape - making it MUCH larger for visibility
        const shaft = MeshBuilder.CreateCylinder('shaft', { 
          height: 1.0, 
          diameter: 0.2 
        }, this.scene);
        shaft.parent = keyNode;
        shaft.position.y = -0.5;
        
        const head = MeshBuilder.CreateBox('head', { 
          width: 0.6, 
          height: 0.4, 
          depth: 0.2 
        }, this.scene);
        head.parent = keyNode;
        head.position.y = 0.2;
        
        const teeth1 = MeshBuilder.CreateBox('teeth1', { 
          width: 0.15, 
          height: 0.25, 
          depth: 0.2 
        }, this.scene);
        teeth1.parent = keyNode;
        teeth1.position.set(-0.2, -1.0, 0);
        
        const teeth2 = MeshBuilder.CreateBox('teeth2', { 
          width: 0.15, 
          height: 0.35, 
          depth: 0.2 
        }, this.scene);
        teeth2.parent = keyNode;
        teeth2.position.set(0, -1.0, 0);
        
        // Create a bright material for the key for better visibility
        const keyMaterial = new StandardMaterial('keyMaterial', this.scene);
        keyMaterial.diffuseColor = new Color3(1.0, 0.8, 0.0); // Bright gold color
        keyMaterial.emissiveColor = new Color3(0.4, 0.3, 0.0); // Add some glow
        keyMaterial.specularColor = new Color3(1.0, 1.0, 1.0); // Shiny
        keyMaterial.specularPower = 64;
        
        // Apply material to all parts
        [shaft, head, teeth1, teeth2].forEach(mesh => {
          mesh.material = keyMaterial;
        });
        
        // Scale the key appropriately - make it large for debugging
        keyNode.scaling = new Vector3(0.5, 0.5, 0.5);
        
        this.logMessage('Fallback key created with bright gold material');
        return keyNode;
      };
      
      // Try to load the model from different paths
      for (const path of paths) {
        try {
          const result = await SceneLoader.ImportMeshAsync(
            '', 
            path.root, 
            path.filename, 
            this.scene
          );
          
          if (result && result.meshes && result.meshes.length > 0) {
            this.logMessage(`Loaded key model from ${path.root}${path.filename}`);
            const keyMesh = result.meshes[0];
            keyMesh.setEnabled(false); // Hide template
            
            // Scale if needed
            keyMesh.scaling = new Vector3(0.1, 0.1, 0.1);
            
            this.keyModelTemplate = keyMesh;
            break;
          }
        } catch (error) {
          this.logMessage(`Could not load key from ${path.root}${path.filename}: ${error.message}`);
        }
      }
      
      // If no model was loaded, create fallback
      if (!this.keyModelTemplate) {
        this.keyModelTemplate = createFallbackKey();
        this.keyModelTemplate.setEnabled(false);
      }
      
      // Load textures for UI
      this.pressATexture = new Image('pressA', '/assets/textures/pressA.png');
      this.pressATexture.width = '150px';
      this.pressATexture.height = '100px';
      this.pressATexture.isVisible = false;
      this.guiTexture.addControl(this.pressATexture);
      
      this.assetsLoaded = true;
      this.logMessage('Assets loaded successfully');
      
      return true;
    } catch (error) {
      this.logMessage(`Error loading assets: ${error.message}`);
      return false;
    }
  }

  /**
   * Add a new key with associated marker ID and riddle
   * @param {number} markerId - ArUco marker ID
   * @param {number} riddleId - ID of the riddle for this key
   * @returns {Object} - The created key object
   */
  async addKey(markerId, riddleId) {
    // Make sure assets are loaded
    if (!this.assetsLoaded) {
      await this.loadAssets();
    }
    
    // Clone the key model template
    const keyInstance = this.keyModelTemplate.clone(`key-${markerId}`);
    keyInstance.setEnabled(false); // Initially hidden
    
    // Add text to the key
    const textPlane = MeshBuilder.CreatePlane('textPlane', { 
      width: 0.2, 
      height: 0.1 
    }, this.scene);
    textPlane.parent = keyInstance;
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
    
    // Create prompt for interaction
    const prompt = new Image(`prompt-${markerId}`, '/assets/textures/pressA.png');
    prompt.width = '150px';
    prompt.height = '100px';
    prompt.isVisible = false;
    this.guiTexture.addControl(prompt);
    
    // Store key data
    const key = {
      markerId,
      riddleId,
      mesh: keyInstance,
      prompt,
      collected: false,
      lastSeen: Date.now()
    };
    
    this.keys.push(key);
    return key;
  }

  /**
   * Update AR visualization based on marker detection
   * @param {Array} markers - Detected ArUco markers
   */
  updateWithMarkers(markers) {
    if (!this.assetsLoaded) return;
    
    const now = Date.now();
    
    if (markers && markers.length > 0) {
      this.logMessage(`Detected ${markers.length} markers`);
      
      // Process each detected marker
      markers.forEach(marker => {
        // Find corresponding key for this marker
        const key = this.keys.find(k => k.markerId === marker.id);
        if (!key || key.collected) return;
        
        // Get pose matrix
        const poseMatrix = marker.poseMatrix;
        if (!poseMatrix) return;
        
        // Debug output of marker detection
        this.logMessage(`Marker ID ${marker.id} detected! Rendering key`);
        
        // Show key and update its position
        key.mesh.setEnabled(true);
        
        // Apply pose matrix to position the key
        try {
          // Convert pose matrix to a BabylonJS matrix
          const babylonMatrix = Matrix.FromArray(poseMatrix);
          
          // Enhanced visibility modifications
          // Scale and adjust the key position to be more visible
          const positionScale = 0.01; // Dramatic reduction to bring the model much closer
          const scaleFactor = 5.0;   // Make it much larger for visibility
          
          // Decompose the matrix to get position, rotation, scaling
          const position = new Vector3();
          const rotation = new Quaternion();
          const scaling = new Vector3();
          babylonMatrix.decompose(scaling, rotation, position);
          
          // Adjust position to be closer to camera and scale up the model
          position.scaleInPlace(positionScale);
          position.z = -1.0; // Fixed distance in front of camera
          
          // Rebuild the matrix with modified values
          Matrix.ComposeToRef(scaling.scale(scaleFactor), rotation, position, babylonMatrix);
          
          // Apply the final matrix to the mesh
          key.mesh.setPreTransformMatrix(babylonMatrix);
          
          // Override rotation to keep key upright
          key.mesh.rotation = new Vector3(0, 0, 0);
        } catch (err) {
          this.logMessage(`Error positioning key: ${err.message}`);
        }
        
        key.lastSeen = now;
        
        // Check if key is targeted
        this.checkKeyTargeting(key);
      });
      
      // Hide keys for markers that are no longer visible
      this.keys.forEach(key => {
        const markerVisible = markers.some(m => m.id === key.markerId);
        const timeSinceLastSeen = now - key.lastSeen;
        
        if ((!markerVisible || timeSinceLastSeen > 500) && !key.collected) {
          key.mesh.setEnabled(false);
          key.prompt.isVisible = false;
          
          if (this.currentKeyId === key.markerId) {
            this.currentKeyId = null;
            this.isTargeted = false;
          }
        }
      });
    } else {
      // No markers detected - hide all keys
      this.keys.forEach(key => {
        if (!key.collected) {
          key.mesh.setEnabled(false);
          key.prompt.isVisible = false;
        }
      });
    }
  }

  /**
   * Check if a key is being targeted by the user
   * @param {Object} key - Key object to check
   */
  checkKeyTargeting(key) {
    try {
      // Make sure the mesh is enabled and visible
      if (!key.mesh || !key.mesh.isEnabled()) {
        return;
      }
      
      // Simple distance-based targeting instead of ray intersection
      // Calculate distance between camera and key
      const cameraPosition = this.camera.position;
      const keyPosition = key.mesh.position;
      
      // Get distance between camera and key
      const distance = Vector3.Distance(cameraPosition, keyPosition);
      
      // Consider it targeted if within range
      const isTargeted = distance < 2.0; // Target within 2 meters
      
      // Update prompt visibility
      key.prompt.isVisible = isTargeted;
      if (isTargeted) {
        key.prompt.linkWithMesh(key.mesh);
        this.currentKeyId = key.markerId;
        this.isTargeted = true;
        this.logMessage(`Key ${key.markerId} is targeted at distance ${distance.toFixed(2)}m`);
      } else if (this.currentKeyId === key.markerId) {
        this.isTargeted = false;
      }
    } catch (error) {
      // Silently handle any errors during targeting check
      this.isTargeted = false;
    }
  }

  /**
   * Open riddle panel when key is interacted with
   * @param {number} keyId - Marker ID of the key
   * @param {Object} riddleData - Riddle object with text and answers
   */
  openRiddle(keyId, riddleData) {
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
    riddleText.text = riddleData ? riddleData.text : "Default riddle question";
    riddleText.height = '80px';
    riddleText.color = 'white';
    riddleText.fontSize = 18;
    panel.addControl(riddleText);
    
    // Add answer buttons
    const answers = riddleData ? riddleData.answers : [
      { text: "Default answer", correct: true }
    ];
    
    answers.forEach((answer, index) => {
      const button = Button.CreateSimpleButton(`answer-${index}`, answer.text);
      button.width = '350px';
      button.height = '40px';
      button.color = 'white';
      button.background = '#333';
      button.onPointerUpObservable.add(() => {
        if (answer.correct) {
          this.collectKey(key);
        } else {
          // Wrong answer feedback
          button.background = '#800000';
          setTimeout(() => {
            button.background = '#333';
          }, 500);
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

  /**
   * Collect a key when riddle is solved
   * @param {Object} key - Key object to collect
   */
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
    
    // Call collection callback if defined
    if (typeof this.onKeyCollected === 'function') {
      this.onKeyCollected(key);
    }
  }

  /**
   * Setup keyboard event listeners
   * @param {Function} riddleProvider - Function that returns riddle data for a key
   */
  setupEventListeners(riddleProvider) {
    this.riddleProvider = riddleProvider;
    
    window.addEventListener('keydown', e => {
      // 'A' key to interact with targeted key
      if (e.code === 'KeyA' && this.isTargeted) {
        const riddleData = this.riddleProvider ? 
          this.riddleProvider(this.currentKeyId) : null;
        
        this.openRiddle(this.currentKeyId, riddleData);
      }
      
      // 'Escape' key to close riddle panel
      if (e.code === 'Escape') {
        // Logic to close any open panels
        const panels = this.guiTexture.getControlsByType('StackPanel');
        panels.forEach(panel => {
          this.guiTexture.removeControl(panel);
        });
      }
    });
  }

  /**
   * Set callback for when a key is collected
   * @param {Function} callback - Callback function
   */
  setOnKeyCollected(callback) {
    this.onKeyCollected = callback;
  }

  /**
   * Get the canvas stream for video output
   * @param {number} fps - Frames per second for the stream
   * @returns {MediaStream} - Canvas media stream
   */
  getCanvasStream(fps = 30) {
    return this.canvas.captureStream(fps);
  }

  /**
   * Clean up resources
   */
  dispose() {
    window.removeEventListener('resize', this.engine.resize);
    this.engine.dispose();
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
