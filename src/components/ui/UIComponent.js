/**
 * Base UI component class that all UI components should extend.
 * Provides standard lifecycle methods, event handling, DOM manipulation,
 * and state management for UI components.
 * 
 * @author Cline
 */

import { EventManager } from '../../core/EventManager.js';
import { DOMFactory } from '../../utils/DOMFactory.js';
import { UIConfig } from '../../core/UIConfig.js';

export default class UIComponent {
    /**
     * Create a new UI component
     * @param {Object} options - Component options
     * @param {String} [options.id] - Component ID
     * @param {String|Array} [options.className] - CSS class name(s)
     * @param {String} [options.template] - HTML template
     * @param {HTMLElement} [options.container] - Parent container
     * @param {Boolean} [options.visible=true] - Initial visibility
     * @param {Object} [options.events] - Event subscriptions
     * @param {Boolean} [options.autoInit=true] - Whether to call init() automatically
     */
    constructor(options = {}) {
        this.id = options.id || `ui-component-${Math.floor(Math.random() * 10000)}`;
        this.className = options.className || '';
        this.template = options.template || '';
        this.container = options.container || null;
        this.isVisible = options.visible !== false;
        this.isInitialized = false;
        this.isActive = false;
        this.element = null;
        this.children = [];
        this.eventSubscriptions = [];
        this.animations = {};
        this.config = UIConfig;
        
        // State
        this.state = {};
        
        // Bind methods to ensure correct 'this' context
        this.init = this.init.bind(this);
        this.update = this.update.bind(this);
        this.render = this.render.bind(this);
        this.dispose = this.dispose.bind(this);
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        
        // Register events
        if (options.events) {
            this.registerEvents(options.events);
        }
        
        // Auto initialize if needed
        if (options.autoInit !== false) {
            this.init();
        }
    }
    
    /**
     * Initialize the component
     * @return {UIComponent} This component instance
     */
    init() {
        if (this.isInitialized) {
            console.log(`🏁 UIComponent (${this.id}): Already initialized.`);
            return this;
        }
        
        console.log(`🏁 UIComponent (${this.id}): Initializing... Container:`, this.container);
        this.isInitialized = true;
        
        if (!this.element) {
            console.log(`🏁 UIComponent (${this.id}): No pre-existing element, calling _createRootElement().`);
            this.element = this._createRootElement();
            if (!this.element) {
                console.error(`❌ UIComponent (${this.id}): _createRootElement() failed to return an element.`);
                // Decide on recovery or error propagation. For now, log and continue (might lead to errors).
            } else {
                console.log(`✅ UIComponent (${this.id}): _createRootElement() created:`, this.element);
            }
        }
        
        if (this.container && this.element && this.element.parentNode !== this.container) {
            console.log(`🏁 UIComponent (${this.id}): Appending element to container:`, this.container);
            try {
                this.container.appendChild(this.element);
                console.log(`✅ UIComponent (${this.id}): Element appended to container.`);
            } catch (e) {
                console.error(`❌ UIComponent (${this.id}): Error appending element to container:`, e);
                console.error(`   Element:`, this.element, `Container:`, this.container);
            }
        } else if (!this.container && this.element) {
            console.warn(`⚠️ UIComponent (${this.id}): Initializing with an element but no container specified. Element will not be automatically appended to the DOM unless already parented.`);
        } else if (this.container && !this.element) {
            console.error(`❌ UIComponent (${this.id}): Container specified but no element to append.`);
        }
        
        this.render();
        
        // Initialize children
        this.children.forEach(child => {
            if (typeof child.init === 'function' && !child.isInitialized) {
                child.init();
            }
        });
        
        // Emit initialization event with standardized name
        if (EventManager) {
            EventManager.emit(`ui:${this.id}:initialize`, { component: this });
        }
        
        return this;
    }
    
    /**
     * Update the component
     * @param {Number} delta - Time elapsed since last frame in seconds
     * @return {UIComponent} This component instance
     */
    update(delta) {
        if (!this.isInitialized || !this.isActive) return this;
        
        // Update animations
        this._updateAnimations(delta);
        
        // Update children
        this.children.forEach(child => {
            if (typeof child.update === 'function') {
                child.update(delta);
            }
        });
        
        return this;
    }
    
    /**
     * Render the component's DOM representation
     * @return {UIComponent} This component instance
     */
    render() {
        if (!this.isInitialized) return this;
        
        // Use template if provided
        if (this.template && this.element) {
            this.element.innerHTML = this.template;
        }
        
        // Render children
        this.children.forEach(child => {
            if (typeof child.render === 'function') {
                child.render();
            }
        });
        
        return this;
    }
      /**
     * Show the component
     * @return {UIComponent} This component instance
     */
    show() {
        console.log(`🎯 UIComponent(${this.id}): show() called`);
        
        // Initialize if needed
        if (!this.isInitialized) {
            console.log(`🎯 UIComponent(${this.id}): Not initialized, calling init()`);
            this.init();
            return this;
        }
        
        if (!this.element) {
            console.error(`❌ UIComponent(${this.id}): No element found for show()`);
            return this;
        }
        
        this.isVisible = true;
        this.element.style.display = '';
        this.isActive = true;
        console.log(`✅ UIComponent(${this.id}): Visibility set to true, display style cleared`);
        
        // Show children
        this.children.forEach(child => {
            if (typeof child.show === 'function') {
                console.log(`🎯 UIComponent(${this.id}): Showing child component`);
                child.show();
            }
        });
        
        // Emit visibility change event with standardized name
        if (EventManager) {
            EventManager.emit(`ui:${this.id}:show`, { component: this });
            console.log(`✅ UIComponent(${this.id}): ui:${this.id}:show event emitted`);
        }
        
        return this;
    }
    
    /**
     * Hide the component
     * @return {UIComponent} This component instance
     */
    hide() {
        // Initialize if needed
        if (!this.isInitialized) {
            this.init();
            return this;
        }
        
        if (!this.element) return this;
        
        this.isVisible = false;
        this.element.style.display = 'none';
        this.isActive = false;
        
        // Hide children
        this.children.forEach(child => {
            if (typeof child.hide === 'function') {
                child.hide();
            }
        });
        
        // Emit visibility change event with standardized name
        if (EventManager) {
            EventManager.emit(`ui:${this.id}:hide`, { component: this });
        }
        
        return this;
    }
    
    /**
     * Toggle component visibility
     * @return {UIComponent} This component instance
     */
    toggle() {
        return this.isVisible ? this.hide() : this.show();
    }
    
    /**
     * Clean up and dispose of the component
     * @return {UIComponent} This component instance
     */
    dispose() {
        // Dispose children first
        this.children.forEach(child => {
            if (typeof child.dispose === 'function') {
                child.dispose();
            }
        });
        
        // Unsubscribe from all events
        this.unregisterAllEvents();
        
        // Remove from DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        this.isInitialized = false;
        this.isActive = false;
        
        // Emit disposal event with standardized name
        if (EventManager) {
            EventManager.emit(`ui:${this.id}:dispose`, { component: this });
        }
        
        return this;
    }
    
    /**
     * Add a child component
     * @param {UIComponent} child - Child component to add
     * @return {UIComponent} This component instance
     */
    addChild(child) {
        if (child && !this.children.includes(child)) {
            this.children.push(child);
            
            // Set container for child if not already set
            if (this.element && !child.container) {
                child.container = this.element;
            }
            
            // Initialize child if parent is already initialized
            if (this.isInitialized && typeof child.init === 'function' && !child.isInitialized) {
                child.init();
            }
            
            // Show/hide child based on parent visibility
            if (this.isVisible && typeof child.show === 'function') {
                child.show();
            } else if (!this.isVisible && typeof child.hide === 'function') {
                child.hide();
            }
        }
        
        return this;
    }
    
    /**
     * Remove a child component
     * @param {UIComponent} child - Child component to remove
     * @return {UIComponent} This component instance
     */
    removeChild(child) {
        const index = this.children.indexOf(child);
        
        if (index !== -1) {
            // Dispose the child
            if (typeof child.dispose === 'function') {
                child.dispose();
            }
            
            // Remove from children array
            this.children.splice(index, 1);
        }
        
        return this;
    }
    
    /**
     * Set component state and trigger render if needed
     * @param {Object} newState - New state object to merge
     * @param {Boolean} [render=true] - Whether to render after state change
     * @return {UIComponent} This component instance
     */
    setState(newState, render = true) {
        this.state = { ...this.state, ...newState };
        
        if (render) {
            this.render();
        }
        
        return this;
    }
    
    /**
     * Register event listeners
     * @param {Object} events - Event mapping object
     * @return {UIComponent} This component instance
     */
    registerEvents(events) {
        if (!EventManager) return this;
        
        // Loop through event definitions
        for (const [eventName, handler] of Object.entries(events)) {
            // Create bound handler
            const boundHandler = typeof handler === 'function' 
                ? handler.bind(this) 
                : (typeof this[handler] === 'function' ? this[handler].bind(this) : null);
                
            if (boundHandler) {
                // Subscribe to event using 'on' alias
                const subscription = EventManager.on(eventName, boundHandler);
                
                // Save subscription for cleanup
                this.eventSubscriptions.push(subscription);
            }
        }
        
        return this;
    }
    
    /**
     * Unregister a specific event listener
     * @param {String} eventName - Event name
     * @return {UIComponent} This component instance
     */
    unregisterEvent(eventName) {
        if (!EventManager) return this;
        
        // Find subscriptions for this event
        const subscriptionsForEvent = this.eventSubscriptions.filter(
            sub => sub.eventType === eventName
        );
        
        // Unsubscribe each handler
        subscriptionsForEvent.forEach(sub => {
            EventManager.unsubscribe(sub);
        });
        
        // Remove from tracked subscriptions
        this.eventSubscriptions = this.eventSubscriptions.filter(
            sub => sub.eventType !== eventName
        );
        
        return this;
    }
    
    /**
     * Unregister all event listeners
     * @return {UIComponent} This component instance
     */
    unregisterAllEvents() {
        if (!EventManager) return this;
        
        // Unsubscribe from all events
        this.eventSubscriptions.forEach(sub => {
            EventManager.unsubscribe(sub);
        });
        
        this.eventSubscriptions = [];
        return this;
    }
    
    /**
     * Add an animation to the component
     * @param {String} name - Animation name
     * @param {Object} options - Animation options
     * @param {Number} options.duration - Duration in seconds
     * @param {Function} options.update - Update function called each frame
     * @param {Function} [options.complete] - Completion callback
     * @param {String} [options.easing='linear'] - Easing function name
     * @param {Boolean} [options.autoStart=true] - Whether to start immediately
     * @return {UIComponent} This component instance
     */
    addAnimation(name, options) {
        if (!name || !options.update || !options.duration) return this;
        
        this.animations[name] = {
            name,
            startTime: options.autoStart !== false ? performance.now() : null,
            duration: options.duration * 1000, // Convert to ms
            update: options.update,
            complete: options.complete || null,
            easing: options.easing || 'linear',
            progress: 0,
            isComplete: false,
            isActive: options.autoStart !== false
        };
        
        return this;
    }
    
    /**
     * Start an animation by name
     * @param {String} name - Animation name
     * @return {UIComponent} This component instance
     */
    startAnimation(name) {
        const animation = this.animations[name];
        
        if (animation) {
            animation.startTime = performance.now();
            animation.progress = 0;
            animation.isComplete = false;
            animation.isActive = true;
        }
        
        return this;
    }
    
    /**
     * Stop an animation by name
     * @param {String} name - Animation name
     * @param {Boolean} [complete=false] - Whether to finish the animation
     * @return {UIComponent} This component instance
     */
    stopAnimation(name, complete = false) {
        const animation = this.animations[name];
        
        if (animation) {
            animation.isActive = false;
            
            if (complete) {
                animation.progress = 1;
                animation.isComplete = true;
                
                if (typeof animation.update === 'function') {
                    animation.update.call(this, 1);
                }
                
                if (typeof animation.complete === 'function') {
                    animation.complete.call(this);
                }
            }
        }
        
        return this;
    }
    
    /**
     * Create a DOM element using DOMFactory
     * @param {String} type - Element type
     * @param {Object} options - Element options
     * @return {HTMLElement} Created DOM element
     */
    createElement(type, options = {}) {
        // Add this.element as parent if not specified
        if (!options.parent && this.element) {
            options.parent = this.element;
        }
        
        return DOMFactory.createElement(type, options);
    }
    
    /**
     * Create a BEM element using DOMFactory
     * @param {String} blockName - BEM block name
     * @param {String} elementName - BEM element name
     * @param {Object} options - Element options
     * @return {HTMLElement} Created BEM element
     */
    createBEMElement(blockName, elementName, options = {}) {
        // Add this.element as parent if not specified
        if (!options.parent && this.element) {
            options.parent = this.element;
        }
        
        return DOMFactory.createBEMElement(blockName, elementName, options);
    }
    
    /**
     * Create the root element for this component
     * @return {HTMLElement} Root element
     * @private
     */
    _createRootElement() {
        console.log(`🏁 UIComponent (${this.id}): _createRootElement() called.`);
        // Default implementation: create a div with component ID and class
        // Subclasses should override this if they need a different root element type or structure
        const element = DOMFactory.createElement('div', {
            id: this.id,
            className: this.className || '' // Ensure className is a string
        });
        console.log(`✅ UIComponent (${this.id}): _createRootElement() created element:`, element);
        return element;
    }
    
    /**
     * Update all active animations
     * @param {Number} delta - Time elapsed since last frame in seconds
     * @private
     */
    _updateAnimations(delta) {
        const now = performance.now();
        
        for (const key in this.animations) {
            const anim = this.animations[key];
            
            if (!anim.isActive || anim.isComplete) continue;
            
            if (anim.startTime === null) {
                anim.startTime = now;
            }
            
            const elapsed = now - anim.startTime;
            let progress = Math.min(elapsed / anim.duration, 1);
            
            // Apply easing
            progress = this._applyEasing(progress, anim.easing);
            anim.progress = progress;
            
            // Call update function
            if (typeof anim.update === 'function') {
                anim.update.call(this, progress);
            }
            
            // Check if complete
            if (progress >= 1) {
                anim.isComplete = true;
                anim.isActive = false;
                
                if (typeof anim.complete === 'function') {
                    anim.complete.call(this);
                }
            }
        }
    }
    
    /**
     * Set visibility without triggering show/hide methods
     * @param {Boolean} visible - Whether component should be visible
     * @return {UIComponent} This component instance
     * @private
     */
    _setVisibility(visible) {
        this.isVisible = visible;
        if (this.element) {
            this.element.style.display = visible ? '' : 'none';
        }
        this.isActive = visible;
        return this;
    }
    
    /**
     * Apply easing function to a progress value
     * @param {Number} t - Progress value [0-1]
     * @param {String} easingName - Name of easing function
     * @return {Number} Eased value
     * @private
     */
    _applyEasing(t, easingName) {
        // Common easing functions
        const easings = {
            linear: t => t,
            easeInQuad: t => t * t,
            easeOutQuad: t => t * (2 - t),
            easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            easeInCubic: t => t * t * t,
            easeOutCubic: t => (--t) * t * t + 1,
            easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
            easeInBack: t => t * t * (2.70158 * t - 1.70158),
            easeOutBack: t => (t - 1) * (t - 1) * (2.70158 * (t - 1) + 1.70158) + 1,
            easeInOutBack: t => {
                const c1 = 1.70158;
                const c2 = c1 * 1.525;
                return t < 0.5
                    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
                    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
            },
            easeOutElastic: t => {
                const c4 = (2 * Math.PI) / 3;
                return t === 0
                    ? 0
                    : t === 1
                    ? 1
                    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
            }
        };
        
        // Use specified easing or fallback to linear
        const easingFn = easings[easingName] || easings.linear;
        return easingFn(t);
    }
}
