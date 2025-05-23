/**
 * Progression system for RIFT
 * Coordinates XP, levels, ranks and skill points
 */

import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { EventManager } from '../../../core/EventManager.js';
import { UIConfig } from '../../../core/UIConfig.js';

// Import progression components
import { ExperienceBar } from './ExperienceBar.js';
import { PlayerRank } from './PlayerRank.js';
import { SkillPointsDisplay } from './SkillPointsDisplay.js';

class ProgressionSystem extends UIComponent {
    /**
     * Create a new progression system
     * @param {Object} world - Reference to the game world
     * @param {Object} options - Component options
     */
    constructor(world, options = {}) {
        // Prevent auto-initialization in parent class
        super({ autoInit: false, ...options });
        
        this.world = world;
        this.options = options || {};
        this.config = UIConfig.xp;
        this.level = this.options.level || 1;
        this.currentXP = this.options.currentXP || 0;
        this.skillPoints = this.options.skillPoints || 0;
        this.isVisible = this.options.visible !== false;
        this.containers = {
            main: null
        };
        this.components = {};
        
        // Bind methods
        this._handleSkillTreeOpen = this._handleSkillTreeOpen.bind(this);
        
        // Manual initialization after all properties are set
        this.init();
    }
    
    /**
     * Initialize the progression system
     */
    init() {
        if (this.isInitialized) return this;
        
        console.log('Initializing RIFT Progression System...');
        
        // Call parent init first
        super.init();
        
        // Set initialized flag early to prevent infinite recursion
        this.isInitialized = true;
        
        this._createContainers();
        this._createComponents();
        this._setupEventListeners();
        
        if (!this.isVisible) {
            this.hide();
        }
        
        console.log('RIFT Progression System initialized');
    }
    
    /**
     * Create layout containers for progression components
     * @private
     */
    _createContainers() {
        // Main container
        this.containers.main = DOMFactory.createElement('div', {
            className: `rift-progression rift-progression--${this.config.hudLayout || 'horizontal'}`,
            id: 'rift-progression',
            parent: document.body
        });
        
        // Set position based on config
        const position = this.config.hudPosition || 'bottom';
        this.containers.main.classList.add(`rift-progression--${position}`);
        
        // Set position CSS
        if (position === 'bottom') {
            this.containers.main.style.position = 'fixed';
            this.containers.main.style.bottom = '20px';
            this.containers.main.style.left = '50%';
            this.containers.main.style.transform = 'translateX(-50%)';
        } else if (position === 'top') {
            this.containers.main.style.position = 'fixed';
            this.containers.main.style.top = '20px';
            this.containers.main.style.left = '50%';
            this.containers.main.style.transform = 'translateX(-50%)';
        }
    }
    
    /**
     * Create progression components
     * @private
     */
    _createComponents() {
        // Experience Bar
        if (this.config.showXpInHUD !== false) {
            try {
                this.components.experienceBar = new ExperienceBar(this.world, {
                    parent: this.containers.main,
                    level: this.level,
                    currentXP: this.currentXP
                });
                this.components.experienceBar.init();
            } catch (error) {
                console.error('[ProgressionSystem] Failed to create ExperienceBar:', error);
            }
        }
        
        // Player Rank
        try {
            this.components.playerRank = new PlayerRank(this.world, {
                parent: this.containers.main,
                level: this.level
            });
            this.components.playerRank.init();
        } catch (error) {
            console.error('[ProgressionSystem] Failed to create PlayerRank:', error);
        }
        
        // Skill Points Display (if enabled)
        if (this.config.enableSkillPoints) {
            try {
                this.components.skillPoints = new SkillPointsDisplay(this.world, {
                    parent: this.containers.main,
                    skillPoints: this.skillPoints
                });
                this.components.skillPoints.init();
            } catch (error) {
                console.error('[ProgressionSystem] Failed to create SkillPointsDisplay:', error);
            }
        }
    }
    
    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {        if (EventManager) {
            // Listen for skill tree opening request
            EventManager.on('ui:skill:open', this._handleSkillTreeOpen);
            
            // Additional game events can be handled here
            EventManager.on('game:started', () => this.show());
            EventManager.on('game:ended', () => this.hide());
            
            // Add test XP event for debugging
            if (this.world.isDebugMode) {
                EventManager.on('debug:add:xp', (data) => {
                    const amount = data?.amount || 100;
                    this.addXP(amount);
                });
            }
        }
    }
    
    /**
     * Handle opening skill tree request
     * @private
     * @param {Object} data - Event data
     */
    _handleSkillTreeOpen(data) {
        console.log(`Opening skill tree with ${data?.availablePoints || 0} points available`);
        
        // Here we would show a skill tree menu screen
        // For now, we just log it and emit an event for the menu system to handle
        if (EventManager) {
            EventManager.emit('ui:screen:request', { 
                screen: 'skillTree',
                data: { 
                    skillPoints: data?.availablePoints || this.skillPoints 
                }
            });
        }
    }
    
    /**
     * Add experience points to the player
     * @param {number} amount - Amount of XP to add
     * @return {ProgressionSystem} This component instance
     */
    addXP(amount) {
        if (!amount || amount <= 0) return this;
        
        // Signal the XP gain to all components
        if (EventManager) {
            EventManager.emit('player:xp:gain', {
                amount: amount,
                source: 'system'
            });
        }
        
        return this;
    }
    
    /**
     * Award skill points to the player
     * @param {number} amount - Amount of skill points to add
     * @return {ProgressionSystem} This component instance
     */
    addSkillPoints(amount) {
        if (!amount || amount <= 0 || !this.components.skillPoints) return this;
        
        this.components.skillPoints.addPoints(amount);
        
        return this;
    }
    
    /**
     * Set player level directly
     * @param {number} level - New level
     * @return {ProgressionSystem} This component instance
     */
    setLevel(level) {
        if (level <= 0) return this;
        
        this.level = level;
        
        // Update components
        if (this.components.experienceBar) {
            this.components.experienceBar.setLevel(level);
        }
        
        if (this.components.playerRank) {
            this.components.playerRank.updateRank(level);
        }
        
        return this;
    }
    
    /**
     * Spend skill points
     * @param {number} amount - Amount of points to spend
     * @return {ProgressionSystem} This component instance
     */
    spendSkillPoints(amount) {
        if (!amount || amount <= 0 || !this.components.skillPoints) return this;
        
        this.components.skillPoints.spendPoints(amount);
        
        return this;
    }
    
    /**
     * Set player progression data
     * @param {Object} data - Progression data
     * @param {number} data.level - Player level
     * @param {number} data.xp - Current XP amount
     * @param {number} data.skillPoints - Available skill points
     * @return {ProgressionSystem} This progression system instance
     */
    setProgressionData(data) {
        if (!data) return this;
        
        // Update internal state
        this.level = data.level || this.level;
        this.currentXP = data.xp || this.currentXP;
        this.skillPoints = data.skillPoints || this.skillPoints;
        
        // Update components
        if (this.components.experienceBar) {
            this.components.experienceBar.setXP(this.level, this.currentXP);
        }
        
        if (this.components.playerRank) {
            this.components.playerRank.updateRank(this.level);
        }
        
        if (this.components.skillPoints) {
            this.components.skillPoints.setPoints(this.skillPoints);
        }
        
        return this;
    }
    
    /**
     * Set size based on window dimensions
     * @param {number} width - Window width
     * @param {number} height - Window height
     * @return {ProgressionSystem} This component instance
     */
    setSize(width, height) {
        // Adjust container size/position based on screen dimensions
        if (width <= 768) {
            // Mobile layout adjustments
            this.containers.main.style.maxWidth = '90%';
        } else {
            // Desktop layout
            this.containers.main.style.maxWidth = '800px';
        }
        
        return this;
    }
    
    /**
     * Show the progression system
     * @return {ProgressionSystem} This component instance
     */
    show() {
        if (!this.containers.main) return this;
        
        this.containers.main.classList.remove('rift-hidden');
        this.isVisible = true;
        
        // Show all components
        for (const key in this.components) {
            if (this.components[key].show) {
                this.components[key].show();
            }
        }
        
        return this;
    }
    
    /**
     * Hide the progression system
     * @return {ProgressionSystem} This component instance
     */
    hide() {
        if (!this.containers.main) return this;
        
        this.containers.main.classList.add('rift-hidden');
        this.isVisible = false;
        
        // Hide all components
        for (const key in this.components) {
            if (this.components[key].hide) {
                this.components[key].hide();
            }
        }
        
        return this;
    }
    
    /**
     * Update the component based on game tick
     * @param {number} delta - Time in seconds since last update
     */
    update(delta) {
        // Update all progression components
        for (const key in this.components) {
            if (this.components[key].update) {
                this.components[key].update(delta);
            }
        }
    }
    
    /**
     * Clean up all progression components
     */    dispose() {
        // Remove event listeners
        if (EventManager) {
            EventManager.off('ui:skill:open', this._handleSkillTreeOpen);
            EventManager.off('debug:add:xp');
            EventManager.off('game:started');
            EventManager.off('game:ended');
        }
        
        // Dispose all components
        for (const key in this.components) {
            if (this.components[key].dispose) {
                this.components[key].dispose();
            }
        }
        
        // Remove containers
        if (this.containers.main && this.containers.main.parentNode) {
            this.containers.main.remove();
        }
        
        this.components = {};
        this.containers = {};
    }
}



export { ProgressionSystem };
