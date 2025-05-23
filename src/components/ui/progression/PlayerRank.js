/**
 * Player rank component for RIFT UI
 * Displays the player's current rank, including rank icon and tier indicators
 */

import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { EventManager } from '../../../core/EventManager.js';
import { UIConfig } from '../../../core/UIConfig.js';

class PlayerRank extends UIComponent {
    /**
     * Create a new PlayerRank component
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
        this.rank = this._getRankForLevel(this.level);
        this.isVisible = this.options.visible !== false;
        
        // Bind methods
        this._handleLevelUp = this._handleLevelUp.bind(this);
        
        // Manual initialization after all properties are set
        this.init();
    }
    
    /**
     * Initialize the rank display
     */
    init() {
        if (this.isInitialized) return this;
        
        // Call parent init first
        super.init();
        
        // Set initialized flag early to prevent infinite recursion
        this.isInitialized = true;
        
        this._createElements();
        this._setupEventListeners();
        this.updateRank(this.level);
        
        if (!this.isVisible) {
            this.hide();
        }
    }
    
    /**
     * Create DOM elements for the rank display
     * @private
     */
    _createElements() {
        this.container = DOMFactory.createElement('div', {
            className: 'rift-rank',
            parent: this.options.parent || document.body
        });
        
        // Icon container
        this.iconContainer = DOMFactory.createElement('div', {
            className: 'rift-rank__icon-container',
            parent: this.container
        });
        
        // Rank icon
        this.rankIcon = DOMFactory.createElement('div', {
            className: `rift-rank__icon rift-rank__icon--${this.rank.icon}`,
            parent: this.iconContainer
        });
        
        // Rank text container
        this.textContainer = DOMFactory.createElement('div', {
            className: 'rift-rank__text',
            parent: this.container
        });
        
        // Rank name
        this.rankName = DOMFactory.createElement('div', {
            className: 'rift-rank__name',
            text: this.rank.name,
            parent: this.textContainer
        });
        
        // Rank tier indicators (stars, etc.)
        this.tierContainer = DOMFactory.createElement('div', {
            className: 'rift-rank__tier',
            parent: this.textContainer
        });
        
        // Create tier indicators (stars, pips, etc.)
        this._createTierIndicators(this.rank.tier);
    }
    
    /**
     * Create tier indicators based on rank tier
     * @private
     * @param {number} tier - Rank tier level
     */
    _createTierIndicators(tier) {
        // Clear existing indicators
        this.tierContainer.innerHTML = '';
        
        // Create specified number of tier indicators
        for (let i = 0; i < tier; i++) {
            DOMFactory.createElement('div', {
                className: 'rift-rank__tier-indicator',
                html: 'â˜…',
                parent: this.tierContainer
            });
        }
    }
    
/**
 * Set up event listeners
 * @private
 */
_setupEventListeners() {
    if (EventManager) {
        this.eventSubscriptions.push(
            EventManager.subscribe('xp:levelup', this._onLevelUp.bind(this))
        );
    }
}

/**
 * Handle xp:levelup event
 * @param {Object} event - Standardized progress event
 * @param {number} event.value - New player level
 * @param {number} event.previous - Previous player level
 * @param {boolean} event.level.isLevelUp - Whether this caused a level up
 * @private
 */
_onLevelUp(event) {
    if (!event || typeof event.value !== 'number') return;
    
    // Update rank based on new level
    this.updateRank(event.value);
}
    
    /**
     * Get the rank data for a given level
     * @private
     * @param {number} level - Player level
     * @return {Object} Rank data object
     */
    _getRankForLevel(level) {
        if (!this.config.ranks || !this.config.ranks.length) {
            // Fallback if no rank data
            return { 
                name: 'Rookie', 
                tier: 1, 
                icon: 'rookie'
            };
        }
        
        // Sort ranks by min level in descending order
        const sortedRanks = [...this.config.ranks].sort((a, b) => b.minLevel - a.minLevel);
        
        // Find the first rank that the player qualifies for
        for (const rank of sortedRanks) {
            if (level >= rank.minLevel) {
                return rank;
            }
        }
        
        // Default to the lowest rank
        return this.config.ranks[0];
    }
    
    /**
     * Update the rank based on player level
     * @param {number} level - Player level
     * @return {PlayerRank} This component instance
     */
    updateRank(level) {
        this.level = level;
        const newRank = this._getRankForLevel(level);
        
        // Check if rank changed
        const rankChanged = this.rank.name !== newRank.name || this.rank.tier !== newRank.tier;
        this.rank = newRank;
        
        // Update rank name and icon
        this.rankName.textContent = this.rank.name;
        
        // Update class for icon
        this.rankIcon.className = `rift-rank__icon rift-rank__icon--${this.rank.icon}`;
        
        // Update tier indicators
        this._createTierIndicators(this.rank.tier);
        
        // Show rank-up animation if rank changed
        if (rankChanged) {
            this._showRankUpAnimation();
            
            // Emit rank changed event using standardized payload
            if (EventManager) {
                EventManager.emit('rank:changed', 
                    EventManager.createStateChangeEvent(
                        'rank', 
                        {
                            name: this.rank.name,
                            tier: this.rank.tier,
                            level: this.level
                        },
                        // Previous value not available here, but we include it for structure
                        {
                            name: this.rank.name,
                            tier: this.rank.tier,
                            level: this.level
                        },
                        null, // delta
                        null, // max
                        'level-increase' // source
                    )
                );
            }
        }
        
        return this;
    }
    
    /**
     * Show rank up animation
     * @private
     */
    _showRankUpAnimation() {
        // Add rank up class to container
        this.container.classList.add('rift-rank--rank-up');
        
        // Remove animation class after it completes
        setTimeout(() => {
            this.container.classList.remove('rift-rank--rank-up');
        }, 3000);
    }
    
    /**
     * Set rank directly
     * @param {string} rankName - Name of the rank
     * @param {number} tier - Tier level
     * @param {string} iconType - Type of icon to display
     * @return {PlayerRank} This component instance
     */
    setRank(rankName, tier = 1, iconType = 'rookie') {
        this.rank = {
            name: rankName,
            tier: tier,
            icon: iconType
        };
        
        // Update UI elements
        this.rankName.textContent = rankName;
        this.rankIcon.className = `rift-rank__icon rift-rank__icon--${iconType}`;
        this._createTierIndicators(tier);
        
        return this;
    }
    
    /**
     * Show the rank component
     * @return {PlayerRank} This component instance
     */
    show() {
        this.container.classList.remove('rift-hidden');
        this.isVisible = true;
        return this;
    }
    
    /**
     * Hide the rank component
     * @return {PlayerRank} This component instance
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



export { PlayerRank };
