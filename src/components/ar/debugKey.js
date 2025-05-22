/**
 * Debug Key for AR Testing
 * This creates a fixed position key for testing purposes
 */
import { 
  Vector3, 
  MeshBuilder, 
  StandardMaterial, 
  Color3, 
  TransformNode
} from '@babylonjs/core';

/**
 * Add a debug key to the scene for testing
 * @param {Scene} scene - BabylonJS scene
 * @param {Object} options - Configuration options
 * @returns {Object} - Debug key object
 */
export function addDebugKey(scene, options = {}) {
  const {
    position = new Vector3(0, 0, -1.5), // Default position in front of camera
    scale = 0.5,
    color = new Color3(1.0, 0.8, 0.0) // Gold color
  } = options;
  
  // Create container node
  const keyNode = new TransformNode('debug-key', scene);
  keyNode.position = position;
  keyNode.scaling = new Vector3(scale, scale, scale);
  
  // Create a simple key-like shape
  const shaft = MeshBuilder.CreateCylinder('debug-shaft', { 
    height: 1.0, 
    diameter: 0.2 
  }, scene);
  shaft.parent = keyNode;
  shaft.position.y = -0.5;
  
  const head = MeshBuilder.CreateBox('debug-head', { 
    width: 0.6, 
    height: 0.4, 
    depth: 0.2 
  }, scene);
  head.parent = keyNode;
  head.position.y = 0.2;
  
  const teeth1 = MeshBuilder.CreateBox('debug-teeth1', { 
    width: 0.15, 
    height: 0.25, 
    depth: 0.2 
  }, scene);
  teeth1.parent = keyNode;
  teeth1.position.set(-0.2, -1.0, 0);
  
  const teeth2 = MeshBuilder.CreateBox('debug-teeth2', { 
    width: 0.15, 
    height: 0.35, 
    depth: 0.2 
  }, scene);
  teeth2.parent = keyNode;
  teeth2.position.set(0, -1.0, 0);
  
  // Create bright material for the key
  const keyMaterial = new StandardMaterial('debug-keyMaterial', scene);
  keyMaterial.diffuseColor = color;
  keyMaterial.emissiveColor = new Color3(0.4, 0.3, 0.0); // Add glow
  keyMaterial.specularColor = new Color3(1.0, 1.0, 1.0); // Shiny
  keyMaterial.specularPower = 64;
  
  // Apply material to all parts
  [shaft, head, teeth1, teeth2].forEach(mesh => {
    mesh.material = keyMaterial;
  });
  
  // Functions to control the key
  const debugKey = {
    node: keyNode,
    show() { keyNode.setEnabled(true); },
    hide() { keyNode.setEnabled(false); },
    setPosition(pos) { keyNode.position = pos; },
    setRotation(rot) { keyNode.rotation = rot; },
    setScale(s) { keyNode.scaling = new Vector3(s, s, s); }
  };
  
  // Start visible
  debugKey.show();
  
  return debugKey;
}
