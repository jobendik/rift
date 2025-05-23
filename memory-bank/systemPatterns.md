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
   
7. **MovementSystem**
   - Tracks entity positions and detects movement
   - Provides spatial awareness through footstep indicators
   - Handles movement patterns detection and visualization

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
   - `_ui-states.css`: Common UI state styles

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
    this._eventMetrics = new Map(); // Performance tracking
  }
  
  subscribe(eventType, handler) {
    // Register handler for event type
    // Return subscription object
  }
  
  unsubscribe(subscription) {
    // Remove handler registration
  }
  
  emit(eventType, data) {
    // Start performance tracking
    const startTime = performance.now();
    
    // Notify all handlers for this event type
    
    // Track performance metrics
    this._trackEventPerformance(eventType, startTime);
  }
  
  // Performance tracking methods
  _trackEventPerformance(eventType, startTime) {
    // Calculate execution time and update metrics
  }
  
  getPerformanceMetrics() {
    // Return current metrics data
  }
  
  enablePerformanceTracking() {
    // Enable tracking with configurable thresholds
  }
  
  disablePerformanceTracking() {
    // Disable tracking
  }
}
```

### Event Standardization

The event system has been enhanced with standardization support, implementing the following patterns:

1. **Standardized Event Names**
   - Follows `namespace:action` pattern (e.g., `health:changed`, `player:damaged`)
   - Consistent verb forms using past tense for actions (changed, updated, damaged, killed, placed)
   - Past tense indicates the event represents something that has already occurred
   - Predefined set of standard namespaces (player, health, weapon, environment, etc.)
   - Examples from environment components:
     - `window:resized` (not `window:resize`) - A resizing has happened
     - `weather:changed` (not `weather:change`) - Weather has changed
     - `environment:updated` (not `environment:update`) - Environment state has updated
     - `waypoint:placed` (not `waypoint:set`) - A waypoint has been placed
     - `game:paused` and `game:resumed` - Game state has changed

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
     
   - **Movement Events**: For entity movement
     ```javascript
     // Example: movement:footstep event
     {
       type: 'movement:footstep',
       timestamp: 1621603987123,
       source: {               // Source entity
         id: 'enemy-442',
         type: 'enemy',
         name: 'Grunt',
         position: {x: 5, y: 0, z: 3}
       },
       playerPosition: {x: 0, y: 0, z: 0},  // Player position
       playerRotation: 1.57,                // Player rotation in radians
       isFriendly: false,                   // Friend or foe
       isContinuous: true,                  // Part of continuous movement
       distance: 10.5,                      // Distance from player
       direction: 45,                       // Direction in degrees
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
   - `createMovementEvent()`: For movement and position events

6. **Event Validation**
   - Validation for event names (namespace:action pattern)
   - Validation for event payloads (required fields)
   - Debug mode for logging validation issues

### Event Performance Monitoring

The event system now includes comprehensive performance monitoring:

1. **Performance Metrics Collection**
   - Event frequency tracking
   - Handler execution time measurement
   - Event throughput calculation
   - Memory usage estimation
   - Min/max/avg execution time tracking
   - High-frequency event detection

2. **Configuration Options**
   ```javascript
   // UIConfig.js
   eventPerformance: {
     enabled: true,                  // Enable monitoring in development
     highFrequencyThreshold: 60,     // Events/sec considered high frequency
     slowHandlerThreshold: 1.0,      // Average ms considered slow
     trackingInterval: 5000,         // Update interval in ms
     maxEventsTracked: 1000          // Maximum events to track
   }
   ```

3. **Performance Dashboard**
   - Real-time event frequency visualization
   - Handler execution time analysis
   - High-impact event identification
   - Automatic optimization recommendations
   - Filtering and sorting capabilities
   - Export functionality for sharing/analysis

4. **Developer Tools Integration**
   - Accessible via keyboard shortcut (Ctrl+Shift+D)
   - Integrated with other development tools
   - Performance recommendations
   - Visual indicators for problematic events

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

### Element Pooling

For frequently created and destroyed elements, use element pooling to minimize DOM operations and reduce garbage collection. The enhanced ElementPool utility significantly improves UI performance:

```javascript
class ElementPool {
  /**
   * Create an element pool
   * @param {Object} options - Pool configuration
   * @param {string} options.elementType - Type of element to create ('div', 'span', etc.)
   * @param {HTMLElement} options.container - Parent container for elements
   * @param {string} [options.className] - Class to apply to all elements
   * @param {number} [options.initialSize=10] - Initial pool size
   * @param {number} [options.maxSize=100] - Maximum pool size
   * @param {Function} [options.createFn] - Custom element creation function
   * @param {Function} [options.resetFn] - Custom element reset function
   * @param {boolean} [options.useBlocks=true] - Use block containers for better performance
   * @param {number} [options.blockSize=10] - Elements per block container
   */
  constructor(options = {}) {
    // Configuration
    this.elementType = options.elementType || 'div';
    this.container = options.container || document.body;
    this.className = options.className || '';
    this.initialSize = options.initialSize || 10;
    this.maxSize = options.maxSize || 100;
    this.createFn = options.createFn || null;
    this.resetFn = options.resetFn || null;
    this.useBlocks = options.useBlocks !== false;
    this.blockSize = options.blockSize || 10;
    
    // State
    this.pool = [];
    this.inUse = new Set();
    this.totalCreated = 0;
    this.blocks = [];
    this.stats = {
      created: 0,
      acquired: 0,
      released: 0,
      peak: 0
    };
    
    // Initialize pool
    this._initializePool();
  }
  
  /**
   * Acquire an element from the pool
   * @returns {Object} Object containing element and release function
   */
  acquire() {
    // Track stats
    this.stats.acquired++;
    this.stats.peak = Math.max(this.stats.peak, this.inUse.size + 1);
    
    // Get element from pool or create new one
    let element;
    if (this.pool.length === 0) {
      // Grow pool if below max size
      if (this.totalCreated < this.maxSize) {
        this._growPool(Math.min(10, this.maxSize - this.totalCreated));
        element = this.pool.pop();
      } else {
        console.warn(`ElementPool: Maximum size of ${this.maxSize} reached.`);
        return { element: null, release: () => {} };
      }
    } else {
      element = this.pool.pop();
    }
    
    // Track usage
    this.inUse.add(element);
    
    // Create release function bound to this element
    const release = () => this.release(element);
    
    return { element, release };
  }
  
  /**
   * Release an element back to the pool
   * @param {HTMLElement} element - Element to release
   */
  release(element) {
    if (!element || !this.inUse.has(element)) return;
    
    // Reset element state
    if (this.resetFn) {
      this.resetFn(element);
    } else {
      this._resetElement(element);
    }
    
    // Return to pool
    this.inUse.delete(element);
    this.pool.push(element);
    this.stats.released++;
  }
  
  /**
   * Get usage statistics
   * @returns {Object} Pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      available: this.pool.length,
      inUse: this.inUse.size,
      total: this.totalCreated
    };
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    // Release all elements
    this.inUse.forEach(element => this.release(element));
    
    // Remove all blocks from the DOM
    if (this.useBlocks) {
      this.blocks.forEach(block => {
        if (block.parentNode) {
          block.parentNode.removeChild(block);
        }
      });
      this.blocks = [];
    } else {
      // Remove all individual elements
      this.pool.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    }
    
    // Clear arrays
    this.pool = [];
    this.inUse.clear();
  }
  
  // Private methods
  
  /**
   * Initialize the element pool
   * @private
   */
  _initializePool() {
    this._growPool(this.initialSize);
  }
  
  /**
   * Grow the pool by creating new elements
   * @param {number} size - Number of elements to add
   * @private
   */
  _growPool(size) {
    let block = null;
    let blockCount = 0;
    
    for (let i = 0; i < size; i++) {
      // Create a block container if using blocks
      if (this.useBlocks && (!block || blockCount >= this.blockSize)) {
        block = document.createElement('div');
        block.className = 'rift-element-pool-block';
        this.container.appendChild(block);
        this.blocks.push(block);
        blockCount = 0;
      }
      
      // Create element
      let element;
      if (this.createFn) {
        element = this.createFn();
      } else {
        element = document.createElement(this.elementType);
        if (this.className) {
          element.className = this.className;
        }
      }
      
      // Add to appropriate container
      if (this.useBlocks && block) {
        block.appendChild(element);
      } else {
        this.container.appendChild(element);
      }
      
      this.pool.push(element);
      this.totalCreated++;
      this.stats.created++;
      blockCount++;
    }
  }
  
  /**
   * Reset an element to its initial state
   * @param {HTMLElement} element - Element to reset
   * @private
   */
  _resetElement(element) {
    // Reset standard properties
    element.textContent = '';
    element.className = this.className || '';
    
    // Clear inline styles except display
    const displayStyle = element.style.display;
    element.removeAttribute('style');
    if (displayStyle === 'none') {
      element.style.display = 'none';
    }
    
    // Clear data attributes
    Array.from(element.attributes)
      .filter(attr => attr.name.startsWith('data-'))
      .forEach(attr => element.removeAttribute(attr.name));
    
    // Remove all child elements
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }
}
```

### ElementPool Usage Pattern

The most effective way to use ElementPool is to integrate it with UIComponents:

```javascript
class OptimizedUIComponent extends UIComponent {
  constructor(options = {}) {
    super(options);
    this.activeElements = [];
    this.pool = null;
  }
  
  init() {
    super.init();
    
    // Initialize element pool
    this.pool = new ElementPool({
      elementType: 'div',
      container: this.element,
      className: 'rift-component-element',
      initialSize: 20,
      useBlocks: true,  // Use block containers for better performance
      blockSize: 10     // Elements per block
    });
  }
  
  createDynamicElement() {
    // Get element from pool
    const { element, release } = this.pool.acquire();
    if (!element) return null;
    
    // Configure element
    element.style.display = 'block';
    element.classList.add('rift-component-element--active');
    
    // Store reference with release function
    this.activeElements.push({ element, release });
    
    return element;
  }
  
  removeDynamicElement(index) {
    if (index < 0 || index >= this.activeElements.length) return;
    
    // Get element and release function
    const { element, release } = this.activeElements[index];
    
    // Release back to pool
    release();
    
    // Remove from active elements
    this.activeElements.splice(index, 1);
  }
  
  update(deltaTime) {
    super.update(deltaTime);
    
    // Update active elements
    // Mark elements for removal when no longer needed
    const toRemove = [];
    this.activeElements.forEach((item, index) => {
      // Logic to determine if element should be removed
      if (/* condition */) {
        toRemove.push(index);
      }
    });
    
    // Remove elements in reverse order to avoid index shifting
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.removeDynamicElement(toRemove[i]);
    }
  }
  
  dispose() {
    // Dispose the element pool to clean up resources
    if (this.pool) {
      this.pool.dispose();
      this.pool = null;
    }
    
    // Clear active elements array
    this.activeElements = [];
    
    super.dispose();
  }
}
```

This pattern is implemented in components like EnhancedDamageNumbers, EnhancedHitIndicator, EnhancedDamageIndicator, and EnhancedKillFeed, which handle frequent visual indicators with minimal DOM operations.

### Block Container Strategy

For improved performance when using ElementPool, the block container approach groups elements under parent containers:

```javascript
// Benefits of block container strategy
// 1. Reduced parent-child relationship tracking overhead
// 2. Better memory locality for DOM operations
// 3. Fewer individual insertions into the document
// 4. Improved rendering pipeline efficiency

// Implementation in ElementPool
const useBlocks = true;
const blockSize = 10; // Elements per block

// When growing the pool with blocks
if (useBlocks && (!block || blockCount >= blockSize)) {
  block = document.createElement('div');
  block.className = 'rift-element-pool-block';
  this.container.appendChild(block);
  this.blocks.push(block);
  blockCount = 0;
}

// Adding elements to blocks instead of directly to container
if (useBlocks && block) {
  block.appendChild(element);
} else {
  this.container.appendChild(element);
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
