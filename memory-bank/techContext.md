# Technical Context: RIFT FPS UI/CSS Redesign

## Technologies Used

The RIFT FPS UI/CSS redesign is a web-based implementation using modern web technologies:

### Core Technologies

- **HTML/CSS/JavaScript**: The UI system is built using standard web technologies for maximum compatibility and performance.
- **CSS Custom Properties**: Extensive use of CSS variables for theming and consistency.
- **BEM Methodology**: Block-Element-Modifier pattern for CSS to maintain a scalable and maintainable codebase.

### Frameworks and Libraries

- **Three.js**: Used for the 3D rendering of the game world. The UI systems interface with the Three.js scene.
- **Custom Component System**: A lightweight, purpose-built component-based architecture for UI elements.
- **Web Components**: Leveraging modern browser APIs for encapsulated UI components.

## Development Environment

### Tools

- **Visual Studio Code**: Primary code editor with extensions for JavaScript, CSS, and HTML.
- **PowerShell**: For build scripts and automating development tasks.
- **Vite**: Fast, modern frontend development server and bundler.

### Browser Support

- **Modern Browsers**: Targeting modern browsers with good WebGL support (Chrome, Firefox, Edge).
- **Mobile Support**: Limited mobile considerations for potential future expansion.

## Project Structure

### Directory Organization

- **src/**: Source code
  - **components/**: UI components
    - **ui/**: UI-specific components
      - **hud/**: Heads-up display components
      - **combat/**: Combat feedback components
      - **notifications/**: Notification system components
      - **menus/**: Menu system components
      - **progression/**: Progression system components
      - **environment/**: Environmental UI components
  - **core/**: Core systems and managers
  - **utils/**: Utility functions and helpers
  - **controls/**: Player control systems
  - **entities/**: Game entity classes
  - **weapons/**: Weapon system classes
  - **effects/**: Visual effects

- **public/**: Static assets
  - **assets/**: Game assets (textures, models, etc.)
  - **styles/**: CSS files
    - **core/**: Foundation styles (_variables.css, _reset.css, etc.)
    - **components/**: Component-specific styles
    - **utils/**: Utility styles
    - **responsive/**: Responsive design styles

### Naming Conventions

- **JavaScript**:
  - Classes use PascalCase (e.g., `HealthDisplay`)
  - Methods and variables use camelCase (e.g., `updateHealth()`)
  - Constants use UPPER_SNAKE_CASE (e.g., `MAX_HEALTH`)

- **CSS**:
  - Following BEM methodology with `rift-` prefix
  - Block: `rift-health-display`
  - Element: `rift-health-display__bar`
  - Modifier: `rift-health-display__bar--critical`

- **File Names**:
  - JavaScript: PascalCase for components (e.g., `HealthDisplay.js`)
  - CSS: kebab-case with underscore prefix for partials (e.g., `_health-display.css`)

## CSS Architecture

### Foundation

- **_variables.css**: Global CSS variables for colors, spacing, typography, etc.
- **_reset.css**: Base reset and normalization styles
- **_typography.css**: Typography system and text styles
- **_animations.css**: Global animation keyframes and transitions
- **_layout.css**: Layout utilities and structure

### Utilities

- **_mixins.css**: Reusable custom property sets
- **_helpers.css**: Utility classes for common patterns

### Responsive Design

- **_desktop.css**: Styles for large screens (≥1201px)
- **_tablet.css**: Styles for medium screens (769px-1200px)
- **_mobile.css**: Styles for small screens (≤768px)

### Components

Each UI component has its own CSS file following the structure:
- **hud/**: HUD component styles (e.g., `_health.css`, `_ammo.css`)
- **combat/**: Combat feedback styles (e.g., `_hit-indicator.css`, `_damage-indicator.css`)
- **notifications/**: Notification styles (e.g., `_notification-manager.css`, `_kill-feed.css`)
- **menus/**: Menu system styles (e.g., `_screen-manager.css`, `_world-map.css`)
- **progression/**: Progression styles (e.g., `_experience-bar.css`, `_player-rank.css`)
- **environment/**: Environmental UI styles (e.g., `_weather.css`, `_objective-marker.css`)

## JavaScript Architecture

### Core Systems

- **UIComponent**: Base class for all UI components with lifecycle methods:
  - `init()`: Setup and initial rendering
  - `update(delta)`: Handle regular updates with delta time
  - `render()`: Update DOM representation
  - `dispose()`: Clean up resources and event listeners

- **EventManager**: Centralized pub/sub system for component communication:
  - `subscribe(eventName, handler)`: Subscribe to events
  - `publish(eventName, data)`: Publish events with data
  - `unsubscribe(eventName, handler)`: Remove subscriptions
  - Automatic cleanup via component lifecycle

- **DOMFactory**: Factory pattern for consistent DOM creation:
  - `createElement(type, options)`: Create DOM elements
  - `createContainer(id, options)`: Create container elements
  - BEM methodology support with `rift-` prefix

- **UIManager**: Orchestrator for all UI subsystems:
  - Manages lifecycle for all UI components
  - Handles view changes (game, menu, pause)
  - Size management for responsive layouts
  - Performance monitoring

- **InputHandler**: User input management:
  - Mouse, keyboard, and touch event handling
  - Normalized coordinates and gestures
  - Event emission for input actions

### Component System

- **Component Hierarchy**:
  - **UIComponent**: Base class for all components
    - **SystemComponent**: Managers for groups of related components
      - **HUDSystem**: Manages HUD components
      - **CombatSystem**: Manages combat feedback
      - **NotificationSystem**: Manages notifications
      - **MenuSystem**: Manages menu screens
      - **ProgressionSystem**: Manages progression display
      - **EnvironmentSystem**: Manages environmental UI

- **Component Communication**:
  - Event-driven architecture using EventManager
  - Standardized event format with namespaces
  - Automatic subscription tracking and cleanup

### System Integration

- **World Class**: Main game state and logic
  - Contains player, level, entities, systems
  - Provides data for UI components

- **AssetManager**: Asset loading and caching
  - Textures, sounds, models, and UI assets
  - Preloading and just-in-time loading strategies

- **WeaponSystem**: Manages weapons and combat
  - Provides ammunition, weapon state for UI
  - Combat events for hit indicators, damage

## Enhanced Combat Feedback System

The Enhanced Combat Feedback System is a significant Phase 4 improvement that builds upon the existing combat feedback foundation. Three out of four planned components have been fully implemented, with the fourth component (AdvancedScreenEffects) pending implementation.

### Components

1. **EnhancedDamageIndicator**: Advanced directional damage awareness ✅ **IMPLEMENTED**
   - Type-specific indicators for different damage types (bullet, explosive, melee, etc.)
   - Intensity scaling based on damage amount
   - Distance representation via visual cues
   - Multi-stage fade system for improved clarity
   - Support for multiple simultaneous damage sources

2. **EnhancedHitIndicator**: Improved hit confirmation system ✅ **IMPLEMENTED**
   - Different visuals for body shots, critical hits, headshots, and kills
   - Dynamic animation sequences for hit confirmation
   - Visual scaling based on damage amount
   - Special kill confirmation indicators
   - Multi-kill recognition for successive kills

3. **DynamicCrosshairSystem**: Contextual crosshair system ✅ **IMPLEMENTED**
   - Real-time spread visualization based on weapon accuracy and movement
   - Contextual color changes based on target type (enemy, friendly, interactive)
   - Shape changes based on interaction context
   - Weapon state integration (reloading, empty, switching)
   - Subtle indication for potential critical hits on vulnerable areas
   - Multi-kill feedback for successive eliminations
   - Layered architecture for separation of concerns:
     - Base layer for core crosshair elements
     - Spread layer for dynamic accuracy visualization
     - Center layer for dot and critical hit indication
     - Hit marker layer for hit feedback
     - Context layer for interactive elements and hints

4. **AdvancedScreenEffects**: Enhanced screen feedback ⏳ **PENDING**
   - Directional screen shake reflecting impact direction
   - Variable effect intensity based on damage type and amount
   - Multi-layer effects (vignette, color shift, blur)
   - Hardware-accelerated animations for performance
   - Special effects for critical states and powerups

### Technical Implementation

- **CSS Integration**:
  - Utilizes CSS Custom Properties extensively for dynamic adjustments
  - Hardware-accelerated animations using transform and opacity
  - Carefully managed stacking contexts with z-index
  - BEM methodology with consistent naming convention
  - Standard class naming patterns implemented across all enhanced feedback components

- **Configuration System**:
  - All visual parameters configurable via UIConfig.js
  - Mirrored CSS variables for consistent appearance
  - Tunable intensity, timing, and visual parameters
  - Feature flags for enabling/disabling enhanced components

- **Event System Integration**:
  - Standardized event naming following `namespace:action` pattern
  - Consistent payload structures for different event types
  - Event flow documentation and clear communication paths
  - Clean event handling with automatic cleanup

- **Component Integration**:
  - CombatSystem updated to conditionally use enhanced or standard components based on UIConfig settings
  - Graceful fallbacks to legacy components if needed
  - Consistent API across both standard and enhanced versions
  - Standardized method naming for consistent interfaces

## Event Standardization System

The Event Standardization System is a comprehensive approach to event management implemented as part of Phase 4 refinement. A detailed documentation has been created, with implementation in progress.

### Event Naming Convention

All events now follow a standardized naming pattern:
```
[namespace]:[action]
```

Where:
- `namespace` identifies the source/domain (e.g., player, weapon, health)
- `action` describes what happened (e.g., damaged, killed, updated)

Example events:
- `health:changed` - Player health value changed
- `weapon:fired` - Weapon was fired
- `enemy:killed` - Enemy was eliminated

### Standardized System Namespaces

The system defines a set of standardized namespaces for clarity and organization:

| Namespace | Description | Example Events |
|-----------|-------------|----------------|
| `player` | Player entity events | `player:spawn`, `player:death`, `player:movement` |
| `health` | Health-related events | `health:damaged`, `health:healed`, `health:critical` |
| `weapon` | Weapon system events | `weapon:fired`, `weapon:reload`, `weapon:switch` |
| `ammo` | Ammunition events | `ammo:low`, `ammo:depleted`, `ammo:added` |
| `enemy` | Enemy-related events | `enemy:spotted`, `enemy:damaged`, `enemy:killed` |
| `hit` | Hit detection events | `hit:registered`, `hit:critical`, `hit:headshot` |
| `combat` | Combat state events | `combat:started`, `combat:ended`, `combat:intensity` |
| `ui` | UI state changes | `ui:show`, `ui:hide`, `ui:resize` |

### Standard Event Payload Structure

All events follow a standardized payload structure with specialized formats for different event types:

1. **State Change Events**
```javascript
{
  type: "namespace:changed",
  timestamp: performance.now(),
  value: newValue,     // Current value
  previous: oldValue,  // Previous value
  delta: change,       // Amount changed (optional)
  max: maximum,        // Maximum possible value (optional)
  source: source       // What caused the change (optional)
}
```

2. **Combat Events**
```javascript
{
  type: "namespace:action",
  timestamp: performance.now(),
  source: {            // Source entity
    id: string,        // Entity ID
    type: string,      // Entity type (player, enemy, etc.)
    name: string,      // Entity name (optional)
    position: Vector3  // 3D position (optional)
  },
  target: {            // Target entity (similar to source)
    id: string,
    type: string,
    name: string,
    position: Vector3
  },
  weapon: {            // Weapon used (optional)
    id: string,
    type: string,
    name: string
  },
  damage: number,      // Damage amount (optional)
  isCritical: boolean, // Critical hit (optional)
  isHeadshot: boolean, // Headshot (optional)
  direction: Vector3   // Direction vector (optional)
}
```

3. **Notification Events**
```javascript
{
  type: "namespace:notify",
  timestamp: performance.now(),
  message: string,     // The notification message
  category: string,    // Category (info, warning, error, success)
  duration: number,    // Display duration in ms (optional)
  priority: number,    // Priority level (optional)
  icon: string,        // Icon identifier (optional)
  actions: Array       // Available actions (optional)
}
```

4. **Player Progress Events**
```javascript
{
  type: "namespace:progress",
  timestamp: performance.now(),
  amount: number,      // Amount of progress
  source: string,      // Source of the progress
  total: number,       // Total required for completion
  level: number,       // Current level or tier (optional)
  rewards: Array       // Associated rewards (optional)
}
```

## Technical Constraints

### Performance Considerations

- **DOM Operations**: Batch DOM operations to prevent layout thrashing
- **Animation Performance**: Use CSS transforms and opacity for hardware acceleration
- **Event Handling**: Debounce handlers for frequent events
- **Visual Updates**: Use requestAnimationFrame for animations
- **Element Pooling**: Reuse elements for frequently created/destroyed UI elements (planned for implementation)
- **Visibility Optimization**: Avoid updating off-screen elements

### Browser Compatibility

- **Target Browsers**: Modern versions of Chrome, Firefox, Edge
- **CSS Features**: Using widely-supported CSS features with minimal fallbacks
- **JavaScript Features**: ES6+ features with compatibility considerations

### Mobile Considerations

- **Touch Input**: Support for touch gestures where appropriate
- **Screen Sizes**: Responsive design for potential future mobile adaptation
- **Performance**: Optimizing for mobile GPUs and processors

## Documentation and Best Practices

### Code Documentation

- **JSDoc Comments**: For all classes and public methods
- **Implementation Notes**: Important considerations documented in code
- **Event Documentation**: Clear documentation of published and subscribed events

### CSS Documentation

- **Component Documentation**: Purpose and usage of each component
- **Variable Documentation**: Meaning and usage of CSS variables
- **Animation Documentation**: Description of animations and transitions

### Performance Guidelines

- **Animation Performance**: Use transform and opacity for animations
- **DOM Manipulation**: Minimize DOM operations and batch when possible
- **Event Handling**: Proper cleanup of event listeners
- **Memory Management**: Clear references when disposing components

## Integration Points

### Three.js Integration

- **Coordinate Systems**: Converting between 3D world and 2D screen coordinates
- **Raycast Integration**: Using raycasts for world interaction with UI
- **Marker System**: Connecting world entities with UI markers

### Game Logic Integration

- **Player State**: Health, ammo, stamina from Player class
- **Weapon State**: Current weapon, ammunition from WeaponSystem
- **Combat Events**: Hit registration, damage from combat system
- **Notification Events**: Game events triggering UI notifications

## Future Technical Considerations

### Planned Technical Improvements

- **Element Pooling System**: For high-frequency UI elements (Phase 4)
- **Performance Profiling**: Identifying and optimizing bottlenecks (Phase 4)
- **Animation System Enhancements**: More sophisticated animation sequences
- **Audio Integration**: UI sound effects and audio feedback (Phase 4)
- **Accessibility Features**: Color blind modes, UI scaling, etc.

### Technical Debt Items

- **Event System Standardization**: Implementation of comprehensive event naming standards in progress (Phase 4)
- **CSS Organization**: Further modularization of CSS components
- **Component Consistency**: Standardizing implementation patterns across components
- **Documentation Completeness**: Ensuring comprehensive documentation of all systems

### Phase 4 Technical Implementations

1. **Enhanced Combat Feedback System**: 75% complete
   - ✅ EnhancedDamageIndicator component
   - ✅ EnhancedHitIndicator component
   - ✅ DynamicCrosshairSystem component
   - ⏳ AdvancedScreenEffects component (pending)

2. **Event System Standardization**: Documentation complete, implementation pending
   - ✅ Comprehensive documentation with naming conventions and payload structures
   - ✅ System namespace definitions and event flow documentation
   - ⏳ Implementation of standardized event names across components
   - ⏳ Refactoring of event payload structures
   - ⏳ Addition of event debugging and monitoring tools

3. **Performance Optimization**: Planning complete, implementation pending
   - ⏳ Profiling of UI components during intensive gameplay
   - ⏳ Element pooling system for frequently created elements
   - ⏳ Batch DOM operations for high-frequency updates
   - ⏳ Animation optimization
   - ⏳ Memory leak identification and fixes

4. **Audio Integration**: Planning pending
   - ⏳ Research into UI sound integration best practices
   - ⏳ Audio feedback architecture document
   - ⏳ Audio event system design
   - ⏳ Spatial audio integration strategy

## Known Technical Issues

1. **Enhanced Combat Feedback Implementation**
   - ✅ Fixed: CSS class name mismatches between JS and CSS files
   - ✅ Fixed: Method name standardization (clearAllIndicators)
   - ✅ Verified: All CSS variables properly defined

2. **Event Standardization**
   - Need to implement standardized event naming conventions across components
   - Need to refactor existing components to use standardized payload structures
   - Need to update event subscription code to match the new patterns

3. **Performance Considerations**
   - Balance between CSS and JavaScript animations needs optimization
   - Element pooling needed for frequently created/destroyed elements
   - DOM batch operations needed for frequently updated elements
   - Performance monitoring during intensive gameplay scenarios

4. **Integration Challenges**
   - Coordinating hit detection with visual feedback
   - Timing animations with gameplay events
   - Ensuring accurate directional information for markers and indicators
   - Integration between DOM-based UI and Three.js rendered elements
