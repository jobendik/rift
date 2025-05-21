/**
 * Skill points display component for RIFT UI
 * Shows available skill points and provides access to skill tree
 */

import { UIComponent } from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import EventManager from '../../../core/EventManager.js';
import UIConfig from '../../../core/UIConfig.js';

export default class SkillPointsDisplay extends UIComponent {
    /**
     * Create a new SkillPointsDisplay component
     * @param {Object} world - Reference to the game world
     * @param {Object} options - Component options
     */
    constructor(world, options = {}) {
        super(world, options);
        
        this.config = UIConfig.xp;
        this.skillPoints = this.options.skillPoints || 0;
        this.isVisible = this.options.visible !== false;
        this.floatingNumbers = [];
        
        // Bind methods
        this._handleLevelUp = this._handleLevelUp.bind(this);
        this._handleSkillPointsChanged = this._handleSkillPointsChanged.bind(this);
        this._handleSpendBtnClick = this._handleSpendBtnClick.bind(this);
    }
    
    /**
     * Initialize the skill points display
     */
    init() {
        this._createElements();
        this._setupEventListeners();
        this.updateDisplay(this.skillPoints);
        
        if (!this.isVisible) {
            this.hide();
        }
    }
    
    /**
     * Create DOM elements for the skill points display
     * @private
     */
    _createElements() {
        this.container = DOMFactory.createElement('div', {
            className: 'rift-skill-points',
            parent: this.options.parent || document.body
        });
        
        // Skill points icon
        this.icon = DOMFactory.createElement('div', {
            className: 'rift-skill-points__icon',
            html: '✦', // Special skill point character
            parent: this.container
        });
        
        // Value container
        this.valueContainer = DOMFactory.createElement('div', {
            className: 'rift-skill-points__value-container',
            parent: this.container
        });
        
        // Label
        this.label = DOMFactory.createElement('div', {
            className: 'rift-skill-points__label',
            text: 'Skill Points',
            parent: this.valueContainer
        });
        
        // Points value
        this.value = DOMFactory.createElement('div', {
            className: 'rift-skill-points__value',
            text: this.skillPoints,
            parent: this.valueContainer
        });
        
        // Spend button (if enabled in config)
        if (this.config.skillPointsAllowSpending) {
            this.spendButton = DOMFactory.createElement('button', {
                className: 'rift-skill-points__button',
                text: 'Spend',
                attributes: {
                    type: 'button'
                },
                parent: this.container
            });
            
            // Add event listener for the button
            this.spendButton.addEventListener('click', this._handleSpendBtnClick);
            
            // Disable button if no points
            if (this.skillPoints <= 0) {
                this._disableSpendButton();
            }
        }
    }
    
    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        if (EventManager) {
            EventManager.on('player:level:up', this._handleLevelUp);
            EventManager.on('player:skill:points:changed', this._handleSkillPointsChanged);
        }
    }
    
    /**
     * Handle skill points changed events
     * @private
     * @param {Object} data - Event data
     * @param {number} data.points - New skill points total
     * @param {number} data.change - Change in points (positive or negative)
     */
    _handleSkillPointsChanged(data) {
        if (!data || typeof data.points !== 'number') return;
        
        const oldPoints = this.skillPoints;
        const newPoints = data.points;
        const change = data.change || (newPoints - oldPoints);
        
        this.updateDisplay(newPoints);
        
        // Show animation for gained/spent points
        if (change !== 0) {
            this._showPointChangeAnimation(change);
        }
    }
    
    /**
     * Handle level up events
     * @private
     * @param {Object} data - Event data
     * @param {number} data.level - New level
     * @param {number} data.skillPoints - Skill points awarded
     */
    _handleLevelUp(data) {
        if (!data || !data.skillPoints) return;
        
        // Add skill points and update display
        const newTotal = this.skillPoints + data.skillPoints;
        this.updateDisplay(newTotal);
        
        // Show animation for gained points
        this._showPointChangeAnimation(data.skillPoints);
    }
    
    /**
     * Handle spend button click
     * @private
     * @param {Event} event - Click event
     */
    _handleSpendBtnClick(event) {
        // Prevent default button behavior
        event.preventDefault();
        
        // Don't do anything if no points available
        if (this.skillPoints <= 0) return;
        
        // Emit the event to open skill tree
        if (EventManager) {
            EventManager.emit('ui:skill:tree:open', { 
                availablePoints: this.skillPoints 
            });
        }
    }
    
    /**
     * Show animation for point change
     * @private
     * @param {number} change - Amount of change
     */
    _showPointChangeAnimation(change) {
        if (change === 0) return;
        
        // Add appropriate class to icon
        this.icon.classList.add('rift-skill-points__icon--glow');
        this.value.classList.add('rift-skill-points__value--pulse');
        this.container.classList.add('rift-skill-points--adding');
        
        // Create floating number
        const prefix = change > 0 ? '+' : '';
        const floatingNumber = DOMFactory.createElement('div', {
            className: 'rift-skill-points__floating-number',
            text: `${prefix}${change}`,
            styles: {
                position: 'absolute',
                top: '0px',
                right: `${Math.random() * 40}px`,
                opacity: '0',
                transform: 'translateY(0px)'
            },
            parent: this.container
        });
        
        // Animate the number
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
        
        // Remove animation classes
        setTimeout(() => {
            this.icon.classList.remove('rift-skill-points__icon--glow');
            this.value.classList.remove('rift-skill-points__value--pulse');
            this.container.classList.remove('rift-skill-points--adding');
        }, 1500);
    }
    
    /**
     * Enable the spend button
     * @private
     */
    _enableSpendButton() {
        if (!this.spendButton) return;
        
        this.spendButton.classList.remove('rift-skill-points__button--disabled');
        this.spendButton.disabled = false;
    }
    
    /**
     * Disable the spend button
     * @private
     */
    _disableSpendButton() {
        if (!this.spendButton) return;
        
        this.spendButton.classList.add('rift-skill-points__button--disabled');
        this.spendButton.disabled = true;
    }
    
    /**
     * Update the skill points display
     * @param {number} points - Number of skill points
     * @return {SkillPointsDisplay} This component instance
     */
    updateDisplay(points) {
        this.skillPoints = Math.max(0, points);
        
        // Update text
        this.value.textContent = this.skillPoints;
        
        // Enable/disable button based on available points
        if (this.spendButton) {
            if (this.skillPoints > 0) {
                this._enableSpendButton();
            } else {
                this._disableSpendButton();
            }
        }
        
        return this;
    }
    
    /**
     * Add skill points
     * @param {number} amount - Amount of points to add
     * @return {SkillPointsDisplay} This component instance
     */
    addPoints(amount) {
        if (amount <= 0) return this;
        
        const newTotal = this.skillPoints + amount;
        this.updateDisplay(newTotal);
        
        // Show animation
        this._showPointChangeAnimation(amount);
        
        // Emit event for other components
        if (EventManager) {
            EventManager.emit('player:skill:points:changed', { 
                points: this.skillPoints,
                change: amount 
            });
        }
        
        return this;
    }
    
    /**
     * Spend skill points
     * @param {number} amount - Amount of points to spend
     * @return {SkillPointsDisplay} This component instance
     */
    spendPoints(amount) {
        if (amount <= 0 || amount > this.skillPoints) return this;
        
        const newTotal = this.skillPoints - amount;
        this.updateDisplay(newTotal);
        
        // Show animation
        this._showPointChangeAnimation(-amount);
        
        // Emit event for other components
        if (EventManager) {
            EventManager.emit('player:skill:points:changed', { 
                points: this.skillPoints,
                change: -amount 
            });
        }
        
        return this;
    }
    
    /**
     * Set exact number of skill points
     * @param {number} points - Number of skill points
     * @return {SkillPointsDisplay} This component instance
     */
    setPoints(points) {
        const oldPoints = this.skillPoints;
        const newPoints = Math.max(0, points);
        const change = newPoints - oldPoints;
        
        this.updateDisplay(newPoints);
        
        // Emit event for other components if there was a change
        if (change !== 0 && EventManager) {
            EventManager.emit('player:skill:points:changed', { 
                points: this.skillPoints,
                change: change 
            });
        }
        
        return this;
    }
    
    /**
     * Show the skill points display
     * @return {SkillPointsDisplay} This component instance
     */
    show() {
        this.container.classList.remove('rift-hidden');
        this.isVisible = true;
        return this;
    }
    
    /**
     * Hide the skill points display
     * @return {SkillPointsDisplay} This component instance
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
        // Remove event listeners
        if (EventManager) {
            EventManager.off('player:level:up', this._handleLevelUp);
            EventManager.off('player:skill:points:changed', this._handleSkillPointsChanged);
        }
        
        if (this.spendButton) {
            this.spendButton.removeEventListener('click', this._handleSpendBtnClick);
        }
        
        // Remove DOM elements
        if (this.container && this.container.parentNode) {
            this.container.remove();
        }
    }
}
