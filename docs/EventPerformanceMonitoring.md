# Event Performance Monitoring System

This document describes the new Event Performance Monitoring system implemented in RIFT to help identify and optimize performance bottlenecks in the event-driven UI architecture.

## Overview

The Event Performance Monitoring system tracks metrics about event frequency and handler execution time to help identify performance bottlenecks in the UI system. It provides real-time monitoring, analysis, and recommendations for optimization.

## Key Features

- **Real-time event tracking**: Monitor events as they occur during gameplay
- **Frequency analysis**: Identify high-frequency events that may need throttling
- **Execution time tracking**: Find slow event handlers that impact performance
- **Filtering and sorting**: Quickly focus on problematic events
- **Recommendations**: Get automatic suggestions for performance improvements

## Accessing the Tool

There are several ways to access the Event Performance Monitor:

1. **Developer Tools Panel**: Press `Ctrl+Shift+D` in-game to open the developer tools panel, then click on "Event Performance Monitor"
2. **Direct URL**: Navigate to `event-performance-monitor.html` in your browser
3. **Config-based Auto-display**: Enable via `Config.debug.showDevTools = true`

## Using the Monitor

### Dashboard Overview

The dashboard has four main tabs:

1. **Overview**: Shows summary statistics and tracking status
2. **Event Frequency**: Lists all events with their frequency rates
3. **Execution Time**: Shows event handler performance metrics
4. **Recommendations**: Provides automatic optimization suggestions

### Starting Performance Tracking

1. Open the monitor
2. Click the "Start Tracking" button
3. Interact with the game to generate events
4. Monitor the dashboard for real-time updates

### Interpreting Results

#### High-Frequency Events

Events firing more than 60 times per second (configurable) are highlighted as potentially problematic. These events may cause performance issues due to:

- Excessive DOM operations
- Garbage collection pressure
- Unnecessary UI updates

**Solution**: Consider implementing throttling, debouncing, or batching strategies.

#### Slow Event Handlers

Event handlers taking more than 1ms to execute (on average) are highlighted. Slow handlers can cause:

- UI jank/stuttering
- Delayed visual feedback
- Poor responsiveness

**Solution**: Optimize the handler code, batch DOM operations, or use requestAnimationFrame for visual updates.

#### High-Impact Events

Events that are both frequent AND slow have the highest impact on performance and should be prioritized for optimization.

## Integration with EventManager

The monitoring system is built into the EventManager class and can be enabled/disabled programmatically:

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

## Configuration in UIConfig.js

Performance monitoring settings can be configured in UIConfig.js:

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

## Best Practices for Event Performance

Based on findings from the monitor, consider these optimization strategies:

### For High-Frequency Events

1. **Throttle** position updates and continuous state changes
2. **Batch** multiple related updates into a single event
3. **Debounce** events that don't need to fire on every input
4. Use **requestAnimationFrame** for visual updates

### For Slow Event Handlers

1. **Batch DOM operations** to reduce reflows and repaints
2. **Implement element pooling** for frequently created/destroyed elements
3. **Use CSS transitions/animations** instead of JavaScript where possible
4. **Defer non-critical updates** to idle periods

## Next Steps in Performance Optimization

The insights gained from this monitoring system will guide our next optimization efforts:

1. Implement element pooling for high-frequency UI elements (damage numbers, hit markers)
2. Add batching to DOM operations in performance-critical handlers
3. Throttle high-frequency events (position updates, ammo counters)
4. Optimize animation performance using requestAnimationFrame and CSS
5. Document performance best practices for the team

## Technical Details

The monitoring system hooks into the EventManager's event dispatch and subscription mechanisms to collect metrics without modifying existing event handlers. It uses high-resolution timing for accurate measurements and employs an optimized data structure to minimize its own performance impact.
