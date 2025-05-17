/**
 * Simple keyboard controls for the minimap
 */

class MinimapKeyboardControls {
  constructor(minimapIntegration) {
    this.minimapIntegration = minimapIntegration;
    this.enabled = true;
    
    // Bind handler method
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.init();
  }
  
  init() {
    document.addEventListener('keydown', this.handleKeyDown);
    console.log('Minimap keyboard controls initialized');
  }
  
  handleKeyDown(event) {
    if (!this.enabled || !this.minimapIntegration || !this.minimapIntegration.initialized) {
      return;
    }
    
    // Only handle the rotation toggle
    if (event.code === 'KeyM') {
      this.minimapIntegration.toggleRotation();
      console.log('Minimap rotation toggled to:', 
        this.minimapIntegration.minimap.options.rotateWithPlayer ? 'ON' : 'OFF');
    }
  }
  
  enable() {
    this.enabled = true;
  }
  
  disable() {
    this.enabled = false;
  }
  
  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }
}

export { MinimapKeyboardControls };
