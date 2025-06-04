/**
 * MarkerConstrainedRenderer
 * Utility class for rendering content that is constrained to ArUco marker boundaries
 */
export class MarkerConstrainedRenderer {
  constructor(canvas, markerDetector) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.markerDetector = markerDetector;
  }

  /**
   * Render content (like a key) constrained to a marker's boundaries
   * @param {Object} marker - Detected marker with corners, bounds, etc.
   * @param {HTMLImageElement|HTMLCanvasElement} content - Content to render
   * @param {Object} options - Rendering options
   */
  renderConstrainedContent(marker, content, options = {}) {
    if (!marker || !marker.corners || marker.corners.length < 4) {
      return;
    }

    const {
      padding = 0.1, // 10% padding by default
      maintainAspectRatio = true,
      centerContent = true,
      clipToBounds = true
    } = options;

    this.ctx.save();

    try {
      // Create clipping path if requested
      if (clipToBounds) {
        const clippingPath = this.markerDetector.createMarkerClippingPath(this.canvas, marker);
        this.ctx.clip(clippingPath);
      }

      // Calculate content dimensions with padding
      const paddedWidth = marker.bounds.width * (1 - padding * 2);
      const paddedHeight = marker.bounds.height * (1 - padding * 2);

      let renderWidth = paddedWidth;
      let renderHeight = paddedHeight;

      // Maintain aspect ratio if requested
      if (maintainAspectRatio && content.width && content.height) {
        const contentAspectRatio = content.width / content.height;
        const markerAspectRatio = paddedWidth / paddedHeight;

        if (contentAspectRatio > markerAspectRatio) {
          // Content is wider than marker - fit to width
          renderWidth = paddedWidth;
          renderHeight = paddedWidth / contentAspectRatio;
        } else {
          // Content is taller than marker - fit to height
          renderHeight = paddedHeight;
          renderWidth = paddedHeight * contentAspectRatio;
        }
      }

      // Calculate position
      let x = marker.bounds.minX + padding * marker.bounds.width;
      let y = marker.bounds.minY + padding * marker.bounds.height;

      if (centerContent) {
        x = marker.center.x - renderWidth / 2;
        y = marker.center.y - renderHeight / 2;
      }

      // Apply transformation matrix for precise positioning
      const transform = this.markerDetector.getMarkerTransformMatrix(
        marker, 
        content.width || renderWidth, 
        content.height || renderHeight
      );
      
      this.ctx.setTransform(transform);

      // Render the content
      this.ctx.drawImage(content, 0, 0, renderWidth, renderHeight);

      // Draw debug information if in debug mode
      if (options.debug) {
        this.renderDebugInfo(marker);
      }

    } finally {
      this.ctx.restore();
    }
  }

  /**
   * Render multiple pieces of content for multiple markers
   * @param {Array} markers - Array of detected markers
   * @param {HTMLImageElement|HTMLCanvasElement} content - Content to render
   * @param {Object} options - Rendering options
   */
  renderMultipleMarkers(markers, content, options = {}) {
    markers.forEach(marker => {
      this.renderConstrainedContent(marker, content, options);
    });
  }

  /**
   * Create a key sprite that fits within marker bounds
   * @param {Object} marker - Detected marker
   * @param {Object} keyOptions - Key rendering options
   */
  createKeySprite(marker, keyOptions = {}) {
    const {
      color = '#FFD700', // Gold color
      size = Math.min(marker.bounds.width, marker.bounds.height) * 0.6,
      style = 'classic' // 'classic', 'modern', 'pixel'
    } = keyOptions;

    // Create a temporary canvas for the key
    const keyCanvas = document.createElement('canvas');
    keyCanvas.width = size;
    keyCanvas.height = size;
    const keyCtx = keyCanvas.getContext('2d');

    // Draw key based on style
    switch (style) {
      case 'classic':
        this.drawClassicKey(keyCtx, size, color);
        break;
      case 'modern':
        this.drawModernKey(keyCtx, size, color);
        break;
      case 'pixel':
        this.drawPixelKey(keyCtx, size, color);
        break;
      default:
        this.drawClassicKey(keyCtx, size, color);
    }

    return keyCanvas;
  }

  /**
   * Draw a classic key design
   */
  drawClassicKey(ctx, size, color) {
    const centerX = size / 2;
    const centerY = size / 2;
    const scale = size / 100; // Scale factor

    ctx.fillStyle = color;
    ctx.strokeStyle = '#B8860B'; // Darker gold for outline
    ctx.lineWidth = 2 * scale;

    // Key head (circular)
    ctx.beginPath();
    ctx.arc(centerX, centerY - 20 * scale, 15 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Key hole
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(centerX, centerY - 20 * scale, 5 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Key shaft
    ctx.fillStyle = color;
    ctx.fillRect(centerX - 3 * scale, centerY - 5 * scale, 6 * scale, 30 * scale);
    ctx.strokeRect(centerX - 3 * scale, centerY - 5 * scale, 6 * scale, 30 * scale);

    // Key teeth
    ctx.fillRect(centerX + 3 * scale, centerY + 15 * scale, 8 * scale, 4 * scale);
    ctx.fillRect(centerX + 3 * scale, centerY + 22 * scale, 6 * scale, 3 * scale);
    ctx.strokeRect(centerX + 3 * scale, centerY + 15 * scale, 8 * scale, 4 * scale);
    ctx.strokeRect(centerX + 3 * scale, centerY + 22 * scale, 6 * scale, 3 * scale);
  }

  /**
   * Draw a modern key design
   */
  drawModernKey(ctx, size, color) {
    const centerX = size / 2;
    const centerY = size / 2;
    const scale = size / 100;

    // Gradient for modern look
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, '#FFA500');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#FF8C00';
    ctx.lineWidth = 2 * scale;

    // Modern key head (rounded rectangle)
    const headWidth = 30 * scale;
    const headHeight = 20 * scale;
    const headRadius = 8 * scale;

    this.roundRect(ctx, centerX - headWidth/2, centerY - 25 * scale, headWidth, headHeight, headRadius);
    ctx.fill();
    ctx.stroke();

    // Key hole
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(centerX, centerY - 15 * scale, 4 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Key shaft (rounded)
    ctx.fillStyle = gradient;
    this.roundRect(ctx, centerX - 4 * scale, centerY - 5 * scale, 8 * scale, 30 * scale, 4 * scale);
    ctx.fill();
    ctx.stroke();

    // Modern teeth (geometric)
    ctx.fillRect(centerX + 4 * scale, centerY + 10 * scale, 10 * scale, 3 * scale);
    ctx.fillRect(centerX + 4 * scale, centerY + 16 * scale, 7 * scale, 3 * scale);
    ctx.fillRect(centerX + 4 * scale, centerY + 22 * scale, 9 * scale, 3 * scale);
  }

  /**
   * Draw a pixel art key design
   */
  drawPixelKey(ctx, size, color) {
    const pixelSize = size / 16; // 16x16 pixel grid
    ctx.fillStyle = color;

    // Pixel pattern for a key
    const keyPattern = [
      [0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0],
      [0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0],
      [0,0,1,1,1,0,0,0,1,1,1,0,0,0,0,0],
      [0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0],
      [0,0,1,1,1,0,0,0,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0],
      [0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ];

    for (let y = 0; y < keyPattern.length; y++) {
      for (let x = 0; x < keyPattern[y].length; x++) {
        if (keyPattern[y][x] === 1) {
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }
  }

  /**
   * Helper method to draw rounded rectangles
   */
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Render debug information about marker detection
   */
  renderDebugInfo(marker) {
    this.ctx.save();
    this.ctx.resetTransform();
    
    // Draw marker outline
    this.ctx.strokeStyle = 'red';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    marker.corners.forEach((corner, i) => {
      if (i === 0) this.ctx.moveTo(corner.x, corner.y);
      else this.ctx.lineTo(corner.x, corner.y);
    });
    this.ctx.closePath();
    this.ctx.stroke();

    // Draw center point
    this.ctx.fillStyle = 'red';
    this.ctx.beginPath();
    this.ctx.arc(marker.center.x, marker.center.y, 3, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw bounds rectangle
    this.ctx.strokeStyle = 'blue';
    this.ctx.strokeRect(marker.bounds.minX, marker.bounds.minY, marker.bounds.width, marker.bounds.height);

    // Draw marker ID
    this.ctx.fillStyle = 'red';
    this.ctx.font = '16px Arial';
    this.ctx.fillText(`ID: ${marker.id}`, marker.bounds.minX, marker.bounds.minY - 5);

    this.ctx.restore();
  }

  /**
   * Example usage function demonstrating the constrained rendering
   */
  static example(canvas, markerDetector, markers) {
    const renderer = new MarkerConstrainedRenderer(canvas, markerDetector);
    
    markers.forEach(marker => {
      // Create a key sprite that fits the marker
      const keySprite = renderer.createKeySprite(marker, {
        color: '#FFD700',
        style: 'classic'
      });

      // Render the key constrained to the marker bounds
      renderer.renderConstrainedContent(marker, keySprite, {
        padding: 0.1,
        maintainAspectRatio: true,
        centerContent: true,
        clipToBounds: true,
        debug: true
      });
    });
  }
} 