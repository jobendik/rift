# Technical Context: RIFT FPS UI/CSS Redesign

## Technologies Used

### Core Web Technologies
- **JavaScript (ES6+)**: Primary programming language for UI components
- **CSS3**: Styling and animations for UI elements
- **HTML5**: Structure for DOM-based UI elements

### Game Engine Integration
- **Three.js**: 3D rendering library used for game world and some UI elements
- **Custom Game Loop**: Handles update cycles for the game and UI
- **WebGL**: Underlying rendering technology for Three.js components

### Development Tools
- **PowerShell**: Required for project command-line operations
- **Vite**: Module bundler and development server
- **ESLint**: JavaScript code linting
- **VS Code**: Primary development environment

### Third-Party Libraries
- **dat.GUI**: Used for debug UI panels
- **Possibly others**: To be determined during implementation

## Development Setup

### Environment Requirements
- **Node.js**: Version 16+ for development tools
- **PowerShell**: Required for build scripts and asset management
- **Modern Browser**: With WebGL support for testing

### Project Structure
```
/
├── public/                # Static assets and built files
│   ├── assets/            # Game assets (models, textures, etc.)
│   │   ├── animations/    # Animation data files
│   │   ├── audios/        # Sound effects and music
│   │   ├── config/        # Configuration files
│   │   ├── hud/           # HUD-specific assets
│   │   ├── models/        # 3D models
│   │   ├── navmeshes/     # Navigation mesh data
│   │   └── textures/      # Texture files
│   │
│   ├── styles/            # CSS files (currently unstructured)
│   │   ├── index.css      # Entry point for CSS
│   │   ├── main.css       # Main styles
│   │   └── components/    # Component-specific styles
│   │
│   ├── index.html         # Main HTML entry point
│   └── main.js            # Built JavaScript bundle
│
├── src/                   # Source code
│   ├── components/        # UI Components
│   │   └── ui/            # UI-specific components
│   │       ├── minimap/   # Minimap components
│   │       └── screens/   # Screen components
│   │
│   ├── controls/          # Input control systems
│   ├── core/              # Core game systems
│   │   └── UIManager.js   # Current monolithic UI manager
│   ├── effects/           # Visual effects
│   ├── entities/          # Game entities
│   ├── etc/               # Miscellaneous utilities
│   ├── evaluators/        # AI evaluators
│   ├── goals/             # AI goals
│   ├── triggers/          # Game event triggers
│   ├── utils/             # Utility functions
│   ├── weapons/           # Weapon systems
│   └── main.js            # Main entry point
│
├── div/                   # Documentation and miscellaneous
├── .gitignore
├── copyAssetsToPublic.ps1 # PowerShell script for asset management
├── jsconfig.json
├── package.json
├── package-lock.json
└── vite.config.js
```

### Build and Run Commands

The primary development workflow uses these PowerShell commands:

- **Start Development Server**: `npm run dev`
- **Copy Assets**: `.\copyAssetsToPublic.ps1` 
- **Build for Production**: `npm run build`

## Technical Constraints

### Browser Compatibility
- The game targets modern browsers with WebGL support
- No requirement to support legacy browsers
- Must maintain 60FPS on mid-range hardware

### Performance Budgets
- **Main Thread Budget**: <16ms per frame for UI operations
- **Memory Usage**: Stable memory footprint without leaks
- **Asset Loading**: Optimized for progressive loading
- **DOM Nodes**: Limited to essential elements to avoid performance degradation
- **Animation Performance**: CSS animations preferred over JavaScript where possible

### Technical Limitations
- **Three.js Integration**: UI elements must coordinate with Three.js rendering
- **Event Handling**: Need to manage both DOM and game events
- **Asset Loading**: UI must gracefully handle loading states
- **Mobile Support**: Not a primary target, but architecture should not preclude future mobile adaptation

## Current Technical Implementation

### UIManager.js Analysis

The current UIManager.js implementation:

1. **Monolithic Structure**:
   - ~2000+ lines of code in a single file
   - Multiple responsibilities mixed together
   - No clear separation between different UI elements

2. **Rendering Approach**:
   - Mixes DOM manipulation with Three.js sprites
   - Creates DOM elements on-the-fly with minimal reuse
   - No clear rendering pipeline or lifecycle

3. **Event Handling**:
   - Direct binding to DOM events
   - Event listeners not systematically tracked or removed
   - No centralized event system for UI components

4. **State Management**:
   - Direct access to game state via world object
   - Component state scattered throughout methods
   - No clear data flow between components

5. **Performance Issues**:
   - Potential memory leaks from unmanaged event listeners
   - DOM manipulations not optimized for performance
   - Animation effects potentially causing layout thrashing

### CSS Implementation Analysis

The current CSS implementation:

1. **Organization**:
   - Multiple CSS files with inconsistent organization
   - Files divided by general purpose rather than components
   - Limited use of variables and consistent naming patterns

2. **Naming Conventions**:
   - No consistent methodology (BEM, SMACSS, etc.)
   - Potential for specificity conflicts
   - Limited namespacing for game-specific elements

3. **Animation Implementation**:
   - Keyframe animations distributed across files
   - Mix of CSS and JavaScript animations
   - No clear strategy for performance-critical animations

4. **Responsive Approach**:
   - Basic media queries for different screen sizes
   - Limited adaptation strategy for different device types
   - Some hard-coded values instead of relative units

## Technical Opportunities

### Architecture Improvements
- **Component System**: Establish a base UIComponent class with lifecycle methods
- **Event System**: Create a centralized EventManager for all UI events
- **DOM Factory**: Implement a factory for consistent DOM element creation
- **State Management**: Define clear patterns for component state

### Performance Optimizations
- **Element Pooling**: Reuse DOM elements for frequently changing content
- **Batch DOM Operations**: Group DOM mutations to minimize layout recalculations
- **Animation Performance**: Leverage CSS transforms and opacity for animations
- **Event Delegation**: Use event delegation for reduced event handler count

### Developer Experience Enhancements
- **Component Isolation**: Make components testable in isolation
- **Clear APIs**: Define strict interfaces between UI and game systems
- **Documentation**: Add JSDoc comments for all public methods
- **Debug Tools**: Enhance debugging capabilities for UI components

## Integration Points with Game Systems

### World Object
```javascript
// The world object is passed to UIManager and provides access to:
world = {
  player: Player,           // Player entity with health, weapons, etc.
  competitors: [],          // All entities in the world (includes player)
  assetManager: AssetManager, // Handles loading assets
  fpsControls: FPSControls, // Player input control system
  camera: Camera,          // Main game camera
  scene: Scene,            // Three.js scene
  debug: Boolean,          // Whether debug mode is active
  isGamePaused: Boolean,   // Whether game is paused
  gameStats: Object        // Game statistics (kills, deaths, etc.)
  // ...other properties and methods
}
```

### Player Object
```javascript
// The player object contains:
player = {
  health: Number,           // Current health
  maxHealth: Number,        // Maximum health
  position: Vector3,        // World position
  forward: Vector3,         // Forward direction
  velocity: Vector3,        // Current velocity
  weaponSystem: WeaponSystem, // Manages weapons
  isMoving: Boolean,        // Whether player is moving
  active: Boolean,          // Whether player is active
  // ...other properties and methods
}
```

### WeaponSystem
```javascript
// The weapon system manages the player's weapons:
weaponSystem = {
  currentWeapon: Weapon,    // Currently equipped weapon
  weapons: [],              // All available weapons
  equipWeaponByName: Function, // Switch weapons by name
  equipWeaponByIndex: Function, // Switch weapons by index 
  // ...other properties and methods
}
```

### AssetManager
```javascript
// The asset manager handles loading assets:
assetManager = {
  textures: Map,            // Loaded textures
  models: Map,              // Loaded models
  animations: Map,          // Loaded animations
  configs: Map,             // Loaded configuration files
  load: Function,           // Load an asset
  getTexture: Function,     // Get a loaded texture
  getModel: Function,       // Get a loaded model
  // ...other properties and methods
}
```

## Technical Requirements for New Implementation

### Core Components
1. **UIComponent Base Class**
   ```javascript
   class UIComponent {
     constructor(options)
     init()
     update(delta)
     render()
     dispose()
     show()
     hide()
     subscribe(eventType, handler)
   }
   ```

2. **EventManager System**
   ```javascript
   class EventManager {
     static subscribe(eventType, handler)
     static unsubscribe(subscription)
     static emit(eventType, data)
   }
   ```

3. **DOM Factory**
   ```javascript
   class DOMFactory {
     static createElement(type, options)
     static createContainer(className, options)
   }
   ```

4. **UIManager Orchestrator**
   ```javascript
   class UIManager {
     constructor(world)
     registerComponent(name, component)
     getComponent(name)
     init()
     update(delta)
     dispose()
   }
   ```

### CSS Architecture
1. **Variables System**
   ```css
   :root {
     --color-primary: #value;
     --spacing-unit: value;
     --font-family-display: "Font", fallback;
   }
   ```

2. **Component Structure**
   ```
   /styles/components/[component-category]/[component-name].css
   ```

3. **BEM Naming**
   ```css
   .rift-block {}
   .rift-block__element {}
   .rift-block__element--modifier {}
   ```

4. **Animation System**
   ```css
   /* In _animations.css */
   @keyframes animation-name {
     from {}
     to {}
   }
   
   /* In component css */
   .rift-component {
     animation: animation-name duration timing-function;
   }
   ```

## Mission-Critical Technical Aspects

1. **Memory Management**:
   - Every event listener must be tracked and removed when no longer needed
   - DOM elements must be properly disposed when components are removed
   - References to game objects must be nullified when components are disposed

2. **Performance Protection**:
   - Critical UI elements must maintain 60fps even during intense gameplay
   - Heavy DOM operations must be batched to prevent layout thrashing
   - Animations must use compositor-friendly properties (transform, opacity)
   - Component updates should be conditional on visibility and necessity

3. **Error Handling**:
   - UI errors must be caught and logged without crashing the game
   - Components must gracefully handle missing or invalid data
   - Event handlers must have proper error boundaries

4. **Compatibility Layer**:
   - During transition, new system must maintain compatibility with existing code
   - Adapter pattern to be used for legacy integration
   - Clear deprecation path for old methods

## Technical Success Metrics

The technical implementation will be measured against these metrics:

1. **Code Quality**:
   - 70%+ reduction in UIManager.js size due to proper componentization
   - 90%+ test coverage for new components
   - 100% of public methods documented with JSDoc comments

2. **Performance**:
   - Stable 60fps during normal gameplay on target hardware
   - No memory leaks during extended play sessions (stable memory profile)
   - <16ms main thread time per frame for UI operations

3. **Maintainability**:
   - Each component file <300 lines
   - Clear separation of concerns between components
   - Consistent patterns across all UI implementations

4. **Feature Completeness**:
   - All existing functionality preserved
   - Enhanced features implemented as specified
   - New component architecture enables easy addition of future features
