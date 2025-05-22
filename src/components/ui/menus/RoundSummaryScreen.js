/**
 * RoundSummaryScreen.js
 * A screen wrapper around the RoundSummary component for use with the ScreenManager
 * 
 * @author Cline
 */

import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { EventManager } from '../../../core/EventManager.js';
import { RoundSummary } from './RoundSummary.js';

export default class RoundSummaryScreen extends UIComponent {
    /**
     * Create a new round summary screen
     * @param {Object} options - Configuration options
     * @param {Object} options.world - World instance
     * @param {Object} options.screenManager - Screen manager instance
     */
    constructor(options = {}) {
        super({
            id: 'round-summary-screen',
            className: 'rift-screen',
            autoInit: false  // Prevent auto-initialization
        });
        
        this.world = options.world || null;
        this.screenManager = options.screenManager || null;
        this.config = this._getConfig();
        
        // State
        this.isInitialized = false;
        this.isActive = false;
        
        // Components
        this.roundSummary = null;
        this.screenElement = null;
        
        // Bind methods
        this._handleKeyDown = this._handleKeyDown.bind(this);
        
        // Manual initialization after all properties are set
        this.init();
    }
    
    /**
     * Get configuration with fallbacks
     * @private
     * @returns {Object} Configuration object
     */
    _getConfig() {
        let uiConfig = {};
        try {
            // Try to access UIConfig if available
            if (typeof UIConfig !== 'undefined' && UIConfig?.menus?.roundSummary) {
                uiConfig = UIConfig.menus.roundSummary;
            }
        } catch (error) {
            console.warn('UIConfig not available, using round summary screen defaults');
        }
        
        // Return defaults merged with any available config
        return {
            title: 'Round Summary',
            pauseGameWhenActive: false,
            ...uiConfig
        };
    }
    
    /**
     * Initialize the round summary screen
     * @returns {RoundSummaryScreen} This instance for chaining
     */
    init() {
        if (this.isInitialized || !this.screenManager) {
            return this;
        }
        
        // Call parent init first
        super.init();
        
        // Register the screen with the screen manager
        this.screenElement = this.screenManager.registerScreen('round-summary', {
            title: this.config.title || 'Round Summary',
            element: this.element
        });
        
        // Create summary component
        this.roundSummary = new RoundSummary({
            world: this.world
        });
        
        // Add to screen only after super.init() has created the element
        if (this.element && this.roundSummary.element) {
            this.element.appendChild(this.roundSummary.element);
        }
        
        // Initialize component (it auto-initializes, but this ensures it's ready)
        if (!this.roundSummary.isInitialized) {
            this.roundSummary.init();
        }
        
        // Set up event listeners
        this._setupEventListeners();
        
        this.isInitialized = true;
        return this;
    }
    
    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        // Register events with EventManager
        this.registerEvents({
            'round:completed': (data) => this.show(data),
            'ui:showScreen:round-summary': (data) => this.show(data.roundData || data)
        });
    }
    
    /**
     * Handle keyboard events
     * @private
     * @param {KeyboardEvent} event - Keyboard event
     */
    _handleKeyDown(event) {
        // ESC key to close screen
        if (event.key === 'Escape' || event.keyCode === 27) {
            this.hide();
            event.preventDefault();
        }
    }
    
    /**
     * Show the round summary screen
     * @param {Object} data - Round data
     */
    show(data) {
        if (!this.isInitialized) {
            this.init();
        }
        
        if (this.isActive) {
            return this;
        }
        
        // Pause game if configured
        if (this.config.pauseGameWhenActive && this.world) {
            this.world.pause();
        }
        
        // Show screen
        this.screenManager.showScreen('round-summary');
        
        // Show summary component
        this.roundSummary.show(data);
        
        // Add keyboard listener
        window.addEventListener('keydown', this._handleKeyDown);
        
        this.isActive = true;
        
        // Trigger event
        EventManager.trigger('ui:roundSummaryScreen:shown', { data });
        
        return this;
    }
    
    /**
     * Hide the round summary screen
     */
    hide() {
        if (!this.isActive) {
            return this;
        }
        
        // Hide screen
        this.screenManager.hideScreen();
        
        // Hide summary component
        this.roundSummary.hide();
        
        // Remove keyboard listener
        window.removeEventListener('keydown', this._handleKeyDown);
        
        // Resume game if it was paused
        if (this.config.pauseGameWhenActive && this.world) {
            this.world.resume();
        }
        
        this.isActive = false;
        
        // Trigger event
        EventManager.trigger('ui:roundSummaryScreen:hidden');
        
        return this;
    }
    
    /**
     * Update method called each frame
     * @param {number} delta - Time since last frame in seconds
     * @returns {RoundSummaryScreen} This instance for chaining
     */
    update(delta) {
        // Only update if active
        if (this.isActive && this.roundSummary) {
            // Update child components
            // No need to update the roundSummary as it doesn't have any animations or state that needs per-frame updates
        }
        
        return this;
    }
    
    /**
     * Dispose of the screen
     */
    dispose() {
        // Hide screen first
        if (this.isActive) {
            this.hide();
        }
        
        // Remove keyboard listener just to be sure
        window.removeEventListener('keydown', this._handleKeyDown);
        
        // Dispose summary component
        if (this.roundSummary) {
            this.roundSummary.dispose();
            this.roundSummary = null;
        }
        
        // Unregister screen
        if (this.screenManager) {
            this.screenManager.unregisterScreen('round-summary');
            this.screenElement = null;
        }
        
        // Call parent dispose method
        super.dispose();
        
        this.isInitialized = false;
    }
}
