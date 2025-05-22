import { 
  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, 
  Matrix, SceneLoader, Ray, MeshBuilder, Color3, StandardMaterial,
  TransformNode, Quaternion
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { AdvancedDynamicTexture, Image, StackPanel, Button, TextBlock } from '@babylonjs/gui';

/**
 * BabylonJS AR Engine for Viewers
 * Handles 3D rendering for viewers to see the AR key game when markers are detected in the host's stream
 */
export class ARViewerEngine {
  /**
   * Create a new AR engine for viewers
   * @param {HTMLVideoElement} hostVideoElement - The host's video element as seen by the viewer
   * @param {Function} logMessage - Function to log messages
   */
  constructor(hostVideoElement, logMessage, options = {}) {
    this.hostVideoElement = hostVideoElement;
    this.logMessage = logMessage || console.log;
    this.options = Object.assign({
      keyScale: 5.0,
    }, options);
    
    this.canvas = document.createElement('canvas');
    this.canvas.id = `ar-viewer-canvas-${hostVideoElement.id}`;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '10'; // Set z-index higher than video but not too high
    this.canvas.style.backgroundColor = 'transparent'; // Ensure transparent background
    this.canvas.style.mixBlendMode = 'normal'; // Use normal blend mode to preserve transparency
    
    // Find the correct container - look at the parent element structure
    let container = hostVideoElement.parentElement;
    // Make sure the container has position relative for absolute positioning to work
    if (container) {
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      container.appendChild(this.canvas);
      this.logMessage('Added AR canvas to host video container');
    } else {
      // Fallback to direct body append
      document.body.appendChild(this.canvas);
      this.logMessage('Warning: Could not find proper container, added AR canvas to document body');
    }
    
    // Initialize BabylonJS with alpha (transparency) enabled
    this.engine = new Engine(this.canvas, true, { 
      alpha: true, 
      premultipliedAlpha: false,
      antialias: true,
      preserveDrawingBuffer: false,
      stencil: true
    });
    
    // Set up scene with transparent background
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color3(0, 0, 0);
    this.scene.clearColor.a = 0; // Make background fully transparent
    this.scene.autoClear = false; // Only clear depth buffer not color buffer
    this.scene.autoClearDepthAndStencil = true; // Clear depth and stencil
    
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
    
    // Start render loop
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
    
    this.logMessage('AR Viewer Engine initialized');
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
    if (this.hostVideoElement && this.hostVideoElement.videoWidth && this.hostVideoElement.videoHeight) {
      const aspectRatio = this.hostVideoElement.videoWidth / this.hostVideoElement.videoHeight;
      this.engine.setHardwareScalingLevel(1.0);
      this.engine.resize();
      this.scene.getEngine().setSize(
        this.hostVideoElement.videoWidth,
        this.hostVideoElement.videoHeight
      );
    }
    
    // Check for video ready
    this.hostVideoElement.addEventListener('loadedmetadata', () => {
      if (this.hostVideoElement.videoWidth && this.hostVideoElement.videoHeight) {
        const aspectRatio = this.hostVideoElement.videoWidth / this.hostVideoElement.videoHeight;
        this.engine.setHardwareScalingLevel(1.0);
        this.engine.resize();
        this.scene.getEngine().setSize(
          this.hostVideoElement.videoWidth,
          this.hostVideoElement.videoHeight
        );
      }
    });
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
  async loadAssets() {
    try {
      this.logMessage('Loading 3D key model for viewer...');
      
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
        this.logMessage('Creating fallback key model for viewer');
        const keyNode = new TransformNode('key-template', this.scene);
        
        // Create a simple key-like shape
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
        
        // Create a bright material for the key
        const keyMaterial = new StandardMaterial('keyMaterial', this.scene);
        keyMaterial.diffuseColor = new Color3(1.0, 0.8, 0.0); // Bright gold color
        keyMaterial.emissiveColor = new Color3(0.4, 0.3, 0.0); // Add some glow
        keyMaterial.specularColor = new Color3(1.0, 1.0, 1.0); // Shiny
        keyMaterial.specularPower = 64;
        
        // Apply material to all parts
        [shaft, head, teeth1, teeth2].forEach(mesh => {
          mesh.material = keyMaterial;
        });
        
        // Scale the key appropriately
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
      
      this.assetsLoaded = true;
      this.logMessage('Assets loaded successfully for viewer');
      
      return true;
    } catch (error) {
      this.logMessage(`Error loading assets for viewer: ${error.message}`);
      return false;
    }
  }

  /**
   * Add a new key with associated marker ID
   * @param {number} markerId - ArUco marker ID
   * @returns {Object} - The created key object
   */
  async addKey(markerId) {
    // Make sure assets are loaded
    if (!this.assetsLoaded) {
      await this.loadAssets();
    }
    
    // Clone the key model template
    const keyInstance = this.keyModelTemplate.clone(`viewer-key-${markerId}`);
    keyInstance.setEnabled(false); // Initially hidden
    
    // Store key data
    const key = {
      markerId,
      mesh: keyInstance,
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
      // Process each detected marker
      markers.forEach(marker => {
        // Find corresponding key for this marker
        let key = this.keys.find(k => k.markerId === marker.id);
        
        // If no key exists for this marker ID, create one
        if (!key) {
          this.addKey(marker.id).then(newKey => {
            key = newKey;
          });
          return;
        }
        
        // Get pose matrix
        const poseMatrix = marker.poseMatrix;
        if (!poseMatrix) return;
        
        // Show key and update its position
        key.mesh.setEnabled(true);
        
        // Apply pose matrix to position the key
        try {
          // Convert pose matrix to a BabylonJS matrix
          const babylonMatrix = Matrix.FromArray(poseMatrix);
          
          // Enhanced visibility modifications
          // Scale and adjust the key position to be more visible
          const positionScale = 0.01; // Dramatic reduction to bring the model much closer
          const scaleFactor = this.options.keyScale; // Make it larger for visibility
          
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
          this.logMessage(`Error positioning viewer key: ${err.message}`);
        }
        
        key.lastSeen = now;
      });
      
      // Hide keys for markers that are no longer visible
      this.keys.forEach(key => {
        const markerVisible = markers.some(m => m.id === key.markerId);
        const timeSinceLastSeen = now - key.lastSeen;
        
        if (!markerVisible || timeSinceLastSeen > 500) {
          key.mesh.setEnabled(false);
        }
      });
    } else {
      // No markers detected - hide all keys
      this.keys.forEach(key => {
        key.mesh.setEnabled(false);
      });
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.engine) {
      this.engine.stopRenderLoop();
    }
    
    if (this.scene) {
      this.scene.dispose();
    }
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    // Remove resize listener
    window.removeEventListener('resize', this.resizeHandler);
    
    this.logMessage('AR Viewer Engine disposed');
  }
}
