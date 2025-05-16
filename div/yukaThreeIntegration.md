# Yuka.js and Three.js Integration Guide

## Introduction

This document explains how the RIFT game engine successfully integrates the Yuka.js AI and entity management library with the Three.js rendering library. This integration provides valuable insights for developers looking to use Yuka.js with other rendering engines like PlayCanvas.

## Core Integration Concepts

### 1. Entity-Renderer Relationship

The core of the integration revolves around connecting Yuka's entity system with Three.js visual representations through a **component-based approach**:

```javascript
// Connecting a Yuka entity with a Three.js object
entity.setRenderComponent(threeJsObject, syncFunction);
```

The `setRenderComponent` method is the primary bridge between the two libraries, establishing a relationship between:
- A **Yuka Entity** (AI, physics, game logic)
- A **Three.js Object** (visual representation)
- A **Sync Function** (synchronization logic)

### 2. Synchronization Function

The synchronization function is a simple but crucial piece that keeps the visual representation aligned with the logical entity:

```javascript
function sync(entity, renderComponent) {
  renderComponent.matrix.copy(entity.worldMatrix);
}
```

Key points:
- Yuka's entities manage their own transformation matrices
- The sync function copies this matrix to the Three.js object
- Three.js objects use `matrixAutoUpdate = false` to prevent automatic updates
- Custom sync functions can be created for special cases (like camera sync)

### 3. Entity Management System

The RIFT engine uses Yuka's EntityManager as the single source of truth for all game entities:

```javascript
// World.js
this.entityManager = new EntityManager();

// Adding entities
this.entityManager.add(entity);

// Removing entities
this.entityManager.remove(entity);

// Updating all entities in the game loop
this.entityManager.update(delta);
```

This approach keeps the game logic decoupled from the rendering pipeline.

## Navigation and Pathfinding

### 1. NavMesh Integration

Yuka's navigation mesh system works with Three.js geometries through conversion processes:

```javascript
// Loading a navmesh from a Three.js geometry
const navMeshGeometry = new MeshGeometry(threeJsGeometry);
const navMesh = new NavMesh();
navMesh.fromMeshGeometry(navMeshGeometry);
```

### 2. Asynchronous Path Planning

RIFT implements asynchronous path planning using Yuka's task system to prevent frame drops:

```javascript
// PathPlanner.js
findPath(vehicle, from, to, callback) {
  const task = new PathPlannerTask(this, vehicle, from, to, callback);
  this.taskQueue.enqueue(task);
}

// Updating the task queue each frame
update() {
  this.taskQueue.update();
}
```

### 3. Path Visualization

For debugging, NavMeshUtils converts Yuka's navigation data to Three.js visualization objects:

```javascript
// NavMeshUtils.js
static createConvexRegionHelper(navMesh) {
  // Create Three.js visualization for navmesh regions
}

static createPathHelper() {
  // Create Three.js visualization for paths
}
```

## AI System Integration

### 1. Steering Behaviors

Yuka's steering behaviors are applied to entities and visualized in Three.js:

```javascript
// Enemy.js extends Vehicle from Yuka
const followPathBehavior = new FollowPathBehavior();
enemy.steering.add(followPathBehavior);
```

### 2. Goal-Oriented Action Planning (GOAP)

The AI system uses Yuka's GOAP components with custom goals and evaluators:

```javascript
// Enemy.js
this.brain = new Think(this);
this.brain.addEvaluator(new AttackEvaluator(CONFIG.EVALUATOR.ATTACK));
this.brain.addEvaluator(new ExploreEvaluator(CONFIG.EVALUATOR.EXPLORE));
```

### 3. Perception Systems

Yuka's perception systems (Vision, Memory) are integrated with Three.js raycasting:

```javascript
// Vision system uses raycasting for line-of-sight checks
if (ray.intersectBVH(this.bvh, intersectionPoint)) {
  // Vision blocked by obstacle
}
```

## Animation Integration

### 1. Animation Management

Yuka entities control Three.js animations through the AnimationMixer:

```javascript
// Loading animations
const animations = assetManager.animations;
const mixer = new AnimationMixer(renderComponent);
const clip = animations.get('walk');
const action = mixer.clipAction(clip);
```

### 2. State-Based Animation Control

Animation changes are triggered by entity state changes:

```javascript
// Changing animation based on entity state
if (this.currentState === 'walking') {
  this.walkAction.play();
  this.idleAction.stop();
}
```

## UI and Effects Integration

### 1. HUD Elements

The UI combines HTML elements with Three.js sprites for in-world indicators:

```javascript
// Creating Three.js sprite for crosshairs
const crosshairsTexture = assetManager.textures.get('crosshairs');
const crosshairsMaterial = new SpriteMaterial({ map: crosshairsTexture });
const crosshairs = new Sprite(crosshairsMaterial);
```

### 2. Damage Indicators

Damage direction indicators use Three.js sprites in 3D space:

```javascript
// Showing damage indicators
this.sprites.frontIndicator.visible = true;
this.endTimeDamageIndicationFront = this.currentTime + this.damageIndicationTime;
```

## Performance Optimizations

### 1. Spatial Partitioning

Yuka's spatial partitioning is used for efficient entity queries:

```javascript
// Creating spatial index
this.spatialIndex = new CellSpacePartitioning(bounds, cellsX, cellsY, cellsZ);
this.spatialIndex.addEntity(entity);
```

### 2. Matrix Updates

Performance is optimized by managing matrix updates:

```javascript
// Disable automatic matrix updates
renderComponent.matrixAutoUpdate = false;
renderComponent.updateMatrix();

// Apply to all children
renderComponent.traverse((object) => {
  if (object.isMesh) {
    object.matrixAutoUpdate = false;
    object.updateMatrix();
  }
});
```

### 3. Task-Based Concurrency

Heavy operations use Yuka's task system to prevent blocking the main thread:

```javascript
// Processing pathfinding requests asynchronously
pathPlanner.update();
```

## Key Integration Points for PlayCanvas

When integrating Yuka with PlayCanvas, focus on these key areas:

1. **Entity-Renderer Relationship**:
   - Create a custom sync function for PlayCanvas entity transforms
   - Handle PlayCanvas's scene graph structure appropriately

2. **Matrix Management**:
   - PlayCanvas uses a different matrix system; conversion will be needed
   - Ensure proper synchronization between Yuka's matrices and PlayCanvas transforms

3. **Navigation Mesh Integration**:
   - Convert PlayCanvas meshes to formats usable by Yuka's navmesh system
   - Create custom visualization helpers for PlayCanvas

4. **Animation System Bridge**:
   - Create an adapter between Yuka entity states and PlayCanvas animation system
   - Handle PlayCanvas's animation blending appropriately

5. **UI and Effects**:
   - Adapt Yuka-driven UI updates to work with PlayCanvas UI system
   - Consider PlayCanvas's particle systems for effects

## Conclusion

The RIFT engine demonstrates that successful integration between Yuka.js and a rendering engine like Three.js is achieved through:

1. Clear separation of concerns (logic vs. rendering)
2. Well-defined synchronization points
3. Consistent entity management
4. Performance-conscious design decisions

The same principles can be applied when integrating Yuka with PlayCanvas, focusing on the specific requirements and capabilities of the PlayCanvas engine while maintaining the clean architecture demonstrated in the RIFT implementation.
