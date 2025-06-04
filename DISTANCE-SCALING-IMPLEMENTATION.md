# Distance-Based Scaling Implementation

## Key Finding: MarkerDetector.ts is NOT used in the main app!

The main app uses these components instead:
- `src/components/ar/arucoARConnector.js` - Main ArUco detection connector
- `src/components/arucoManager.js` - Manager for remote stream detection  
- `src/components/ar/threeViewerEngine.js` - 3D rendering engine

## Distance Scaling Implementation

### 1. Two Methods for Distance Calculation

**Method 1: Pose Z-Translation (Most Accurate)**
- Uses the Z-coordinate from ArUco pose estimation
- Represents actual 3D distance from camera to marker
- Range: 50-500mm (typical ArUco detection range)
- Formula: `distanceScale = 500 / normalizedDistance`

**Method 2: Marker Apparent Size (Fallback)**
- Uses marker size relative to video frame
- Smaller apparent size = further away
- Logarithmic scaling for natural perception
- Formula: `distanceScale = pow(relativeSize / minSize, 0.3)`

### 2. Components Updated

**threeViewerEngine.js**
```javascript
// New method added
calculateDistanceScale(marker) {
  // Returns scale factor based on distance (0.2 to 3.0)
}

// Updated in updateWithMarkers()
const finalScale = baseScale * constraints.distanceScale;
```

**arucoARConnector.js**
```javascript
// New method added
calculateDistanceScale(marker, pose) {
  // Calculates distance scale for main AR connector
}

// Updated marker processing
return {
  ...marker,
  distanceScale: distanceScale, // NEW: Distance scaling factor
  // ... other properties
}
```

**arucoManager.js**
```javascript
// New function added
calculateDistanceScale(marker, pose, imageWidth, imageHeight) {
  // Calculates distance scale for remote stream detection
}

// Updated marker processing
markers.push({
  // ... existing properties
  distanceScale: distanceScale, // NEW: Distance scaling factor
});
```

### 3. How It Works

1. **Detection**: ArUco markers are detected with corners and pose information
2. **Distance Calculation**: 
   - Primary: Use Z-translation from pose estimation
   - Fallback: Calculate from marker's apparent size
3. **Scaling**: Key size = baseScale × distanceScale
4. **Rendering**: Keys appear larger when markers are closer, smaller when further

### 4. Scale Ranges

- **Distance Scale**: 0.2 to 3.0 (clamped for stability)
- **Close markers** (50mm): Scale = 10.0 (huge keys)
- **Medium distance** (200mm): Scale = 2.5 (normal keys)  
- **Far markers** (500mm): Scale = 1.0 (small keys)
- **Very far** (fallback): Scale = 0.2 (tiny keys)

### 5. Debug Output

The system now logs distance information:
```
Marker 63 Z-distance: 180.50mm, distance scale: 2.77
Key 63 positioned at (0.15, -0.23, -1.00) with scale 1.38 (base: 0.50, distance: 2.77)
```

### 6. Real-World Effect

- **Move marker closer**: Key grows larger automatically
- **Move marker away**: Key shrinks proportionally
- **Maintains proportion**: Key stays within marker bounds
- **Natural perception**: Logarithmic scaling feels realistic

## Testing the Implementation

1. Print an ArUco marker (ID 0, 63, or 91)
2. Run your video call application
3. Move the marker closer/farther from the camera
4. Observe keys scaling based on distance
5. Check console logs for distance calculations

## Files Modified

- ✅ `src/components/ar/threeViewerEngine.js` - Added distance scaling
- ✅ `src/components/ar/arucoARConnector.js` - Added distance scaling  
- ✅ `src/components/arucoManager.js` - Added distance scaling
- ⚠️ `MarkerDetector.ts` - Fixed linter errors but NOT USED in main app
- ℹ️ `example-integration.js` - Demo only, not part of main app

The distance scaling is now implemented in the **actual components being used** by your video call application! 