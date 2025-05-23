# Event Standardization Catalog

This document provides a comprehensive catalog of standardized events used throughout the RIFT FPS UI system.

## Event Naming Convention

All events follow the standardized naming pattern:
- Standard events: `namespace:action` (e.g., `health:changed`)
- Component-specific events: `namespace:id:action` (e.g., `ui:health-display:visible`)

Actions consistently use past tense for events that have occurred:
- ✅ `changed` (not `change`)
- ✅ `activated` (not `activate`)
- ✅ `position-changed` (not `position`)
- ✅ `modal-shown` (not `showModal`)

## Standard Payload Structure

All event payloads include:
- `timestamp`: When the event occurred
- `type`: The event name (namespace:action)
- Event-specific data properties

## Event Catalog by Namespace

### Player Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `player:position-changed` | Player position updated | `position: {x, y, z}`, `previousPosition: {x, y, z}` |
| `player:rotation-changed` | Player rotation/direction updated | `rotation: {x, y, z}`, `direction: Vector3` |
| `player:damaged` | Player took damage | `amount: Number`, `source: String`, `sourcePosition: {x, y, z}`, `damageType: String` |
| `player:healed` | Player received healing | `amount: Number`, `source: String` |
| `player:killed` | Player was eliminated | `killer: String`, `weapon: String`, `distance: Number` |
| `player:respawned` | Player respawned | `position: {x, y, z}` |
| `player:sprinting-started` | Player began sprinting | `stamina: Number` |
| `player:sprinting-ended` | Player stopped sprinting | `stamina: Number`, `reason: String` |

### Health Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `health:changed` | Health value changed | `current: Number`, `previous: Number`, `max: Number` |
| `health:critical` | Health reached critical threshold | `current: Number`, `threshold: Number`, `percentage: Number` |
| `health:recovered` | Health regeneration occurred | `amount: Number`, `current: Number`, `max: Number` |

### Weapon Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `weapon:fired` | Weapon was fired | `weapon: String`, `ammo: Number`, `position: {x, y, z}` |
| `weapon:reloading-started` | Weapon reload initiated | `weapon: String`, `duration: Number` |
| `weapon:reloaded` | Weapon reload completed | `weapon: String`, `ammo: Number`, `reserve: Number` |
| `weapon:changed` | Active weapon changed | `current: String`, `previous: String` |
| `weapon:spread-changed` | Weapon accuracy/spread updated | `value: Number`, `previous: Number`, `reason: String` |
| `weapon:picked-up` | New weapon acquired | `weapon: String`, `ammo: Number`, `slot: Number` |
| `weapon:dropped` | Weapon removed from inventory | `weapon: String`, `slot: Number` |
| `weapon:wheel-shown` | Weapon selection wheel displayed | `currentWeapon: String`, `availableWeapons: Array` |
| `weapon:wheel-hidden` | Weapon selection wheel hidden | `selectedWeapon: String` |
| `weapon:selected` | Weapon chosen from wheel | `weapon: String`, `previous: String` |

### Ammo Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `ammo:changed` | Ammunition count updated | `current: Number`, `previous: Number`, `max: Number`, `weaponType: String` |
| `ammo:low` | Ammunition reached low threshold | `current: Number`, `threshold: Number`, `weaponType: String` |
| `ammo:depleted` | Ammunition fully depleted | `weaponType: String` |
| `ammo:added` | Ammunition added to reserves | `amount: Number`, `current: Number`, `max: Number`, `weaponType: String` |

### Hit Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `hit:registered` | Hit successfully landed | `target: String`, `targetType: String`, `weapon: String`, `damage: Number`, `isCritical: Boolean` |
| `hit:confirmed` | Visual hit confirmation | `targetType: String`, `isCritical: Boolean`, `isKill: Boolean` |
| `hit:received` | Player received a hit | `source: String`, `direction: Vector3`, `damage: Number`, `damageType: String` |

### Enemy Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `enemy:damaged` | Enemy took damage | `id: String`, `amount: Number`, `position: {x, y, z}`, `healthRemaining: Number` |
| `enemy:killed` | Enemy was eliminated | `id: String`, `position: {x, y, z}`, `weapon: String`, `wasHeadshot: Boolean` |
| `enemy:spotted` | Enemy detected on sensors | `id: String`, `position: {x, y, z}`, `distance: Number` |
| `enemy:critical-targeted` | Critical hit potential | `id: String`, `targetPoint: String` |

### UI Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `ui:modal-shown` | Modal dialog displayed | `modal: String`, `data: Object` |
| `ui:modal-hidden` | Modal dialog closed | `modal: String`, `reason: String` |
| `ui:screen-shown` | Full screen UI displayed | `screen: String`, `previous: String` |
| `ui:screen-hidden` | Full screen UI hidden | `screen: String`, `next: String` |
| `ui:component-visibility-changed` | UI component visibility changed | `component: String`, `visible: Boolean`, `reason: String` |

### Notification Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `notification:displayed` | Notification shown to player | `id: String`, `type: String`, `message: String`, `duration: Number` |
| `notification:cleared` | Notification removed | `id: String`, `reason: String` |
| `notification:queued` | Notification added to queue | `id: String`, `type: String`, `priority: Number` |
| `notification:clicked` | User interacted with notification | `id: String`, `type: String`, `action: String` |

### Achievement Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `achievement:unlocked` | Achievement earned | `id: String`, `name: String`, `description: String`, `value: Number` |
| `achievement:progress-updated` | Achievement progress changed | `id: String`, `progress: Number`, `total: Number`, `percentage: Number` |

### Progression Events 

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `progression:xp-gained` | Experience points earned | `amount: Number`, `source: String`, `total: Number` |
| `progression:level-up` | Player level increased | `level: Number`, `previous: Number`, `skillPoints: Number` |
| `progression:skill-point-spent` | Skill point used | `skillId: String`, `pointsRemaining: Number` |
| `progression:rank-changed` | Player rank updated | `rank: String`, `previous: String`, `level: Number` |

### Game Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `game:started` | Game session began | `mode: String`, `map: String`, `difficulty: String` |
| `game:paused` | Game paused | `reason: String`, `pausedBy: String` |
| `game:resumed` | Game unpaused | `pauseDuration: Number` |
| `game:ended` | Game session completed | `result: String`, `duration: Number`, `score: Number` |
| `game:round-next` | Next round started | `round: Number`, `totalRounds: Number` |

### Mission Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `mission:updated` | Mission details changed | `id: String`, `name: String`, `description: String`, `objectives: Array` |
| `mission:started` | Mission began | `id: String`, `timeLimit: Number` |
| `mission:completed` | Mission successfully finished | `id: String`, `rewards: Array`, `timeTaken: Number` |
| `mission:cancelled` | Mission aborted | `id: String`, `reason: String` |
| `objective:updated` | Objective status changed | `id: String`, `missionId: String`, `progress: Number`, `status: String` |
| `objective:completed` | Objective finished | `id: String`, `missionId: String`, `rewards: Array` |
| `objective:focused` | Objective highlighted for player | `id: String`, `missionId: String` |

### Map Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `map:zoomed` | Map zoom level changed | `level: Number`, `previous: Number` |
| `map:centered` | Map centered on location | `position: {x, y, z}`, `animation: Boolean` |
| `map:area-highlighted` | Map area highlighted | `area: String`, `color: String`, `duration: Number` |
| `map:marker-placed` | Marker added to map | `id: String`, `position: {x, y, z}`, `type: String` |
| `map:marker-removed` | Marker removed from map | `id: String` |

### Movement Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `movement:footstep` | Entity footstep detected | `entityId: String`, `entityType: String`, `position: {x, y, z}`, `distance: Number`, `intensity: Number` |
| `movement:slide` | Slide movement started | `duration: Number`, `direction: Vector3` |
| `movement:jump` | Jump performed | `height: Number`, `startPosition: {x, y, z}` |
| `movement:collision` | Entity collided with surface | `entityId: String`, `surfaceType: String`, `velocity: Number` |

### Stamina Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `stamina:changed` | Stamina value updated | `current: Number`, `previous: Number`, `max: Number` |
| `stamina:depleted` | Stamina fully consumed | `recoveryDelay: Number` |
| `stamina:recovering` | Stamina regeneration active | `rate: Number`, `current: Number` |

### Weather Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `weather:changed` | Weather condition changed | `type: String`, `previous: String`, `intensity: Number` |
| `weather:intensity-changed` | Weather strength changed | `type: String`, `intensity: Number`, `previous: Number` |

### Environment Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `environment:updated` | Environment state changed | `time: String`, `lighting: Number`, `ambience: String` |
| `zone:activated` | Danger zone activated | `id: String`, `type: String`, `radius: Number`, `position: {x, y, z}`, `damage: Number` |
| `zone:deactivated` | Danger zone deactivated | `id: String`, `reason: String` |
| `zone:intensity-changed` | Danger zone intensity update | `id: String`, `intensity: Number`, `previous: Number` |

### Powerup Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `powerup:added` | Player gained powerup effect | `id: String`, `type: String`, `duration: Number`, `intensity: Number` |
| `powerup:removed` | Powerup effect ended | `id: String`, `reason: String` |
| `powerup:updated` | Powerup status changed | `id: String`, `timeRemaining: Number`, `intensity: Number` |

### Waypoint Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `waypoint:placed` | Navigation waypoint set | `id: String`, `position: {x, y, z}`, `type: String`, `distance: Number` |
| `waypoint:reached` | Player arrived at waypoint | `id: String`, `timeToReach: Number` |
| `waypoint:removed` | Waypoint deleted | `id: String`, `reason: String` |

### Window Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `window:resized` | Browser window size changed | `width: Number`, `height: Number`, `previous: {width, height}` |
| `window:focused` | Window gained focus | `inactive: Number` |
| `window:blurred` | Window lost focus | `time: Number` |

### Input Events

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `input:pointer-moved` | Mouse or touch pointer moved | `x: Number`, `y: Number`, `normalizedX: Number`, `normalizedY: Number`, `isDown: Boolean`, `button: Number`, `timestamp: Number` |
| `input:pointer-downed` | Mouse button or touch pressed | `x: Number`, `y: Number`, `button: Number`, `timestamp: Number` |
| `input:pointer-upped` | Mouse button or touch released | `x: Number`, `y: Number`, `button: Number`, `timestamp: Number` |
| `input:key-downed` | Keyboard key pressed | `key: String`, `code: String`, `shift: Boolean`, `ctrl: Boolean`, `alt: Boolean`, `timestamp: Number` |
| `input:key-upped` | Keyboard key released | `key: String`, `code: String`, `shift: Boolean`, `ctrl: Boolean`, `alt: Boolean`, `timestamp: Number` |
| `input:blurred` | Input system lost focus | `timestamp: Number` |
| `input:touch-started` | Touch input began | `x: Number`, `y: Number`, `touches: Number`, `timestamp: Number` |
| `input:touch-moved` | Touch moved on screen | `x: Number`, `y: Number`, `touches: Number`, `timestamp: Number` |
| `input:touch-ended` | Touch input ended | `x: Number`, `y: Number`, `touches: Number`, `timestamp: Number` |
| `input:gesture-pinched` | Pinch gesture detected | `scale: Number`, `timestamp: Number` |
| `input:weaponwheel:shown` | Weapon wheel displayed | `timestamp: Number` |
| `input:weaponwheel:hidden` | Weapon wheel hidden | `timestamp: Number` |
| `input:scoreboard:shown` | Scoreboard displayed | `timestamp: Number` |
| `input:scoreboard:hidden` | Scoreboard hidden | `timestamp: Number` |
| `input:pause-toggled` | Game pause state toggled | `timestamp: Number` |
| `input:map-toggled` | Map visibility toggled | `timestamp: Number` |
| `input:weapon:reloaded` | Weapon reload input triggered | `timestamp: Number` |
| `input:player:sprint-started` | Player sprint input began | `timestamp: Number` |
| `input:player:sprint-stopped` | Player sprint input ended | `timestamp: Number` |
| `input:weapon:selected` | Weapon selected via input | `index: Number`, `timestamp: Number` |

## Component-Specific Events

Component-specific events follow the pattern `namespace:id:action` and are used when the event is specific to a particular UI component instance.

| Event Name | Description | Payload Properties |
|------------|-------------|-------------------|
| `ui:health-display:visible` | Health display visibility changed | `visible: Boolean`, `reason: String` |
| `ui:ammo-display:flash` | Ammo display flash animation triggered | `reason: String`, `duration: Number` |
| `ui:crosshair:expanded` | Crosshair spread visualization changed | `amount: Number`, `reason: String` |
| `ui:minimap:zoomed` | Minimap specific zoom event | `level: Number`, `previous: Number` |
| `ui:notification-manager:cleared-all` | All notifications removed | `count: Number`, `reason: String` |

## Event Payload Templates

### State Change Template
```javascript
{
  timestamp: 1598276523000,       // When the event occurred
  type: "namespace:changed",      // Event name/type (e.g., health:changed)
  previous: value,                // Previous state value
  current: value,                 // Current state value
  source: "sourceIdentifier",     // What caused the change (optional)
  reason: "reasonForChange"       // Why the change occurred (optional)
}
```

### Combat Event Template
```javascript
{
  timestamp: 1598276523000,       // When the event occurred
  type: "namespace:action",       // Event name/type (e.g., hit:registered)
  position: {x: 0, y: 0, z: 0},   // Where the event occurred
  source: "sourceIdentifier",     // Who/what initiated the action
  target: "targetIdentifier",     // Who/what was affected
  value: 0,                       // Numeric value (damage, healing, etc.)
  damageType: "damageType",       // Type of damage/effect (optional)
  isCritical: false               // Whether it was a critical hit (optional)
}
```

### Notification Event Template
```javascript
{
  timestamp: 1598276523000,       // When the event occurred
  type: "notification:type",      // Event name/type
  id: "notificationId",           // Unique identifier for the notification
  message: "Notification text",   // Content of the notification
  priority: 1,                    // Priority level (higher = more important)
  duration: 5000,                 // How long to display in ms
  category: "notificationType",   // Category for grouping/filtering
  actions: []                     // Available user actions (optional)
}
```

### UI Event Template
```javascript
{
  timestamp: 1598276523000,       // When the event occurred
  type: "ui:action",              // Event name/type (e.g., ui:modal-shown)
  component: "componentName",     // UI component identifier
  previous: "previousState",      // Previous UI state (optional)
  current: "currentState",        // Current UI state 
  data: {},                       // Additional data specific to the UI event
  reason: "reasonForAction"       // Why the UI changed (optional)
}
```

### Progress Event Template
```javascript
{
  timestamp: 1598276523000,       // When the event occurred
  type: "progression:type",       // Event name/type
  amount: 0,                      // Amount of progress made
  total: 100,                     // Total amount needed
  percentage: 0,                  // Percentage of completion
  source: "sourceIdentifier",     // Source of the progress
  rewards: []                     // Any rewards for progress (optional)
}
```

## Using the Standardized Events

When publishing events:

```javascript
// Import EventManager
import EventManager from '../core/EventManager';

// Create a standardized event payload
const payload = {
  timestamp: Date.now(),
  type: 'health:changed',
  previous: 75,
  current: 50,
  max: 100,
  source: 'enemyDamage',
  reason: 'Enemy hit with rifle'
};

// Emit the event
EventManager.emit('health:changed', payload);

// Or use helper methods
EventManager.emitStateChangeEvent('health', {
  previous: 75,
  current: 50,
  max: 100,
  source: 'enemyDamage'
});
```

When subscribing to events:

```javascript
// Import EventManager
import EventManager from '../core/EventManager';

// Subscribe to an event
this.eventSubscriptionId = EventManager.on('health:changed', this._onHealthChanged);

// Handler with JSDoc comment
/**
 * Handle health changed events
 * @param {Object} data - Event data
 * @param {number} data.timestamp - When the event occurred
 * @param {string} data.type - Event type ('health:changed')
 * @param {number} data.previous - Previous health value
 * @param {number} data.current - Current health value
 * @param {number} data.max - Maximum health value
 * @param {string} [data.source] - What caused the health change
 */
_onHealthChanged(data) {
  // Handle the event
  console.log(`Health changed from ${data.previous} to ${data.current}`);
  
  // Update UI based on event data
  this._updateHealthBar(data.current, data.max);
  
  // Check for critical state
  if (data.current / data.max < 0.25) {
    this._activateLowHealthWarning();
  }
}

// Remember to unsubscribe when component is disposed
dispose() {
  EventManager.off(this.eventSubscriptionId);
  // Other cleanup...
}
```
