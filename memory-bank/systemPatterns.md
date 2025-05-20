# RIFT: System Patterns

## High-Level Architecture

RIFT implements a hybrid component-entity architecture that integrates Three.js (for rendering) with Yuka.js (for game logic and AI). This architecture creates a clean separation between visual representation and game logic, allowing each system to focus on its specific responsibilities.

```mermaid
flowchart TD
    World["World (Central Controller)"] --> EntityManager
    World --> AssetManager
    World --> SpawningManager
    World --> UIManager
    World --> PathPlanner
    World --> Sky["EnvironmentSystem (Sky/Weather)"]
    
    EntityManager --> Entities["Game Entities"]
    Entities --> Player
    Entities --> Enemies
    Entities --> Items
    Entities --> Level
    
    AssetManager --> Models
    AssetManager --> Textures
    AssetManager --> Audio
    AssetManager --> Animations
    
    SpawningManager --> Spawning["Spawn Points"]
    SpawningManager --> ItemManagement["Item Management"]
    
    UIManager --> HUD["Heads-Up Display"]
    UIManager --> Menus
    UIManager --> MessageSystem
    
    Player --> WeaponSystem
    Player --> Controls["FirstPersonControls"]
    
    Enemies --> AI["Goal-Oriented AI"]
    AI --> Goals
    AI --> Evaluators
    AI --> Perception
    AI --> Memory
    
    PathPlanner --> NavMesh
    PathPlanner --> CostTable
```

## Core System Components

### World Class

The `World` class serves as the central controller for the entire game, responsible for:
- Initializing and managing all subsystems
- Coordinating the game loop
- Managing scene setup and rendering
- Handling entity lifecycle
- Providing centralized access to shared resources

Pattern: **Facade Pattern** - Provides a simplified interface to the complex underlying systems.

### Entity-Component Relationship

A key architectural pattern in RIFT is the relationship between logical entities and their visual representations:

```mermaid
flowchart LR
    YukaEntity["Yuka Entity (Logic)"] --> SyncFunction["Sync Function"]
    ThreeObject["Three.js Object (Visual)"] --> SyncFunction
    SyncFunction --> EntityRenderComponent["Entity Render Component"]
```

Key implementation:
```javascript
entity.setRenderComponent(threeJsObject, syncFunction);
```

Pattern: **Bridge Pattern** - Decouples abstraction (game entity) from implementation (visual representation).

### Game Entity Hierarchy

```mermaid
flowchart TD
    GameEntity["GameEntity (Base)"] --> MovingEntity
    GameEntity --> Level
    GameEntity --> Items
    
    MovingEntity --> Vehicle
    MovingEntity --> Player
    
    Vehicle --> Enemy
    
    Items --> HealthPack
    Items --> WeaponItem
```

Pattern: **Composite Pattern** - Allows building complex entity hierarchies while treating individual objects and compositions uniformly.

## Key Subsystems

### AI Architecture

RIFT implements a sophisticated AI system using Goal-Oriented Action Planning (GOAP):

```mermaid
flowchart TD
    AI["Enemy AI"] --> Brain["Think Component"]
    Brain --> Evaluators
    Brain --> Goals
    
    Evaluators --> AttackEval["AttackEvaluator"]
    Evaluators --> ExploreEval["ExploreEvaluator"]
    Evaluators --> GetHealthEval["GetHealthEvaluator"]
    Evaluators --> GetWeaponEval["GetWeaponEvaluator"]
    
    Goals --> MainGoals["Top-Level Goals"]
    Goals --> SubGoals["Tactical Sub-Goals"]
    
    MainGoals --> Attack["AttackGoal"]
    MainGoals --> Explore["ExploreGoal"]
    MainGoals --> GetItem["GetItemGoal"]
    MainGoals --> Hunt["HuntGoal"]
    
    SubGoals --> Charge["ChargeGoal"]
    SubGoals --> Dodge["DodgeGoal"]
    SubGoals --> FindPath["FindPathGoal"]
    SubGoals --> FollowPath["FollowPathGoal"]
    SubGoals --> SeekPosition["SeekToPositionGoal"]
    
    AI --> Perception["Perception Systems"]
    Perception --> Vision
    Perception --> Memory
    Perception --> TargetSystem
```

Pattern: **Strategy Pattern** - Enables selecting behavior algorithms (goals) at runtime based on context.

### Navigation System

```mermaid
flowchart TD
    NavSystem["Navigation System"] --> NavMesh["Navigation Mesh"]
    NavSystem --> PathPlanner["Path Planner"]
    NavSystem --> CostTable["Path Cost Table"]
    NavSystem --> SpatialIndex["Spatial Index"]
    
    PathPlanner --> PathTask["Path Planning Tasks"]
    PathPlanner --> AsyncQueue["Async Task Queue"]
    
    NavSystem --> SteeringBehaviors["Steering Behaviors"]
    SteeringBehaviors --> FollowPath["FollowPathBehavior"]
    SteeringBehaviors --> OnPath["OnPathBehavior"]
    SteeringBehaviors --> Seek["SeekBehavior"]
```

Pattern: **Command Pattern** - Encapsulates path planning requests as objects (tasks) for asynchronous execution.

### Weapon System

```mermaid
flowchart TD
    WeaponSystem --> WeaponBase["Weapon (Base Class)"]
    WeaponBase --> Blaster
    WeaponBase --> Shotgun
    WeaponBase --> AssaultRifle
    
    WeaponSystem --> ProjectileSystem["Projectile System"]
    ProjectileSystem --> Bullet
    ProjectileSystem --> RayIntersection["Ray Intersection Logic"]
    
    WeaponSystem --> WeaponState["Weapon State Management"]
    WeaponState --> Ready
    WeaponState --> Firing
    WeaponState --> Reloading
    WeaponState --> Switching
```

Pattern: **Template Method Pattern** - Defines the skeleton of weapon behavior in the base class, with specifics implemented in subclasses.

### Environmental System

```mermaid
flowchart TD
    EnvironmentSystem --> Sky
    EnvironmentSystem --> Weather
    EnvironmentSystem --> Effects
    
    Sky --> TimeOfDay["Time of Day States"]
    Sky --> SkyTransitions["Sky Transitions"]
    Sky --> LightingChanges["Lighting Changes"]
    
    Weather --> WeatherTypes["Weather Types"]
    WeatherTypes --> Clear
    WeatherTypes --> Cloudy
    WeatherTypes --> Rainy
    WeatherTypes --> Storm
    WeatherTypes --> Foggy
    
    Effects --> Rain["Rain Particles"]
    Effects --> Clouds["Cloud Sprites"]
    Effects --> Lightning["Lightning Effect"]
    Effects --> Fog["Fog Settings"]
```

Pattern: **State Pattern** - Allows the environment to alter behavior when its internal state changes.

## Data Flow Architecture

```mermaid
flowchart LR
    Input["User Input"] --> Controls
    Controls --> Player
    Player --> EntityManager
    
    EntityManager <--> Physics["Physics/Collision"]
    EntityManager <--> AI["AI Systems"]
    
    EntityManager --> RenderSync["Render Sync"]
    RenderSync --> Renderer["Three.js Renderer"]
    
    AssetManager --> EntityManager
    AssetManager --> Renderer
    
    World --> UpdateLoop["Update Loop"]
    UpdateLoop --> EntityManager
    UpdateLoop --> UIManager
    UpdateLoop --> EnvironmentSystem
    UpdateLoop --> Renderer
```

Pattern: **Observer Pattern** - Components observe and react to changes in other parts of the system.

## Key Technical Decisions

### Rendering and Performance

1. **Asynchronous Processing**
   - Path planning tasks executed asynchronously to prevent frame drops
   - Asset loading with progress indicators for better UX
   - Frame-independent physics and movement calculations

2. **Spatial Optimization**
   - Cell-space partitioning for efficient entity management
   - Navigation mesh for optimized pathfinding
   - Level of detail (LOD) based on distance and visibility

3. **Memory Management**
   - Asset pooling for frequently used objects
   - Texture and model optimization
   - Efficient audio resource handling
   - Cleaning up unused resources

4. **Rendering Pipeline**
   - PBR (Physically Based Rendering) materials
   - Dynamic shadow mapping
   - Post-processing effects
   - SRGBColorSpace for accurate color reproduction
