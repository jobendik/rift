/**
 * KillFeed Component
 * 
 * Displays kill notifications and kill streaks:
 * - Shows recent eliminations with killer/victim names
 * - Weapon icons and special kill types (headshot, multi-kill)
 * - Kill streak announcements with visual flair
 * - Configurable message duration and positioning
 * 
 * @extends UIComponent
 */

import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { EventManager } from '../../../core/EventManager.js';

export class KillFeed extends UIComponent {
    /**
     * Create a new KillFeed
     * 
     * @param {Object} options - Component options
     * @param {number} options.messageDuration - Time to show each message in ms
     * @param {number} options.maxMessages - Maximum number of messages to display
     * @param {number} options.streakMinimum - Minimum kills for streak announcement
     */
    constructor(options = {}) {
        super({
            id: options.id || 'kill-feed',
            className: 'rift-kill-feed',
            container: options.container || document.body,
            ...options
        });
        
        // Configuration
        this.messageDuration = options.messageDuration || 6000;
        this.maxMessages = options.maxMessages || 10;
        this.streakMinimum = options.streakMinimum || 3;
        this.fadeDuration = options.fadeDuration || 500;
        
        // Internal state
        this.messages = [];
        this.streaks = [];
        this.eventSubscriptions = [];
        
        // Weapon icons mapping
        this.weaponIcons = {
            'assault_rifle': 'icon-rifle',
            'shotgun': 'icon-shotgun',
            'sniper': 'icon-sniper',
            'pistol': 'icon-pistol',
            'knife': 'icon-knife',
            'grenade': 'icon-grenade',
            'explosive': 'icon-explosive',
            'environment': 'icon-environment'
        };
        
        this._setupEventListeners();
    }
    
    /**
     * Set up event listeners for kill events
     * @private
     */
    _setupEventListeners() {
        this.eventSubscriptions.push(
            EventManager.subscribe('kill:confirmed', this._onKillConfirmed.bind(this))
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('kill:streak', this._onKillStreak.bind(this))
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('game:paused', this._onGamePaused.bind(this))
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('game:ended', this._onGameEnded.bind(this))
        );
    }
    
    /**
     * Add a kill message to the feed
     * 
     * @param {Object} data - Kill data
     * @param {string} data.killer - Name of the killer
     * @param {string} data.victim - Name of the victim
     * @param {string} data.weapon - Weapon used for the kill
     * @param {boolean} data.isHeadshot - Whether it was a headshot
     * @param {string} data.specialType - Special kill type (if any)
     */
    addKillMessage(data) {
        console.log('[KillFeed] Adding kill message:', data);
        
        // Remove oldest message if at maximum
        if (this.messages.length >= this.maxMessages) {
            this._removeOldestMessage();
        }
        
        // Create message element
        const message = this._createKillMessage(data);
        
        // Add to DOM and track
        this.element.appendChild(message.element);
        this.messages.push(message);
        
        // Show with animation
        setTimeout(() => {
            message.element.classList.add('rift-kill-message--enter');
        }, 10);
        
        // Set up auto-remove timer
        message.timerId = setTimeout(() => {
            this._removeMessage(message);
        }, this.messageDuration);
    }
    
    /**
     * Add a kill streak announcement
     * 
     * @param {Object} data - Streak data
     * @param {string} data.player - Player name
     * @param {number} data.killCount - Number of kills in streak
     * @param {string} data.streakType - Type of streak ('killing_spree', 'rampage', etc.)
     */
    addKillStreak(data) {
        console.log('[KillFeed] Adding kill streak:', data);
        
        // Create streak element
        const streak = this._createKillStreak(data);
        
        // Add to DOM
        this.element.appendChild(streak.element);
        this.streaks.push(streak);
        
        // Show with animation
        setTimeout(() => {
            streak.element.classList.add('rift-kill-streak--enter');
        }, 10);
        
        // Auto-remove after longer duration
        streak.timerId = setTimeout(() => {
            this._removeStreak(streak);
        }, this.messageDuration * 1.5);
    }
    
    /**
     * Update kill feed animations
     * 
     * @param {number} delta - Time since last update in ms
     */
    update(delta) {
        // Nothing specific to update per frame
        return this;
    }
    
    /**
     * Clean up resources and timers
     */
    dispose() {
        // Clear all timers
        [...this.messages, ...this.streaks].forEach(item => {
            if (item.timerId) {
                clearTimeout(item.timerId);
            }
        });
        
        this.messages = [];
        this.streaks = [];
        
        // Unsubscribe from events
        this.eventSubscriptions.forEach(subscription => {
            EventManager.unsubscribe(subscription);
        });
        this.eventSubscriptions = [];
        
        // Call parent dispose
        super.dispose();
        
        return this;
    }
    
    /**
     * Handle kill:confirmed event
     * @param {Object} event - Kill event data
     * @private
     */
    _onKillConfirmed(event) {
        this.addKillMessage({
            killer: event.killer || 'Unknown',
            victim: event.victim || 'Target',
            weapon: event.weapon || 'unknown',
            isHeadshot: event.isHeadshot || false,
            specialType: event.specialType || null
        });
    }
    
    /**
     * Handle kill:streak event
     * @param {Object} event - Streak event data
     * @private
     */
    _onKillStreak(event) {
        if (event.killCount >= this.streakMinimum) {
            this.addKillStreak({
                player: event.player || 'Player',
                killCount: event.killCount,
                streakType: event.streakType || 'killing_spree'
            });
        }
    }
    
    /**
     * Handle game:paused event
     * @private
     */
    _onGamePaused() {
        // Pause all animations (implementation depends on CSS)
        this.element.classList.add('rift-kill-feed--paused');
    }
    
    /**
     * Handle game:ended event
     * @private
     */
    _onGameEnded() {
        // Clear all messages
        this.clearAll();
    }
    
    /**
     * Create a kill message DOM element
     * 
     * @private
     * @param {Object} data - Kill message data
     * @returns {Object} - Message object with DOM element and metadata
     */
    _createKillMessage(data) {
        const message = {};
        
        // Create main message container
        message.element = DOMFactory.createElement('div', {
            className: 'rift-kill-message'
        });
        
        // Add killer name
        const killer = DOMFactory.createElement('span', {
            className: 'rift-kill-message__player rift-kill-message__killer',
            text: data.killer
        });
        message.element.appendChild(killer);
        
        // Add weapon icon/text (simplified for now since we don't have icons)
        const weapon = DOMFactory.createElement('span', {
            className: 'rift-kill-message__weapon',
            text: ' → '  // Simple arrow for now
        });
        message.element.appendChild(weapon);
        
        // Add victim name
        const victim = DOMFactory.createElement('span', {
            className: 'rift-kill-message__player rift-kill-message__victim',
            text: data.victim
        });
        message.element.appendChild(victim);
        
        // Add special indicators
        if (data.isHeadshot) {
            const special = DOMFactory.createElement('span', {
                className: 'rift-kill-message__special rift-kill-message__special--headshot',
                text: ' (HS)'
            });
            message.element.appendChild(special);
        } else if (data.specialType) {
            const special = DOMFactory.createElement('span', {
                className: 'rift-kill-message__special',
                text: ` (${data.specialType.toUpperCase()})`
            });
            message.element.appendChild(special);
        }
        
        message.data = data;
        return message;
    }
    
    /**
     * Create a kill streak DOM element
     * 
     * @private
     * @param {Object} data - Streak data
     * @returns {Object} - Streak object with DOM element and metadata
     */
    _createKillStreak(data) {
        const streak = {};
        
        // Create streak container
        streak.element = DOMFactory.createElement('div', {
            className: `rift-kill-streak rift-kill-streak--${data.streakType.replace('_', '-')}`
        });
        
        // Add streak text
        const streakText = this._getStreakText(data.killCount, data.streakType);
        const text = DOMFactory.createElement('div', {
            className: 'rift-kill-streak__text',
            text: `${data.player} ${streakText}!`
        });
        streak.element.appendChild(text);
        
        // Add kill count
        const count = DOMFactory.createElement('div', {
            className: 'rift-kill-streak__count',
            text: `${data.killCount} kills`
        });
        streak.element.appendChild(count);
        
        streak.data = data;
        return streak;
    }
    
    /**
     * Get streak text based on kill count
     * 
     * @private
     * @param {number} killCount - Number of kills
     * @param {string} streakType - Type of streak
     * @returns {string} - Streak description text
     */
    _getStreakText(killCount, streakType) {
        // Default streak names based on count
        const streakNames = {
            3: 'is on a killing spree',
            5: 'is dominating',
            7: 'is on a rampage',
            10: 'is unstoppable',
            15: 'is godlike'
        };
        
        // Find the appropriate streak text
        const streakKeys = Object.keys(streakNames).map(Number).sort((a, b) => b - a);
        
        for (const threshold of streakKeys) {
            if (killCount >= threshold) {
                return streakNames[threshold];
            }
        }
        
        return 'is on a killing spree';
    }
    
    /**
     * Remove the oldest message from the feed
     * 
     * @private
     */
    _removeOldestMessage() {
        if (this.messages.length === 0) return;
        
        const oldest = this.messages.shift();
        this._removeMessage(oldest, true);
    }
    
    /**
     * Remove a specific message from the feed
     * 
     * @private
     * @param {Object} message - Message to remove
     * @param {boolean} immediate - Whether to skip exit animation
     */
    _removeMessage(message, immediate = false) {
        if (!message || !message.element || !message.element.parentNode) {
            return;
        }
        
        // Clear timer
        if (message.timerId) {
            clearTimeout(message.timerId);
        }
        
        if (immediate) {
            // Remove immediately
            message.element.parentNode.removeChild(message.element);
            this.messages = this.messages.filter(m => m !== message);
        } else {
            // Remove with animation
            message.element.classList.add('rift-kill-message--exit');
            message.element.classList.remove('rift-kill-message--enter');
            
            setTimeout(() => {
                if (message.element.parentNode) {
                    message.element.parentNode.removeChild(message.element);
                }
                this.messages = this.messages.filter(m => m !== message);
            }, this.fadeDuration);
        }
    }
    
    /**
     * Remove a specific streak from the feed
     * 
     * @private
     * @param {Object} streak - Streak to remove
     */
    _removeStreak(streak) {
        if (!streak || !streak.element || !streak.element.parentNode) {
            return;
        }
        
        // Clear timer
        if (streak.timerId) {
            clearTimeout(streak.timerId);
        }
        
        // Remove with animation
        streak.element.classList.add('rift-kill-streak--exit');
        streak.element.classList.remove('rift-kill-streak--enter');
        
        setTimeout(() => {
            if (streak.element.parentNode) {
                streak.element.parentNode.removeChild(streak.element);
            }
            this.streaks = this.streaks.filter(s => s !== streak);
        }, this.fadeDuration);
    }
    
    /**
     * Clear all messages and streaks
     */
    clearAll() {
        // Clear all timers
        [...this.messages, ...this.streaks].forEach(item => {
            if (item.timerId) {
                clearTimeout(item.timerId);
            }
        });
        
        // Remove all messages with animation
        this.messages.forEach(message => this._removeMessage(message));
        this.streaks.forEach(streak => this._removeStreak(streak));
        
        return this;
    }
}
