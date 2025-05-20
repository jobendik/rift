/**
 * MinimapKeyboardControls:
 * Provides toggling of minimap rotation through keyboard controls.
 * Listens for the 'M' key to toggle between fixed and rotation modes.
 */

class MinimapKeyboardControls {
  /**
   * Create a new MinimapKeyboardControls instance
   * 
   * @param {MinimapIntegration} minimapIntegration - The minimap integration instance to control
   */
  constructor(minimapIntegration) {
    this.minimapIntegration = minimapIntegration;
    this.enabled = true;
    
    // Bind handler method to maintain proper 'this' context
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.init();
  }
  
  /**
   * Initialize keyboard event listeners
   */
  init() {
    document.addEventListener('keydown', this.handleKeyDown);
    console.log('Minimap keyboard controls initialized');
  }
  
  /**
   * Handle key down events, specifically looking for the 'M' key
   * to toggle minimap rotation mode
   * 
   * @param {KeyboardEvent} event - The keyboard event
   */
  handleKeyDown(event) {
    // Skip if controls are disabled or minimap isn't available
    if (!this.enabled || !this.minimapIntegration || !this.minimapIntegration.initialized) {
      return;
    }
    
    // Handle the rotation toggle with the 'M' key
    if (event.code === 'KeyM') {
      const isRotating = this.minimapIntegration.toggleRotation();
      console.log('Minimap rotation toggled to:', isRotating ? 'ON' : 'OFF');
    }
  }
  
  /**
   * Enable keyboard controls
   */
  enable() {
    this.enabled = true;
  }
  
  /**
   * Disable keyboard controls
   */
  disable() {
    this.enabled = false;
  }
  
  /**
   * Clean up all event listeners when no longer needed
   */
  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }
}

export { MinimapKeyboardControls };
