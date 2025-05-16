# RIFT2: 3D First-Person Shooter Game

## Project Overview

RIFT2 is a browser-based 3D first-person shooter (FPS) game built with JavaScript and WebGL. The game features a robust AI system, weapon mechanics, health management, and an immersive 3D environment. Players navigate through levels, engage with enemy NPCs, collect weapons and health packs, and experience reactive gameplay elements.

## Technical Architecture

### Core Technologies
- **WebGL Rendering**: Uses WebGL for 3D graphics rendering
- **Modular JavaScript**: Structured into logical components
- **Rollup.js**: For bundling the application
- **GLSL**: For shader programming
- **Blender**: For 3D model creation and animation

### Key Components

#### World and Game Loop (core/World.js)
The `World` class serves as the central hub that coordinates all game systems. It initializes and updates:
- Game entities (player, enemies, items)
- Physics simulations
- AI decision making
- Rendering pipeline
- User input processing

The game loop maintains consistent timing for updates regardless of frame rate, ensuring smooth gameplay across different devices.

#### Asset Management (core/AssetManager.js)
Handles loading, caching, and providing access to:
- 3D models (.glb files)
- Animations (.json)
- Audio files (.ogg)
- Textures and images
- Configuration data (.json)

Provides hooks for loading screens and error handling during resource acquisition.

#### Player Controls (controls/FirstPersonControls.js)
Implements a first-person camera system with:
- Mouse look (pitch/yaw)
- WASD movement
- Jumping mechanics
- Weapon handling
- Collision detection

#### Entity System
The game uses composition-based entities:
- `Player.js`: The user-controlled character with health, inventory, and movement logic
- `Enemy.js`: AI-controlled opponents that use the goal-oriented action planning system
- `Level.js`: Manages the 3D environment, lighting, and navigation mesh
- `Item.js`: Base class for collectible objects
  - `WeaponItem.js`: Weapons that can be collected
  - `HealthPack.js`: Items that restore player health

#### AI System
RIFT2 features a sophisticated Goal-Oriented Action Planning (GOAP) AI system:

1. **Evaluators** (evaluators/): Score potential actions based on current context
   - `AttackEvaluator.js`: Evaluates when enemies should engage the player
   - `ExploreEvaluator.js`: Determines when enemies should explore the level
   - `GetHealthEvaluator.js`: Decides when enemies need to seek health
   - `GetWeaponEvaluator.js`: Evaluates when enemies should acquire better weapons

2. **Goals** (goals/): Represent specific objectives AI can pursue
   - `AttackGoal.js`: Engage and attack the player
   - `ChargeGoal.js`: Rush toward the player
   - `DodgeGoal.js`: Avoid incoming fire
   - `ExploreGoal.js`: Search the level for items or the player
   - `FindPathGoal.js`: Calculate a path to a destination
   - `FollowPathGoal.js`: Navigate along a calculated path
   - `GetItemGoal.js`: Retrieve a specific item
   - `HuntGoal.js`: Track and find the player
   - `SeekToPositionGoal.js`: Move to a specific location

3. **Path Planning**
   - `PathPlanner.js`: A* pathfinding implementation using navigation meshes
   - `PathPlannerTask.js`: Asynchronous path computation to prevent frame drops
   - `NavMeshUtils.js`: Utilities for working with navigation meshes

#### Weapon System (core/WeaponSystem.js)
Manages all weapon functionality:
- Weapon switching and inventory
- Ammunition tracking
- Firing mechanisms
- Reload animations and timing
- Projectile physics
- Hit detection and damage calculation

Weapon types include:
- `AssaultRifle.js`: Rapid-fire, medium damage
- `Blaster.js`: Energy weapon with special effects
- `Shotgun.js`: Wide spread, high damage at close range

#### UI Management (core/UIManager.js)
Handles all user interface elements:
- Health and ammo displays
- Crosshairs
- Damage indicators
- Weapon selection UI
- Game state messages
- Menu overlays

## Asset Pipeline

### 3D Models and Animations
1. Created in Blender (stored in `/blend` directory)
2. Exported to GLB format for web optimization
3. Stored in `/app/models`
4. Animations exported as JSON and stored in `/app/animations`

### Audio
The game uses positional audio for immersion:
- Weapon sounds (shots, reloads)
- Impact effects
- Footsteps
- Item collection sounds

### Level Design
Levels are created in Blender with:
1. Collision geometry
2. Navigation meshes for AI movement
3. Spawn points for enemies and items
4. Lighting information baked into lightmaps

## Build and Deployment

The project uses Rollup.js for bundling:
1. Entry point is `src/main.js`
2. Configuration in `config/rollup/config.js`
3. Output to `build/bundle.js`
4. Static assets served from `/app` directory

## Getting Started

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm start`
4. Open browser at `http://localhost:8080`

### Building for Production
1. Run `npm run build`
2. Deploy the contents of the `build` directory along with the `app` directory to your web server

## Game Mechanics

### Combat System
- Projectile-based weapons with different properties
- Hit detection using raycasting
- Damage system with falloff based on distance
- Visual and audio feedback for hits

### Health System
- Player and enemies have health points
- Health packs restore health when collected
- Damage indicators show direction of incoming attacks

### Spawning System (core/SpawningManager.js)
- Handles enemy and item spawning based on game progression
- Maintains balance through dynamic difficulty adjustment
- Prevents enemies from spawning in player's view

## Future Development
- Additional weapons and enemy types
- More complex level designs
- Multiplayer capabilities
- Performance optimizations for mobile devices
- Enhanced visual effects and post-processing

---

This project demonstrates advanced game development techniques in a web-based environment, blending 3D graphics, AI systems, and responsive gameplay mechanics to create an immersive first-person shooter experience.
