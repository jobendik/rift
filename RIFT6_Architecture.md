# RIFT6 Game Engine Architecture

## Table of Contents
1. [Introduction](#introduction)
2. [Core Systems](#core-systems)
3. [Entity Framework](#entity-framework)
4. [Weapon Framework](#weapon-framework)
5. [AI System](#ai-system)
6. [Control Systems](#control-systems)
7. [Effects and Visual Enhancements](#effects-and-visual-enhancements)
8. [Utility Systems](#utility-systems)
9. [File Structure](#file-structure)
10. [Build and Deployment](#build-and-deployment)

## Introduction

RIFT6 is a first-person shooter game engine built on top of Three.js for rendering and YUKA for AI and gameplay logic. The engine provides a robust framework for creating immersive 3D shooter experiences with advanced AI behavior, weapons systems, and physics.

## Core Systems

### Asset Management System
The `AssetManager` handles loading and managing all assets including:
- 3D Models (GLTF format)
- Animations
- Audio files
- Textures
- Configuration files
- Navigation meshes

The asset manager provides centralized access to all game resources through a series of maps:
```javascript
this.animations = new Map();
this.audios = new Map();
this.configs = new Map();
this.models = new Map();
this.textures = new Map();
```

Asset loading occurs asynchronously during initialization with progress tracking through a loading manager.

**Located in**: `src/core/AssetManager.js`

### World System
The `World` class serves as the main container for the game scene, handling:
- Scene initialization and setup
- Physics updates
- Rendering pipeline
- Game loop management
- Entity management (adding, removing, updating)
- Projectile intersection detection
- Camera and lighting setup

The world class maintains references to:
- The scene graph
- The renderer
- The player entity
- All competitor entities
- The navigation mesh
- Helper visualization objects for debugging

**Located in**: `src/core/World.js`

### UI Management
The `UIManager` handles all user interface elements, including:
- HUD elements (health, ammo)
- Crosshairs
- Damage indicators
- Frag messages
- Debug UI
- Screen overlays
- Loading screens

The UI manager creates both HTML-based UI elements and Three.js sprites for 3D-positioned UI elements.

**Located in**: `src/core/UIManager.js`

### Weapon System
The `WeaponSystem` manages all aspects of weapons including:
- Weapon inventory
- Weapon selection
- Aiming
- Shooting
- Reloading
- Weapon switching
- Fuzzy logic for AI weapon selection

**Located in**: `src/core/WeaponSystem.js`

### Spawning Manager
The `SpawningManager` is responsible for:
- Managing spawn points
- Respawning players and enemies
- Spawning items (health, weapons)
- Creating trigger regions for items

**Located in**: `src/core/SpawningManager.js`

## Entity Framework

### Base Entities
The entity framework is built on YUKA's entity system, with specialized classes for:

- `GameEntity`: Base class for all game objects
- `MovingEntity`: Base class for entities that can move
- `Vehicle`: Base class for entities with steering behaviors

### Player Entity
The `Player` class (`src/entities/Player.js`) represents the human-controlled player and includes:
- Health and damage management
- Weapon handling
- Movement controls
- Death and respawn logic
- Camera positioning
- Collision detection
- Message handling for events

Key features:
```javascript
// Player structure
this.head = new GameEntity(); // For camera attachment
this.weaponContainer = new GameEntity(); // For weapon models
this.weaponSystem = new WeaponSystem(this);
this.bounds = new AABB(); // For collision detection
```

### Enemy Entity
The `Enemy` class (`src/entities/Enemy.js`) represents AI-controlled opponents with:
- Advanced AI behavior using goal-oriented action planning
- Pathfinding and navigation
- Target acquisition and tracking
- Weapon selection and combat decisions
- Animation management
- Vision and perception systems
- Memory for tracking encountered entities

Key components:
```javascript
// AI components
this.brain = new Think(this);
this.memorySystem = new MemorySystem(this);
this.targetSystem = new TargetSystem(this);
this.vision = new Vision(this.head);
this.path = null; // Current navigation path
```

### Item Entities
- `HealthPack`: Healing items that can be picked up
- `WeaponItem`: Weapon pickups for players and enemies

## Weapon Framework

### Base Weapon Class
`Weapon` (`src/weapons/Weapon.js`) defines the common interface for all weapons:
- Ammo management
- Firing logic
- Reloading
- Weapon state (ready, reloading, out of ammo)
- Base weapon properties (damage, fire rate)

### Weapon Types
The engine includes several weapon implementations:

1. **Blaster** (`src/weapons/Blaster.js`)
   - Basic weapon with moderate fire rate
   - Default starting weapon

2. **Shotgun** (`src/weapons/Shotgun.js`)
   - Multiple projectiles in a spread pattern
   - High damage at close range, less effective at distance

3. **Assault Rifle** (`src/weapons/AssaultRifle.js`)
   - Rapid-fire automatic weapon
   - Good for sustained damage

### Projectile System
The projectile system handles bullets and their effects:
- `Bullet` class for visualizing projectiles
- Ray casting for hit detection
- Impact effects and damage calculation
- Muzzle flash effects

Bullet creation and hit detection:
```javascript
// Create bullet and determine hit
const ray = new Ray();
head.getWorldPosition(ray.origin);
head.getWorldDirection(ray.direction);
const result = world.checkProjectileIntersection(projectile, intersectionPoint);
```

## AI System

### Pathfinding
- `PathPlanner`: Handles asynchronous path finding using YUKA's task system
- `PathPlannerTask`: Individual pathfinding operations
- Navigation mesh for representing traversable areas

### Goal-Oriented Action Planning (GOAP)
AI uses a hierarchical goal system with various evaluators and goals:

#### Evaluators
- `AttackEvaluator`: Determines when to attack
- `ExploreEvaluator`: Evaluates exploration options
- `GetHealthEvaluator`: Prioritizes health collection
- `GetWeaponEvaluator`: Evaluates weapon acquisition

#### Goals
- `AttackGoal`: High-level combat behavior
- `ChargeGoal`: Approaching target aggressively
- `DodgeGoal`: Evasive movement when under attack
- `ExploreGoal`: Wandering and exploration
- `FindPathGoal`: Computing paths to targets
- `FollowPathGoal`: Following computed paths
- `GetItemGoal`: Acquiring items on the map
- `HuntGoal`: Actively searching for the player
- `SeekToPositionGoal`: Moving to specific positions

### Perception Systems
- `Vision`: Line-of-sight checks for enemies
- `MemorySystem`: Remembering entity positions and states
- `TargetSystem`: Selecting and tracking targets

## Control Systems

### First-Person Controls
The `FirstPersonControls` class (`src/controls/FirstPersonControls.js`) handles:
- Mouse-look camera control
- WASD movement
- Weapon aiming
- Shooting input
- Head bobbing for walking
- Weapon movement effects

Input handling:
```javascript
// Key mapping
case 87: // w
  this.input.forward = true;
  break;
case 65: // a
  this.input.left = true;
  break;
// ...
case 49: // 1
  this.owner.changeWeapon(WEAPON_TYPES_BLASTER);
  break;
```

### Orbit Controls
For debugging, an orbit camera is available that allows:
- Panning around the level
- Zooming in and out
- Examining the scene from different angles

## Effects and Visual Enhancements

### Animation System
- Character animations based on Three.js `AnimationMixer`
- Blending between different movement animations
- Weapon animations for shooting, reloading
- Death animations

### Lighting and Environment
- Directional lighting for shadows
- Hemisphere lighting for ambient illumination
- Sky system for environmental backdrop

### Visual Effects
- Muzzle flashes for weapon firing
- Damage indicators in UI
- Hit indications for successful attacks
- Crosshair feedback

## Utility Systems

### Debug Tools
Extensive debugging features are available:
- Visualizing navigation mesh regions
- Path visualization for AI
- Entity bounds visualization
- Spatial index visualization
- Wireframe mode for level geometry
- UUID labels for entities

### Helpers
- `NavMeshUtils`: Navigation mesh visualization
- `SceneUtils`: Helper functions for scene manipulation
- `CharacterBounds`: Collision detection for characters

## File Structure

```
RIFT6/
├── src/
│   ├── core/
│   │   ├── AssetManager.js    # Asset loading and management
│   │   ├── Config.js          # Game configuration constants
│   │   ├── Constants.js       # Game constants
│   │   ├── SpawningManager.js # Entity spawning
│   │   ├── TargetSystem.js    # AI targeting
│   │   ├── UIManager.js       # User interface
│   │   ├── WeaponSystem.js    # Weapon management
│   │   └── World.js           # Main game world
│   │
│   ├── controls/
│   │   └── FirstPersonControls.js # Player controls
│   │
│   ├── entities/
│   │   ├── Enemy.js           # AI-controlled opponents
│   │   ├── HealthPack.js      # Health pickup items
│   │   ├── Level.js           # Level geometry
│   │   ├── Player.js          # Player entity
│   │   └── WeaponItem.js      # Weapon pickups
│   │
│   ├── etc/
│   │   ├── CharacterBounds.js # Character collision
│   │   ├── NavMeshUtils.js    # Navigation mesh utilities
│   │   ├── PathPlanner.js     # AI path planning
│   │   ├── PathPlannerTask.js # Pathfinding tasks
│   │   └── SceneUtils.js      # Scene helper functions
│   │
│   ├── evaluators/
│   │   ├── AttackEvaluator.js    # AI combat evaluation
│   │   ├── ExploreEvaluator.js   # AI exploration
│   │   ├── GetHealthEvaluator.js # AI health seeking
│   │   └── GetWeaponEvaluator.js # AI weapon seeking
│   │
│   ├── goals/
│   │   ├── AttackGoal.js        # AI attack goal
│   │   ├── ChargeGoal.js        # AI charge behavior
│   │   ├── DodgeGoal.js         # AI evasion behavior
│   │   ├── ExploreGoal.js       # AI exploration
│   │   ├── FindPathGoal.js      # AI pathfinding
│   │   ├── FollowPathGoal.js    # AI path following
│   │   ├── GetItemGoal.js       # AI item acquisition
│   │   ├── HuntGoal.js          # AI hunting behavior
│   │   └── SeekToPositionGoal.js # AI positioning
│   │
│   ├── triggers/
│   │   └── ItemGiver.js        # Trigger for item pickup
│   │
│   ├── weapons/
│   │   ├── AssaultRifle.js     # Assault rifle implementation
│   │   ├── Blaster.js          # Blaster implementation
│   │   ├── Bullet.js           # Projectile implementation
│   │   ├── Projectile.js       # Projectile base
│   │   ├── Shotgun.js          # Shotgun implementation
│   │   └── Weapon.js           # Base weapon class
│   │
│   ├── effects/
│   │   └── Sky.js              # Sky background effect
│   │
│   └── main.js                 # Main entry point
│
├── assets/
│   ├── models/                 # 3D models and animations
│   ├── textures/               # Texture files
│   ├── audio/                  # Sound effects and music
│   └── config/                 # Configuration files
│
└── index.html                  # Main HTML file
```

## Build and Deployment

The RIFT6 engine is built to run in modern web browsers, leveraging:
- Three.js for 3D rendering
- YUKA for AI and game entity management
- JavaScript ES6 modules for code organization

Key components for building and running:
- ES6 module loading for component organization
- Asset loading through `AssetManager`
- Responsive design for different screen sizes
- Resource management for consistent performance

---

This document provides an overview of the RIFT6 game engine architecture. For more detailed information on specific components, refer to the JSDoc comments in the individual source files.
