/**
 * Minimap Module:
 * Exports all components related to the minimap functionality.
 * This module provides a comprehensive top-down map system for 
 * FPS games built with Three.js.
 */

// Core minimap class that handles rendering the minimap
import { AdvancedMinimap } from './AdvancedMinimap.js';

// Integration with the game world and handles adding items/enemies
import { MinimapIntegration } from './MinimapIntegration.js';

// Keyboard controls for toggling minimap features
import { MinimapKeyboardControls } from './MinimapKeyboardControls.js';

// Export all components
export {
  AdvancedMinimap,
  MinimapIntegration,
  MinimapKeyboardControls
};
