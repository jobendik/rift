# System Patterns: RIFT FPS UI/CSS Redesign

This document outlines the architectural patterns, design principles, and technical decisions used in the RIFT FPS UI/CSS redesign. It serves as a guide for maintaining consistency across the codebase and making informed decisions for future development.

## Component Architecture

### UIComponent Base Class

The UI system is built on a component-based architecture with the `UIComponent` base class providing core functionality:

```javascript
// Core lifecycle pattern
class UIComponent {
  constructor(parent) {
    this.parent = parent;
    this.children = new Set();
    this.eventSubscriptions = [];
    this.element = null;
  }

  init() { /* Initialize component */ }
  update(deltaTime) { /* Update component state */ }
  render() { /* Update DOM representation */ }
  dispose() { /* Clean up resources and event listeners */ }
}
```

Key patterns implemented in the `UIComponent` class:

1. **Lifecycle Management**
   - `init()`: Setup, DOM creation, event binding
   - `update(deltaTime)`: Regular state updates (called by animation frame)
   - `render()`: DOM updates based on state changes
   - `dispose()`: Cleanup resources, event subscriptions, and DOM elements

2. **Component Hierarchy**
   - Parent-child relationships with automatic propagation of lifecycle methods
   - Child components are registered/unregistered in parent
   - Lifecycle methods cascade through the component tree

3. **Event Subscription Management**
   - Automatic tracking of event subscriptions
   - Automatic unsubscription during `dispose()`
   - Standardized event subscription pattern

4. **Element Creation and Management**
   - Components manage their own DOM elements
   - Standard patterns for creating and updating elements
   - Automatic element cleanup on disposal

5. **Animation System**
   - Built-in support for animations with easing functions
   - Methods for starting, stopping, and chaining animations
   - Integration with CSS transitions and animations

6. **State Management**
   - Internal state tracking with change detection
   - Methods for controlled state updates that trigger renders
   - Support for debounced updates for performance

7. **Visibility Controls**
   - Methods for showing, hiding, and toggling visibility
   - Support for animated transitions between states
   - Automatic CSS class management for visibility states

### System Components

The UI is organized into system components that orchestrate related functionality:

1. **HUDSystem**
   - Coordinates HUD components (health, ammo, compass, etc.)
   - Manages layout and positioning of HUD elements
   - Handles HUD-wide state (like visibility toggling)

2. **CombatSystem**
   - Orchestrates combat feedback components
   - Manages hit indicators, damage indicators, screen effects
   - Coordinates complex multi-component feedback sequences

3. **NotificationSystem**
   - Controls notification-related components
   - Manages notification queue and priority
   - Coordinates different notification types

4. **MenuSystem**
   - Manages menu screens and transitions
   - Handles modal dialogs and popups
   - Controls menu navigation and state

5. **ProgressionSystem**
   - Coordinates progression-related UI components
   - Manages XP, level, and skill point displays
   - Handles progression animations and feedback

6. **EnvironmentSystem**
   - Orchestrates environment-related UI elements
   - Manages objective markers, danger zones, weather effects
   - Coordinates world-space UI elements

Each system extends `UIComponent` and follows a consistent pattern:

```javascript
class SystemName extends UIComponent {
  constructor(parent) {
    super(parent);
    this.subsystems = {};
  }

  init() {
    super.init();
    this._createComponents();
    this._setupEventListeners();
  }

  _createComponents() {
    // Create and initialize child components
    this.subsystems.componentA = new ComponentA(this);
    this.subsystems.componentA.init();
    // etc.
  }

  _setupEventListeners() {
    // Register system-wide event listeners
  }

  // System-specific methods...
}
```

## CSS Architecture

### BEM Methodology with RIFT Prefix

CSS follows BEM (Block, Element, Modifier) methodology with a `rift-` prefix for namespacing:

```css
/* Block */
.rift-health {
  /* Block styles */
}

/* Element */
.rift-health__bar {
  /* Element styles */
}

/* Modifier */
.rift-health__bar--critical {
  /* Modifier styles */
}
```

### CSS Structure

CSS is organized into multiple layers:

1. **Core**
   - `_variables.css`: Design tokens and theme variables
   - `_reset.css`: Base styles and normalization
   - `_typography.css`: Text styles and fonts
   - `_animations.css`: Shared animation keyframes
   - `_layout.css`: Layout structures and grid

2. **Utils**
   - `_mixins.css`: Reusable property sets
   - `_helpers.css`: Utility classes

3. **Components**
   - Organized by system (hud, combat, menus, etc.)
   - Component files follow component structure
   - Component-specific variables scoped to component

4. **Responsive**
   - `_desktop.css`, `_tablet.css`, `_mobile.css`
   - Media query breakpoints and responsive adjustments

### CSS Variables

CSS variables are used extensively for theming and consistency:

```css
:root {
  /* Colors */
  --rift-color-primary: #007bff;
  --rift-color-secondary: #6c757d;
  --rift-color-success: #28a745;
  --rift-color-danger: #dc3545;
  --rift-color-warning: #ffc107;
  --rift-color-info: #17a2b8;
  
  /* Spacing */
  --rift-spacing-xs: 4px;
  --rift-spacing-sm: 8px;
  --rift-spacing-md: 16px;
  --rift-spacing-lg: 24px;
  --rift-spacing-xl: 32px;
  
  /* Typography */
  --rift-font-family: 'Exo 2', sans-serif;
  --rift-font-size-sm: 12px;
  --rift-font-size-md: 16px;
  --rift-font-size-lg: 20px;
  --rift-font-size-xl: 24px;
  
  /* Animations */
  --rift-animation-fast: 100ms;
  --rift-animation-normal: 200ms;
  --rift-animation-slow: 300ms;
  
  /* Z-indices */
  --rift-z-index-hud: 100;
  --rift-z-index-notification: 200;
  --rift-z-index-modal: 300;
  --rift-z-index-overlay: 400;
}
```

A JavaScript mirror (`UIConfig.js`) maintains these variables for JS code to access:

```javascript
const UIConfig = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    // etc.
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    // etc.
  },
  
  // etc.
};
```

## Event System

### Event Manager

The `EventManager` provides a central event bus using a pub/sub pattern:

```javascript
class EventManager {
  constructor() {
    this._events = new Map();
    this._subscriptionId = 0;
  }
  
  subscribe(eventType, handler) {
    // Register handler for event type
    // Return subscription object
  }
  
  unsubscribe(subscription) {
    // Remove handler registration
  }
  
  emit(eventType, data) {
    // Notify all handlers for this event type
  }
}
```

### Event Standardization

The event system has been enhanced with standardization support, implementing the following patterns:

1. **Standardized Event Names**
   - Follows `namespace:action` pattern (e.g., `health:changed`, `player:damaged`)
   - Consistent verb forms (mostly past tense for state changes: changed, updated, damaged, killed)
   - Predefined set of standard namespaces (player, health, weapon, etc.)

2. **Standardized Event Payloads**
   - Consistent structure based on event type
   - Type-specific required fields
   - Common metadata (timestamp, type)

3. **Event Type Categories**
   - **State Change Events**: For value changes (health, ammo, etc.)
     ```javascript
     // Example: health:changed event
     {
       type: 'health:changed',
       timestamp: 1621603987123,
       value: 80,         // Current value
       previous: 100,     // Previous value
       delta: -20,        // Change amount
       max: 100,          // Maximum possible value
       source: 'enemy-attack' // What caused the change
     }
     ```
   
   - **Combat Events**: For combat interactions
     ```javascript
     // Example: hit:registered event
     {
       type: 'hit:registered',
       timestamp: 1621603987123,
       source: {          // Source entity
         id: 'player-1',
         type: 'player',
         name: 'Player',
         position: {x: 0, y: 1.8, z: 0}
       },
       target: {          // Target entity
         id: 'enemy-442',
         type: 'enemy',
         name: 'Grunt',
         position: {x: 5, y: 1.8, z: 3}
       },
       weapon: {          // Weapon used
         id: 'weapon-2',
         type: 'rifle',
         name: 'Assault Rifle'
       },
       damage: 25,        // Damage amount
       isCritical: false, // Critical hit flag
       isHeadshot: true,  // Headshot flag
       direction: {x: 0.7, y: 0, z: 0.3} // Direction vector
     }
     ```
   
   - **Notification Events**: For user notifications
     ```javascript
     // Example: notification:displayed event
     {
       type: 'notification:displayed',
       timestamp: 1621603987123,
       message: 'Sharpshooter', // Notification message
       category: 'achievement', // Notification category
       duration: 5000,         // Duration in milliseconds
       priority: 2,            // Priority level
       id: 'achievement-sharpshooter', // Unique ID
       icon: 'trophy-icon',    // Icon to display
       actions: [{             // Available actions
         label: 'View',
         action: 'view-achievement'
       }]
     }
     ```
   
   - **Progress Events**: For progression updates
     ```javascript
     // Example: xp:gained event
     {
       type: 'xp:gained',
       timestamp: 1621603987123,
       amount: 100,           // Amount of XP
       source: 'enemy-kill',  // Source of XP
       total: 1250,           // New total XP
       level: {               // Level information
         current: 5,
         previous: 4,
         isLevelUp: true
       },
       rewards: ['skill-point'] // Any rewards earned
     }
     ```

4. **Event Standardization Implementation Tools**
   - `EventStandardizationImplementer`: Utility for analyzing and migrating components
   - Event name mapping from legacy names to standardized names
   - Payload template generation for different event types
   - JSDoc comment generation for standardized events
   - Migration code generation
   
5. **EventManager Helper Methods**
   - `createStateChangeEvent()`: For state change events
   - `createCombatEvent()`: For combat-related events
   - `createNotificationEvent()`: For notification events
   - `createProgressEvent()`: For progression events

6. **Event Validation**
   - Validation for event names (namespace:action pattern)
   - Validation for event payloads (required fields)
   - Debug mode for logging validation issues

### Event Usage Pattern in Components

Components follow a consistent pattern for event usage:

```javascript
class MyComponent extends UIComponent {
  init() {
    super.init();
    this._setupEventListeners();
  }
  
  _setupEventListeners() {
    // Register event handlers
    this.eventSubscriptions.push(
      EventManager.subscribe('health:changed', this._onHealthChanged.bind(this))
    );
  }
  
  _onHealthChanged(event) {
    // Handle event
    console.log(`Health changed: ${event.previous} → ${event.value}`);
    // Update component state
    this.render();
  }
  
  // Automatic cleanup in parent class dispose() method
}
```

## DOM Manipulation Pattern

### DOMFactory

The `DOMFactory` class provides a factory pattern for consistent DOM creation:

```javascript
class DOMFactory {
  /**
   * Create a DOM element with BEM conventions
   */
  static createElement(blockName, elementName, modifiers = []) {
    const element = document.createElement('div');
    
    // Apply BEM class naming
    let className = `rift-${blockName}`;
    if (elementName) {
      className += `__${elementName}`;
    }
    element.classList.add(className);
    
    // Apply modifiers
    modifiers.forEach(modifier => {
      element.classList.add(`${className}--${modifier}`);
    });
    
    return element;
  }
  
  /**
   * Create a specialized element type (button, input, etc.)
   */
  static createElementOfType(type, blockName, elementName, modifiers = []) {
    // Similar to createElement but with specified element type
  }
  
  /**
   * Create a text node within an element
   */
  static createTextElement(blockName, elementName, text, modifiers = []) {
    // Create element and set text content
  }
  
  // Other factory methods...
}
```

### DOM Update Pattern

Components follow a clear separation between state and DOM:

1. State changes in response to events or method calls
2. `render()` method updates DOM based on current state
3. No direct DOM manipulation outside of `render()`

```javascript
class HealthDisplay extends UIComponent {
  constructor(parent) {
    super(parent);
    this.state = {
      currentHealth: 100,
      maxHealth: 100,
      isCritical: false
    };
  }
  
  init() {
    super.init();
    this._createElements();
    this._setupEventListeners();
    this.render();
  }
  
  _createElements() {
    this.element = DOMFactory.createElement('health');
    this.healthBar = DOMFactory.createElement('health', 'bar');
    this.element.appendChild(this.healthBar);
  }
  
  _setupEventListeners() {
    this.eventSubscriptions.push(
      EventManager.subscribe('health:changed', this._onHealthChanged.bind(this))
    );
  }
  
  _onHealthChanged(event) {
    // Update component state
    this.state.currentHealth = event.value;
    this.state.maxHealth = event.max;
    this.state.isCritical = event.value < event.max * 0.2;
    
    // Trigger render
    this.render();
  }
  
  render() {
    // Update DOM based on state
    const healthPercent = (this.state.currentHealth / this.state.maxHealth) * 100;
    this.healthBar.style.width = `${healthPercent}%`;
    
    // Update modifiers based on state
    if (this.state.isCritical) {
      this.healthBar.classList.add('rift-health__bar--critical');
    } else {
      this.healthBar.classList.remove('rift-health__bar--critical');
    }
  }
}
```

## Performance Patterns

### Batch DOM Updates

For high-frequency updates, batch DOM changes to minimize reflows:

```javascript
function updateMultipleElements() {
  // Group reads
  const width = element1.offsetWidth;
  const height = element2.offsetHeight;
  
  // Group writes
  requestAnimationFrame(() => {
    element3.style.width = `${width}px`;
    element4.style.height = `${height}px`;
  });
}
```

### Hardware-Accelerated Animations

Prefer CSS properties that are hardware-accelerated:

```css
/* Instead of */
.element {
  animation: move 500ms;
}

@keyframes move {
  from { left: 0; top: 0; }
  to { left: 100px; top: 100px; }
}

/* Use */
.element {
  animation: move 500ms;
}

@keyframes move {
  from { transform: translate(0, 0); }
  to { transform: translate(100px, 100px); }
}
```

### Event Debouncing

For high-frequency events, use debouncing:

```javascript
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Usage
this.onResize = debounce(this._handleResize.bind(this), 100);
window.addEventListener('resize', this.onResize);
```

## Animation Patterns

### Animation System

The `UIComponent` base class provides animation utilities:

```javascript
// In UIComponent class
animate(property, startValue, endValue, duration, easing = 'linear', callback) {
  const startTime = performance.now();
  const change = endValue - startValue;
  
  const step = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = this._applyEasing(progress, easing);
    const currentValue = startValue + (change * easedProgress);
    
    // Update property
    this[property] = currentValue;
    
    // Continue animation if not complete
    if (progress < 1) {
      this._animationFrame = requestAnimationFrame(step);
    } else if (callback) {
      callback();
    }
  };
  
  // Start animation
  this._animationFrame = requestAnimationFrame(step);
}

_applyEasing(progress, easing) {
  // Implement easing functions (linear, easeIn, easeOut, etc.)
}
```

### CSS Animation Classes

For simpler animations, toggle CSS classes:

```javascript
// In component
showWithAnimation() {
  this.element.classList.add('rift-appear');
  
  // Clean up after animation
  const onAnimationEnd = () => {
    this.element.removeEventListener('animationend', onAnimationEnd);
    this.element.classList.remove('rift-appear');
    this.element.classList.add('rift-visible');
  };
  
  this.element.addEventListener('animationend', onAnimationEnd);
}
```

```css
/* In CSS */
.rift-appear {
  animation: fade-in 300ms var(--rift-ease-out);
}

.rift-visible {
  opacity: 1;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## Enhanced Combat Feedback System

### Component Architecture

The Enhanced Combat Feedback system follows these architectural patterns:

1. **Enhanced Variants of Base Components**
   - Enhanced components extend the base functionality
   - Base component API is preserved for compatibility
   - Enhanced features are added on top of base implementation

2. **Type-Based Visual Differentiation**
   - Components use data attributes to drive visual variations
   - CSS selectors target these attributes for styling
   - JS code sets attributes based on event data

3. **Intensity Scaling**
   - Visual effects scale based on intensity values
   - CSS custom properties control visual intensity
   - JS calculates appropriate intensity values from gameplay data

4. **Multi-Layer Composition**
   - Complex visual effects use multiple DOM elements
   - Elements are composed to create compound effects
   - Each layer has a specific visual responsibility

5. **Hardware-Accelerated Animation**
   - Transform and opacity for performance
   - Animation orchestration via JS for complex sequences
   - CSS keyframes for repeatable animations

### Example: Enhanced Damage Indicator Pattern

```javascript
// Component implementation pattern
class EnhancedDamageIndicator extends UIComponent {
  init() {
    super.init();
    this._createIndicators();
    this._setupEventListeners();
  }
  
  _createIndicators() {
    this.element = DOMFactory.createElement('damage-indicator');
    
    // Create indicators for each direction
    this.indicators = {
      front: this._createDirectionalIndicator('front'),
      back: this._createDirectionalIndicator('back'),
      left: this._createDirectionalIndicator('left'),
      right: this._createDirectionalIndicator('right')
    };
  }
  
  _createDirectionalIndicator(direction) {
    const indicator = DOMFactory.createElement('damage-indicator', 'direction');
    indicator.dataset.direction = direction;
    
    // Create inner elements for multi-layer effect
    const outer = DOMFactory.createElement('damage-indicator', 'outer');
    const inner = DOMFactory.createElement('damage-indicator', 'inner');
    const pulse = DOMFactory.createElement('damage-indicator', 'pulse');
    
    indicator.appendChild(outer);
    indicator.appendChild(inner);
    indicator.appendChild(pulse);
    
    this.element.appendChild(indicator);
    return indicator;
  }
  
  showDamageIndicator(direction, intensity, damageType) {
    const indicator = this.indicators[direction];
    
    if (!indicator) return;
    
    // Set attributes for styling
    indicator.dataset.active = 'true';
    indicator.dataset.damageType = damageType || 'bullet';
    
    // Set intensity via CSS custom property
    indicator.style.setProperty('--damage-intensity', intensity.toFixed(2));
    
    // Trigger animation
    indicator.classList.add('rift-damage-indicator__direction--active');
    
    // Schedule cleanup
    setTimeout(() => {
      indicator.classList.remove('rift-damage-indicator__direction--active');
      indicator.dataset.active = 'false';
    }, 1000); // Animation duration
  }
  
  _onPlayerDamaged(event) {
    // Calculate direction from damage source
    const direction = this._calculateDamageDirection(event.source.position);
    
    // Calculate intensity based on damage amount and max health
    const intensity = Math.min(event.damage / (event.max * 0.3), 1);
    
    // Show indicator
    this.showDamageIndicator(direction, intensity, event.damageType);
  }
}
```

```css
/* CSS pattern */
.rift-damage-indicator__direction {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  transition: opacity 300ms var(--rift-ease-out);
}

.rift-damage-indicator__direction--active {
  opacity: 1;
}

/* Direction-specific positioning */
.rift-damage-indicator__direction[data-direction="front"] {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
}

/* Similar for other directions... */

/* Damage type differentiation */
.rift-damage-indicator__direction[data-damage-type="bullet"] {
  --indicator-color: var(--rift-color-damage-bullet);
}

.rift-damage-indicator__direction[data-damage-type="explosion"] {
  --indicator-color: var(--rift-color-damage-explosion);
}

/* Intensity control */
.rift-damage-indicator__inner {
  transform: scale(calc(0.8 + (var(--damage-intensity) * 0.4)));
  opacity: var(--damage-intensity);
}
```

## Event Standardization Implementation

### Component Analysis and Migration

The event standardization implementation follows these patterns:

1. **Component Analysis**
   - Scan components for event subscriptions
   - Identify non-standard event names
   - Generate compliance reports

2. **Migration Code Generation**
   - Map legacy event names to standardized ones
   - Generate migration code suggestions
   - Create JSDoc comments for standardized handlers

3. **EventStandardizationImplementer Tool**
   - Centralizes standardization logic
   - Provides utilities for component migration
   - Handles event name and payload standardization

4. **Interactive Migration Tool**
   - Visual dashboard for standardization progress
   - Component-by-component analysis
   - Migration code generation and validation

### Pattern for Updating Components

```javascript
// Before standardization
class ExampleComponent extends UIComponent {
  _setupEventListeners() {
    this.eventSubscriptions.push(
      EventManager.subscribe('health:max', this._onMaxHealthChanged.bind(this)),
      EventManager.subscribe('enemy:kill', this._onEnemyKill.bind(this))
    );
  }
  
  _onMaxHealthChanged(event) {
    // Handler implementation
  }
  
  _onEnemyKill(event) {
    // Handler implementation
  }
}

// After standardization
class ExampleComponent extends UIComponent {
  _setupEventListeners() {
    this.eventSubscriptions.push(
      EventManager.subscribe('health:max-changed', this._onMaxHealthChanged.bind(this)),
      EventManager.subscribe('enemy:killed', this._onEnemyKilled.bind(this))
    );
  }
  
  /**
   * Handle health:max-changed event
   * @param {Object} event - Standardized state change event
   * @param {number} event.value - Current maximum health value
   * @param {number} event.previous - Previous maximum health value
   * @param {number} event.delta - Change amount
   * @private
   */
  _onMaxHealthChanged(event) {
    // Handler implementation using standardized payload
  }
  
  /**
   * Handle enemy:killed event
   * @param {Object} event - Standardized combat event
   * @param {Object} event.source - Source entity information
   * @param {Object} event.target - Target entity information
   * @param {Object} event.weapon - Weapon information
   * @private
   */
  _onEnemyKilled(event) {
    // Handler implementation using standardized payload
    // Note renamed method to match event name
  }
}
```

## Integration Patterns

### Three.js Integration with DOM UI

```javascript
// Example: ObjectiveMarkerSystem integrating 3D positions with DOM UI
class ObjectiveMarkerSystem extends UIComponent {
  updateMarkers(worldObjects, camera, screenSize) {
    worldObjects.forEach(object => {
      // Get screen position from 3D world position
      const screenPosition = this._worldToScreen(object.position, camera, screenSize);
      
      // Update DOM marker position
      const marker = this.markers.get(object.id);
      if (marker) {
        // Is object in view?
        if (this._isInView(screenPosition)) {
          // Position on-screen marker
          marker.style.left = `${screenPosition.x}px`;
          marker.style.top = `${screenPosition.y}px`;
          marker.classList.remove('rift-objective-marker--off-screen');
        } else {
          // Position off-screen indicator at screen edge
          const edgePosition = this._getScreenEdgePosition(screenPosition, screenSize);
          marker.style.left = `${edgePosition.x}px`;
          marker.style.top = `${edgePosition.y}px`;
          
          // Rotate to point toward off-screen object
          const angle = this._calculateAngleToPosition(screenPosition, screenSize);
          marker.style.transform = `rotate(${angle}deg)`;
          
          marker.classList.add('rift-objective-marker--off-screen');
        }
        
        // Update distance
        const distance = this._calculateDistance(object.position, camera.position);
        marker.querySelector('.rift-objective-marker__distance').textContent = 
          `${Math.round(distance)}m`;
      }
    });
  }
  
  // Helper methods...
}
```

### System Registration Pattern

```javascript
// UIManager orchestrates all systems
class UIManager {
  constructor() {
    this.systems = {};
    this.fpsCounter = null;
    this.lastTime = 0;
    this.isRunning = false;
  }
  
  init() {
    this._createSystems();
    this._setupEventListeners();
    this.start();
  }
  
  _createSystems() {
    // Register all systems
    this.systems.hud = new HUDSystem(this);
    this.systems.combat = new CombatSystem(this);
    this.systems.notifications = new NotificationSystem(this);
    this.systems.menus = new MenuSystem(this);
    this.systems.progression = new ProgressionSystem(this);
    this.systems.environment = new EnvironmentSystem(this);
    
    // Initialize all systems
    Object.values(this.systems).forEach(system => system.init());
  }
  
  registerSystem(name, system) {
    if (this.systems[name]) {
      console.warn(`System ${name} already registered. Overwriting.`);
    }
    
    this.systems[name] = system;
    if (this.isRunning) {
      system.init();
    }
    
    return system;
  }
  
  update(timestamp) {
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;
    
    // Update all systems
    Object.values(this.systems).forEach(system => system.update(deltaTime));
    
    // Continue animation loop
    if (this.isRunning) {
      this.animationFrame = requestAnimationFrame(this.update.bind(this));
    }
  }
  
  // Other methods...
}
```

## Responsive Design Patterns

### Screen Size Management

```javascript
class UIManager {
  // ...
  
  _setupEventListeners() {
    // Handle window resize
    window.addEventListener('resize', this._onResize.bind(this));
    this._onResize(); // Initial size
  }
  
  _onResize() {
    // Get current screen size
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Set size on root element
    document.documentElement.style.setProperty('--rift-viewport-width', `${width}px`);
    document.documentElement.style.setProperty('--rift-viewport-height', `${height}px`);
    
    // Determine size class
    let sizeClass = 'desktop';
    if (width <= 768) {
      sizeClass = 'mobile';
    } else if (width <= 1200) {
      sizeClass = 'tablet';
    }
    
    // Update size class on body
    document.body.dataset.sizeClass = sizeClass;
    
    // Notify systems of resize
    Object.values(this.systems).forEach(system => {
      if (system.onResize) {
        system.onResize(width, height, sizeClass);
      }
    });
  }
}
```

### Responsive CSS Pattern

```css
/* Base styles */
.rift-component {
  /* Default styles for all sizes */
}

/* Size-specific styles */
[data-size-class="mobile"] .rift-component {
  /* Mobile styles */
}

[data-size-class="tablet"] .rift-component {
  /* Tablet styles */
}

[data-size-class="desktop"] .rift-component {
  /* Desktop styles */
}
```

## Input Handling Patterns

### Input Abstraction

```javascript
class InputHandler {
  constructor() {
    this._setupMouseEvents();
    this._setupKeyboardEvents();
    this._setupTouchEvents();
    
    this.mousePosition = { x: 0, y: 0 };
    this.normalizedMousePosition = { x: 0, y: 0 }; // -1 to 1
    this.keys = new Set();
  }
  
  _
