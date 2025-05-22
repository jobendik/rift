/**
 * KillFeed Component
 * 
 * Manages and displays kill events in the game:
 * - Player kills (who killed whom)
 * - Special kill types (headshots, melee kills, etc.)
 * - Multi-kills and streaks
 * 
 * Provides visual feedback for combat events while minimizing
 * screen clutter.
 * 
 * @extends UIComponent
 */

import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';

export class KillFeed extends UIComponent {
    /**
     * Create a new KillFeed
     * 
     * @param {Object} options - Component options
     * @param {number} options.displayDuration - Display time in ms
     * @param {number} options.fadeDuration - Animation duration in ms
     * @param {number} options.maxMessages - Maximum messages to show at once
     * @param {number} options.streakTimeout - Time window for kill streaks in ms
     */
    constructor(options = {}) {
        super({
            autoInit: false,
            id: options.id || 'kill-feed',
            className: 'rift-kill-feed',
            container: options.container || document.body,
            ...options
        });
        
        // Configuration
        this.displayDuration = options.displayDuration || 5000;
        this.fadeDuration = options.fadeDuration || 500;
        this.maxMessages = options.maxMessages || 5;
        this.streakTimeout = options.streakTimeout || 10000;
        
        // Internal state
        this.messages = [];
        this.activeTimers = [];
        this.currentStreak = {
            playerName: null,
            count: 0,
            lastKillTime: 0,
            timerId: null
        };
        this.isPaused = false;
        this.pauseStartTime = 0;
        
        // Weapon icons mapping
        this.weaponIcons = {
            'assault_rifle': 'icon-ar',
            'shotgun': 'icon-shotgun',
            'blaster': 'icon-blaster',
            'pistol': 'icon-pistol',
            'sniper': 'icon-sniper',
            'melee': 'icon-melee',
            'grenade': 'icon-grenade',
            'explosive': 'icon-explosive',
            'headshot': 'icon-headshot'
        };
        
        // Kill streak types
        this.streakTypes = [
            { count: 3, type: 'killing-spree' },
            { count: 5, type: 'rampage' },
            { count: 8, type: 'dominating' },
            { count: 10, type: 'unstoppable' }
        ];
    }
    
    /**
     * Initialize the kill feed
     */
    init() {
        if (!this.element) {
            this._createRootElement();
        }
        
        this.isInitialized = true;
        return this;
    }
    
    /**
     * Add a kill message to the feed
     * 
     * @param {Object} data - Kill data
     * @param {string} data.killer - Name of the player/entity who got the kill
     * @param {string} data.victim - Name of the player/entity who was killed
     * @param {string} data.weapon - Weapon used for the kill
     * @param {boolean} data.isHeadshot - Whether the kill was a headshot
     * @param {boolean} data.isTeamkill - Whether the kill was a team kill
     * @param {string} data.killerTeam - Team of the killer (if applicable)
     * @param {string} data.victimTeam - Team of the victim (if applicable)
     * @param {string} data.specialType - Special kill type (e.g., 'melee', 'revenge')
     */
    addKillMessage(data) {
        // Manage multi-kill streaks if same player gets multiple kills
        if (data.killer === this.currentStreak.playerName) {
            const now = Date.now();
            if (now - this.currentStreak.lastKillTime < this.streakTimeout) {
                // Continue the streak
                this.currentStreak.count++;
                this.currentStreak.lastKillTime = now;
                
                // Clear existing streak timer if any
                if (this.currentStreak.timerId) {
                    clearTimeout(this.currentStreak.timerId);
                    this.activeTimers = this.activeTimers.filter(id => id !== this.currentStreak.timerId);
                }
                
                // Check if we've reached a streak milestone
                const streakType = this._getStreakType(this.currentStreak.count);
                if (streakType) {
                    this.showKillStreak(data.killer, streakType, this.currentStreak.count);
                }
                
                // Set new timeout to reset streak
                this.currentStreak.timerId = setTimeout(() => {
                    this._resetStreak();
                }, this.streakTimeout);
                
                this.activeTimers.push(this.currentStreak.timerId);
            } else {
                // Too much time passed, reset streak and start new one
                this._resetStreak();
                this.currentStreak.playerName = data.killer;
                this.currentStreak.count = 1;
                this.currentStreak.lastKillTime = now;
            }
        } else {
            // Different player, reset streak and start new one
            this._resetStreak();
            this.currentStreak.playerName = data.killer;
            this.currentStreak.count = 1;
            this.currentStreak.lastKillTime = Date.now();
        }
        
        // Create the kill message element
        const message = this._createKillMessage(data);
        
        // Clean up old messages if we're at max
        if (this.messages.length >= this.maxMessages) {
            const oldestMessage = this.messages.shift();
            this._removeMessage(oldestMessage, true);
        }
        
        // Add to DOM and track
        this.element.appendChild(message.element);
        this.messages.push(message);
        
        // Show with animation after a brief delay
        setTimeout(() => {
            message.element.classList.add('rift-kill-message--enter');
        }, 10);
        
        // Set up auto-remove timer
        message.timerId = setTimeout(() => {
            this._removeMessage(message);
        }, this.displayDuration);
        
        this.activeTimers.push(message.timerId);
        
        return message;
    }
    
    /**
     * Show a kill streak message
     * 
     * @param {string} playerName - Name of the player with the streak
     * @param {string} streakType - Type of streak
     * @param {number} kills - Number of kills in the streak
     */
    showKillStreak(playerName, streakType, kills) {
        // Create streak element
        const streak = this._createStreakMessage(playerName, streakType, kills);
        
        // Add to DOM
        this.element.appendChild(streak.element);
        
        // Show with animation after a brief delay
        setTimeout(() => {
            streak.element.classList.add('rift-kill-streak--enter');
        }, 10);
        
        // Set up auto-remove timer
        streak.timerId = setTimeout(() => {
            streak.element.classList.add('rift-kill-streak--exit');
            streak.element.classList.remove('rift-kill-streak--enter');
            
            setTimeout(() => {
                if (streak.element.parentNode) {
                    streak.element.parentNode.removeChild(streak.element);
                }
            }, this.fadeDuration);
        }, 3000); // Shorter duration for streak messages
        
        this.activeTimers.push(streak.timerId);
        
        return streak;
    }
    
    /**
     * Update the kill feed
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
        this.activeTimers.forEach(timerId => clearTimeout(timerId));
        this.activeTimers = [];
        this.messages = [];
        this._resetStreak();
        
        // Call parent dispose
        super.dispose();
        
        return this;
    }
    
    /**
     * Pause all kill feed timers
     */
    pauseTimers() {
        if (this.isPaused) return;
        
        this.isPaused = true;
        this.pauseStartTime = Date.now();
        
        // Clear all active timers
        this.activeTimers.forEach(timerId => clearTimeout(timerId));
        this.activeTimers = [];
        
        // Store remaining time for all messages
        this.messages.forEach(message => {
            message.remainingTime = message.expireTime - this.pauseStartTime;
        });
        
        // Store remaining time for current streak if active
        if (this.currentStreak.timerId) {
            this.currentStreak.remainingTime = this.currentStreak.lastKillTime + 
                                             this.streakTimeout - 
                                             this.pauseStartTime;
        }
    }
    
    /**
     * Resume kill feed timers after pause
     */
    resumeTimers() {
        if (!this.isPaused) return;
        
        const pauseDuration = Date.now() - this.pauseStartTime;
        this.isPaused = false;
        
        // Resume timers for all messages with adjusted durations
        this.messages.forEach(message => {
            const adjustedTime = Math.max(100, message.remainingTime); // Ensure at least 100ms
            
            message.expireTime = Date.now() + adjustedTime;
            
            // Create new timer
            message.timerId = setTimeout(() => {
                this._removeMessage(message);
            }, adjustedTime);
            
            this.activeTimers.push(message.timerId);
        });
        
        // Resume streak timer if active
        if (this.currentStreak.count > 0 && this.currentStreak.remainingTime) {
            const adjustedTime = Math.max(100, this.currentStreak.remainingTime);
            
            this.currentStreak.lastKillTime = Date.now() - (this.streakTimeout - adjustedTime);
            
            this.currentStreak.timerId = setTimeout(() => {
                this._resetStreak();
            }, adjustedTime);
            
            this.activeTimers.push(this.currentStreak.timerId);
        }
    }
    
    /**
     * Clear all current kill feed messages
     */
    clearAll() {
        // Clear timers
        this.activeTimers.forEach(timerId => clearTimeout(timerId));
        this.activeTimers = [];
        
        // Remove messages with exit animation
        const currentMessages = [...this.messages];
        currentMessages.forEach(message => {
            message.element.classList.add('rift-kill-message--exit');
            message.element.classList.remove('rift-kill-message--enter');
            
            setTimeout(() => {
                if (message.element.parentNode) {
                    message.element.parentNode.removeChild(message.element);
                }
            }, this.fadeDuration);
        });
        
        this.messages = [];
        this._resetStreak();
        
        return this;
    }
    
    /**
     * Create a kill message DOM element
     * 
     * @private
     * @param {Object} data - Kill data
     * @returns {Object} - Message object with DOM element and metadata
     */
    _createKillMessage(data) {
        const message = {};
        
        // Determine message class based on multi-kill
        let messageClass = 'rift-kill-message';
        if (this.currentStreak.count === 2) {
            messageClass += ' rift-kill-message--double';
        } else if (this.currentStreak.count === 3) {
            messageClass += ' rift-kill-message--triple';
        } else if (this.currentStreak.count === 4) {
            messageClass += ' rift-kill-message--quad';
        } else if (this.currentStreak.count >= 5) {
            messageClass += ' rift-kill-message--monster';
        }
        
        // Create message container
        message.element = DOMFactory.createElement({
            type: 'div',
            classes: messageClass.split(' ')
        });
        
        // Add killer name
        const killer = DOMFactory.createElement({
            type: 'span',
            classes: ['rift-kill-message__player', 'rift-kill-message__killer'],
            text: data.killer
        });
        message.element.appendChild(killer);
        
        // Add weapon icon
        const weaponClass = this.weaponIcons[data.weapon] || 'icon-weapon';
        const weapon = DOMFactory.createElement({
            type: 'span',
            classes: ['rift-kill-message__weapon', weaponClass]
        });
        message.element.appendChild(weapon);
        
        // Add victim name
        const victim = DOMFactory.createElement({
            type: 'span',
            classes: ['rift-kill-message__player', 'rift-kill-message__victim'],
            text: data.victim
        });
        message.element.appendChild(victim);
        
        // Add special indicator (e.g., headshot)
        if (data.isHeadshot) {
            const special = DOMFactory.createElement({
                type: 'span',
                classes: ['rift-kill-message__special', 'rift-kill-message__special--headshot'],
                text: 'HEADSHOT'
            });
            message.element.appendChild(special);
        } else if (data.specialType) {
            const special = DOMFactory.createElement({
                type: 'span',
                classes: ['rift-kill-message__special'],
                text: data.specialType.toUpperCase()
            });
            message.element.appendChild(special);
        }
        
        // Set expiration time
        message.expireTime = Date.now() + this.displayDuration;
        message.data = data;
        
        return message;
    }
    
    /**
     * Create a streak message DOM element
     * 
     * @private
     * @param {string} playerName - Player name
     * @param {string} streakType - Type of streak
     * @param {number} kills - Number of kills
     * @returns {Object} - Streak message object with DOM element
     */
    _createStreakMessage(playerName, streakType, kills) {
        const streak = {};
        
        // Create streak container
        streak.element = DOMFactory.createElement({
            type: 'div',
            classes: ['rift-kill-streak', `rift-kill-streak--${streakType}`]
        });
        
        // Format streak text based on type
        let streakText = '';
        switch (streakType) {
            case 'killing-spree':
                streakText = `${playerName} is on a killing spree! (${kills})`;
                break;
            case 'rampage':
                streakText = `${playerName} is on a rampage! (${kills})`;
                break;
            case 'dominating':
                streakText = `${playerName} is dominating! (${kills})`;
                break;
            case 'unstoppable':
                streakText = `${playerName} is unstoppable! (${kills})`;
                break;
            default:
                streakText = `${playerName} - ${kills} kills`;
        }
        
        streak.element.textContent = streakText;
        streak.playerName = playerName;
        streak.kills = kills;
        streak.type = streakType;
        
        return streak;
    }
    
    /**
     * Remove a message from the kill feed
     * 
     * @private
     * @param {Object} message - Message to remove
     * @param {boolean} immediate - Whether to remove immediately without animation
     */
    _removeMessage(message, immediate = false) {
        // If already removed from DOM, ignore
        if (!message || !message.element || !message.element.parentNode) {
            return;
        }
        
        // Clear timer if exists
        if (message.timerId) {
            clearTimeout(message.timerId);
            this.activeTimers = this.activeTimers.filter(id => id !== message.timerId);
        }
        
        if (immediate) {
            if (message.element.parentNode) {
                message.element.parentNode.removeChild(message.element);
            }
            this.messages = this.messages.filter(m => m !== message);
        } else {
            // Start exit animation
            message.element.classList.add('rift-kill-message--exit');
            message.element.classList.remove('rift-kill-message--enter');
            
            // Remove from DOM after animation completes
            setTimeout(() => {
                if (message.element.parentNode) {
                    message.element.parentNode.removeChild(message.element);
                }
                
                // Remove from tracked messages
                this.messages = this.messages.filter(m => m !== message);
            }, this.fadeDuration);
        }
    }
    
    /**
     * Get streak type based on kill count
     * 
     * @private
     * @param {number} kills - Kill count
     * @returns {string|null} - Streak type or null if not a streak
     */
    _getStreakType(kills) {
        // Find highest matching streak type
        for (let i = this.streakTypes.length - 1; i >= 0; i--) {
            if (kills === this.streakTypes[i].count) {
                return this.streakTypes[i].type;
            }
        }
        return null;
    }
    
    /**
     * Reset the current kill streak
     * 
     * @private
     */
    _resetStreak() {
        if (this.currentStreak.timerId) {
            clearTimeout(this.currentStreak.timerId);
            this.activeTimers = this.activeTimers.filter(id => id !== this.currentStreak.timerId);
        }
        
        this.currentStreak = {
            playerName: null,
            count: 0,
            lastKillTime: 0,
            timerId: null
        };
    }
}



