// Helper for handling asset paths in both development and production
export function getAssetPath(path) {
  // Remove leading slash if present
  if (path.startsWith('/')) {
    path = path.substring(1);
  }
  return path;
}
