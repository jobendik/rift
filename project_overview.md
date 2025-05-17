# RIFT 3D FPS Game - Technical Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Core Architecture](#core-architecture)
3. [Three.js and Yuka.js Integration](#threejs-and-yukajs-integration)
4. [Entity System Architecture](#entity-system-architecture)
5. [AI and Navigation Systems](#ai-and-navigation-systems)
6. [Player Controls and Interactions](#player-controls-and-interactions)
7. [Weapon System Implementation](#weapon-system-implementation)
8. [Environmental Effects and Rendering](#environmental-effects-and-rendering)
9. [Audio System Implementation](#audio-system-implementation)
10. [User Interface Systems](#user-interface-systems)
11. [Performance Optimizations](#performance-optimizations)
12. [Debug Tools and Development Aids](#debug-tools-and-development-aids)

## Introduction

RIFT is a first-person shooter (FPS) game built with modern web technologies, specifically Three.js for rendering and Yuka.js for game logic and AI. The game showcases advanced techniques for creating immersive 3D experiences in the browser, including realistic physics, intelligent enemy behavior, dynamic lighting, and environmental effects.

This document serves as a comprehensive technical guide to understanding the architectural decisions, implementation details, and integration patterns used throughout the codebase. It's intended as a study guide for developers looking to understand how the various systems interact to create a cohesive gaming experience.

## Core Architecture

### World Class - The Central Controller

The `World` class serves as the main controller for the entire game, managing:

- Scene initialization and setup
- Game loop (via requestAnimationFrame)
- Entity management
- Physics updates
- Rendering pipeline
- Environmental systems

```javascript
class World {
    constructor() {
        // Core systems
        this.entityManager = new EntityManager();
        this.time = new Time();
        
        // Managers
        this.assetManager = null;
        this.spawningManager = new SpawningManager(this);
        this.uiManager = new UIManager(this);
        
        // Rendering
        this.renderer = null;
        this.camera = null;
        this.scene = null;
        
        // Game state
        this.player = null;
        this.competitors = new Array();
        
        // Navigation
        this.navMesh = null;
        this.costTable = null;
        this.pathPlanner = null;
        
        // Environment
        this.environmentSystem = {
            sky: { /* sky configuration */ },
            weather: { /* weather configuration */ },
            effects: { /* visual effects */ }
        };
    }
}
```

The World class initialization follows a structured sequence:
1. Asset loading via AssetManager
2. Scene initialization
3. Weather effects setup
4. Level initialization
5. Enemy spawning
6. Player creation
7. Controls setup
8. UI initialization
9. Animation loop start

### Manager Classes

The architecture employs several manager classes to handle specific aspects of the game:

- **AssetManager**: Loads and provides access to all game assets (models, textures, audio)
- **SpawningManager**: Handles entity spawning and respawning logic
- **UIManager**: Manages all user interface elements
- **WeaponSystem**: Controls weapon behavior, selection, and firing logic

This separation of concerns allows for cleaner code organization and better maintainability.

## Three.js and Yuka.js Integration

The game seamlessly integrates the Three.js rendering library with the Yuka.js AI and entity management framework. This integration is a key architectural feature that allows for a clean separation between game logic and visual representation.

### Entity-Renderer Relationship

The core integration concept involves connecting Yuka's entity system with Three.js visual objects through a component-based approach:

```javascript
// Connecting a Yuka entity with a Three.js object
entity.setRenderComponent(threeJsObject, syncFunction);
```

This approach establishes a relationship between:
- A **Yuka Entity** (handling AI, physics, game logic)
- A **Three.js Object** (handling visual representation)
- A **Sync Function** (handling synchronization between them)

### Synchronization Mechanism

The synchronization function keeps the visual representation aligned with the logical entity:

```javascript
function sync(entity, renderComponent) {
    renderComponent.matrix.copy(entity.worldMatrix);
}
```

Key implementation details:
- Yuka entities manage their own transformation matrices
- Three.js objects use `matrixAutoUpdate = false` to prevent automatic updates
- The sync function copies the Yuka entity matrix to the Three.js object
- The World's update cycle calls the EntityManager, which applies these syncs

### World Management Model

The game uses Yuka's EntityManager as the single source of truth for all entities:

```javascript
// Adding game entities
world.add(entity);

// Implementation in World class
add(entity) {
    this.entityManager.add(entity);
    
    if (entity._renderComponent !== null) {
        this.scene.add(entity._renderComponent);
    }
    
    return this;
}
```

This approach keeps game logic decoupled from the rendering pipeline, making it easier to modify either system without affecting the other.

## Entity System Architecture

The entity system is built on Yuka's entity framework with specialized classes for different game objects.

### Entity Hierarchy

```
GameEntity (Yuka)
├── MovingEntity
│   ├── Vehicle
│   │   └── Enemy
│   └── Player
├── Level
└── Items
    ├── HealthPack
    ├── WeaponItem
```

### Player Entity

The `Player` class implements the player-controlled character with:

- Health and damage management
- Head entity for camera attachment
- Weapon container for visual representation
- AABB collision bounds
- Death and respawn logic
- Animation handling

Key implementation details:
```javascript
class Player extends MovingEntity {
    constructor(world) {
        super();
        
        // Core properties
        this.health = CONFIG.PLAYER.MAX_HEALTH;
        this.maxHealth = CONFIG.PLAYER.MAX_HEALTH;
        this.status = STATUS_ALIVE;
        
        // Head for camera positioning
        this.head = new GameEntity();
        this.add(this.head);
        
        // Weapon handling
        this.weaponContainer = new GameEntity();
        this.head.add(this.weaponContainer);
        this.weaponSystem = new WeaponSystem(this);
        
        // Collision detection
        this.bounds = new AABB();
        this.boundsDefinition = new AABB(
            new Vector3(-0.25, 0, -0.25), 
            new Vector3(0.25, 1.8, 0.25)
        );
    }
}
```

### Enemy Entity

The `Enemy` class represents AI-controlled opponents with sophisticated behavior systems:

- Goal-oriented action planning via the `Think` component
- Vision system for detecting players and obstacles
- Memory system for tracking seen entities
- Path planning and navigation
- Weapon selection and aiming
- Animation state management

The AI architecture uses a hierarchical system of goals and evaluators:
```javascript
// Goal-driven agent design
this.brain = new Think(this);
this.brain.addEvaluator(new AttackEvaluator());
this.brain.addEvaluator(new ExploreEvaluator());
this.brain.addEvaluator(new GetHealthEvaluator(1, HEALTH_PACK));
this.brain.addEvaluator(new GetWeaponEvaluator(1, WEAPON_TYPES_ASSAULT_RIFLE));
this.brain.addEvaluator(new GetWeaponEvaluator(1, WEAPON_TYPES_SHOTGUN));
```

## AI and Navigation Systems

### Goal-Oriented Action Planning (GOAP)

The AI system uses goal-oriented action planning to create realistic and adaptive enemy behavior:

1. **Evaluators** assess different possible actions based on context:
   - `AttackEvaluator`: Determines when to attack the player
   - `ExploreEvaluator`: Evaluates when exploration is appropriate
   - `GetHealthEvaluator`: Prioritizes health collection when injured
   - `GetWeaponEvaluator`: Evaluates weapon acquisition based on needs

2. **Goals** represent high-level behaviors that break down into sub-goals:
   - `AttackGoal`: Combat behavior (shooting, approaching)
   - `ExploreGoal`: Wandering and exploration of the level
   - `GetItemGoal`: Seeking and acquiring items on the map
   - `HuntGoal`: Actively searching for the player

3. **Sub-goals** handle specific tactical actions:
   - `ChargeGoal`: Approaching target aggressively
   - `DodgeGoal`: Evasive movement when under attack
   - `FindPathGoal`: Computing paths to targets
   - `FollowPathGoal`: Following computed paths
   - `SeekToPositionGoal`: Moving to specific positions

### Perception Systems

Enemy perception relies on three core systems:

1. **Vision System**:
   ```javascript
   this.vision = new Vision(this.head);
   this.visionRegulator = new Regulator(CONFIG.BOT.VISION.UPDATE_FREQUENCY);
   ```
   - Line-of-sight checks using ray casting
   - Field of view limitations
   - Distance-based perception

2. **Memory System**:
   ```javascript
   this.memorySystem = new MemorySystem(this);
   this.memorySystem.memorySpan = CONFIG.BOT.MEMORY.SPAN;
   ```
   - Remembers last known positions of other entities
   - Tracks entities even when out of sight (for a limited time)
   - Enables hunting behavior for previously seen targets

3. **Target System**:
   ```javascript
   this.targetSystem = new TargetSystem(this);
   this.targetSystemRegulator = new Regulator(CONFIG.BOT.TARGET_SYSTEM.UPDATE_FREQUENCY);
   ```
   - Prioritizes targets based on threat level
   - Manages target acquisition and tracking
   - Determines when to switch targets

### Navigation and Pathfinding

The navigation system uses Yuka's navigation mesh capabilities with custom enhancements:

1. **NavMesh** represents the walkable areas of the level:
   - Loaded from a pre-calculated navigation mesh geometry
   - Defines polygonal regions that characters can traverse
   - Provides spatial queries for position validation

2. **PathPlanner** handles asynchronous path calculation:
   ```javascript
   // Asynchronous path finding
   findPath(vehicle, from, to, callback) {
       const task = new PathPlannerTask(this, vehicle, from, to, callback);
       this.taskQueue.enqueue(task);
   }
   ```
   - Uses a task-based system to prevent frame drops
   - Computes optimal paths between regions
   - Returns path as a series of waypoints

3. **Steering Behaviors** control movement along the calculated paths:
   ```javascript
   // Steering behaviors for navigation
   const followPathBehavior = new FollowPathBehavior();
   const onPathBehavior = new OnPathBehavior();
   const seekBehavior = new SeekBehavior();
   ```
   - `FollowPathBehavior`: Follows the sequence of waypoints
   - `OnPathBehavior`: Keeps the entity on the path
   - `SeekBehavior`: Moves directly toward a target

## Player Controls and Interactions

### First-Person Controls

The `FirstPersonControls` class manages player input and camera control:

- Mouse-look for camera rotation
- WASD/arrow keys for movement
- Key bindings for weapon selection
- Mouse buttons for firing and aiming
- Head bobbing for walking simulation
- Camera position syncing with player entity

Key implementation details:
```javascript
// Mouse movement handling
_onMouseMove(event) {
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    
    this.yaw -= movementX * 0.002;
    this.pitch -= movementY * 0.002;
    
    this.pitch = Math.max(-PI_2, Math.min(PI_2, this.pitch));
    
    this._updateRotation();
}

// Movement input handling
_onKeyDown(event) {
    switch(event.keyCode) {
        case 87: // w
            this.input.forward = true;
            break;
        case 65: // a
            this.input.left = true;
            break;
        // More key handlers...
    }
}
```

### Collision Detection

Player collision uses an Axis-Aligned Bounding Box (AABB) approach:

```javascript
// Collision bounds definition
this.bounds = new AABB();
this.boundsDefinition = new AABB(
    new Vector3(-0.25, 0, -0.25), 
    new Vector3(0.25, 1.8, 0.25)
);
```

The collision system ensures:
- Player can't walk through walls or obstacles
- Player stays within level boundaries
- Player can't pass through other characters

### Player-World Interaction

The player interacts with the world through several mechanisms:

1. **Projectile Intersection**:
   ```javascript
   checkProjectileIntersection(projectile, intersectionPoint) {
       // Logic to detect hits against entities
   }
   ```
   
2. **Item Collection**:
   - Proximity detection for health packs and weapons
   - Automatic collection on overlap
   - Inventory management for acquired items

3. **Damage System**:
   ```javascript
   receiveDamage(amount, attacker) {
       if (this.status === STATUS_ALIVE) {
           this.health -= amount;
           
           if (this.health <= 0) {
               this.health = 0;
               this.initDeath();
           }
       }
   }
   ```

## Weapon System Implementation

### Weapon Base Class

The `Weapon` class defines a common interface for all weapons:

```javascript
class Weapon {
    constructor(owner) {
        this.owner = owner;
        this.ammoRemaining = 0;
        this.ammoCapacity = 0;
        this.reloading = false;
        this.ready = true;
        this.automatic = false;
    }
    
    shoot() { /* Abstract method */ }
    reload() { /* Abstract method */ }
    changeWeapon() { /* Abstract method */ }
}
```

Key features include:
- Ammo management (remaining, capacity)
- Weapon state tracking (ready, reloading)
- Owner reference for positioning and control
- Abstract methods for weapon-specific behavior

### Weapon Types

The game implements several weapon types with unique characteristics:

1. **Blaster**:
   - Basic starting weapon
   - Unlimited ammo
   - Moderate fire rate and damage

2. **Shotgun**:
   - Multiple projectiles in a spread pattern
   - High damage at close range
   - Limited ammunition and slower reload

3. **Assault Rifle**:
   - Rapid-fire automatic weapon
   - Medium range effectiveness
   - Limited ammunition with larger magazine

### Projectile System

The projectile system handles bullet physics and collision:

```javascript
// Projectile creation
const ray = new Ray();
head.getWorldPosition(ray.origin);
head.getWorldDirection(ray.direction);

// Adding bullet to world
world.addBullet(owner, ray);
```

Projectile features:
- Ray-based collision detection
- Visual tracer effects
- Impact effects on hit
- Damage calculation based on weapon type and distance

### Weapon Selection

The `WeaponSystem` class manages the player's arsenal:

```javascript
class WeaponSystem {
    constructor(owner) {
        this.owner = owner;
        this.weapons = new Array();
        this.currentWeapon = null;
        this.weaponTransitionTime = 0.3;
        this.transitioning = false;
    }
    
    changeWeapon(weaponType) {
        // Logic to switch between weapons
    }
}
```

Features include:
- Weapon inventory management
- Smooth weapon switching animations
- Weapon-specific positioning and animations
- Automatic reloading when empty

## Environmental Effects and Rendering

### Sky and Time of Day System

The game implements a dynamic sky system with time-of-day changes:

```javascript
// Sky and weather animation system
this.environmentSystem = {
    sky: {
        enabled: true,             // Whether to animate the sky
        cycleDuration: 120,        // Full day/night cycle in seconds
        currentTime: 0,            // Current time in the cycle
        lastTimeOfDay: 'day',      // Tracking last time of day
        transitioning: false,      // Whether we're in a transition
        transitionParams: null,    // Parameters for current transition
    },
    // ... additional configuration
}
```

Features include:
- Day/night cycle with transitional periods (dawn, dusk)
- Color changes for different times of day
- Lighting adjustments based on time
- Smooth transitions between time states

### Weather System

The weather system creates dynamic atmospheric conditions:

```javascript
weather: {
    enabled: true,             // Whether to animate weather
    currentType: 'clear',      // Current weather type
    targetType: 'clear',       // Target weather type for transitions
    transitionProgress: 1.0,   // Progress of current transition
    transitionDuration: 10.0,  // Duration of weather transitions
    changeInterval: {
        min: 20,               // Minimum time between changes
        max: 40                // Maximum time between changes
    },
    types: {
        'clear': { /* parameters */ },
        'cloudy': { /* parameters */ },
        'rainy': { /* parameters */ },
        'storm': { /* parameters */ },
        'foggy': { /* parameters */ }
    }
}
```

Weather effects include:
- Fog density variations
- Rain particle systems
- Cloud coverage changes
- Lightning effects
- Wind strength variations

### Rendering Pipeline

The rendering system leverages Three.js capabilities:

```javascript
// Renderer setup
this.renderer = new WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
});
this.renderer.outputColorSpace = SRGBColorSpace;
this.renderer.shadowMap.enabled = true;
```

Key rendering features:
- PBR (Physically Based Rendering) materials
- Dynamic shadows
- Post-processing effects
- SRGB color space for accurate color reproduction
- Efficient rendering optimizations

## Audio System Implementation

### Audio Management

The `AssetManager` handles loading and management of all audio assets:

```javascript
// Audio setup
this.audioLoader = new AudioLoader(this.loadingManager);
this.listener = new AudioListener();
this.audios = new Map();

// Loading audio
_loadAudios() {
    const blasterShot = new PositionalAudio(listener);
    blasterShot.matrixAutoUpdate = false;
    
    // Load audio buffer
    audioLoader.load('assets/audio/blaster_shot.mp3', buffer => {
        blasterShot.setBuffer(buffer);
        blasterShot.setRefDistance(20);
        blasterShot.setVolume(CONFIG.AUDIO.VOLUME_WEAPON);
    });
    
    audios.set('blaster_shot', blasterShot);
    // ... more audio loading
}
```

### Spatial Audio

The game uses Three.js's spatial audio capabilities:

- **Positional Audio**: Sounds that emanate from specific points in 3D space
- **Reference Distance**: Controls how quickly sounds attenuate with distance
- **Volume Control**: Different sound categories have different volume levels

Implementation details:
```javascript
// Clone audio for entity usage
cloneAudio(source) {
    const audio = new source.constructor(source.listener);
    audio.buffer = source.buffer;
    return audio;
}

// Using audio in a weapon
shoot() {
    const audio = this.audios.get('shot');
    if (audio.isPlaying === true) audio.stop();
    audio.play();
}
```

### Audio Categories

The game organizes sounds into several categories:

1. **Weapon Sounds**:
   - Shooting effects
   - Reload sounds
   - Empty magazine clicks

2. **Movement Sounds**:
   - Footsteps
   - Jumping
   - Landing

3. **Impact Sounds**:
   - Bullet impacts on different materials
   - Explosions
   - Physical collisions

4. **Environmental Sounds**:
   - Weather effects (rain, thunder)
   - Ambient background sounds
   - Time-of-day specific ambience

## User Interface Systems

### UI Manager

The `UIManager` class handles all user interface elements:

```javascript
class UIManager {
    constructor(world) {
        this.world = world;
        
        // Interface elements
        this.fpsInterface = document.getElementById('fps-interface');
        this.crosshair = document.getElementById('crosshair');
        this.healthBar = document.getElementById('health');
        this.ammoDisplay = document.getElementById('ammo');
        this.messageArea = document.getElementById('messages');
        
        // UI state
        this.damageOverlay = document.getElementById('damage-overlay');
        this.damageAlpha = 0;
    }
}
```

The UI system combines HTML/CSS elements with Three.js sprites for different interface needs.

### HUD Elements

Key HUD (Heads-Up Display) elements include:

1. **Health Bar**:
   - Visual representation of player health
   - Color changes at critical health levels
   - Animated transitions on damage

2. **Ammo Counter**:
   - Current ammunition display
   - Magazine and reserve ammo counters
   - Visual feedback during reloading

3. **Crosshair**:
   - Dynamic crosshair that changes with movement
   - Weapon-specific crosshair styles
   - Hit indication when successfully damaging enemies

### Damage and Status Effects

The UI provides feedback for player status:

```javascript
// Show damage overlay
showDamageOverlay() {
    this.damageAlpha = 1.0;
    this.damageOverlay.style.opacity = this.damageAlpha;
    
    // Fade out over time
    // ...
}

// Update health display
updateHealth(value) {
    const percentage = (value / 100) * 100;
    this.healthBar.style.width = percentage + '%';
    
    // Color changes based on health
    if (percentage < 25) {
        this.healthBar.style.backgroundColor = '#ff0000';
    } else if (percentage < 50) {
        this.healthBar.style.backgroundColor = '#ff9900';
    } else {
        this.healthBar.style.backgroundColor = '#00ff00';
    }
}
```

### Message System

The game includes a message system for game events:

- Kill notifications
- Item pickups
- Game state messages
- Objective updates

## Performance Optimizations

### Spatial Partitioning

The game uses Yuka's spatial partitioning for efficient entity management:

```javascript
// Cell-space partitioning for efficient spatial queries
this.spatialIndex = new CellSpacePartitioning(
    new Vector3(-100, -20, -100),
    new Vector3(100, 20, 100),
    10, 2, 10
);
```

This optimization enables:
- Fast neighbor queries
- Efficient collision detection
- Reduced computational complexity for spatial operations

### Asynchronous Path Planning

Path planning occurs asynchronously to prevent frame rate drops:

```javascript
// PathPlanner implementation
findPath(vehicle, from, to, callback) {
    const task = new PathPlannerTask(this, vehicle, from, to, callback);
    this.taskQueue.enqueue(task);
}
```

This approach ensures:
- Computationally intensive path calculations don't block the main thread
- Path planning can be distributed across multiple frames
- Smooth gameplay even with multiple AI entities calculating paths

### Level of Detail

The game implements level of detail (LOD) optimizations:

- Reduced update frequency for distant entities
- Simplified physics for out-of-view entities
- Regulator system for spreading computations over time:
  ```javascript
  this.visionRegulator = new Regulator(CONFIG.BOT.VISION.UPDATE_FREQUENCY);
  ```

## Debug Tools and Development Aids

### Visual Debugging

The game includes extensive visual debugging tools:

```javascript
this.helpers = {
    convexRegionHelper: null,
    spatialIndexHelper: null,
    axesHelper: null,
    graphHelper: null,
    pathHelpers: new Array(),
    spawnHelpers: new Array(),
    uuidHelpers: new Array(),
    skeletonHelpers: new Array(),
    itemHelpers: new Array()
};
```

These helpers provide visualization for:
- Navigation mesh regions
- Path planning results
- Entity bounds and skeletons
- Spatial partitioning cells
- World coordinate axes

### Orbit Camera Mode

A debug orbit camera allows inspection of the game world:

```javascript
this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
this.orbitControls.enabled = this.debug;
```

This camera enables:
- Free movement around the scene
- Zooming in/out for detailed inspection
- Examining the level from any angle

### Performance Monitoring

Debug tools for performance include:

- Frame rate monitoring
- Entity count tracking
- Path planning timing statistics
- Memory usage monitoring

These tools help identify bottlenecks and optimization opportunities during development.

---

This document serves as a comprehensive overview of the RIFT 3D first-person shooter game architecture. It explains the core systems, their interactions, and the technical decisions behind the implementation. Developers can use this as a guide to understand the codebase and learn from its design patterns for their own projects.
