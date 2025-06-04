import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * ThreeJS AR Engine for Viewers
 * Handles 3D rendering for viewers to see the AR key game when markers are detected in the host's stream
 */
export class ThreeViewerEngine {
  /**
   * Create a new AR engine for viewers using ThreeJS
   * @param {HTMLVideoElement} hostVideoElement - The host's video element as seen by the viewer
   * @param {Function} logMessage - Function to log messages
   */
  constructor(hostVideoElement, logMessage, options = {}) {
    this.hostVideoElement = hostVideoElement;
    this.logMessage = logMessage || console.log;
    this.options = Object.assign({
      keyScale: 0.5,
    }, options);
    
    // Setup canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = `ar-viewer-canvas-${hostVideoElement.id}`;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '10';
    this.canvas.style.backgroundColor = 'transparent';
    this.canvas.style.mixBlendMode = 'normal';
    
    // Find container and add canvas
    let container = hostVideoElement.parentElement;
    if (container) {
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      container.appendChild(this.canvas);
      this.logMessage('Added AR canvas to host video container');
    } else {
      document.body.appendChild(this.canvas);
      this.logMessage('Warning: Could not find proper container, added AR canvas to document body');
    }
    
    // Initialize ThreeJS
    this.initThreeJS();
    
    // Assets state
    this.assetsLoaded = false;
    this.keyModelTemplate = null;
    this.keys = [];
    
    // Handle window resize
    this.resizeHandler = this.onResize.bind(this);
    window.addEventListener('resize', this.resizeHandler);
    
    this.logMessage('ThreeJS AR Viewer Engine initialized');
  }
  
  /**
   * Initialize ThreeJS renderer, scene, and camera
   */
  initThreeJS() {
    // Create renderer with transparency
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      premultipliedAlpha: false,
      antialias: true
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setClearColor(0x000000, 0); // Transparent background
    
    // Create scene
    this.scene = new THREE.Scene();
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75, // Field of view
      this.canvas.clientWidth / this.canvas.clientHeight, // Aspect ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );
    this.camera.position.z = 5;
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 1);
    this.scene.add(directionalLight);
    
    // Start animation loop
    this.startRenderLoop();
  }
  
  /**
   * Start the render loop
   */
  startRenderLoop() {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      
      // Render the scene
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    
    animate();
  }
  
  /**
   * Handle window resize
   */
  onResize() {
    if (this.canvas && this.renderer && this.camera) {
      // Get the current size of the container
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      
      // Update camera aspect ratio
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      
      // Update renderer size
      this.renderer.setSize(width, height, false);
    }
  }
  
  /**
   * Load 3D assets
   * @returns {Promise} - Resolves when assets are loaded
   */
  async loadAssets() {
    try {
      this.logMessage('Loading 3D key model for ThreeJS viewer...');
      
      // Try to load model using various paths
      const paths = [
        // Try direct path
        '/public/assets/models/key.glb',
        // Try relative paths
        '/assets/models/key.glb',
        'assets/models/key.glb',
        'models/key.glb',
        // Original paths as fallback
        '/public/models/key.glb',
        '/models/key.glb'
      ];
      
      // Create a fallback key if model isn't available
      const createFallbackKey = () => {
        this.logMessage('Creating fallback key model for viewer');
        const keyGroup = new THREE.Group();
        
        // Create a simple key-like shape
        const shaftGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.0, 16);
        const shaft = new THREE.Mesh(shaftGeometry, this.createGoldMaterial());
        shaft.position.y = -0.5;
        keyGroup.add(shaft);
        
        const headGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.2);
        const head = new THREE.Mesh(headGeometry, this.createGoldMaterial());
        head.position.y = 0.2;
        keyGroup.add(head);
        
        const teeth1Geometry = new THREE.BoxGeometry(0.15, 0.25, 0.2);
        const teeth1 = new THREE.Mesh(teeth1Geometry, this.createGoldMaterial());
        teeth1.position.set(-0.2, -1.0, 0);
        keyGroup.add(teeth1);
        
        const teeth2Geometry = new THREE.BoxGeometry(0.15, 0.35, 0.2);
        const teeth2 = new THREE.Mesh(teeth2Geometry, this.createGoldMaterial());
        teeth2.position.set(0, -1.0, 0);
        keyGroup.add(teeth2);
        
        // Scale the key appropriately
        keyGroup.scale.set(0.5, 0.5, 0.5);
        
        this.logMessage('Fallback key created with bright gold material');
        return keyGroup;
      };
      
      // Create gold material for fallback key
      this.createGoldMaterial = () => {
        return new THREE.MeshStandardMaterial({
          color: 0xffd700,
          metalness: 0.8,
          roughness: 0.2,
          emissive: 0x664800,
          emissiveIntensity: 0.2
        });
      };
      
      // Try to load the model from different paths
      const loader = new GLTFLoader();
      let modelLoaded = false;
      
      for (const path of paths) {
        try {
          const result = await new Promise((resolve, reject) => {
            loader.load(
              path,
              (gltf) => resolve(gltf),
              undefined,
              (error) => reject(error)
            );
          });
          
          if (result && result.scene) {
            this.logMessage(`Loaded key model from ${path}`);
            
            // Clone the model to use as template
            this.keyModelTemplate = result.scene.clone();
            
            // Hide the template
            this.keyModelTemplate.visible = false;
            
            // Scale if needed
            this.keyModelTemplate.scale.set(0.1, 0.1, 0.1);
            
            // Add to scene but keep hidden
            this.scene.add(this.keyModelTemplate);
            
            modelLoaded = true;
            break;
          }
        } catch (error) {
          this.logMessage(`Could not load key from ${path}: ${error.message}`);
        }
      }
      
      // If no model was loaded, create fallback
      if (!modelLoaded) {
        this.keyModelTemplate = createFallbackKey();
        this.keyModelTemplate.visible = false;
        this.scene.add(this.keyModelTemplate);
      }
      
      this.assetsLoaded = true;
      this.logMessage('ThreeJS assets loaded successfully for viewer');
      
      return true;
    } catch (error) {
      this.logMessage(`Error loading ThreeJS assets for viewer: ${error.message}`);
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
    const keyInstance = this.keyModelTemplate.clone();
    keyInstance.visible = false; // Initially hidden
    keyInstance.name = `viewer-key-${markerId}`;
    
    // Add to the scene
    this.scene.add(keyInstance);
    
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
   * Calculate distance-based scale factor for the key
   * @param {Object} marker - Detected marker with bounds and pose
   * @returns {number} - Distance-based scale factor
   */
  calculateDistanceScale(marker) {
    let distanceScale = 1.0;
    
    // Method 1: Use pose translation Z if available (most accurate)
    if (marker.pose && marker.pose.bestTranslation && marker.pose.bestTranslation[2]) {
      const zDistance = Math.abs(marker.pose.bestTranslation[2]);
      // Scale inversely with distance - closer markers get bigger keys
      // Normalize distance to a reasonable scale (assuming 50-500mm typical range)
      const normalizedDistance = Math.max(50, Math.min(500, zDistance));
      distanceScale = 500 / normalizedDistance; // Inverse relationship
      
      this.logMessage(`Marker ${marker.id} Z-distance: ${zDistance.toFixed(2)}mm, scale: ${distanceScale.toFixed(2)}`);
    } 
    // Method 2: Use marker apparent size as distance proxy (fallback)
    else if (marker.bounds) {
      // Smaller apparent marker size = further away
      const markerArea = marker.bounds.width * marker.bounds.height;
      const videoArea = (this.hostVideoElement.videoWidth || 640) * (this.hostVideoElement.videoHeight || 480);
      const relativeSize = markerArea / videoArea;
      
      // Scale based on relative marker size
      // Typical marker might be 1-10% of screen area
      const minRelativeSize = 0.001; // Very far
      const maxRelativeSize = 0.1;   // Very close
      const clampedSize = Math.max(minRelativeSize, Math.min(maxRelativeSize, relativeSize));
      
      // Logarithmic scaling for natural distance perception
      distanceScale = Math.pow(clampedSize / minRelativeSize, 0.3);
      
      this.logMessage(`Marker ${marker.id} relative size: ${(relativeSize * 100).toFixed(2)}%, scale: ${distanceScale.toFixed(2)}`);
    }
    
    // Clamp scale to reasonable bounds
    return Math.max(0.2, Math.min(3.0, distanceScale));
  }

  /**
   * Calculate the scale and position to fit the key within marker bounds
   * @param {Object} marker - Detected marker with corners and bounds
   * @returns {Object} - Scale and position adjustments
   */
  calculateMarkerConstraints(marker) {
    if (!marker.corners || marker.corners.length < 4) {
      return { scale: 1, position: { x: 0, y: 0, z: 0 }, distanceScale: 1 };
    }

    // Calculate marker dimensions in 2D space
    const corners = marker.corners;
    const bounds = marker.bounds || this.calculateBounds(corners);
    
    // Use marker size to determine appropriate scale
    // Assuming marker is roughly square, use the smaller dimension
    const markerSize = Math.min(bounds.width, bounds.height);
    
    // Scale factor to keep key within marker bounds (with some padding)
    const maxKeySize = markerSize * 0.3; // 30% of marker size
    const keyScale = maxKeySize / 50; // Divide by 50 to get the right scale
    
    // Calculate distance-based scale
    const distanceScale = this.calculateDistanceScale(marker);
    
    return {
      scale: Math.max(keyScale, 0.1), // Minimum scale to ensure visibility
      distanceScale: distanceScale,
      bounds: bounds
    };
  }

  /**
   * Calculate bounds from corners if not provided
   */
  calculateBounds(corners) {
    const xs = corners.map(c => c.x);
    const ys = corners.map(c => c.y);
    
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys)
    };
  }

  /**
   * Convert 2D marker coordinates to 3D position using perspective transformation
   * @param {Object} marker - Detected marker
   * @param {number} depth - Z-depth for the 3D position
   * @returns {Object} - 3D position
   */
  markerTo3DPosition(marker, depth = -1.0) {
    if (!marker.center) {
      return { x: 0, y: 0, z: depth };
    }

    // Convert from screen coordinates to normalized device coordinates
    // Assuming the video feed matches the screen coordinate system
    const videoWidth = this.hostVideoElement.videoWidth || 640;
    const videoHeight = this.hostVideoElement.videoHeight || 480;
    
    // Normalize coordinates to [-1, 1] range
    const normalizedX = (marker.center.x / videoWidth) * 2 - 1;
    const normalizedY = -((marker.center.y / videoHeight) * 2 - 1); // Flip Y axis
    
    // Convert to world coordinates based on camera position and field of view
    const aspectRatio = videoWidth / videoHeight;
    const fov = this.camera.fov * Math.PI / 180; // Convert to radians
    const distance = Math.abs(depth);
    
    const worldY = Math.tan(fov / 2) * distance * normalizedY;
    const worldX = worldY * aspectRatio * normalizedX;
    
    return { x: worldX, y: worldY, z: depth };
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
        
        // Show key
        key.mesh.visible = true;
        
        try {
          // Calculate constraints based on marker corners
          const constraints = this.calculateMarkerConstraints(marker);
          
          // Position the key based on marker center and constraints
          let position;
          
          if (marker.poseMatrix) {
            // Use pose matrix if available for accurate 3D positioning
            const matrix = new THREE.Matrix4().fromArray(marker.poseMatrix);
            const pos = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            matrix.decompose(pos, quaternion, scale);
            
            // Apply constraints to keep key within marker bounds
            pos.multiplyScalar(0.01); // Bring it closer
            pos.z = Math.max(pos.z, -2.0); // Don't go too far back
            pos.z = Math.min(pos.z, -0.5); // Don't come too close
            
            position = pos;
            key.mesh.quaternion.copy(quaternion);
          } else {
            // Fallback to 2D-to-3D conversion using marker center
            position = this.markerTo3DPosition(marker, -1.0);
            position = new THREE.Vector3(position.x, position.y, position.z);
          }
          
          // Apply position
          key.mesh.position.copy(position);
          
          // Apply constrained scale based on marker size AND distance
          const baseScale = constraints.scale * this.options.keyScale;
          const finalScale = baseScale * constraints.distanceScale; // Apply distance scaling
          key.mesh.scale.set(finalScale, finalScale, finalScale);
          
          // Optional: Add slight rotation for visual effect, but keep it subtle
          key.mesh.rotation.y += 0.005; // Slower rotation to avoid distraction
          
          // Log positioning info for debugging
          this.logMessage(`Key ${marker.id} positioned at (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}) with scale ${finalScale.toFixed(2)} (base: ${baseScale.toFixed(2)}, distance: ${constraints.distanceScale.toFixed(2)})`);
          
        } catch (err) {
          this.logMessage(`Error positioning ThreeJS key: ${err.message}`);
        }
        
        key.lastSeen = now;
      });
      
      // Hide keys for markers that are no longer visible
      this.keys.forEach(key => {
        const markerVisible = markers.some(m => m.id === key.markerId);
        const timeSinceLastSeen = now - key.lastSeen;
        
        if (!markerVisible || timeSinceLastSeen > 500) {
          key.mesh.visible = false;
        }
      });
    } else {
      // No markers detected - hide all keys
      this.keys.forEach(key => {
        key.mesh.visible = false;
      });
    }
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    // Stop animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Dispose of ThreeJS resources
    if (this.scene) {
      // Remove and dispose all objects from the scene
      while(this.scene.children.length > 0) { 
        const object = this.scene.children[0];
        this.scene.remove(object);
        
        // Dispose geometries and materials
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    }
    
    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    // Remove canvas
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    // Remove resize listener
    window.removeEventListener('resize', this.resizeHandler);
    
    this.logMessage('ThreeJS AR Viewer Engine disposed');
  }
}
