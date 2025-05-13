// Simple copy script for asset files
const fs = require('fs');
const path = require('path');

// Asset folders to copy
const assetFolders = [
  'models',
  'audios',
  'textures',
  'navmeshes',
  'config',
  'animations'
];

console.log('Starting asset copy process...');

// Copy a directory recursively
function copyDir(src, dest) {
  // Create destination folder if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
    console.log(`Created directory: ${dest}`);
  }

  try {
    // Read all files in source directory
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      // Copy directories recursively, files directly
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied: ${entry.name}`);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${src}:`, err);
  }
}

// Process each asset folder
assetFolders.forEach(folder => {
  const srcDir = path.join(__dirname, 'app', folder);
  const destDir = path.join(__dirname, 'dist', folder);

  if (fs.existsSync(srcDir)) {
    console.log(`\nCopying ${folder} assets:`);
    console.log(`  From: ${srcDir}`);
    console.log(`  To:   ${destDir}`);
    
    try {
      copyDir(srcDir, destDir);
      console.log(`✓ Successfully copied ${folder} folder`);
    } catch (error) {
      console.error(`✗ Error copying ${folder} folder:`, error);
    }
  } else {
    console.log(`✗ Source folder not found: ${srcDir}`);
  }
});

console.log('\nAsset copy process completed!');
