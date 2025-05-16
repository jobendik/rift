# Level Model Replacement Guide for RIFT FPS Game

This guide provides detailed instructions for replacing the level.glb model in your RIFT FPS game with a custom level model.

## Overview

The level model in your game is more than just a visual element. It's integrated with several game systems:

1. **Visual Rendering**: The 3D model displayed in the game world
2. **Collision Detection**: Used by the Bullet Vicinity Handler (BVH) for projectile and line-of-sight calculations
3. **Navigation Mesh**: Used by AI for pathfinding
4. **Lightmapping**: Custom lighting information for visual quality
5. **Spawn Points**: Defined in configuration for placing enemies, health packs, and weapons

Simply replacing the level.glb file alone won't work because of these interconnected systems. Here's a complete guide on how to implement a new level.

## Step 1: Prepare Your New Level Model

### Model Requirements

1. **Format**: Use glTF/GLB format (preferred format for three.js and web)
2. **Mesh Name**: The main mesh must be named "level" (lowercase) to match existing code
3. **Scale**: Maintain a similar scale to the original model or adjust game mechanics accordingly
4. **UV Maps**: Prepare two UV maps:
   - UV set 0: For the main texture
   - UV set 1: For the lightmap texture

### Creating Your Model

1. Use a 3D modeling program like Blender, 3DS Max, or Maya
2. Design your level with proper UV mapping
3. Keep polygon count reasonable for web performance
4. Export as GLB with the following settings:
   - Include textures
   - Apply modifiers
   - Y-up orientation (three.js standard)

## Step 2: Replace the Visual Model

1. Create your new level.glb file
2. Place it in `/app/models/` replacing the existing file
3. If using a different filename, update the loading path in `src/core/AssetManager.js` around line 425:

```javascript
// level - removed leading slash
console.info('AssetManager: Loading level model');
gltfLoader.load('models/your_level_filename.glb', 
    // rest of code...
);
```

## Step 3: Create a Lightmap

The lightmap enhances visual quality by adding pre-calculated lighting to your level.

1. Generate a lightmap for your level in your 3D application
2. Export the lightmap as a PNG file
3. Replace `/app/textures/lightmap.png` with your new lightmap
4. Ensure your model has proper second UV set (UV1) for the lightmap

Important lightmap settings used in the code:
- The lightmap uses SRGBColorSpace
- flipY is set to false
- minFilter and magFilter use LinearFilter
- generateMipmaps is false
- lightMapIntensity is set to 1.5 (can be adjusted)
- lightMapUv is set to 1 (second UV set)

## Step 4: Update the Navigation Mesh

The navigation mesh is critical for AI pathfinding. You need to create a new navmesh that matches your level geometry.

1. Create a simplified version of your level for navigation
2. Export as GLB
3. Replace `/app/navmeshes/navmesh.glb`

There are several tools to generate navigation meshes:
- Blender has addons for navmesh generation
- Recast Navigation can generate navmeshes from your model
- You can hand-create a simplified version of your level

## Step 5: Generate a Cost Table

The cost table is used alongside the navigation mesh for pathfinding decisions.

1. Use the RIFT navmesh cost table generator to create a new cost table
2. Replace `/app/navmeshes/costTable.json`

You might need to understand the specifics of the cost table format used by the YUKA library.

## Step 6: Update Level Configuration

The `level.json` file defines spawn points and other level-specific settings.

1. Open `/app/config/level.json`
2. Update the spawn point coordinates to match your new level:
   - `competitorSpawningPoints`: Enemy spawn locations
   - `healthPackSpawningPoints`: Health item spawn locations
   - `shotgunSpawningPoints`: Shotgun weapon spawn locations
   - `assaultRilflesSpawningPoints`: Rifle weapon spawn locations

3. Update the `spatialIndex` settings based on your level size:

```json
"spatialIndex": {
    "width": 125,   // X-dimension of your level
    "height": 25,   // Y-dimension (height) of your level
    "depth": 125,   // Z-dimension of your level
    "cellsX": 20,   // Spatial partitioning cells in X direction
    "cellsY": 1,    // Spatial partitioning cells in Y direction
    "cellsZ": 20    // Spatial partitioning cells in Z direction
}
```

## Step 7: Test and Debug

1. Run your game to test the new level
2. Check for these potential issues:
   - Visual rendering problems
   - Collision detection issues
   - Enemy navigation problems
   - Missing or incorrectly placed items

### Debug Visualization

When debugging, use the game's debug mode to visualize:
- Navigation mesh
- Spatial partitioning cells
- Spawn points
- Collision boundaries

## Common Issues and Solutions

### "Level mesh not found in the loaded model"
- Make sure your main mesh is named "level" (lowercase)
- Check the model structure in a glTF viewer

### Lightmap not applying
- Verify your model has a second set of UVs (UV1)
- Check that the lightmap texture is correctly exported

### Navigation mesh issues
- Ensure the navmesh is properly aligned with your visual model
- Check for any disconnected areas that might trap AI

### Game crashes during level loading
- Check browser console for specific error messages
- Verify all required files are correctly placed and accessible

### Physics/collision issues
- The game uses a BVH (Bounding Volume Hierarchy) for collision
- Make sure your level's collision geometry is properly defined

## Advanced: Creating a Complete Level Package

For better organization when creating multiple levels, consider creating a level package:

1. Create a folder structure like:
```
app/levels/your_level_name/
  ├── level.glb              # Visual model
  ├── lightmap.png           # Lightmap texture
  ├── navmesh.glb            # Navigation mesh
  ├── costTable.json         # Pathfinding cost table
  └── level.json             # Level configuration
```

2. Modify the `AssetManager.js` to load from your package folder
3. This makes it easier to switch between different levels

## Final Notes

- Test thoroughly after making any changes
- Keep backup copies of original files before replacing them
- Consider starting with small modifications before complete replacements
- Remember that performance matters - optimize your models, textures, and lighting

By following this guide, you should be able to successfully replace the level in your RIFT FPS game with a custom one that works with all the game systems.
