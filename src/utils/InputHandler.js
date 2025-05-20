/**
 * Centralized input handling system for UI interactions.
 * Processes mouse, keyboard, and touch events, normalizing them across devices.
 * Implements event delegation for performance and allows binding specific UI components to input events.
 * 
 * @author Cline
 */

import EventManager from '../core/EventManager.js';

export class InputHandler {
    /**
     * Initialize the input handler
     * @param {UIManager} uiManager - Reference to the UI manager
     */
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.isEnabled = false;
        
        // Track pointer state
        this.pointerPosition = { x: 0, y: 0 };
        this.pointerNormalized = { x: 0, y: 0 }; // -1 to 1
        this.isPointerDown = false;
        this.activePointerButton = -1;
        
        // Key tracking
        this.keysDown = new Set();
        
        // Gesture state
        this.gestureStartDistance = 0;
        this.gestureScale = 1;
        
        // Raycast results cache
        this.hoveredElements = [];
        
        // Bind methods to ensure correct 'this' context
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onContextMenu = this._onContextMenu.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onBlur = this._onBlur.bind(this);
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);
    }
    
    /**
     * Enable input handling by attaching event listeners
     */
    enable() {
        if (this.isEnabled) return;
        
        // Add event listeners
        document.addEventListener('mousemove', this._onMouseMove, { passive: true });
        document.addEventListener('mousedown', this._onMouseDown);
        document.addEventListener('mouseup', this._onMouseUp, { passive: true });
        document.addEventListener('contextmenu', this._onContextMenu);
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp, { passive: true });
        window.addEventListener('blur', this._onBlur, { passive: true });
        
        // Touch events
        document.addEventListener('touchstart', this._onTouchStart, { passive: false });
        document.addEventListener('touchmove', this._onTouchMove, { passive: false });
        document.addEventListener('touchend', this._onTouchEnd, { passive: true });
        
        this.isEnabled = true;
        
        // Emit event
        if (EventManager) {
            EventManager.emit('input:enabled', { handler: this });
        }
    }
    
    /**
     * Disable input handling by removing event listeners
     */
    disable() {
        if (!this.isEnabled) return;
        
        // Remove event listeners
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('mousedown', this._onMouseDown);
        document.removeEventListener('mouseup', this._onMouseUp);
        document.removeEventListener('contextmenu', this._onContextMenu);
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        window.removeEventListener('blur', this._onBlur);
        
        // Touch events
        document.removeEventListener('touchstart', this._onTouchStart);
        document.removeEventListener('touchmove', this._onTouchMove);
        document.removeEventListener('touchend', this._onTouchEnd);
        
        this.isEnabled = false;
        
        // Reset state
        this.keysDown.clear();
        this.isPointerDown = false;
        this.activePointerButton = -1;
        
        // Emit event
        if (EventManager) {
            EventManager.emit('input:disabled', { handler: this });
        }
    }
    
    /**
     * Handle mouse move events
     * @param {MouseEvent} event - Mouse event
     * @private
     */
    _onMouseMove(event) {
        this.pointerPosition.x = event.clientX;
        this.pointerPosition.y = event.clientY;
        
        // Update normalized coordinates (-1 to 1)
        this.pointerNormalized.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointerNormalized.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Emit event
        if (EventManager) {
            EventManager.emit('input:pointer:move', {
                x: event.clientX,
                y: event.clientY,
                normalizedX: this.pointerNormalized.x,
                normalizedY: this.pointerNormalized.y,
                isDown: this.isPointerDown,
                button: this.activePointerButton
            });
        }
    }
    
    /**
     * Handle mouse down events
     * @param {MouseEvent} event - Mouse event
     * @private
     */
    _onMouseDown(event) {
        this.isPointerDown = true;
        this.activePointerButton = event.button;
        
        // Special handling of right click for weapon wheel
        if (event.button === 2) {
            event.preventDefault();
            
            // Check if game is active before showing weapon wheel
            if (this.uiManager?.activeView === 'game' && !this.uiManager?.isGamePaused) {
                if (EventManager) {
                    EventManager.emit('input:weaponwheel:toggle', { show: true });
                }
            }
        }
        
        // Emit event
        if (EventManager) {
            EventManager.emit('input:pointer:down', {
                x: event.clientX,
                y: event.clientY,
                button: event.button
            });
        }
    }
    
    /**
     * Handle mouse up events
     * @param {MouseEvent} event - Mouse event
     * @private
     */
    _onMouseUp(event) {
        this.isPointerDown = false;
        this.activePointerButton = -1;
        
        // Hide weapon wheel on right-click release
        if (event.button === 2) {
            if (EventManager) {
                EventManager.emit('input:weaponwheel:toggle', { show: false });
            }
        }
        
        // Emit event
        if (EventManager) {
            EventManager.emit('input:pointer:up', {
                x: event.clientX,
                y: event.clientY,
                button: event.button
            });
        }
    }
    
    /**
     * Handle context menu events (right-click)
     * @param {MouseEvent} event - Mouse event
     * @private
     */
    _onContextMenu(event) {
        // Prevent default browser context menu
        if (this.uiManager?.activeView === 'game') {
            event.preventDefault();
        }
    }
    
    /**
     * Handle key down events
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    _onKeyDown(event) {
        // Add to tracked keys
        this.keysDown.add(event.key);
        
        // Special handling for certain keys
        switch (event.key) {
            case 'Tab':
                // Prevent default tab behavior
                if (this.uiManager?.activeView === 'game') {
                    event.preventDefault();
                    if (EventManager) {
                        EventManager.emit('input:scoreboard:toggle', { show: true });
                    }
                }
                break;
                
            case 'Escape':
                // Handle menu/pause toggling
                if (EventManager) {
                    EventManager.emit('input:pause:toggle');
                }
                break;
                
            case 'm':
            case 'M':
                // Toggle map
                if (this.uiManager?.activeView === 'game' && !this.uiManager?.isGamePaused) {
                    if (EventManager) {
                        EventManager.emit('input:map:toggle');
                    }
                }
                break;
                
            case 'r':
            case 'R':
                // Reload weapon
                if (this.uiManager?.activeView === 'game' && !this.uiManager?.isGamePaused) {
                    if (EventManager) {
                        EventManager.emit('input:weapon:reload');
                    }
                }
                break;
                
            case 'Shift':
                // Start sprint
                if (this.uiManager?.activeView === 'game' && !this.uiManager?.isGamePaused) {
                    if (EventManager) {
                        EventManager.emit('input:player:sprint', { active: true });
                    }
                }
                break;
        }
        
        // Emit event
        if (EventManager) {
            EventManager.emit('input:key:down', {
                key: event.key,
                code: event.code,
                shift: event.shiftKey,
                ctrl: event.ctrlKey,
                alt: event.altKey
            });
        }
        
        // Handle number keys for weapon selection (1-9)
        const numKey = parseInt(event.key);
        if (!isNaN(numKey) && numKey >= 1 && numKey <= 9) {
            if (this.uiManager?.activeView === 'game' && !this.uiManager?.isGamePaused) {
                if (EventManager) {
                    EventManager.emit('input:weapon:select', { index: numKey - 1 });
                }
            }
        }
    }
    
    /**
     * Handle key up events
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    _onKeyUp(event) {
        // Remove from tracked keys
        this.keysDown.delete(event.key);
        
        // Special handling for certain keys
        switch (event.key) {
            case 'Tab':
                // Hide scoreboard
                if (EventManager) {
                    EventManager.emit('input:scoreboard:toggle', { show: false });
                }
                break;
                
            case 'Shift':
                // Stop sprint
                if (EventManager) {
                    EventManager.emit('input:player:sprint', { active: false });
                }
                break;
        }
        
        // Emit event
        if (EventManager) {
            EventManager.emit('input:key:up', {
                key: event.key,
                code: event.code,
                shift: event.shiftKey,
                ctrl: event.ctrlKey,
                alt: event.altKey
            });
        }
    }
    
    /**
     * Handle window blur (when user leaves the window/tab)
     * @private
     */
    _onBlur() {
        // Clear all tracked inputs
        this.keysDown.clear();
        this.isPointerDown = false;
        this.activePointerButton = -1;
        
        // Emit event
        if (EventManager) {
            EventManager.emit('input:blur');
        }
    }
    
    /**
     * Handle touch start events
     * @param {TouchEvent} event - Touch event
     * @private
     */
    _onTouchStart(event) {
        // Prevent default behavior for certain UI components to avoid scrolling
        if (this._shouldPreventDefault(event)) {
            event.preventDefault();
        }
        
        this.isPointerDown = true;
        
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            this.pointerPosition.x = touch.clientX;
            this.pointerPosition.y = touch.clientY;
            
            // Update normalized coordinates (-1 to 1)
            this.pointerNormalized.x = (touch.clientX / window.innerWidth) * 2 - 1;
            this.pointerNormalized.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        }
        
        // Track pinch gesture
        if (event.touches.length === 2) {
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            this.gestureStartDistance = Math.sqrt(dx * dx + dy * dy);
        }
        
        // Emit event
        if (EventManager) {
            EventManager.emit('input:touch:start', {
                x: this.pointerPosition.x,
                y: this.pointerPosition.y,
                touches: event.touches.length
            });
        }
    }
    
    /**
     * Handle touch move events
     * @param {TouchEvent} event - Touch event
     * @private
     */
    _onTouchMove(event) {
        // Prevent default behavior for certain UI components to avoid scrolling
        if (this._shouldPreventDefault(event)) {
            event.preventDefault();
        }
        
        if (event.touches.length > 0) {
            const touch = event.touches[0];
            this.pointerPosition.x = touch.clientX;
            this.pointerPosition.y = touch.clientY;
            
            // Update normalized coordinates (-1 to 1)
            this.pointerNormalized.x = (touch.clientX / window.innerWidth) * 2 - 1;
            this.pointerNormalized.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        }
        
        // Handle pinch gesture
        if (event.touches.length === 2) {
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (this.gestureStartDistance > 0) {
                this.gestureScale = distance / this.gestureStartDistance;
                
                if (EventManager) {
                    EventManager.emit('input:gesture:pinch', {
                        scale: this.gestureScale
                    });
                }
            }
        }
        
        // Emit event
        if (EventManager) {
            EventManager.emit('input:touch:move', {
                x: this.pointerPosition.x,
                y: this.pointerPosition.y,
                touches: event.touches.length
            });
        }
    }
    
    /**
     * Handle touch end events
     * @param {TouchEvent} event - Touch event
     * @private
     */
    _onTouchEnd(event) {
        if (event.touches.length === 0) {
            this.isPointerDown = false;
        }
        
        // Reset gesture tracking
        if (event.touches.length < 2) {
            this.gestureStartDistance = 0;
            this.gestureScale = 1;
        }
        
        // Emit event
        if (EventManager) {
            EventManager.emit('input:touch:end', {
                x: this.pointerPosition.x,
                y: this.pointerPosition.y,
                touches: event.touches.length
            });
        }
    }
    
    /**
     * Determine if default behavior should be prevented for touch events
     * @param {TouchEvent} event - Touch event
     * @return {Boolean} Whether to prevent default behavior
     * @private
     */
    _shouldPreventDefault(event) {
        // Prevent default behavior when in game view to avoid scrolling
        if (this.uiManager?.activeView === 'game') {
            return true;
        }
        
        // Let events pass through otherwise
        return false;
    }
    
    /**
     * Check if a key is currently pressed
     * @param {String} key - The key to check
     * @return {Boolean} Whether the key is down
     */
    isKeyDown(key) {
        return this.keysDown.has(key);
    }
    
    /**
     * Check if any of the specified keys are currently pressed
     * @param {Array<String>} keys - The keys to check
     * @return {Boolean} Whether any of the keys are down
     */
    isAnyKeyDown(keys) {
        for (const key of keys) {
            if (this.keysDown.has(key)) return true;
        }
        return false;
    }
    
    /**
     * Get the current cursor position
     * @return {Object} x and y coordinates
     */
    getCursorPosition() {
        return { ...this.pointerPosition };
    }
    
    /**
     * Get the current normalized cursor position (-1 to 1)
     * @return {Object} x and y normalized coordinates
     */
    getNormalizedCursorPosition() {
        return { ...this.pointerNormalized };
    }
    
    /**
     * Clean up and dispose
     */
    dispose() {
        this.disable();
    }
}

export default InputHandler;
