# AR Role-Based Fix: Preventing AR Rendering on Wrong Users

## The Bug 🐛

**Problem**: ArUco marker detection and AR key rendering was happening on the wrong user's video:
- Viewer's video was getting AR overlays when only the host should have them
- Multiple users were getting AR detection when only hosts should generate markers
- AR keys were appearing on viewers' own videos instead of only on the host's video

## Root Cause Analysis 🔍

The issue was in `src/main.js` where the AR setup logic wasn't properly distinguishing between user roles:

**Before Fix:**
```javascript
// ❌ WRONG: AR setup for ALL users regardless of role
setupArucoDetectionForRemoteStream(user.uid.toString(), videoElement, canvasElement, markerInfoElement, logMessage);

// ❌ WRONG: Host's own video always gets AR setup 
if (canvasElement && markerInfoElement) {
  setupArucoDetectionForRemoteStream(localUidStr, localVideoElement, canvasElement, markerInfoElement, logMessage);
}
```

## The Fix ✅ (Updated: Simplified Approach)

### Approach: First Video Publisher = Host

Instead of using RTM messaging (which can be complex), we use a simple heuristic:
- **First user to publish video** = designated host
- **Only this user gets AR detection** from viewers
- **Other video streams are ignored** for AR purposes

### 1. Host Detection Logic
**File**: `src/main.js` - `user-published` event handler

```javascript
// ✅ FIXED: Simple host detection
if (userRole === 'viewer' && canvasElement && markerInfoElement) {
  // Simple heuristic: First user to publish video is considered the host
  if (!firstVideoPublisher) {
    firstVideoPublisher = user.uid.toString();
    designatedHosts.add(user.uid.toString());
    logMessage(`User ${user.uid} is designated as the first video publisher (likely host)`);
  }
  
  // Check if this user is a designated host
  if (designatedHosts.has(user.uid.toString())) {
    logMessage(`Setting up ArUco detection for designated host ${user.uid}`);
    setupArucoDetectionForRemoteStream(user.uid.toString(), videoElement, canvasElement, markerInfoElement, logMessage);
    // ... AR setup
  } else {
    logMessage(`Skipping AR setup for user ${user.uid} - not the designated host`);
  }
}
```

### 2. Host AR Setup (Local Video) - Unchanged
**File**: `src/main.js` - `createLocalParticipantTile()` function

```javascript
// ✅ FIXED: Only hosts get AR detection on their own video
if (canvasElement && markerInfoElement && userRole === 'host') {
  logMessage(`Setting up ArUco detection for host's own video (${localUidStr})`);
  setupArucoDetectionForRemoteStream(localUidStr, localVideoElement, canvasElement, markerInfoElement, logMessage);
}
```

### 3. State Management
**File**: `src/main.js` - Added tracking variables

```javascript
let designatedHosts = new Set(); // Set of UIDs that are actual hosts
let firstVideoPublisher = null; // Track the first user to publish video (likely the host)

// Clean up on channel leave
designatedHosts.clear();
firstVideoPublisher = null;
```

## How It Works Now 🎯

### Expected Scenario
1. **Host joins** → joins as host role → publishes video → becomes `firstVideoPublisher`
2. **Viewer 1 joins** → sees host video → sets up AR detection on host only
3. **Viewer 2 joins** → also turns on camera → their video is ignored for AR
4. **Viewer 3 joins** → sees AR keys only on the host's video

### Debug Output 📝

You should now see proper logging like this:

**Viewer logs when host joins:**
```
User 42373 is designated as the first video publisher (likely host)
Setting up ArUco detection for designated host 42373
ThreeJS AR viewer initialized for designated host 42373
```

**Viewer logs when another viewer joins:**
```
Skipping AR setup for user 12345 - not the designated host (first video publisher: 42373)
```

## User Experience 👤

- **Host (42373)**: Shows ArUco markers → sees AR keys on their own video → streams enhanced video
- **Viewer 1**: Watches host → sees AR keys on host's video when host shows markers
- **Viewer 2**: Watches host + turns on camera → sees AR keys on host only, NOT on their own video
- **Result**: AR only appears on the designated host's video

## Files Modified 📁

- ✅ `src/main.js` - Implemented simplified host detection based on first video publisher
- ✅ Updated `AR-ROLE-FIX.md` - Documentation of the simplified fix

## Why This Approach Works

1. **No RTM dependency** - Works with just RTC
2. **Simple heuristic** - First to publish video = host
3. **Predictable behavior** - Host typically joins and starts streaming first
4. **Clear separation** - Only designated host gets AR treatment

The bug is now fixed with a much simpler approach! AR detection and rendering will only happen on the first user to publish video (the designated host).

## Testing

1. **Host joins first** → publishes video → should become the designated host
2. **Viewers join later** → should see AR only on the host's video
3. **Other viewers turn on cameras** → should NOT get AR detection
4. **AR keys appear only on host's markers** → not on any viewer's video 