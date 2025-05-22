// Helper function to create HTML for a participant tile
export function createParticipantTileHTML(uid, username = "User", profilePicUrl = 'default-avatar.png') {
  return `
    <div class="participant-tile" id="participant-${uid}">
      <div class="video-wrapper" style="position: relative;">
        <!-- Video element with z-index to ensure it's below the canvas but visible -->
        <video id="video-${uid}" autoplay playsinline class="hidden" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;"></video> 
        
        <!-- Avatar with z-index matching video -->
        <img id="avatar-${uid}" src="${profilePicUrl}" class="avatar" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;">
        
        <!-- ArUco marker detection canvas -->
        <canvas id="canvas-${uid}" class="marker-canvas-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 2; pointer-events: none;"></canvas>
        
        <!-- AR viewer canvas will be added here programmatically with higher z-index -->
      </div>
      <div class="participant-meta">
        <span id="name-${uid}" class="username">${username}</span>
        <div id="marker-info-${uid}" class="marker-info-overlay">Marker: None</div>
        <div class="media-controls">
          <button id="mic-btn-${uid}" class="media-btn control-btn-off hidden" title="Unmute Microphone"> Mic Off</button>
          <button id="cam-btn-${uid}" class="media-btn control-btn-off hidden" title="Start Camera"> Cam Off</button>
        </div>
      </div>
    </div>
  `;
}
