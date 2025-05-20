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

## Technical Implementation Status

### HUD Components 
All planned HUD components have been implemented:

1. **HealthDisplay**
   - Health value and bar visualization with states
   - Low health and critical health warnings
   - Screen flash effects for damage and healing
   - Critical health overlay effect
   - Automatic cleanup of screen effects when component is disposed

2. **HUDSystem**
   - Coordinator for all HUD elements
   - Positional containers for different screen regions
   - Child component management and updates
   - Responsive layout adjustments
   - Integration with world object for data

3. **AmmoDisplay**
   - Current and total ammo visualization
   - Magazine view with bullet indicators
   - Low ammo warning state
   - Reloading animation and state handling
   - Weapon type-specific styling

4. **CrosshairSystem**
   - Dynamic crosshair based on weapon spread
   - Hit markers with critical and headshot variations
   - Enemy targeting state changes
   - Weapon-specific crosshair styles
   - Contextual coloring for different targets

5. **MinimapSystem**
   - Interactive minimap with zoom and rotate functions
   - Enemy and item tracking
   - Responsive design for different screen sizes
   - Integration with event system for notifications
   - Specialized icons for game entities

6. **StaminaSystem**
   - Sprint mechanics visualization
   - Stamina depletion and regeneration indicators
   - Visual feedback for state changes
   - Integration with player movement system

7. **CompassDisplay**
   - Directional awareness with heading
   - Waypoint markers for objectives
   - Friend/foe indicators
   - Integration with navigation system

### Feedback Systems
All planned feedback components have been implemented:

1. **CombatSystem**
   - Coordinator for all combat feedback components
   - Integration with game systems for event handling
   - Testing capabilities for component demonstration
   - Performance optimization for combat scenarios

2. **HitIndicator**
   - Hit confirmation feedback
   - Critical and headshot hit markers
   - Kill confirmation animations
   - Integration with weapon system

3. **DamageIndicator**
   - 360-degree directional damage visualization
   - Intensity based on damage amount
   - Duration scaling for clarity
   - Stacking for multiple damage sources

4. **DamageNumbers**
   - Floating damage indicators for different damage types
   - Normal, critical, headshot, and kill damage numbers
   - Animation system for rising and fading
   - Stacking for rapid consecutive hits
   - Element pooling for performance

5. **ScreenEffects**
   - Damage flash effect for player damage
   - Healing glow effect for health recovery
   - Screen shake system with intensity and decay
   - Vignette effect for low health
   - Hardware-accelerated CSS animations

6. **FootstepIndicator**
   - Directional awareness for movement sounds
   - Friend/foe differentiation with visual styling
   - Distance-based intensity scaling
   - Continuous tracking for running vs. single steps
   - Performance-optimized animation system

### Notification System
All planned notification components have been implemented:

1. **NotificationSystem**
   - Coordinator for all notification components
   - Integration with UIManager for global access
   - Configuration through UIConfig
   - Event subscription management

2. **NotificationManager**
   - General game notification handling
   - Support for different notification types
   - Queue management with priority
   - Stacking of similar notifications
   - Configurable display duration and positioning

3. **KillFeed**
   - Real-time feed of player eliminations
   - Kill streak announcements
   - Weapon and headshot indicators
   - Self-kill and team kill differentiation
   - Configurable display duration and fade effects

4. **EventBanner**
   - High-visibility event announcements
   - Support for different event types with styling
   - Round outcome announcements
   - Optional timer countdowns
   - Queue management for sequential announcements

5. **AchievementDisplay**
   - Achievement popup system with types
   - Progress tracking visualization
   - Queue management for multiple achievements
   - Configurable display timers
   - Dismiss controls for user interaction

### CSS Implementation
Complete implementation of component-specific CSS following BEM methodology:

1. **Core CSS**
   - Comprehensive variables in `_variables.css`
   - Reset and base styles in `_reset.css`
   - Typography system in `_typography.css`
   - Animation keyframes in `_animations.css`
   - Layout structures in `_layout.css`

2. **Component CSS**
   - HUD components in `/components/hud/`
   - Combat feedback in `/components/combat/`
   - Notifications in `/components/notifications/`
   - Utility classes in `/utils/`
   - Responsive breakpoints in `/responsive/`

3. **Animation System**
   ```css
   /* In _animations.css */
   @keyframes rift-pulse {
     0% { opacity: var(--opacity-min); }
     50% { opacity: var(--opacity-max); }
     100% { opacity: var(--opacity-min); }
   }
   
   /* In component CSS */
   .rift-health__bar--critical {
     animation: rift-pulse var(--rift-duration-slow) infinite;
     --opacity-min: 0.6;
     --opacity-max: 1;
   }
   ```

### Next Technical Implementation: Menu System

The next phase focuses on implementing the Menu System components:

1. **ScreenManager**
   - Screen transitions and state management
   - Modal handling for overlays
   - Focus management for keyboard navigation
   - Background blur effects for depth

2. **WeaponWheel**
   - Radial menu for weapon selection
   - Visual feedback for available/unavailable weapons
   - Quick selection through directional input
   - Weapon stats and ammunition display

3. **WorldMap**
   - Overview navigation with zoom functionality
   - Objective markers and waypoints
   - Player position tracking
   - Area discovery and fog-of-war

4. **MissionBriefing**
   - Mission objective display
   - Narrative elements and story presentation
   - Visual cues for mission difficulty
   - Reward information and completion criteria

5. **RoundSummary**
   - End-of-round statistics display
   - Player performance metrics
   - Progression and XP visualization
   - Achievements and milestones earned

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
   - ✅ HUD components implementation
   - ✅ Feedback systems implementation
   - ✅ Notification system implementation
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
- Begin implementing the Menu System components, starting with ScreenManager
- Create CSS foundation for menu-specific components in `/styles/components/menus/`
- Develop component framework for screen transitions and modal handling
- Implement WeaponWheel component with radial selection interface
- Design WorldMap component with overview navigation
- Create MissionBriefing and RoundSummary components
- Develop testing strategy for menu system components
- Implement focus management for keyboard navigation
