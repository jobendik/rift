/**
 * Experience bar component for RIFT UI
 * Displays player level, experience progress, and level up animations
 */

import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { EventManager } from '../../../core/EventManager.js';
import { UIConfig } from '../../../core/UIConfig.js';

class ExperienceBar extends UIComponent {
    /**
     * Create a new ExperienceBar component
     * @param {Object} world - Reference to the game world
     * @param {Object} options - Component options
     */
    constructor(world, options = {}) {
        // Prevent auto-initialization in parent class
        super({ autoInit: false, ...options });
        
        this.world = world;
        this.options = options || {};
        this.level = this.options.level || 1;
        this.currentXP = this.options.currentXP || 0;
        this.targetXP = this._calculateXPForLevel(this.level);
        this.config = UIConfig.xp;
        this.isVisible = this.options.visible !== false;
        
        // Bind methods
        this._handleLevelUp = this._handleLevelUp.bind(this);
        this._handleXPGain = this._handleXPGain.bind(this);
        
        // Manual initialization after all properties are set
        this.init();
    }
    
    /**
     * Initialize the experience bar
     */
    init() {
        if (this.isInitialized) return this;
        
        // Call parent init first
        super.init();
        
        // Set initialized flag early to prevent infinite recursion
        this.isInitialized = true;
        
        this._createElements();
        this._setupEventListeners();
        this.updateXP(this.currentXP);
        
        if (!this.isVisible) {
            this.hide();
        }
    }
    
    /**
     * Create DOM elements for the experience bar
     * @private
     */
    _createElements() {
        this.container = DOMFactory.createElement('div', {
            className: 'rift-experience',
            parent: this.options.parent || document.body
        });
        
        // Level indicator
        this.levelDisplay = DOMFactory.createElement('div', {
            className: 'rift-experience__level',
            text: this.level,
            parent: this.container
        });
        
        // XP Bar
        this.xpBarContainer = DOMFactory.createElement('div', {
            className: 'rift-experience__bar',
            parent: this.container
        });
        
        this.xpFill = DOMFactory.createElement('div', {
            className: 'rift-experience__fill',
            parent: this.xpBarContainer
        });
        
        // XP Value
        this.xpValue = DOMFactory.createElement('div', {
            className: 'rift-experience__value',
            text: `${this.currentXP}/${this.targetXP}`,
            parent: this.container
        });
        
        // Level Up Overlay (hidden by default)
        this.levelUpOverlay = DOMFactory.createElement('div', {
            className: 'rift-experience__level-up rift-hidden',
            parent: this.container
        });
        
        this.levelUpText = DOMFactory.createElement('div', {
            className: 'rift-experience__level-up-text',
            text: 'LEVEL UP!',
            parent: this.levelUpOverlay
        });
    }
    
    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        if (EventManager) {
            this.eventSubscriptions.push(
                EventManager.subscribe('xp:gained', this._onXPGained.bind(this))
            );
            this.eventSubscriptions.push(
                EventManager.subscribe('xp:levelup', this._onLevelUp.bind(this))
            );
        }
    }
    
    /**
     * Handle xp:gained event
     * @param {Object} event - Standardized progress event
     * @param {number} event.amount - Amount of XP gained
     * @param {string} event.source - Source of XP (kill, objective, etc.)
     * @param {number} event.total - New total XP
     * @private
     */
    _onXPGained(event) {
        if (!event || typeof event.amount !== 'number') return;
        
        const amount = event.amount || 0;
        this.gainXP(amount);
        
        // Display floating XP indicator if enabled
        if (this.config.displayXpGain && amount > 0) {
            this._showXPGainIndicator(amount, event.source);
        }
    }
    
    /**
     * Handle xp:levelup event
     * @param {Object} event - Standardized progress event
     * @param {number} event.value - New player level
     * @param {number} event.previous - Previous player level
     * @param {Object} event.level - Level information
     * @param {boolean} event.level.isLevelUp - Whether this caused a level up
     * @private
     */
    _onLevelUp(event) {
        if (!event || typeof event.value !== 'number') return;
        
        this.setLevel(event.value);
        
        // Show level up animation if enabled
        if (this.config.displayLevelUp) {
            this._showLevelUpAnimation();
        }
    }
    
    /**
     * Show XP gain indicator
     * @private
     * @param {number} amount - Amount of XP gained
     * @param {string} source - Source of XP
     */
    _showXPGainIndicator(amount, source) {
        // Create a floating number that rises and fades out
        const floatingNumber = DOMFactory.createElement('div', {
            className: 'rift-experience__floating-number',
            text: `+${amount} XP`,
            styles: {
                position: 'absolute',
                top: '0px',
                right: `${Math.random() * 40}px`,
                opacity: '0',
                transform: 'translateY(0px)'
            },
            parent: this.container
        });
        
        // Animate the number rising up and fading out
        requestAnimationFrame(() => {
            floatingNumber.style.transition = 'all 1.5s ease-out';
            floatingNumber.style.opacity = '1';
            floatingNumber.style.transform = 'translateY(-30px)';
            
            setTimeout(() => {
                floatingNumber.style.opacity = '0';
                setTimeout(() => {
                    floatingNumber.remove();
                }, 500);
            }, 1000);
        });
    }
    
    /**
     * Show level up animation
     * @private
     */
    _showLevelUpAnimation() {
        // Add level up classes
        this.xpFill.classList.add('rift-experience__fill--level-up');
        this.levelDisplay.classList.add('rift-experience__level--level-up');
        this.levelUpOverlay.classList.remove('rift-hidden');
        
        // Remove classes after animation
        setTimeout(() => {
            this.xpFill.classList.remove('rift-experience__fill--level-up');
            this.levelDisplay.classList.remove('rift-experience__level--level-up');
            this.levelUpOverlay.classList.add('rift-hidden');
        }, 3000);
    }
    
    /**
     * Calculate XP required for a given level
     * @private
     * @param {number} level - Level to calculate XP for
     * @return {number} XP required for level
     */
    _calculateXPForLevel(level) {
        if (level <= 1) return this.config.baseXpPerLevel;
        
        return Math.floor(
            this.config.baseXpPerLevel * 
            Math.pow(this.config.levelScalingFactor, level - 1)
        );
    }
    
    /**
     * Set the player's current level
     * @param {number} level - New level
     * @return {ExperienceBar} This component instance
     */
    setLevel(level) {
        this.level = Math.min(Math.max(1, level), this.config.maxLevel || 100);
        this.levelDisplay.textContent = this.level;
        this.targetXP = this._calculateXPForLevel(this.level);
        this.updateXP(this.currentXP);
        
        return this;
    }
    
    /**
     * Update the experience value display
     * @param {number} xp - Current XP amount
     * @return {ExperienceBar} This component instance
     */
    updateXP(xp) {
        this.currentXP = Math.max(0, xp);
        
        // Calculate percentage fill
        const percentage = Math.min(100, (this.currentXP / this.targetXP) * 100);
        
        // Update fill width
        this.xpFill.style.width = `${percentage}%`;
        
        // Update text value
        this.xpValue.textContent = `${this.currentXP}/${this.targetXP}`;
        
        return this;
    }
    
    /**
     * Add experience points, handling level ups if necessary
     * @param {number} amount - Amount of XP to add
     * @return {ExperienceBar} This component instance
     */
    gainXP(amount) {
        if (amount <= 0) return this;
        
        let remainingXP = amount;
        let didLevelUp = false;
        let levelsGained = 0;
        
        // Add XP and handle level ups
        while (remainingXP > 0) {
            const xpToNextLevel = this.targetXP - this.currentXP;
            
            if (remainingXP >= xpToNextLevel && this.level < (this.config.maxLevel || 100)) {
                // Level up
                this.level++;
                levelsGained++;
                didLevelUp = true;
                
                remainingXP -= xpToNextLevel;
                this.currentXP = 0;
                this.targetXP = this._calculateXPForLevel(this.level);
                
                // Update level display
                this.levelDisplay.textContent = this.level;
            } else {
                // Just add XP
                this.currentXP += remainingXP;
                remainingXP = 0;
            }
        }
        
        // Update XP bar
        this.updateXP(this.currentXP);
        
        // Emit level up event if we leveled up
        if (didLevelUp && EventManager) {
            EventManager.emit('xp:levelup', 
                EventManager.createProgressEvent(
                    levelsGained * (this.config.skillPointsPerLevel || 1), // amount
                    'experience-gain',                                      // source
                    this.currentXP,                                         // total
                    {                                                       // level
                        current: this.level,
                        previous: this.level - levelsGained,
                        isLevelUp: true
                    },
                    []                                                      // rewards (empty array as default)
                )
            );
        }
        
        return this;
    }
    
    /**
     * Set exact XP values
     * @param {number} level - Player level
     * @param {number} currentXP - Current XP amount
     * @param {number} targetXP - Target XP for next level
     * @return {ExperienceBar} This component instance
     */
    setXP(level, currentXP, targetXP) {
        this.level = Math.min(Math.max(1, level), this.config.maxLevel || 100);
        this.currentXP = Math.max(0, currentXP);
        this.targetXP = targetXP || this._calculateXPForLevel(this.level);
        
        // Update displays
        this.levelDisplay.textContent = this.level;
        this.updateXP(this.currentXP);
        
        return this;
    }
    
    /**
     * Show the experience bar
     * @return {ExperienceBar} This component instance
     */
    show() {
        this.container.classList.remove('rift-hidden');
        this.isVisible = true;
        return this;
    }
    
    /**
     * Hide the experience bar
     * @return {ExperienceBar} This component instance
     */
    hide() {
        this.container.classList.add('rift-hidden');
        this.isVisible = false;
        return this;
    }
    
    /**
     * Update the component based on game tick
     * @param {number} delta - Time in seconds since last update
     */
    update(delta) {
        // Currently no tick-based updates needed for this component
    }
    
    /**
     * Clean up the component
     */
    dispose() {
        // Unsubscribe from all events using parent class method
        super.dispose();
        
        // Remove DOM elements
        if (this.container && this.container.parentNode) {
            this.container.remove();
        }
    }
}



export { ExperienceBar };
