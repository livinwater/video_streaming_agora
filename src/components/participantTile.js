// Helper function to create HTML for a participant tile
export function createParticipantTileHTML(uid, username = "User", profilePicUrl = 'default-avatar.png') {
  return `
    <div class="participant-tile" id="participant-${uid}">
      <div class="video-wrapper">
        <video id="video-${uid}" autoplay playsinline class="hidden"></video> 
        <canvas id="canvas-${uid}" class="marker-canvas-overlay"></canvas>
        <img id="avatar-${uid}" src="${profilePicUrl}" class="avatar">
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
