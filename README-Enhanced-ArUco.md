# Enhanced ArUco Marker Detection with Constrained Rendering

This enhanced ArUco marker detection system provides precise corner detection and utilities for rendering content that stays perfectly within marker boundaries.

## Features

- **Enhanced Marker Detection**: Detects ArUco markers with detailed corner and bounds information
- **Constrained Rendering**: Renders content (like keys) that stays within marker boundaries
- **Multiple Key Styles**: Classic, modern, and pixel art key designs
- **Automatic Scaling**: Keys automatically scale to fit marker size while maintaining aspect ratio
- **Debug Visualization**: Optional debug overlays showing marker detection details
- **Clipping Support**: Content can be clipped to marker boundaries for precise positioning

## Files Structure

- `MarkerDetector.ts` - Enhanced marker detection with corner analysis
- `MarkerConstrainedRenderer.js` - Utility for rendering content within marker bounds
- `example-integration.js` - Complete example implementation
- Integration files in `src/components/ar/` - Updated existing AR system components

## Quick Start

### 1. Basic Usage

```javascript
import { MarkerDetector } from './MarkerDetector.js';
import { MarkerConstrainedRenderer } from './MarkerConstrainedRenderer.js';

// Initialize components
const markerDetector = new MarkerDetector();
const canvas = document.getElementById('arCanvas');
const renderer = new MarkerConstrainedRenderer(canvas, markerDetector);

// Detect markers from video frame
const imageData = getImageDataFromVideo(); // Your video capture logic
const markers = markerDetector.detectMarkers(imageData);

// Render keys constrained to markers
markers.forEach(marker => {
  const keySprite = renderer.createKeySprite(marker, {
    color: '#FFD700',
    style: 'classic'
  });
  
  renderer.renderConstrainedContent(marker, keySprite, {
    padding: 0.15,
    clipToBounds: true,
    centerContent: true
  });
});
```

### 2. Enhanced Integration

```javascript
import { createEnhancedARDemo } from './example-integration.js';

// Simple setup - requires video element with id="hostVideo" and canvas with id="arOverlay"
const arRenderer = createEnhancedARDemo();
```

## Enhanced Marker Data Structure

The enhanced system provides detailed marker information:

```javascript
{
  id: 63,                    // Marker ID
  corners: [                 // Exact corner coordinates
    { x: 100, y: 120 },
    { x: 200, y: 125 },
    { x: 195, y: 225 },
    { x: 105, y: 220 }
  ],
  center: { x: 150, y: 172 }, // Calculated center point
  bounds: {                   // Bounding rectangle
    minX: 100,
    maxX: 200,
    minY: 120,
    maxY: 225,
    width: 100,
    height: 105
  },
  pose: {                     // 3D pose information
    bestError: 12.5,
    bestRotation: [...],
    bestTranslation: [...]
  }
}
```

## Key Features

### 1. Automatic Constraint Calculation

The system automatically calculates how to fit content within marker boundaries:

```javascript
// Keys automatically scale to fit marker size
const constraints = renderer.calculateMarkerConstraints(marker);
// Returns: { scale: 0.8, bounds: {...} }
```

### 2. Multiple Rendering Options

```javascript
renderer.renderConstrainedContent(marker, content, {
  padding: 0.1,              // 10% padding inside marker
  maintainAspectRatio: true, // Keep content proportions
  centerContent: true,       // Center within marker
  clipToBounds: true,        // Clip content to marker shape
  debug: false              // Show debug information
});
```

### 3. Built-in Key Styles

- **Classic**: Traditional key design with circular head and teeth
- **Modern**: Contemporary design with gradients and rounded corners  
- **Pixel**: Retro pixel-art style key

```javascript
const keySprite = renderer.createKeySprite(marker, {
  color: '#FFD700',    // Gold color
  style: 'classic',    // 'classic', 'modern', 'pixel'
  size: 'auto'         // Auto-sized to marker
});
```

## Integration with Existing Systems

### ThreeJS Integration

The enhanced marker data works seamlessly with your existing ThreeJS viewer:

```javascript
// In threeViewerEngine.js - updateWithMarkers method
updateWithMarkers(markers) {
  markers.forEach(marker => {
    // Use enhanced bounds for better positioning
    const constraints = this.calculateMarkerConstraints(marker);
    
    // Position key using marker center and bounds
    const position = this.markerTo3DPosition(marker);
    key.mesh.position.copy(position);
    
    // Scale based on marker size
    const scale = constraints.scale * this.options.keyScale;
    key.mesh.scale.set(scale, scale, scale);
  });
}
```

### ArUco Manager Integration

The enhanced system is backward compatible with existing ArUco manager:

```javascript
// Enhanced markers include bounds information
const processedMarkers = markers.map(marker => ({
  ...marker,
  bounds: calculateMarkerBounds(marker.corners),
  center: calculateCenter(marker.corners)
}));
```

## Configuration Options

### Rendering Options

```javascript
const options = {
  padding: 0.15,           // 15% padding (0.0 - 0.5)
  keyStyle: 'classic',     // 'classic', 'modern', 'pixel'
  keyColor: '#FFD700',     // Any CSS color
  enableClipping: true,    // Clip content to marker shape
  showDebug: false        // Show debug overlays
};
```

### Debug Mode

Enable debug mode to see detailed marker detection information:

```javascript
renderer.renderConstrainedContent(marker, content, { debug: true });
```

Debug mode shows:
- Red outline of detected marker corners
- Blue bounding rectangle
- Red center point
- Marker ID label

## Performance Considerations

- **Frame Rate**: Detection runs at 60fps with automatic canvas sizing
- **Memory**: Efficient reuse of canvas elements and sprites
- **CPU**: Optimized corner calculations and bounds checking

## Browser Compatibility

- Modern browsers with Canvas 2D support
- WebGL for 3D rendering features
- getUserMedia for camera access

## Troubleshooting

### Common Issues

1. **Keys not appearing**: Check that markers are properly detected and video is playing
2. **Keys outside bounds**: Ensure bounds calculation is working - enable debug mode
3. **Performance issues**: Reduce detection frequency or canvas resolution

### Debug Tips

```javascript
// Enable debug mode to see detection details
renderer.options.showDebug = true;

// Check marker detection in console
console.log('Detected markers:', markers);

// Verify bounds calculation
markers.forEach(marker => {
  console.log(`Marker ${marker.id} bounds:`, marker.bounds);
});
```

## Example Use Cases

1. **AR Key Collection Game**: Keys appear precisely within markers and can be "collected"
2. **Educational Markers**: Information overlays that stay within marker boundaries
3. **Product Visualization**: 3D models constrained to marker areas
4. **Interactive Presentations**: Content that adapts to marker size and position

## Next Steps

- Add support for custom content shapes beyond keys
- Implement marker-to-marker relationships
- Add physics-based interactions within marker bounds
- Support for non-rectangular marker shapes 