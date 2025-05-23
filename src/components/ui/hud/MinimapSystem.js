/**
 * Minimap system component for the RIFT UI HUD.
 * Integrates the existing advanced minimap functionality with the new component-based architecture.
 * 
 * @author Cline
 */

import UIComponent from '../UIComponent.js';
import { EventManager } from '../../../core/EventManager.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { MinimapIntegration } from '../minimap/MinimapIntegration.js';

class MinimapSystem extends UIComponent {
    /**
     * Create a new minimap system component
     * @param {Object} world - Reference to the game world
     * @param {Object} options - Component options
     * @param {HTMLElement} [options.container] - Parent container
     * @param {Number} [options.size=180] - Size of the minimap in pixels
     * @param {Boolean} [options.interactive=true] - Whether the minimap can be interacted with
     * @param {Boolean} [options.rotateWithPlayer=false] - Whether the minimap rotates with the player
     */
    constructor(world, options = {}) {
        super({
            autoInit: false,
            id: options.id || 'minimap-system',
            className: `rift-minimap ${options.interactive !== false ? 'rift-minimap--interactive' : ''}`,
            container: options.container,
            ...options
        });
        
        this.world = world;
        
        // Configuration
        this.size = options.size || 180;
        this.interactive = options.interactive !== false;
        this.rotateWithPlayer = options.rotateWithPlayer || false;
        
        // Component state
        this.state = {
            initialized: false,
            expanded: false
        };
        
        // References
        this.minimapIntegration = null;
        this.canvasContainer = null;
        
        // Register events
        this.registerEvents({
            'game:map-toggled': this._onMapToggle,
            'hud:resized': this._onHudResized,
            'minimap:toggled': this._onMinimapToggle
        });
    }
    
    /**
     * Initialize the component
     */
    init() {
        if (this.isInitialized) return this;
        
        // Call parent init to create root element
        super.init();
        
        // Create canvas container for the minimap
        this.canvasContainer = this.createElement('div', {
            className: 'rift-minimap__canvas-container'
        });
        
        // Create placeholder while minimap initializes
        const placeholder = this.createElement('div', {
            className: 'rift-minimap__placeholder',
            styles: {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            },
            parent: this.element
        });
        
        // Add loading text to placeholder
        this.createElement('div', {
            className: 'rift-minimap__loading',
            text: 'Loading map...',
            styles: {
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '14px',
                fontFamily: 'var(--rift-font-hud)'
            },
            parent: placeholder
        });
        
        if (this.interactive) {
            this._createControls();
        }
        
        // Use setTimeout to wait for DOM to be fully ready
        setTimeout(() => {
            this._initMinimap();
        }, 100);
        
        return this;
    }
    
    /**
     * Update component state
     * @param {Number} delta - Time elapsed since last frame in seconds
     */
    update(delta) {
        if (!this.isInitialized || !this.isActive) return this;
        
        // Call parent update
        super.update(delta);
        
        // Update minimap integration if initialized
        if (this.state.initialized && this.minimapIntegration) {
            this.minimapIntegration.update();
        }
        
        return this;
    }
    
    /**
     * Initialize the minimap integration
     * @private
     */
    _initMinimap() {
        if (!this.world) {
            console.error('[MinimapSystem] World object not provided');
            return;
        }
        
        // Create minimap integration
        this.minimapIntegration = new MinimapIntegration(this.world);
        
        // Create a div that will serve as the container for the minimap
        const minimapContainer = this.createElement('div', {
            id: 'minimap-container',
            className: 'rift-minimap__container',
            parent: this.canvasContainer
        });
        
        // Initialize minimap integration
        this.minimapIntegration.init();
        
        // Update state
        this.setState({
            initialized: true
        });
        
        // Remove placeholder after initialization
        const placeholder = this.element.querySelector('.rift-minimap__placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        console.log('[MinimapSystem] Minimap initialized');
        
        // Set rotation based on initial configuration
        if (this.rotateWithPlayer && this.minimapIntegration.minimap) {
            this.minimapIntegration.minimap.options.rotateWithPlayer = true;
        }
    }
    
    /**
     * Create control elements
     * @private
     */
    _createControls() {
        // Create controls container
        const controls = this.createElement('div', {
            className: 'rift-minimap__controls'
        });
        
        // Zoom in button
        const zoomInBtn = this.createElement('button', {
            className: 'rift-minimap__control-button rift-minimap__control-button--zoom-in',
            text: '+',
            parent: controls
        });
        
        zoomInBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._onZoomIn();
        });
        
        // Zoom out button
        const zoomOutBtn = this.createElement('button', {
            className: 'rift-minimap__control-button rift-minimap__control-button--zoom-out',
            text: '-',
            parent: controls
        });
        
        zoomOutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._onZoomOut();
        });
        
        // Rotate toggle button
        const rotateBtn = this.createElement('button', {
            className: 'rift-minimap__control-button rift-minimap__control-button--rotate',
            text: 'â†»',
            parent: controls
        });
        
        rotateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._onRotateToggle();
        });
        
        // Expand button
        const expandBtn = this.createElement('button', {
            className: 'rift-minimap__control-button rift-minimap__control-button--expand',
            text: 'â›¶',
            parent: controls
        });
        
        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._onExpandToggle();
        });
        
        // Add to element
        this.element.appendChild(controls);
        
        // Add click event to minimap for expansion
        this.element.addEventListener('click', () => {
            this._onExpandToggle();
        });
        
        // Create close button (hidden by default)
        const closeBtn = this.createElement('button', {
            className: 'rift-minimap__close',
            text: 'Ã—'
        });
        
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.state.expanded) {
                this._onExpandToggle();
            }
        });
        
        this.element.appendChild(closeBtn);
    }
    
    /**
     * Handle minimap toggled event
     * @param {Object} event - Standardized state change event
     * @param {boolean} event.value - Whether the minimap should be visible
     * @param {boolean} event.previous - Previous visibility state
     * @private
     */
    _onMinimapToggle(event) {
        if (event.value === true) {
            this.show();
        } else if (event.value === false) {
            this.hide();
        } else {
            this.toggle();
        }
    }
    
    /**
     * Handle map toggle keyboard event
     * @param {Object} event - Event data
     * @private
     */
    _onMapToggle(event) {
        // Toggle expanded state when map button is pressed
        this._onExpandToggle();
    }
    
    /**
     * Handle HUD resize event
     * @param {Object} event - Event data
     * @private
     */
    _onHudResized(event) {
        // Adjust minimap size if needed
        if (this.minimapIntegration && this.minimapIntegration.minimap) {
            // Pass resize event to minimap if needed
        }
    }
    
    /**
     * Handle zoom in button click
     * @private
     */
    _onZoomIn() {
        if (this.minimapIntegration && this.minimapIntegration.minimap) {
            const currentScale = this.minimapIntegration.minimap.options.scale;
            const newScale = Math.max(10, currentScale * 0.8); // Zoom in by reducing scale
            this.minimapIntegration.minimap.options.scale = newScale;
        }
    }
    
    /**
     * Handle zoom out button click
     * @private
     */
    _onZoomOut() {
        if (this.minimapIntegration && this.minimapIntegration.minimap) {
            const currentScale = this.minimapIntegration.minimap.options.scale;
            const newScale = Math.min(100, currentScale * 1.2); // Zoom out by increasing scale
            this.minimapIntegration.minimap.options.scale = newScale;
        }
    }
    
    /**
     * Handle rotation toggle button click
     * @private
     */
    _onRotateToggle() {
        if (this.minimapIntegration) {
            const isRotating = this.minimapIntegration.toggleRotation();
            
            // Emit standardized event for potential listeners
            if (EventManager) {
                EventManager.emit('minimap:rotation-changed', { 
                    value: isRotating,
                    previous: !isRotating,
                    source: 'user-action'
                });
            }
        }
    }
    
    /**
     * Toggle expanded view of minimap
     * @private
     */
    _onExpandToggle() {
        if (!this.interactive) return;
        
        const expanded = !this.state.expanded;
        
        // Toggle expanded class
        this.element.classList.toggle('rift-minimap--expanded', expanded);
        
        this.setState({ expanded });
        
        // Emit standardized event
        if (EventManager) {
            EventManager.emit('minimap:expanded', { 
                value: expanded,
                previous: !expanded,
                source: 'user-action'
            });
        }
        
        // Update minimap renderer size
        if (this.minimapIntegration && this.minimapIntegration.minimap && this.minimapIntegration.minimap.renderer) {
            // Force resize to match new container size
            setTimeout(() => {
                const width = this.element.clientWidth;
                const height = this.element.clientHeight;
                this.minimapIntegration.minimap.renderer.setSize(width, height);
            }, 300); // Wait for transition to complete
        }
    }
    
    /**
     * Show the minimap
     */
    show() {
        if (this.minimapIntegration) {
            this.minimapIntegration.show();
        }
        
        this.element.classList.remove('rift-hidden');
        return this;
    }
    
    /**
     * Hide the minimap
     */
    hide() {
        if (this.minimapIntegration) {
            this.minimapIntegration.hide();
        }
        
        this.element.classList.add('rift-hidden');
        return this;
    }
    
    /**
     * Toggle minimap visibility
     */
    toggle() {
        if (this.element.classList.contains('rift-hidden')) {
            this.show();
        } else {
            this.hide();
        }
        
        return this;
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        // Clean up minimap integration
        if (this.minimapIntegration) {
            this.minimapIntegration.destroy();
            this.minimapIntegration = null;
        }
        
        // Call parent dispose
        super.dispose();
    }
}

export { MinimapSystem };
