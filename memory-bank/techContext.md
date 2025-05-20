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
- **Web Fonts**: Rajdhani, Orbitron, and Exo 2 for specialized UI typography

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
│   ├── styles/            # CSS files
│   │   ├── index.css      # Entry point for CSS
│   │   ├── main.css       # Main styles (deprecated, being refactored)
│   │   ├── /components/   # Component-specific styles
│   │   │   ├── /hud/      # HUD component styles
│   │   │   │   ├── _health.css  # Health display styles - implemented
│   │   │   │   ├── _ammo.css    # Ammo display styles - implemented
│   │   │   │   └── _layout.css  # HUD layout styles - implemented
│   │   │   ├── /combat/   # Combat feedback styles
│   │   │   ├── /notifications/ # Notification styles
│   │   │   ├── /menus/    # Menu system styles
│   │   │   └── /effects/  # Visual effect styles
│   │   ├── /core/         # Core styles
│   │   │   ├── _variables.css  # CSS variables - implemented
│   │   │   ├── _reset.css      # Base resets - implemented
│   │   │   ├── _typography.css # Text styles - implemented
│   │   │   ├── _animations.css # Animation keyframes - implemented
│   │   │   └── _layout.css     # Layout utilities - implemented
│   │   ├── /responsive/   # Responsive breakpoints
│   │   │   ├── _desktop.css    # Large screen styles - implemented
│   │   │   ├── _tablet.css     # Medium screen styles - implemented
│   │   │   └── _mobile.css     # Small screen styles - implemented
│   │   └── /utils/        # Utility styles
│   │       ├── _mixins.css     # CSS props and functions - implemented
│   │       └── _helpers.css    # Utility classes - implemented
│   │
│   ├── index.html         # Main HTML entry point
│   └── main.js            # Built JavaScript bundle
│
├── src/                   # Source code
│   ├── components/        # UI Components
│   │   └── ui/            # UI-specific components
│   │       ├── UIComponent.js # Base component class - implemented
│   │       ├── minimap/   # Minimap components
│   │       └── screens/   # Screen components
│   │
│   ├── controls/          # Input control systems
│   ├── core/              # Core game systems
│   │   ├── EventManager.js # Event system - implemented
│   │   ├── UIConfig.js    # UI configuration - implemented
│   │   └── UIManager.js   # New UI manager - implemented
│   ├── effects/           # Visual effects
│   ├── entities/          # Game entities
│   ├── etc/               # Miscellaneous utilities
│   ├── evaluators/        # AI evaluators
│   ├── goals/             # AI goals
│   ├── triggers/          # Game event triggers
│   ├── utils/             # Utility functions
│   │   ├── DOMFactory.js  # DOM element factory - implemented
│   │   └── InputHandler.js # Input handling - implemented
│   ├── weapons/           # Weapon systems
│   └── main.js            # Main entry point
│
├── div/                   # Documentation and miscellaneous
├── memory-bank/           # Project documentation
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

### Core Architecture Implementation

The core architecture of the UI system has been implemented with these key components:

1. **UIComponent Base Class**:
   - Comprehensive lifecycle methods (init, update, render, dispose)
   - Event subscription management with automatic cleanup
   - DOM element creation and management
   - Component hierarchy with parent/child relationships
   - Animation system with easing functions
   - State management
   - BEM methodology integration
   - Visibility controls

2. **EventManager**:
   - Centralized pub/sub system
   - Subscription tracking with unique IDs
   - Debug mode for event logging
   - Error boundary for event handlers
   - Event statistics and utility methods
   - Standardized event format with timestamps

3. **DOMFactory**:
   - Factory pattern for consistent DOM creation
   - BEM methodology support with "rift-" prefix
   - Helper methods for common UI elements (buttons, notifications, etc.)
   - Standardized style application
   - Support for parent-child element relationships

4. **UIManager (new)**:
   - System orchestration architecture
   - Component registration system
   - Lifecycle management for subsystems
   - Performance monitoring with FPS counter
   - View state management (game, menu, pause)
   - Size and responsive layout management

5. **InputHandler**:
   - Centralized input processing
   - Support for mouse, keyboard, and touch events
   - Gesture recognition (pinch)
   - Normalized coordinate system
   - Event delegation for efficiency
   - Weapon wheel integration with right-click
   - Key bindings for game actions

6. **CSS Variables**:
   - Comprehensive variable set in `_variables.css`
   - Color system with primary, secondary, and status colors
   - Typography system with specialized game fonts
   - Spacing system with consistent scaling
   - Animation timing variables
   - Game-specific UI variables

### Technical Implementation Patterns

Several key technical patterns have been established in the implementation:

1. **MinimapSystem Implementation**:
   ```javascript
   class MinimapSystem extends UIComponent {
       constructor(options) {
           super(options);
           this.world = options.world;
           this.minimapConfig = this.config.minimap;
           
           // Minimap state
           this.isExpanded = false;
           this.zoomLevel = 1;
           this.isRotating = false;
           
           // DOM references
           this.minimapContainer = null;
           this.minimapCanvas = null;
           this.minimapIcons = {};
           this.controls = {};
           
           // Initialize state
           this.state = {
               playerPosition: { x: 0, y: 0, z: 0 },
               playerRotation: 0,
               enemies: [],
               items: [],
               objectives: []
           };
       }
       
       init() {
           // Create main container
           this._createMinimapElements();
           
           // Initialize controls
           this._initControls();
           
           // Register event handlers
           this.registerEvents({
               'minimap:toggle': this._onToggleExpand,
               'minimap:zoom': this._onZoom,
               'minimap:rotate': this._onToggleRotate,
               'player:position': this._onPlayerPositionUpdate,
               'enemy:spotted': this._onEnemySpotted,
               'item:discovered': this._onItemDiscovered
           });
           
           // Set initial state
           this.render();
       }
       
       update(delta) {
           if (!this.world) return;
           
           // Update player position and rotation
           const player = this.world.player;
           if (player) {
               // Update state with new data
               this.setState({
                   playerPosition: player.position,
                   playerRotation: player.rotation.y,
                   enemies: this._getVisibleEnemies(),
                   items: this._getItems(),
                   objectives: this._getObjectives()
               }, false);
           }
           
           // Update animations
           this._updateAnimations(delta);
           
           // Update canvas
           this._updateCanvas();
       }
       
       // Additional methods for functionality
       toggleExpand() { /* ... */ }
       zoom(direction) { /* ... */ }
       toggleRotation() { /* ... */ }
       
       // Private methods
       _createMinimapElements() { /* ... */ }
       _initControls() { /* ... */ }
       _updateCanvas() { /* ... */ }
       _getVisibleEnemies() { /* ... */ }
       _getItems() { /* ... */ }
       _getObjectives() { /* ... */ }
       
       // Event handlers
       _onToggleExpand() { /* ... */ }
       _onZoom(event) { /* ... */ }
       _onToggleRotate() { /* ... */ }
       _onPlayerPositionUpdate(event) { /* ... */ }
       _onEnemySpotted(event) { /* ... */ }
       _onItemDiscovered(event) { /* ... */ }
   }
   ```

2. **Component Lifecycle**:
   ```javascript
   class UIComponent {
       init() { /* Initialize component */ }
       update(delta) { /* Update state */ }
       render() { /* Update DOM */ }
       dispose() { /* Cleanup resources */ }
   }
   ```

2. **Event-Based Communication**:
   ```javascript
   // Publishing
   EventManager.emit('event:type', { data: value });
   
   // Subscribing
   component.subscribe('event:type', (event) => {
       // Handle event
   });
   ```

3. **Automatic Resource Management**:
   ```javascript
   dispose() {
       // Dispose children first
       this.children.forEach(child => child.dispose());
       
       // Unsubscribe from all events
       this.unregisterAllEvents();
       
       // Remove from DOM
       if (this.element && this.element.parentNode) {
           this.element.parentNode.removeChild(this.element);
       }
   }
   ```

4. **BEM CSS Methodology**:
   ```css
   .rift-block {}
   .rift-block__element {}
   .rift-block__element--modifier {}
   ```

5. **Component State Management**:
   ```javascript
   setState(newState, render = true) {
       this.state = { ...this.state, ...newState };
       
       if (render) {
           this.render();
       }
   }
   ```

### CSS Implementation

The CSS implementation now features a comprehensive and structured approach:

1. **Core CSS Files**:

   **CSS Variables Structure** in `_variables.css`:
   ```css
   :root {
     /* COLOR SCHEME */
     --rift-primary: #e63946;
     --rift-primary-glow: rgba(230, 57, 70, 0.7);
     
     /* TYPOGRAPHY */
     --rift-font-hud: 'Rajdhani', 'Orbitron', sans-serif;
     
     /* SPACING */
     --rift-space-md: 1rem;
     
     /* ANIMATIONS */
     --rift-duration-fast: 0.2s;
     
     /* GAME UI */
     --rift-crosshair-size: 24px;
   }
   ```

   **Reset and Base Styles** in `_reset.css`:
   ```css
   /* Basic reset */
   * {
     margin: 0;
     padding: 0;
     box-sizing: border-box;
   }
   
   /* Document styles */
   html, body {
     width: 100%;
     height: 100%;
     overflow: hidden;
     font-family: var(--rift-font-body);
     background-color: var(--rift-background);
     color: var(--rift-text-color);
   }
   ```

   **Typography System** in `_typography.css`:
   ```css
   /* HUD Text */
   .rift-hud-text {
     font-family: var(--rift-font-hud);
     letter-spacing: var(--rift-letter-spacing-wide);
   }
   
   .rift-hud-text--lg {
     font-size: var(--rift-font-size-xl);
     font-weight: var(--rift-font-weight-semibold);
   }
   ```

   **Animation System** in `_animations.css`:
   ```css
   /* Hit marker flash */
   @keyframes rift-hit-marker {
     0% { opacity: 1; transform: scale(0.8); }
     50% { opacity: 1; transform: scale(1.1); }
     100% { opacity: 0; transform: scale(1); }
   }
   
   /* Animation utility classes */
   .rift-animate-pulse {
     animation: rift-pulse var(--rift-duration-slow) infinite;
   }
   ```

   **Layout System** in `_layout.css`:
   ```css
   /* HUD container */
   .rift-hud {
     position: fixed;
     top: 0;
     left: 0;
     width: 100%;
     height: 100%;
     pointer-events: none;
     z-index: var(--rift-z-index-hud);
   }
   
   /* HUD corners positioning */
   .rift-hud__top-left {
     position: absolute;
     top: var(--rift-hud-margin);
     left: var(--rift-hud-margin);
     z-index: var(--rift-z-index-hud);
   }
   ```

2. **Utility Systems**:

   **Helper Classes** in `_helpers.css`:
   ```css
   /* Visibility helpers */
   .rift-hidden { display: none !important; }
   .rift-invisible { visibility: hidden !important; }
   
   /* Color helpers */
   .rift-color-primary { color: var(--rift-primary); }
   .rift-bg-primary { background-color: var(--rift-primary); }
   ```

   **Responsive Breakpoints** in responsive files:
   ```css
   /* In _mobile.css */
   @media (max-width: 768px) {
     .rift-hide-mobile { display: none !important; }
     
     .rift-minimap {
       width: calc(var(--rift-minimap-size) * 0.8);
       height: calc(var(--rift-minimap-size) * 0.8);
     }
   }
   ```

3. **Component Implementation** in `components/hud/_health.css`:
   ```css
   .rift-health {
     display: flex;
     align-items: center;
     padding: var(--rift-hud-padding);
     background-color: var(--rift-ui-background);
     border: var(--rift-hud-border-width) solid var(--rift-health);
     border-radius: var(--rift-border-radius);
   }
   
   .rift-health__bar--critical {
     background-color: var(--rift-health-critical);
     animation: rift-pulse var(--rift-duration-slow) infinite;
   }
   ```

4. **JavaScript Configuration Mirror**:
   ```javascript
   export const UIConfig = {
     colors: {
       primary: '#e63946',
       primaryGlow: 'rgba(230, 57, 70, 0.7)',
     },
     
     fonts: {
       hud: "'Rajdhani', 'Orbitron', sans-serif",
     }
   };
   ```

## Technical Opportunities

### Architecture Enhancements
- **Component Registry**: Create a central registry for all UI components
- **Template System**: Implement HTML-based templates for complex component structures
- **Animation Manager**: Move animations from JS to CSS where appropriate for performance
- **State Synchronization**: Implement better patterns for state synchronization between components

### Performance Optimizations
- **Element Pooling**: Implement pooling for frequently created/destroyed elements
- **Batch DOM Operations**: Group DOM mutations to minimize layout recalculations
- **Rendering Strategy**: Use CSS transforms and opacity for animations
- **Visibility Optimization**: Skip updates for offscreen components

### Developer Experience Improvements
- **Component Testing**: Create isolated testing environment for components
- **Visual Testing**: Implement screenshot-based regression testing
- **Performance Monitoring**: Add detailed performance tracking for components
- **Documentation**: Generate API documentation from JSDoc comments

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

### Event-Based Integration
The implemented EventManager allows for decoupled communication:

```javascript
// Game system emits events
EventManager.emit('health:changed', { value: newHealth, previous: oldHealth });

// UI components react to events
healthComponent.subscribe('health:changed', (event) => {
  // Update health display
});
```

## Technical Requirements for Upcoming Implementation

### HUD Components
1. **HealthDisplay** (Implemented)
   ```javascript
   class HealthDisplay extends UIComponent {
     constructor(options)
     updateHealth(value, animate = true)
     updateMaxHealth(value)
     showLowHealthWarning()
     showCriticalHealthWarning()
     showHealEffect(amount)
     showDamageEffect()
     getHealthPercentage()
   }
   ```
   
   The HealthDisplay component has been implemented with:
   - Health value and bar visualization
   - Low health and critical health states with visual feedback
   - Screen flash effects for damage and healing
   - Critical health overlay effect
   - Automatic handling of health value changes via events
   - Cleanup of screen effects when component is disposed

2. **HUDSystem** (Implemented)
   ```javascript
   class HUDSystem extends UIComponent {
     constructor(world, options)
     init()
     update(delta)
     _createContainers()
     _initComponents()
     _updateComponentData()
     setSize(width, height)
   }
   ```
   
   The HUDSystem acts as a coordinator for all HUD elements:
   - Creates positional containers for different screen regions (top-left, bottom-right, etc.)
   - Initializes and manages child HUD components
   - Automatically updates components with data from the world object
   - Handles resizing and responsive layout adjustments
   - Current subcomponents: HealthDisplay

2. **AmmoDisplay** (Implemented)
   ```javascript
   class AmmoDisplay extends UIComponent {
     constructor(options)
     updateAmmo(current, total)
     showLowAmmoWarning()
     showReloadAnimation()
     updateWeaponType(weaponType)
     renderBullets()
   }
   ```
   
   The AmmoDisplay component has been implemented with:
   - Current and total ammo visualization
   - Magazine view with bullet indicators
   - Low ammo warning state with visual feedback
   - Reloading animation and state handling
   - Weapon type-specific styling
   - Event-based updates from the weapon system

3. **CrosshairSystem** (Implemented)
   ```javascript
   class CrosshairSystem extends UIComponent {
     constructor(options)
     updateSpread(value)
     showHitMarker(isCritical, isHeadshot)
     updateWeaponType(weaponType)
     _createDynamicCrosshair()
     _createStaticCrosshair()
     _createHitMarker()
     _updateDynamicCrosshair()
   }
   ```
   
   The CrosshairSystem component has been implemented with:
   - Dynamic crosshair that changes based on weapon spread
   - Hit markers for hit confirmation with critical and headshot variations
   - Enemy targeting state changes
   - Weapon-type specific crosshair styles
   - Contextual coloring based on target type

### Feedback Systems
1. **DamageIndicator**
   ```javascript
   class DamageIndicator extends UIComponent {
     constructor(options)
     showDamageFrom(direction, amount)
     updateIndicatorOpacity(delta)
   }
   ```

2. **HitIndicator**
   ```javascript
   class HitIndicator extends UIComponent {
     constructor(options)
     showHit(position, isCritical)
     showKill(position)
   }
   ```

3. **ScreenEffects**
   ```javascript
   class ScreenEffects extends UIComponent {
     constructor(options)
     showDamageFlash(intensity)
     showHealEffect()
     applyScreenShake(intensity, duration)
   }
   ```

### CSS Requirements
1. **Component Structure** (Implemented)
   ```
   /styles/components/hud/_health.css        # Implemented
   /styles/components/hud/_ammo.css          # Implemented
   /styles/components/hud/_crosshair.css     # Pending
   /styles/components/combat/_damage-indicator.css  # Pending
   /styles/components/combat/_hit-indicator.css     # Pending
   ```

2. **Animation System** (Implemented)
   ```css
   /* In _animations.css - implemented */
   @keyframes rift-pulse {
     0% { opacity: var(--opacity-min); }
     50% { opacity: var(--opacity-max); }
     100% { opacity: var(--opacity-min); }
   }
   
   /* In component CSS (_health.css) - implemented */
   .rift-health__bar--critical {
     animation: rift-pulse var(--rift-duration-slow) infinite;
     --opacity-min: 0.6;
     --opacity-max: 1;
   }
   ```

3. **Responsive Design** (Implemented)
   ```css
   /* Base styles in component files */
   .rift-minimap {
     width: var(--rift-minimap-size);
     height: var(--rift-minimap-size);
   }
   
   /* Adjustments in breakpoint files */
   @media (min-width: 1201px) {
     .rift-minimap {
       width: calc(var(--rift-minimap-size) * 1.2);
       height: calc(var(--rift-minimap-size) * 1.2);
     }
   }
   ```

4. **Utility Classes** (Implemented)
   ```css
   /* In _helpers.css */
   .rift-text-left { text-align: left; }
   .rift-color-primary { color: var(--rift-primary); }
   .rift-bg-primary { background-color: var(--rift-primary); }
   .rift-m-md { margin: var(--rift-space-md); }
   .rift-p-sm { padding: var(--rift-space-sm); }
   ```

## Technical Success Metrics

The technical implementation will be measured against these metrics:

1. **Code Quality**:
   - ✅ UIComponent base class with clear lifecycle methods
   - ✅ EventManager with subscription tracking and cleanup
   - ✅ DOMFactory for consistent element creation
   - ✅ UIManager as system orchestrator
   - ✅ CSS architecture following BEM methodology
   - ⏳ Individual component implementations with single responsibilities

2. **Performance**:
   - ✅ FPS counter implementation for monitoring
   - ✅ CSS animation system for declarative animations
   - ✅ JavaScript animation system for dynamic animations
   - ⏳ Efficient DOM manipulation
   - ⏳ Memory leak prevention
   - ⏳ Consistent 60fps during gameplay

3. **Maintainability**:
   - ✅ Clear separation of concerns in architecture
   - ✅ Consistent patterns for component development
   - ✅ Proper event-based communication
   - ✅ Modular CSS with clear organization
   - ⏳ Code documentation with JSDoc
   - ⏳ Additional component-specific CSS files

4. **Feature Completeness**:
   - ✅ Core architecture implementation
   - ✅ CSS foundation implementation
   - ⏳ HUD components implementation
   - ⏳ Feedback systems implementation
   - ⏳ Notification system implementation
   - ⏳ Menu system implementation

## Implementation Notes

### Current Technical Strengths
- The UIComponent base class is very robust with comprehensive lifecycle methods
- EventManager provides a solid foundation for decoupled communication
- DOMFactory ensures consistent DOM creation and styling
- UIManager successfully implements the orchestrator pattern
- CSS architecture provides a maintainable and scalable foundation
- Design system with variables enables consistent styling
- Responsive design system adapts to different screen sizes
- Animation system allows for both CSS and JS animations

### Technical Challenges to Address
- Event naming conventions need to be standardized
- Animation strategy (CSS vs JS) needs to be determined case-by-case for optimal performance
- Integration between DOM-based UI and Three.js needs clarification
- Element pooling for frequently created/destroyed elements
- Testing strategy for components

### Next Technical Implementation Steps
- Create JavaScript components for already-defined CSS components (starting with HealthDisplay)
- Implement remaining HUD component CSS and JavaScript
- Build feedback systems for combat interactions
- Develop notification system architecture
- Create testing and benchmarking approach
