/**
 * Path Helper Utility
 * 
 * Provides functions to resolve asset paths correctly in both development and production environments.
 * Handles compatibility with GitHub Pages and other deployment scenarios by determining the correct
 * base path based on the current URL structure.
 */

/**
 * Asset directory configuration
 * Maps asset types to their directory paths
 * This makes it easy to change the structure in one place if needed
 */
const ASSET_DIRECTORIES = {
  models: 'assets/models',
  textures: 'assets/textures',
  audio: 'assets/audio',
  animations: 'assets/animations',
  config: 'assets/config',
  navmeshes: 'assets/navmeshes',
  hud: 'assets/hud'
};

/**
 * Gets the correct base path for assets depending on environment
 * @returns {string} The base path to use for asset loading
 */
export function getBasePath() {
  // Check if we're running on GitHub Pages (URL contains /rift/)
  const isGitHubPages = window.location.pathname.includes('/rift/');
  
  // Return appropriate base path
  return isGitHubPages ? '/rift/' : '/';
}

/**
 * Resolves an asset path correctly for the current environment
 * @param {string} assetType - The type of asset (models, textures, audio, etc.)
 * @param {string} filename - The filename of the asset
 * @returns {string} The full resolved path to the asset
 * @throws {Error} If an invalid asset type is provided
 */
export function getAssetPath(assetType, filename) {
  // Get the mapped directory for this asset type
  const assetDir = ASSET_DIRECTORIES[assetType];
  
  // Check if this is a valid asset type
  if (!assetDir) {
    console.warn(`Unknown asset type: ${assetType}, using raw path`);
    return `${getBasePath()}${assetType}/${filename}`;
  }
  
  // Return the properly constructed path
  return `${getBasePath()}${assetDir}/${filename}`;
}

/**
 * Get the adaptive path for a model file
 * @param {string} filename - The model filename
 * @returns {string} The full path to the model
 */
export function getModelPath(filename) {
  return getAssetPath('models', filename);
}

/**
 * Get the adaptive path for a texture file
 * @param {string} filename - The texture filename
 * @returns {string} The full path to the texture
 */
export function getTexturePath(filename) {
  return getAssetPath('textures', filename);
}

/**
 * Get the adaptive path for an audio file
 * @param {string} filename - The audio filename
 * @returns {string} The full path to the audio file
 */
export function getAudioPath(filename) {
  return getAssetPath('audio', filename);
}

/**
 * Get the adaptive path for an animation file
 * @param {string} filename - The animation filename
 * @returns {string} The full path to the animation file
 */
export function getAnimationPath(filename) {
  return getAssetPath('animations', filename);
}

/**
 * Get the relative path for an asset, useful for CSS references
 * @param {string} assetType - The type of asset
 * @param {string} filename - The filename of the asset
 * @returns {string} The relative path to the asset (without base path)
 */
export function getRelativeAssetPath(assetType, filename) {
  const assetDir = ASSET_DIRECTORIES[assetType] || assetType;
  return `${assetDir}/${filename}`;
}

/**
 * Check if the current environment is development mode
 * @returns {boolean} True if running in development mode
 */
export function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}
