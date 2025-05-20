/**
 * @author Mugen87 / https://github.com/Mugen87
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import world from './core/World.js';
import { AdvancedMinimap, MinimapIntegration, MinimapKeyboardControls } from './components/ui/minimap/index.js';
import { init as pauseScreenInit, cleanup as pauseScreenCleanup } from './components/ui/screens/PauseScreen.js';

// Console color logging for better debugging
const logStyles = {
  info: 'color: #2196F3',
  success: 'color: #4CAF50',
  warning: 'color: #FF9800',
  error: 'color: #F44336; font-weight: bold'
};

function log(message, type = 'info') {
  console.log(`%c${message}`, logStyles[type] || '');
}

log('RIFT5: Starting Three.js Migration Fixes', 'info');
log(`Three.js version: ${THREE.REVISION}`, 'info');

// Create a custom loading manager to track progress
const loadingManager = new THREE.LoadingManager();
window.loadingManager = loadingManager; // Make it globally available for the AssetManager

// Set up loading screen UI interactions
const loadingScreen = document.getElementById('loadingScreen');
const startScreen = document.getElementById('startScreen');
const progressBar = document.getElementById('progressBar');
const loadingText = document.getElementById('loadingText');

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  const progress = Math.floor((itemsLoaded / itemsTotal) * 100);
  if (progressBar) progressBar.style.width = `${progress}%`;
  if (loadingText) loadingText.textContent = `Loading assets... ${progress}%`;
  log(`Loading: ${url} (${itemsLoaded}/${itemsTotal})`, 'info');
};

loadingManager.onLoad = () => {
  log('All assets loaded successfully!', 'success');
  
  if (loadingScreen) {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
      if (startScreen) startScreen.classList.remove('hidden');
    }, 1000);
  }
};

loadingManager.onError = (url) => {
  log(`Error loading: ${url}`, 'error');
  
  if (loadingText) {
    loadingText.innerHTML = "Error loading application. Check console for details.";
  }
  if (progressBar) {
    progressBar.style.backgroundColor = '#e74c3c';
  }
};

// Fix 1: Ensure SRGBColorSpace is defined
if (THREE.SRGBColorSpace === undefined) {
  log('Adding SRGBColorSpace definition', 'warning');
  // THREE.SRGBColorSpace = 'srgb'; // Commented out to prevent esbuild error
}

// Fix 2: Create a wrapper around TextureLoader to fix colorSpace
const originalTextureLoader = THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load = function(url, onLoad, onProgress, onError) {
  return originalTextureLoader.call(this, url, 
    texture => {
      if (texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        log(`Texture colorspace fixed: ${url}`, 'success');
      }
      if (onLoad) onLoad(texture);
    },
    onProgress,
    error => {
      log(`Error loading texture: ${url}`, 'error');
      console.error(error);
      if (onError) onError(error);
    }
  );
};

// Fix 3: Create a wrapper around GLTFLoader to fix materials
const originalGltfLoaderLoad = GLTFLoader.prototype.load;
GLTFLoader.prototype.load = function(url, onLoad, onProgress, onError) {
  return originalGltfLoaderLoad.call(this, url, 
    gltf => {
      if (gltf && gltf.scene) {
        gltf.scene.traverse(object => {
          if (object.isMesh && object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => {
                if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
                if (material.lightMap) material.lightMap.colorSpace = THREE.SRGBColorSpace;
                material.needsUpdate = true;
              });
            } else {
              if (object.material.map) object.material.map.colorSpace = THREE.SRGBColorSpace;
              if (object.material.lightMap) object.material.lightMap.colorSpace = THREE.SRGBColorSpace;
              object.material.needsUpdate = true;
            }
          }
        });
        log(`GLTF materials fixed: ${url}`, 'success');
      }
      if (onLoad) onLoad(gltf);
    },
    onProgress,
    error => {
      log(`Error loading GLTF: ${url}`, 'error');
      console.error(error);
      if (onError) onError(error);
    }
  );
};

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  log('DOM ready, setting up event handlers', 'info');
  
// Initialize the pointer lock overlay
  const pointerLockOverlay = document.getElementById('pointerLockOverlay');
  if (pointerLockOverlay) {
    // Initially hide the overlay
    pointerLockOverlay.classList.add('hidden');
    
    // Attach the pause screen functions to the window object
    window.pauseScreen = { 
      init: pauseScreenInit,
      cleanup: pauseScreenCleanup 
    };
    log('Pause screen module loaded', 'success');
    
    // Add click handler to resume game
    pointerLockOverlay.addEventListener('click', () => {
      // Request pointer lock when overlay is clicked
      document.body.requestPointerLock();
      pointerLockOverlay.classList.add('hidden');
    });
    
    // Setup button handlers
    const resumeButton = document.getElementById('resumeButton');
    if (resumeButton) {
      resumeButton.addEventListener('click', () => {
        // Request fullscreen when resuming game
        try {
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().then(() => {
              // After fullscreen, request pointer lock
              document.body.requestPointerLock();
              pointerLockOverlay.classList.add('hidden');
            }).catch(err => {
              console.warn('Fullscreen request failed:', err);
              // Still request pointer lock even if fullscreen fails
              document.body.requestPointerLock();
              pointerLockOverlay.classList.add('hidden');
            });
          } else {
            // If already in fullscreen or fullscreen not available, just request pointer lock
            document.body.requestPointerLock();
            pointerLockOverlay.classList.add('hidden');
          }
        } catch (error) {
          console.warn('Fullscreen API error:', error);
          document.body.requestPointerLock();
          pointerLockOverlay.classList.add('hidden');
        }
      });
    }
    
    const quitButton = document.getElementById('quitButton');
    if (quitButton) {
      quitButton.addEventListener('click', () => {
        // Exit fullscreen first, then reload page
        if (document.fullscreenElement) {
          document.exitFullscreen().then(() => {
            window.location.reload();
          }).catch(err => {
            console.warn('Error exiting fullscreen:', err);
            window.location.reload();
          });
        } else {
          window.location.reload();
        }
      });
    }
  }
  
  const startButton = document.getElementById('start');
  if (startButton) {
    startButton.addEventListener('click', () => {
      log('Game starting...', 'info');
      
      // Request fullscreen mode when starting the game
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(err => {
            console.warn('Fullscreen request failed:', err);
          });
        }
      } catch (error) {
        console.warn('Fullscreen API not supported:', error);
      }
      
      // Completely hide and remove the start screen
      if (startScreen) {
        startScreen.classList.add('hidden');
        startScreen.style.display = 'none';
        // Actually remove from DOM to avoid any interference
        setTimeout(() => {
          if (startScreen.parentNode) {
            startScreen.parentNode.removeChild(startScreen);
          }
        }, 100);
      }
      
      try {
        // Initialize the world
        try {
          world.init();
        } catch (error) {
          log(`Error during world initialization: ${error.message}`, 'error');
          console.error(error);
        }
      } catch (error) {
        log(`Critical error starting game: ${error.message}`, 'error');
        console.error(error);
      }
    });
  } else {
    log('Warning: Start button not found in the DOM!', 'warning');
  }
});

// --- ADVANCED MINIMAP INTEGRATION ---
// This is now handled by the UIManager and MinimapIntegration class
/*
let minimap = null;
function setupAdvancedMinimap() {
  if (!window.scene || !window.camera || !window.player) {
    console.warn('Minimap: scene/camera/player not ready');
    return;
  }
  minimap = new AdvancedMinimap(window.scene, window.camera, window.player, {
    size: 180,
    position: 'top-right',
    scale: 25,
    height: 80,
    rotateWithPlayer: false,
    zoomable: true,
    enemyDetectionRadius: 30,
    heightIndicator: true,
    updateFrequency: 2,
    lowResolutionFactor: 0.8,
    simplifyGeometry: true,
    showObjectives: true,
    fogOfWar: true,
    radarSweep: true
  });
  window.minimap = minimap;
}

// Example: hook into world/game ready event
if (window.world && typeof window.world.init === 'function') {
  const origInit = window.world.init;
  window.world.init = function(...args) {
    const result = origInit.apply(this, args);
    // Expose scene/camera/player globally if not already
    window.scene = this.scene;
    window.camera = this.camera;
    window.player = this.player;
    setTimeout(setupAdvancedMinimap, 0); // Defer to ensure objects exist
    return result;
  };
}
*/

// Export the world for debugging
window.gameWorld = world;
