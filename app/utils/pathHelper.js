/**
 * Helper utility to resolve paths correctly in both development and production (GitHub Pages)
 */

/**
 * Gets the correct base path for assets depending on environment
 * @returns {string} The base path to use for asset loading
 */
export function getBasePath() {
  // Check if we're running on GitHub Pages (URL contains /rift/)
  const isGitHubPages = window.location.pathname.includes('/rift/');
  return isGitHubPages ? '/rift/' : '/';
}

/**
 * Resolves an asset path correctly for the current environment
 * @param {string} assetType - The type of asset (models, audios, textures, etc.)
 * @param {string} filename - The filename of the asset
 * @returns {string} The full resolved path to the asset
 */
export function getAssetPath(assetType, filename) {
  const base = getBasePath();
  return `${base}${assetType}/${filename}`;
}

/**
 * Get the adaptive path for a model
 * For GitHub Pages compatibility
 */
export function getModelPath(filename) {
  return getAssetPath('models', filename);
}
