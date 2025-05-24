# Technical Context: RIFT FPS UI/CSS Redesign

This document outlines the technical foundations, technical decisions, and implementation details for the RIFT FPS UI/CSS redesign project.

## Core Technologies

### Frontend Stack
- **HTML5**: Used for structure of all UI components
- **CSS3**: Styling with advanced features (CSS variables, grid, flexbox, animations)
- **Vanilla JavaScript**: ES6+ without additional frameworks
- **BEM Methodology**: For CSS organization with rift- prefix (Block Element Modifier)
- **Three.js**: For 3D rendering of the game world
- **Canvas API**: For specialized 2D rendering like minimap and compass displays

### Build Tools
- **Vite**: Fast development server and build tool
- **npm**: Package management
- **ESLint**: Code quality and style enforcement
- **stylelint**: CSS linting and style enforcement

## Architecture & Design Patterns

### Component-Based Architecture
The UI is structured as a hierarchy of components, each encapsulating its own:
- State management
- DOM manipulation 
- Event handling
- Lifecycle methods
- Visual representation

### Event-Driven Communication
Components communicate via a central EventManager using a publish/subscribe pattern:
- Standardized event names (namespace:action format)
- Consistent event payload structures
- Automatic subscription tracking and cleanup
- Event performance monitoring

### DOM Management Strategies
- **ElementPool**: DOM element reuse system for frequently created/destroyed elements
- **Block Containers**: Element grouping for optimized DOM operations
- **DOMFactory**: Factory pattern for consistent DOM element creation
- **State-DOM Separation**: Clear separation between state and DOM representation

### Performance Optimization Techniques
- **Element Pooling**: Reuse DOM elements to minimize creation/destruction
- **Event Performance Monitoring**: Track event frequency and handler execution time
- **Batch DOM Operations**: Reduce reflows by grouping reads and writes
- **Hardware Acceleration**: Use transform/opacity for animations
- **requestAnimationFrame**: Coordinate visual updates with browser rendering cycle
- **CSS Animations**: Offload animation work to GPU when possible
- **Visibility Management**: Only update visible components
- **Throttling**: Limit high-frequency events
- **Debouncing**: Combine rapid sequential events

## Browser Support

The redesign targets modern browsers with these minimum versions:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Targets

### Target Specifications
- **60+ FPS** maintained during gameplay on recommended hardware
- **Sub-16ms** per frame budget (for 60 FPS)
- **DOM Operations Budget**: <5ms per frame
- **Event Handling Budget**: <3ms per frame
- **Animation Budget**: <8ms per frame
- **Memory**: <100MB for UI components

### Component-Specific Budgets
- **HUD Elements**: <2ms per frame total
- **Combat Feedback**: <3ms per frame during intense combat
- **Notification System**: <1ms per frame average
- **Menu Transitions**: <50ms total for complete transition

## Technical Implementation Details

### Event System Implementation

The EventManager provides these key capabilities:
- Event subscription with automatic tracking
- Event emission with payload validation
- Standardized event naming conventions
- Performance monitoring with metrics collection
- Throttling and debouncing utilities

```javascript
// Core EventManager implementation
class EventManager {
  static instance = null;
  
  static getInstance() {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  constructor() {
    this._events = new Map();
    this._subscriptionId = 0;
    this._eventMetrics = new Map();
    this._performanceTracking = false;
  }
  
  // Subscribe to an event
  subscribe(eventType, handler) {
    if (!this._events.has(eventType)) {
      this._events.set(eventType, new Map());
    }
    
    const id = this._subscriptionId++;
    this._events.get(eventType).set(id, handler);
    
    return {
      eventType,
      id,
      unsubscribe: () => this.unsubscribe({ eventType, id })
    };
  }
  
  // Unsubscribe from an event
  unsubscribe({ eventType, id }) {
    if (!this._events.has(eventType)) return false;
    return this._events.get(eventType).delete(id);
  }
  
  // Emit an event to all subscribers
  emit(eventType, data = {}) {
    // Start performance tracking
    const startTime = this._performanceTracking ? performance.now() : 0;
    
    if (!this._events.has(eventType)) return false;
    
    // Add standard metadata to event
    const event = {
      type: eventType,
      timestamp: Date.now(),
      ...data
    };
    
    // Notify handlers
    this._events.get(eventType).forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
      }
    });
    
    // Track performance metrics
    if (this._performanceTracking) {
      this._trackEventPerformance(eventType, startTime);
    }
    
    return true;
  }
  
  // Track event performance metrics
  _trackEventPerformance(eventType, startTime) {
    const executionTime = performance.now() - startTime;
    
    if (!this._eventMetrics.has(eventType)) {
      this._eventMetrics.set(eventType, {
        count: 0,
        totalExecutionTime: 0,
        avgExecutionTime: 0,
        minExecutionTime: Infinity,
        maxExecutionTime: 0,
        lastTimestamp: performance.now(),
        frequency: 0
      });
    }
    
    const metrics = this._eventMetrics.get(eventType);
    
    // Update metrics
    metrics.count++;
    metrics.totalExecutionTime += executionTime;
    metrics.avgExecutionTime = metrics.totalExecutionTime / metrics.count;
    metrics.minExecutionTime = Math.min(metrics.minExecutionTime, executionTime);
    metrics.maxExecutionTime = Math.max(metrics.maxExecutionTime, executionTime);
    
    // Calculate frequency (events per second)
    const now = performance.now();
    const elapsed = now - metrics.lastTimestamp;
    if (elapsed > 0) {
      metrics.frequency = 1000 / elapsed; // events per second
    }
    metrics.lastTimestamp = now;
  }
  
  // Get performance metrics for all events
  getPerformanceMetrics() {
    const result = {};
    this._eventMetrics.forEach((metrics, eventType) => {
      result[eventType] = { ...metrics };
    });
    return result;
  }
  
  // Enable performance tracking
  enablePerformanceTracking(options = {}) {
    this._performanceTracking = true;
    this._performanceOptions = {
      highFrequencyThreshold: options.highFrequencyThreshold || 60,
      slowHandlerThreshold: options.slowHandlerThreshold || 1.0,
      ...options
    };
  }
  
  // Disable performance tracking
  disablePerformanceTracking() {
    this._performanceTracking = false;
  }
  
  // Reset performance metrics
  resetPerformanceMetrics() {
    this._eventMetrics.clear();
  }
}
```

### ElementPool Implementation

The ElementPool utility provides an efficient way to reuse DOM elements:

```javascript
class ElementPool {
  constructor(options = {}) {
    // Configuration
    this.elementType = options.elementType || 'div';
    this.container = options.container || document.body;
    this.className = options.className || '';
    this.initialSize = options.initialSize || 10;
    this.maxSize = options.maxSize || 100;
    this.growSize = options.growSize || Math.max(5, Math.floor(this.initialSize / 2));
    this.createFn = options.createFn || this._defaultCreateFn.bind(this);
    this.resetFn = options.resetFn || this._defaultResetFn.bind(this);
    this.useBlocks = options.useBlocks !== false; // Default to true
    this.blockSize = options.blockSize || 10;
    
    // State tracking
    this.pool = [];          // Available elements
    this.inUse = new Set();  // Currently active elements
    this.blocks = [];        // Container blocks when using block system
    
    // Statistics
    this.stats = {
      created: 0,
      acquired: 0,
      released: 0,
      maxUsed: 0,
      outOfPoolCount: 0
    };
    
    // Initialize the pool
    this._initialize();
  }
  
  _initialize() {
    this._growPool(this.initialSize);
  }
  
  _defaultCreateFn() {
    const element = document.createElement(this.elementType);
    if (this.className) {
      element.className = this.className;
    }
    element.style.display = 'none'; // Hidden by default
    return element;
  }
  
  _defaultResetFn(element) {
    // Reset to initial state
    element.style.display = 'none';
    element.className = this.className;
    element.textContent = '';
  }
  
  _createBlock() {
    const block = document.createElement('div');
    block.className = 'rift-element-pool-block';
    block.style.display = 'contents'; // No visual impact
    this.container.appendChild(block);
    this.blocks.push(block);
    return block;
  }
  
  _growPool(count) {
    // Calculate how many we can add within maxSize limit
    const actualCount = Math.min(count, this.maxSize - (this.pool.length + this.inUse.size));
    
    if (actualCount <= 0) return;
    
    // Determine which block to use
    let targetBlock;
    if (this.useBlocks) {
      const lastBlock = this.blocks[this.blocks.length - 1];
      if (!lastBlock || lastBlock.childNodes.length >= this.blockSize) {
        targetBlock = this._createBlock();
      } else {
        targetBlock = lastBlock;
      }
    }
    
    // Create elements
    for (let i = 0; i < actualCount; i++) {
      const element = this.createFn();
      
      // Add to appropriate container
      if (this.useBlocks) {
        targetBlock.appendChild(element);
        
        // Create new block if current one is full
        if (targetBlock.childNodes.length >= this.blockSize && i < actualCount - 1) {
          targetBlock = this._createBlock();
        }
      } else {
        this.container.appendChild(element);
      }
      
      this.pool.push(element);
      this.stats.created++;
    }
  }
  
  // Acquire an element from the pool
  acquire() {
    // Update stats
    this.stats.acquired++;
    
    // Get element from pool or create new ones if needed
    if (this.pool.length === 0) {
      if (this.inUse.size < this.maxSize) {
        this._growPool(this.growSize);
      } else {
        this.stats.outOfPoolCount++;
        console.warn(`ElementPool warning: Pool exhausted (${this.inUse.size} elements in use)`);
        return { element: null, release: () => {} };
      }
    }
    
    const element = this.pool.pop();
    this.inUse.add(element);
    
    // Update stats
    this.stats.maxUsed = Math.max(this.stats.maxUsed, this.inUse.size);
    
    // Return element with release function
    const release = () => this.release(element);
    return { element, release };
  }
  
  // Release an element back to the pool
  release(element) {
    if (!this.inUse.has(element)) return false;
    
    // Update stats
    this.stats.released++;
    
    // Reset element state
    this.resetFn(element);
    
    // Return to pool
    this.inUse.delete(element);
    this.pool.push(element);
    
    return true;
  }
  
  // Release all elements
  releaseAll() {
    this.inUse.forEach(element => {
      this.resetFn(element);
      this.pool.push(element);
    });
    
    // Update stats
    this.stats.released += this.inUse.size;
    
    // Clear in-use set
    this.inUse.clear();
  }
  
  // Get statistics about pool usage
  getStats() {
    return {
      ...this.stats,
      available: this.pool.length,
      inUse: this.inUse.size,
      total: this.pool.length + this.inUse.size,
      utilization: this.inUse.size / (this.pool.length + this.inUse.size)
    };
  }
  
  // Clean up resources
  dispose(removeElements = true) {
    // Release all elements
    this.releaseAll();
    
    if (removeElements) {
      // Remove block containers
      this.blocks.forEach(block => {
        if (block.parentNode) {
          block.parentNode.removeChild(block);
        }
      });
      
      // Clear arrays
      this.pool = [];
      this.inUse.clear();
      this.blocks = [];
      
      // Reset stats
      this.stats = {
        created: 0,
        acquired: 0,
        released: 0,
        maxUsed: 0,
        outOfPoolCount: 0
      };
    }
  }
}
```

### UI Component Base Class

The `UIComponent` base class provides the foundation for all UI components:

```javascript
class UIComponent {
  constructor(options = {}) {
    this.id = options.id || `component-${UIComponent.nextId++}`;
    this.className = options.className || '';
    this.container = options.container || document.body;
    this.parent = options.parent || null;
    this.element = null;
    this.children = new Set();
    this.eventSubscriptions = [];
    this.isInitialized = false;
    this.isVisible = true;
    
    // Register with parent
    if (this.parent) {
      this.parent.addChild(this);
    }
  }
  
  init() {
    if (this.isInitialized) return this;
    
    // Create component's main element if not provided
    if (!this.element) {
      this.element = document.createElement('div');
      this.element.id = this.id;
      if (this.className) {
        this.element.className = this.className;
      }
      this.container.appendChild(this.element);
    }
    
    this.isInitialized = true;
    return this;
  }
  
  update(deltaTime) {
    // Update children
    this.children.forEach(child => {
      if (child.isVisible) {
        child.update(deltaTime);
      }
    });
    return this;
  }
  
  render() {
    // Render children
    this.children.forEach(child => {
      if (child.isVisible) {
        child.render();
      }
    });
    return this;
  }
  
  dispose() {
    // Unsubscribe from all events
    this.eventSubscriptions.forEach(subscription => {
      if (subscription.unsubscribe) {
        subscription.unsubscribe();
      }
    });
    this.eventSubscriptions = [];
    
    // Dispose children
    this.children.forEach(child => {
      child.dispose();
    });
    this.children.clear();
    
    // Remove from parent
    if (this.parent) {
      this.parent.removeChild(this);
    }
    
    // Remove element from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    this.isInitialized = false;
    return this;
  }
  
  addChild(child) {
    this.children.add(child);
    child.parent = this;
    return this;
  }
  
  removeChild(child) {
    this.children.delete(child);
    return this;
  }
  
  show() {
    if (this.element) {
      this.element.style.display = '';
    }
    this.isVisible = true;
    return this;
  }
  
  hide() {
    if (this.element) {
      this.element.style.display = 'none';
    }
    this.isVisible = false;
    return this;
  }
}

UIComponent.nextId = 0;
```

## File Structure & Organization

```
public/
├── assets/
│   ├── hud/           # HUD-specific assets
│   ├── models/        # 3D models
│   ├── textures/      # Textures and images
│   ├── animations/    # Animation data
│   ├── audios/        # Sound effects
│   ├── config/        # Configuration JSON files
│   └── navmeshes/     # Navigation mesh data
├── styles/
│   ├── index.css      # Main CSS entry point
│   ├── main.css       # Main CSS bundle
│   ├── core/          # Core CSS files
│   │   ├── _variables.css
│   │   ├── _reset.css
│   │   ├── _typography.css
│   │   ├── _animations.css
│   │   ├── _layout.css
│   │   └── _ui-states.css
│   ├── utils/         # Utility CSS
│   │   ├── _mixins.css
│   │   └── _helpers.css
│   ├── components/    # Component-specific CSS
│   │   ├── hud/       # HUD components
│   │   ├── combat/    # Combat feedback components
│   │   ├── menus/     # Menu components
│   │   ├── notifications/  # Notification components
│   │   ├── progression/    # Progression components
│   │   ├── environment/    # Environment components
│   │   └── movement/       # Movement components
│   └── responsive/    # Responsive styles
│       ├── _desktop.css
│       ├── _tablet.css
│       └── _mobile.css
└── *.html             # Test pages and examples
src/
├── main.js           # Main entry point
├── components/       # UI Components
│   └── ui/
│       ├── UIComponent.js        # Base component class
│       ├── hud/                  # HUD components
│       ├── combat/               # Combat feedback components
│       ├── notifications/        # Notification components
│       ├── progression/          # Progression components
│       ├── environment/          # Environment components
│       ├── movement/             # Movement components
│       └── menus/                # Menu components
├── core/            # Core systems
│   ├── World.js             # Main game world
│   ├── Config.js            # Configuration settings
│   ├── UIConfig.js          # UI-specific configuration
│   ├── AssetManager.js      # Asset loading and management
│   ├── EventManager.js      # Event system
│   └── UIManager.js         # UI coordination
├── controls/        # Player controls
├── effects/         # Visual effects
├── entities/        # Game entities
├── utils/           # Utility functions
│   ├── DOMFactory.js        # Factory for DOM elements
│   ├── ElementPool.js       # Element pooling utility
│   └── InputHandler.js      # Input handling
└── weapons/         # Weapon systems
```

## Development Setup

### Environment Requirements
- **Node.js**: v14.17.0 or higher
- **npm**: v6.14.13 or higher
- **Modern Browser**: Chrome, Firefox, or Edge latest version

### Local Development Commands
- `npm install`: Install dependencies
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run lint`: Run code linting
- `npm run lint:css`: Run CSS linting

### Testing Approach
- Component integration tests via standalone test pages
- Visual regression testing with screenshots
- Performance benchmarking with browser devtools
- Event monitoring with custom dashboard

## Dependencies

### Runtime Dependencies
- **three.js**: 3D rendering
- **stats.js**: Performance monitoring

### Development Dependencies
- **vite**: Build tooling
- **eslint**: JavaScript linting
- **stylelint**: CSS linting
- **prettier**: Code formatting
- **rollup**: Module bundling with Vite

## Performance Optimization Examples

### Element Pooling Example
```javascript
// Before: Creating new elements for each damage number
function showDamageNumber(damage, position) {
  const element = document.createElement('div');
  element.className = 'rift-damage-number';
  element.textContent = damage;
  element.style.left = `${position.x}px`;
  element.style.top = `${position.y}px`;
  this.container.appendChild(element);
  
  setTimeout(() => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }, 1000);
}

// After: Using element pooling
function showDamageNumber(damage, position) {
  const { element, release } = this.pool.acquire();
  if (!element) return;
  
  element.textContent = damage;
  element.style.left = `${position.x}px`;
  element.style.top = `${position.y}px`;
  element.style.display = 'block';
  
  setTimeout(() => {
    release();
  }, 1000);
}
```

### Event Performance Monitoring
```javascript
// Enable event performance monitoring
const eventManager = EventManager.getInstance();
eventManager.enablePerformanceTracking({
  highFrequencyThreshold: 60,    // Events/sec considered high frequency
  slowHandlerThreshold: 1.0      // Average ms considered slow
});

// Later, get metrics for analysis
const metrics = eventManager.getPerformanceMetrics();
console.table(metrics);

// Example output:
// ┌─────────────────┬───────┬──────────────────┬────────────────┬────────────────┬────────────────┬──────────┐
// │ Event           │ Count │ Avg Exec Time    │ Min Exec Time  │ Max Exec Time  │ Frequency      │ Warning  │
// ├─────────────────┼───────┼──────────────────┼────────────────┼────────────────┼────────────────┼──────────┤
// │ position:updated│ 1200  │ 0.8ms            │ 0.3ms          │ 2.5ms          │ 120/sec        │ HIGH FREQ│
// │ health:changed  │ 25    │ 0.5ms            │ 0.2ms          │ 1.2ms          │ 2.5/sec        │          │
// │ damage:taken    │ 150   │ 1.2ms            │ 0.4ms          │ 3.5ms          │ 15/sec         │ SLOW     │
// │ ammo:changed    │ 200   │ 0.9ms            │ 0.3ms          │ 2.1ms          │ 20/sec         │          │
// └─────────────────┴───────┴──────────────────┴────────────────┴────────────────┴────────────────┴──────────┘
```

## Browser Compatibility

The redesigned UI works across all target browsers with these considerations:
- CSS variables fallback for legacy browser support
- Graceful visual degradation in older browsers
- Core functionality works even without advanced features
- Performance optimizations tapered based on device capabilities

## CI/CD Pipeline

Basic CI/CD workflow:
1. Code commit triggers build checks
2. Automated linting ensures code quality
3. Build artifacts for distribution
4. Deploy to staging environment
5. Performance benchmarks run automatically
6. Event monitor logs are collected and analyzed
7. Team reviews changes before production deployment
