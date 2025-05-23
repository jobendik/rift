# Technical Context: RIFT FPS UI/CSS Redesign

## Project Overview

The RIFT FPS UI/CSS Redesign is a comprehensive update of the game's user interface systems. The project is focused on creating a modern, responsive, and performant UI layer that enhances gameplay feedback while maintaining the game's signature sci-fi aesthetic.

## Technology Stack

### Core Technologies

- **JavaScript (ES6+)** - Core programming language for all UI components
- **CSS3** - Styling with a focus on CSS variables and modern features
- **HTML5** - Base DOM structure
- **Three.js** - 3D rendering engine that the UI needs to integrate with
- **Vite** - Build tool and development server

### Key Libraries & Dependencies

- No external UI frameworks (custom-built components)
- Core game engine (proprietary - built on Three.js)
- Asset management system for loading textures and sounds

## Architecture Overview

### Component-Based System

The UI is built using a component-based architecture with the following characteristics:

1. **UIComponent Base Class**
   - Provides common lifecycle methods: `init()`, `update()`, `render()`, `dispose()`
   - Manages parent-child relationships between components
   - Handles event subscription and cleanup
   - Provides animation utilities

2. **System Orchestrators**
   - HUDSystem, CombatSystem, NotificationSystem, etc.
   - Coordinate related components
   - Manage system-wide state
   - Handle communication between systems

3. **Individual Components**
   - Specialized for specific UI functionality
   - Extend UIComponent or appropriate sub-class
   - Follow consistent patterns for state management and rendering

### Event System

The project uses a centralized event system for communication between components, with the following features:

1. **EventManager**
   - Provides pub/sub functionality
   - Manages event subscriptions and cleanup
   - Handles debugging and event monitoring
   - Enhanced to support standardized events

2. **Event Standardization Implementation**
   - Standardized naming convention:
     - Two-part pattern: `namespace:action` (e.g., 'health:changed')
     - Three-part pattern for component-specific events: `namespace:id:action` (e.g., 'ui:health-display:visible')
   - Predefined payload structures for different event types
   - Helper methods for creating standardized payloads
   - Validation capabilities for event names and payloads
   - Migration utilities for updating legacy event usage

3. **Event Performance Monitoring System**
   - Real-time metrics collection for event frequency and execution time
   - Configuration options for thresholds and tracking parameters
   - Dashboard for visualizing performance data
   - Automatic recommendations for optimization
   - Integration with developer tools panel (Ctrl+Shift+D)

4. **Event Types**
   - State Change Events: For value changes (health, ammo, etc.)
   - Combat Events: For combat interactions (hits, damage, kills)
   - Notification Events: For user notifications
   - Progress Events: For progression updates (XP, levels, achievements)
   - Movement Events: For entity movement (footsteps, position changes)

5. **Standard Event Structure**
   - Common metadata (type, timestamp)
   - Type-specific required fields
   - Optional fields based on context

### DOM Management

The UI creates and manages DOM elements with the following approaches:

1. **DOMFactory**
   - Factory pattern for consistent DOM creation
   - Enforces BEM naming conventions with `rift-` prefix
   - Provides utility methods for common element types

2. **Component Rendering**
   - Components manage their own DOM elements
   - Clear separation between state and rendering
   - Uses CSS classes and attributes for styling
   - Minimizes direct style manipulation

3. **Performance Considerations**
   - Batch DOM updates for high-frequency components
   - Use of requestAnimationFrame for rendering
   - CSS animations for performance
   - Hardware acceleration via transform/opacity
   - Element pooling via ElementPool utility for frequently created/destroyed elements

### CSS Architecture

The CSS follows BEM methodology with these organizational principles:

1. **CSS Organization**
   - Core files: variables, reset, typography, animations, layout
   - Utility files: mixins, helpers
   - Component files: organized by system
   - Responsive files: desktop, tablet, mobile adaptations

2. **BEM Naming Convention**
   - Block: `.rift-block`
   - Element: `.rift-block__element`
   - Modifier: `.rift-block__element--modifier`

3. **CSS Variables**
   - Color system
   - Spacing system
   - Typography system
   - Animation timing
   - Z-index management
   - JavaScript mirror of variables in `UIConfig.js`

## Component Systems

### HUD System

Displays core gameplay information constantly visible to the player.

1. **Components**
   - HealthDisplay: Player health visualization with states
   - AmmoDisplay: Current ammo and magazine visualization
   - CrosshairSystem: Dynamic crosshair with hit feedback
   - MinimapSystem: Minimap visualization
   - StaminaSystem: Stamina/sprint visualization
   - CompassDisplay: Directional awareness and POI markers
   - WeaponWheel: Weapon selection interface

2. **Integration Points**
   - Player health state
   - Weapon system (current weapon, ammo)
   - World position and orientation
   - Sprint mechanics

3. **Technologies Used**
   - DOM-based elements for HUD components
   - CSS animations for state changes
   - Event-driven updates based on game state

### Combat Feedback System

Provides visual feedback during combat to enhance player awareness.

1. **Standard Components**
   - HitIndicator: Confirmation of successful hits
   - DamageIndicator: Directional indicators for incoming damage
   - DamageNumbers: Floating combat text
   - ScreenEffects: Full-screen visual effects
   - FootstepIndicator: Awareness of nearby movement

2. **Enhanced Components**
   - EnhancedDamageIndicator: Advanced directional damage with intensity scaling
   - EnhancedHitIndicator: Hit type differentiation and multi-kill recognition
   - DynamicCrosshairSystem: Contextual behaviors and adaptive spread
   - AdvancedScreenEffects: Multi-layer effects with directional impact

3. **Integration Points**
   - Combat system (hits, damage)
   - Enemy positions
   - Player state (health, damage taken)
   - Weapon accuracy and state

4. **Technologies Used**
   - CSS animations for visual effects
   - Data attributes for visual variations
   - CSS custom properties for intensity scaling
   - Multi-element composition for complex effects

### Notification System

Manages game notifications with priority and queuing.

1. **Components**
   - NotificationManager: Core notification handling
   - KillFeed: Player elimination notifications
   - EventBanner: Major event announcements
   - AchievementDisplay: Achievement unlocks and progress

2. **Integration Points**
   - Kill events
   - Achievement system
   - Game state changes
   - Objective system

3. **Technologies Used**
   - Queue management for notifications
   - Priority-based display
   - CSS animations for transitions
   - Automatic cleanup of old notifications

### Menu System

Handles game menus, screens, and UI overlays.

1. **Components**
   - ScreenManager: Screen transitions and management
   - WorldMap: Level navigation with interactive elements
   - MissionBriefing: Mission details and objectives
   - RoundSummary: Post-round statistics

2. **Integration Points**
   - Game state (paused, menu, playing)
   - Mission/objective data
   - Player statistics
   - Level information

3. **Technologies Used**
   - Modal screen management
   - CSS transitions for screen changes
   - Interactive elements with event handling
   - Data visualization for statistics

### Progression System

Visualizes player progression and rewards.

1. **Components**
   - ExperienceBar: XP visualization with animations
   - PlayerRank: Rank display with badge and title
   - SkillPointsDisplay: Skill point allocation interface

2. **Integration Points**
   - Player XP and level data
   - Skill tree system
   - Rank progression

3. **Technologies Used**
   - Progress visualizations
   - Animation sequences for level-ups
   - Interactive skill allocation
   - Badge/rank visualization

### Environmental System

Provides contextual information about the game world.

1. **Components**
   - WeatherSystem: Visual effects for weather conditions
   - ObjectiveMarkerSystem: Waypoints and objective indicators
   - DangerZone: Hazardous area visualization
   - PowerupDisplay: Active buffs and status effects

2. **Integration Points**
   - Weather/environment state
   - Objective locations
   - Hazard zones
   - Active effects/buffs

3. **Technologies Used**
   - 3D to 2D position mapping
   - Distance calculations
   - Off-screen indicator system
   - Particle effects for weather

### Movement System

Detects and visualizes entity movement for enhanced spatial awareness.

1. **Components**
   - MovementSystem: Tracks entity positions and detects movement
   - FootstepIndicator: Visualizes detected footsteps with directional awareness

2. **Core Functionality**
   - Position tracking for both player and entities
   - Distance-based footstep detection with configurable thresholds
   - Standardized event emission with rich payload data
   - Direction calculation for spatial awareness
   - Distinguished friend/foe detection with different thresholds
   - Detection of continuous vs. single movement patterns
   - Testing tools for simulating movement without actual entity position changes

3. **Integration Points**
   - Entity position updates from game world
   - Player position and rotation
   - Combat system for threat awareness
   - Sprint state for movement pattern detection

4. **Technologies Used**
   - Position tracking with distance calculation
   - Angle calculation for directional awareness
   - Event standardization for consistent event payloads
   - Configurable thresholds for different entity types
   - Performance considerations for handling large entity counts

## Development Approach

### Development Process

1. **Phase-Based Implementation**
   - Core Architecture (UIComponent, EventManager, etc.)
   - CSS Foundation (variables, reset, etc.)
   - HUD Components
   - Combat Feedback Systems
   - Notification System
   - Menu System
   - Progression System
   - Environmental Systems
   - Refinement (Enhanced Combat Feedback, Event System Standardization, Movement System, etc.)
   - Performance Optimization (Event Performance Monitoring System)
   - Audio Integration

2. **Testing Strategy**
   - Component testing in isolation
   - System integration testing
   - Performance profiling
   - Browser compatibility testing

3. **Documentation**
   - Memory Bank for knowledge persistence
   - Component documentation in code
   - System documentation in specialized files
   - CSS and design system documentation

### Development Environment

1. **Tooling**
   - VSCode as primary editor
   - Vite for development server
   - npm for package management
   - Git for version control

2. **Project Structure**
   ```
   /
   ├── public/
   │   ├── assets/
   │   │   ├── animations/
   │   │   ├── audios/
   │   │   ├── config/
   │   │   ├── hud/
   │   │   ├── models/
   │   │   ├── navmeshes/
   │   │   └── textures/
   │   ├── styles/
   │   │   ├── components/
   │   │   │   ├── combat/
   │   │   │   ├── environment/
   │   │   │   ├── hud/
   │   │   │   ├── menus/
   │   │   │   ├── movement/
   │   │   │   ├── notifications/
   │   │   │   └── progression/
   │   │   ├── core/
   │   │   ├── responsive/
   │   │   └── utils/
   │   ├── index.html
   │   └── main.js
   ├── src/
   │   ├── components/
   │   │   └── ui/
   │   │       ├── combat/
   │   │       ├── environment/
   │   │       ├── hud/
   │   │       ├── menus/
   │   │       ├── movement/
   │   │       ├── notifications/
   │   │       └── progression/
   │   ├── controls/
   │   ├── core/
   │   ├── effects/
   │   ├── entities/
   │   ├── etc/
   │   ├── evaluators/
   │   ├── goals/
   │   ├── triggers/
   │   ├── utils/
   │   ├── weapons/
   │   └── main.js
   ├── docs/
   │   ├── EnhancedCombatFeedback.md
   │   ├── EventStandardization.md
   │   └── EventPerformanceMonitoring.md
   ├── memory-bank/
   │   ├── activeContext.md
   │   ├── productContext.md
   │   ├── progress.md
   │   ├── projectbrief.md
   │   ├── systemPatterns.md
   │   └── techContext.md
   └── .clinerules
   ```

## Technical Implementations

### Event Performance Monitoring Implementation

The Event Performance Monitoring system provides comprehensive performance tracking for events:

1. **Core EventManager Enhancements**
   - Added performance metrics tracking capabilities to EventManager:
     ```javascript
     // Tracking metrics in EventManager
     _trackEventPerformance(eventType, startTime) {
       const executionTime = performance.now() - startTime;
       
       // Update event metrics
       if (!this._eventMetrics.has(eventType)) {
         this._eventMetrics.set(eventType, {
           count: 0,
           totalExecutionTime: 0,
           avgExecutionTime: 0,
           minExecutionTime: Infinity,
           maxExecutionTime: 0,
           lastTimestamp: performance.now()
         });
       }
       
       const metrics = this._eventMetrics.get(eventType);
       metrics.count++;
       metrics.totalExecutionTime += executionTime;
       metrics.avgExecutionTime = metrics.totalExecutionTime / metrics.count;
       metrics.minExecutionTime = Math.min(metrics.minExecutionTime, executionTime);
       metrics.maxExecutionTime = Math.max(metrics.maxExecutionTime, executionTime);
       metrics.lastTimestamp = performance.now();
     }
     ```

2. **Configuration and Control**
   - Added configuration options in UIConfig.js:
     ```javascript
     // Event performance monitoring settings
     eventPerformance: {
       enabled: true,                  // Enable monitoring in development
       highFrequencyThreshold: 60,     // Events/sec considered high frequency
       slowHandlerThreshold: 1.0,      // Average ms considered slow
       trackingInterval: 5000,         // Update interval in ms
       maxEventsTracked: 1000          // Maximum number of events to track
     }
     ```
   - Provided API for enabling, disabling, and resetting performance tracking:
     ```javascript
     // Enable performance tracking
     EventManager.enablePerformanceTracking(highFrequencyThreshold, slowHandlerThreshold);
     
     // Disable tracking
     EventManager.disablePerformanceTracking();
     
     // Get current metrics
     const metrics = EventManager.getPerformanceMetrics();
     
     // Reset metrics
     EventManager.resetPerformanceMetrics();
     ```

3. **Performance Dashboard**
   - Created event-performance-monitor.html dashboard:
     - Tabbed interface with Overview, Event Frequency, Execution Time, and Recommendations
     - Real-time graphs and visualizations of event performance
     - Sortable and filterable tables of event metrics
     - Automatic optimization recommendations based on metrics

4. **Developer Tools Integration**
   - Added keyboard shortcut (Ctrl+Shift+D) for accessing developer tools
   - Integrated performance monitor with other development tools
   - Implemented toolbar for common actions (start/stop tracking, reset metrics, etc.)

### Event Standardization Implementation

The Event System has been enhanced with comprehensive standardization support:

1. **Core EventManager Updates**
   - Added validation for both two-part and three-part event name patterns:
     - Two-part: `namespace:action` (e.g., 'health:changed')
     - Three-part: `namespace:id:action` (e.g., 'ui:health-display:visible')
   - Implemented helper methods for creating standardized payloads:
     - `createStateChangeEvent()` for health, ammo, etc.
     - `createCombatEvent()` for hit registration, damage, etc.
     - `createNotificationEvent()` for all notification types
     - `createProgressEvent()` for XP, achievements, etc.
   - Added payload validation based on event type
   - Enhanced debug logging for event tracing
   - Added configurable validation (on/off) for production vs development

2. **EventStandardizationImplementer Utility**
   - Created mapping from legacy event names to standardized names
   - Defined standard namespaces and actions
   - Implemented payload templates for different event types
   - Created component analysis functionality
   - Added migration code generation
   - Implemented JSDoc comment generation for standardized events
   - Support for component-specific events

3. **Testing Framework**
   - Developed EventStandardizationTest with test cases
   - Created interactive event-test.html for visual testing
   - Added validation test cases for enforcing standards
   - Implemented benchmarking tools for performance testing

4. **Interactive Tools**
   - Built Event Standardization Index tool with:
     - Component analysis and compliance reporting
     - Event validation and recommendations
     - Migration code generation
     - Visual dashboard for progress tracking

### Enhanced Combat Feedback Implementation

The Combat Feedback system has been enhanced with advanced visual effects:

1. **EnhancedDamageIndicator**
   - Implemented type-specific indicators for different damage types
   - Added intensity scaling based on damage amount
   - Created distance representation via visual cues
   - Supported multiple simultaneous damage sources
   - Built multi-stage fade system for smooth transitions

2. **EnhancedHitIndicator**
   - Implemented differentiated visuals for body shots, critical hits, headshots, and kills
   - Created dynamic animation sequences for hit confirmation
   - Added visual scaling based on damage amount
   - Designed special kill confirmation indicators
   - Built multi-kill recognition for successive kills

3. **DynamicCrosshairSystem**
   - Implemented dynamic spread visualization based on weapon accuracy
   - Created contextual color changes based on target type
   - Added shape changes based on interaction context
   - Integrated with weapon state (reloading, empty, switching)
   - Added critical hit potential visualization
   - Implemented multi-kill feedback for successive eliminations

4. **AdvancedScreenEffects**
   - Created directional screen shake reflecting impact direction
   - Implemented variable effect intensity based on damage type and amount
   - Built multi-layer effects system (vignette, color shift, blur)
   - Used hardware-accelerated animations for performance
   - Added special effects for critical states and powerups
   - Implemented environmental effect visualizations
   - Added accessibility considerations including reduced motion support

### Movement System Implementation

The Movement System provides spatial awareness of entity movement with standardized events:

1. **Core Architecture**
   - Modular MovementSystem component extending UIComponent
   - Player and entity position tracking with delta calculation
   - Distance-based footstep detection with configurable thresholds
   - Standardized event emission with rich positional data
   - Direction calculation for spatial awareness
   - Entity type differentiation (friend vs. foe)
   - Continuous vs. single movement pattern detection
   - Performance optimizations for tracking large numbers of entities

2. **Position Tracking**
   - Maintains cache of entity positions and state
   - Calculates distance traveled between position updates
   - Configurable thresholds for generating footstep events
   - Adjustable detection radius with type-specific multipliers
   - Sprint state integration with adjusted footstep frequency

3. **Event Standardization**
   - Emits standardized 'movement:footstep' events
   - Rich payload with source entity information, positions, and metadata:
     ```javascript
     // Example standardized movement:footstep event
     {
       // Source entity information
       source: {
         id: entityId,
         type: 'enemy',
         name: 'Grunt-123',
         position: {x: 10, y: 0, z: 5}
       },
       // Position data
       position: {x: 10, y: 0, z: 5},
       playerPosition: {x: 0, y: 0, z: 0},
       playerRotation: 1.57,
       
       // Additional metadata
       isFriendly: false,
       isContinuous: true,
       distance: 10.5,
       direction: 45,
       timestamp: 12345678
     }
     ```

4. **Testing Utilities**
   - Comprehensive test methods for development and debugging
   - `testFootstep()` for simulating individual footsteps with configurable parameters
   - `testFootstepSequence()` for creating a series of footsteps from the same entity
   - Built-in debug mode with detailed console logging
   - Extensible configuration options for testing different scenarios
   - Methods for simulating both friendly and enemy footsteps
   - Support for chaining footsteps to create movement paths

## Performance Considerations

1. **DOM Performance**
   - Minimize DOM operations for frequently updated elements
   - Batch DOM updates with requestAnimationFrame
   - Use CSS class manipulation over direct style changes
   - Implement element pooling for frequent creation/destruction

2. **Animation Performance**
   - Use hardware-accelerated properties (transform, opacity)
   - Implement CSS animations over JavaScript when possible
   - Limit simultaneous animations during intensive gameplay
   - Apply reduced motion settings for accessibility

3. **Event System Optimization**
   - Debounce high-frequency events
   - Minimize event payload size for frequent events
   - Batch event emissions when appropriate
   - Clean up event listeners to prevent memory leaks
   - Use event performance monitoring to identify bottlenecks

4. **Rendering Efficiency**
   - Optimize CSS selectors for performance
   - Minimize layout thrashing with read/write batching
   - Use CSS containment for independent components
   - Implement visibility tracking for off-screen elements

## Technical Constraints

1. **Browser Compatibility**
   - Target modern browsers (Chrome, Firefox, Safari, Edge)
   - Use polyfills for essential features on older browsers
   - Progressive enhancement for advanced visual effects

2. **Performance Requirements**
   - Maintain 60 FPS during intensive gameplay
   - Minimize main thread blocking operations
   - Support for various hardware configurations
   - Optimize for both high-end and mid-range systems

3. **Integration Limitations**
   - UI layer must work with existing game systems
   - Minimal changes to core gameplay code
   - DOM-based UI must overlay Three.js canvas
   - Communication via standardized events

## Future Technical Considerations

1. **Performance Optimization**
   - Further optimization of high-frequency update components
   - Complete migration of remaining UI components to ElementPool
   - Memory leak detection and prevention
   - Advanced performance monitoring and metrics

2. **Audio System Integration**
   - Development of UI sound system
   - Integration with visual feedback components
   - Accessibility options for audio feedback
   - Spatial audio integration where appropriate

3. **Accessibility Enhancements**
   - Color blind modes for critical UI elements
   - Screen reader support for key information
   - Reduced motion options for animations
   - Configurable UI sizing and positioning

4. **Advanced Customization**
   - User-configurable HUD layouts
   - Theme selection for UI elements
   - Performance/visual quality tradeoff options
   - Personal statistics display options
