/**
 * Key Manager for AR Game
 * Handles key state, riddles, and game logic
 */
export class KeyManager {
  constructor() {
    this.keys = [];
    this.collectedKeys = [];
    this.riddles = [];
    this.onKeyCollected = null;
  }

  /**
   * Load riddles from JSON file
   * @returns {Promise<Array>} - Array of riddle objects
   */
  async loadRiddles() {
    try {
      // Default riddles if fetch fails
      const defaultRiddles = [
        {
          id: 1,
          text: "What has keys but can't open locks?",
          answers: [
            { text: "A piano", correct: true },
            { text: "A computer", correct: false },
            { text: "A treasure chest", correct: false }
          ]
        },
        {
          id: 2,
          text: "I'm light as a feather, but the strongest person can't hold me for more than a few minutes. What am I?",
          answers: [
            { text: "Breath", correct: true },
            { text: "A thought", correct: false },
            { text: "A feather", correct: false }
          ]
        },
        {
          id: 3,
          text: "What goes up but never comes down?",
          answers: [
            { text: "Age", correct: true },
            { text: "A balloon", correct: false },
            { text: "Temperature", correct: false }
          ]
        }
      ];

      try {
        const response = await fetch('/data/riddles.json');
        if (response.ok) {
          this.riddles = await response.json();
        } else {
          console.warn('Could not load riddles.json, using defaults');
          this.riddles = defaultRiddles;
        }
      } catch (error) {
        console.warn('Error loading riddles, using defaults:', error);
        this.riddles = defaultRiddles;
      }
      
      return this.riddles;
    } catch (error) {
      console.error('Error in riddle setup:', error);
      return [];
    }
  }

  /**
   * Get riddle by ID
   * @param {number} riddleId - ID of the riddle to retrieve
   * @returns {Object|null} - Riddle object or null if not found
   */
  getRiddle(riddleId) {
    return this.riddles.find(riddle => riddle.id === riddleId);
  }

  /**
   * Add a key with associated marker and riddle
   * @param {number} markerId - ArUco marker ID
   * @param {number} riddleId - ID of the riddle for this key
   * @param {Object} options - Additional key options
   * @returns {Object} - The created key object
   */
  addKey(markerId, riddleId, options = {}) {
    const key = {
      id: this.keys.length + 1,
      markerId,
      riddleId,
      collected: false,
      mesh: null, // Will be set by AR engine
      ...options
    };
    
    this.keys.push(key);
    return key;
  }

  /**
   * Mark key as collected
   * @param {number} markerId - ArUco marker ID of the collected key
   * @returns {Object|null} - The collected key or null if not found
   */
  collectKey(markerId) {
    const key = this.keys.find(k => k.markerId === markerId && !k.collected);
    if (key) {
      key.collected = true;
      key.collectedAt = new Date();
      this.collectedKeys.push(key);
      
      // Call collection callback if defined
      if (typeof this.onKeyCollected === 'function') {
        this.onKeyCollected(key);
      }
      
      return key;
    }
    return null;
  }

  /**
   * Check if all keys have been collected
   * @returns {boolean} - True if all keys have been collected
   */
  allKeysCollected() {
    return this.keys.length > 0 && this.keys.every(key => key.collected);
  }

  /**
   * Get number of collected keys
   * @returns {number} - Number of collected keys
   */
  getCollectedCount() {
    return this.collectedKeys.length;
  }

  /**
   * Get total number of keys
   * @returns {number} - Total number of keys
   */
  getTotalCount() {
    return this.keys.length;
  }

  /**
   * Set callback for key collection event
   * @param {Function} callback - Function to call when key is collected
   */
  setOnKeyCollected(callback) {
    this.onKeyCollected = callback;
  }
}
