/**
 * EnhancedKillFeed Component
 * 
 * An optimized version of KillFeed that uses the ElementPool utility
 * for more efficient DOM element reuse. Features include:
 * - Displaying kill events (who killed whom)
 * - Special kill types (headshots, melee kills, etc.)
 * - Multi-kills and streaks
 * - Efficient DOM manipulation via element pooling
 * 
 * @extends UIComponent
 */

import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { EventManager } from '../../../core/EventManager.js';
import { ElementPool } from '../../../utils/ElementPool.js';
import { UIConfig } from '../../../core/UIConfig.js';

export class EnhancedKillFeed extends UIComponent {
    /**
     * Create a new EnhancedKillFeed
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
        
        // Element pools (will be initialized in init)
        this.messagePool = null;
        this.streakPool = null;
        
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
        
        // Initialize element pools
        this._initElementPools();
        
        this._setupEventListeners();
        
        this.isInitialized = true;
        return this;
    }
    
    /**
     * Initialize element pools for kill messages and streak messages
     * @private
     */
    _initElementPools() {
        // Create custom element creation function for kill messages
        const createMessageFn = () => {
            const element = document.createElement('div');
            element.className = 'rift-kill-message';
            element.style.display = 'none'; // Initially hidden
            return element;
        };
        
        // Create custom reset function for kill messages
        const resetMessageFn = (element) => {
            // Reset basic properties
            element.textContent = '';
            element.className = 'rift-kill-message';
            
            // Clear inline styles except display
            const wasHidden = element.style.display === 'none';
            element.style = '';
            if (wasHidden) {
                element.style.display = 'none';
            }
            
            // Remove any child elements
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        };
        
        // Create the message pool
        this.messagePool = new ElementPool({
            elementType: 'div',
            createFn: createMessageFn,
            resetFn: resetMessageFn,
            container: this.element,
            className: 'rift-kill-message',
            initialSize: this.maxMessages,
            maxSize: this.maxMessages * 2, // Allow some buffer
            useBlocks: true,
            blockSize: 5
        });
        
        // Create custom element creation function for streak messages
        const createStreakFn = () => {
            const element = document.createElement('div');
            element.className = 'rift-kill-streak';
            element.style.display = 'none'; // Initially hidden
            return element;
        };
        
        // Create custom reset function for streak messages
        const resetStreakFn = (element) => {
            // Reset basic properties
            element.textContent = '';
            element.className = 'rift-kill-streak';
            
            // Clear inline styles except display
            const wasHidden = element.style.display === 'none';
            element.style = '';
            if (wasHidden) {
                element.style.display = 'none';
            }
        };
        
        // Create the streak pool
        this.streakPool = new ElementPool({
            elementType: 'div',
            createFn: createStreakFn,
            resetFn: resetStreakFn,
            container: this.element,
            className: 'rift-kill-streak',
            initialSize: 3, // Streaks are less common
            maxSize: 5,
            useBlocks: true,
            blockSize: 3
        });
    }
    
    /**
     * Set up event listeners for kill events
     * @private
     */
    _setupEventListeners() {
        this.eventSubscriptions.push(
            EventManager.subscribe('enemy:killed', this._onEnemyKilled.bind(this))
        );
        
        // Listen for player kills in case of multiplayer scenarios
        this.eventSubscriptions.push(
            EventManager.subscribe('player:killed', this._onPlayerKilled.bind(this))
        );
        
        // Listen for game state changes to pause/resume timers
        this.eventSubscriptions.push(
            EventManager.subscribe('game:paused', () => this.pauseTimers())
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('game:resumed', () => this.resumeTimers())
        );
    }
    
    /**
     * Handle enemy:killed event
     * @param {Object} event - Standardized combat event
     * @param {Object} event.source - Source entity information
     * @param {Object} event.target - Target entity information
     * @param {Object} event.weapon - Weapon information
     * @param {boolean} event.isHeadshot - Whether the hit was a headshot
     * @param {boolean} event.isCritical - Whether the hit was a critical hit
     * @private
     */
    _onEnemyKilled(event) {
        this.addKillMessage({
            killer: event.source.name || event.source.id,
            victim: event.target.name || event.target.id,
            weapon: event.weapon ? event.weapon.type : 'unknown',
            isHeadshot: event.isHeadshot || false,
            isTeamkill: event.isTeamkill || false,
            killerTeam: event.source.team,
            victimTeam: event.target.team,
            specialType: event.specialType
        });
    }
    
    /**
     * Handle player:killed event
     * @param {Object} event - Standardized combat event
     * @param {Object} event.source - Source entity information
     * @param {Object} event.target - Target entity information
     * @param {Object} event.weapon - Weapon information
     * @param {boolean} event.isHeadshot - Whether the hit was a headshot
     * @param {boolean} event.isCritical - Whether the hit was a critical hit
     * @private
     */
    _onPlayerKilled(event) {
        this.addKillMessage({
            killer: event.source.name || event.source.id,
            victim: event.target.name || event.target.id,
            weapon: event.weapon ? event.weapon.type : 'unknown',
            isHeadshot: event.isHeadshot || false,
            isTeamkill: event.isTeamkill || false,
            killerTeam: event.source.team,
            victimTeam: event.target.team,
            specialType: event.specialType
        });
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
        
        // Create the kill message using element pool
        const message = this._createKillMessage(data);
        
        // Clean up old messages if we're at max
        if (this.messages.length >= this.maxMessages) {
            const oldestMessage = this.messages.shift();
            this._removeMessage(oldestMessage, true);
        }
        
        // Add to DOM and track
        message.element.style.display = 'block';
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
        // Create streak element using element pool
        const streak = this._createStreakMessage(playerName, streakType, kills);
        
        // Make it visible
        streak.element.style.display = 'block';
        
        // Show with animation after a brief delay
        setTimeout(() => {
            streak.element.classList.add('rift-kill-streak--enter');
        }, 10);
        
        // Set up auto-remove timer
        streak.timerId = setTimeout(() => {
            streak.element.classList.add('rift-kill-streak--exit');
            streak.element.classList.remove('rift-kill-streak--enter');
            
            setTimeout(() => {
                if (streak.release) {
                    streak.release();
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
        
        // Release all messages
        this.messages.forEach(message => {
            if (message.release) {
                message.release();
            }
        });
        this.messages = [];
        
        // Reset streak
        this._resetStreak();
        
        // Dispose element pools
        if (this.messagePool) {
            this.messagePool.dispose();
            this.messagePool = null;
        }
        
        if (this.streakPool) {
            this.streakPool.dispose();
            this.streakPool = null;
        }
        
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
                if (message.release) {
                    message.release();
                }
            }, this.fadeDuration);
        });
        
        this.messages = [];
        this._resetStreak();
        
        return this;
    }
    
    /**
     * Create a kill message using element pool
     * 
     * @private
     * @param {Object} data - Kill data
     * @returns {Object} - Message object with DOM element and metadata
     */
    _createKillMessage(data) {
        // Get element from pool
        const { element, release } = this.messagePool.acquire();
        
        // Create message object
        const message = {
            element,
            release,
            data,
            expireTime: Date.now() + this.displayDuration
        };
        
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
        
        // Reset element and set classes
        element.className = messageClass;
        
        // Add killer name
        const killer = DOMFactory.createElement('span', {
            className: 'rift-kill-message__player rift-kill-message__killer',
            text: data.killer
        });
        element.appendChild(killer);
        
        // Add weapon icon
        const weaponClass = this.weaponIcons[data.weapon] || 'icon-weapon';
        const weapon = DOMFactory.createElement('span', {
            className: `rift-kill-message__weapon ${weaponClass}`
        });
        element.appendChild(weapon);
        
        // Add victim name
        const victim = DOMFactory.createElement('span', {
            className: 'rift-kill-message__player rift-kill-message__victim',
            text: data.victim
        });
        element.appendChild(victim);
        
        // Add special indicator (e.g., headshot)
        if (data.isHeadshot) {
            const special = DOMFactory.createElement('span', {
                className: 'rift-kill-message__special rift-kill-message__special--headshot',
                text: 'HEADSHOT'
            });
            element.appendChild(special);
        } else if (data.specialType) {
            const special = DOMFactory.createElement('span', {
                className: 'rift-kill-message__special',
                text: data.specialType.toUpperCase()
            });
            element.appendChild(special);
        }
        
        return message;
    }
    
    /**
     * Create a streak message using element pool
     * 
     * @private
     * @param {string} playerName - Player name
     * @param {string} streakType - Type of streak
     * @param {number} kills - Number of kills
     * @returns {Object} - Streak message object with DOM element
     */
    _createStreakMessage(playerName, streakType, kills) {
        // Get element from pool
        const { element, release } = this.streakPool.acquire();
        
        // Create streak object
        const streak = {
            element,
            release,
            playerName,
            kills,
            type: streakType
        };
        
        // Reset and set class
        element.className = `rift-kill-streak rift-kill-streak--${streakType}`;
        
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
        
        element.textContent = streakText;
        
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
        // If already removed, ignore
        if (!message || !message.element) {
            return;
        }
        
        // Clear timer if exists
        if (message.timerId) {
            clearTimeout(message.timerId);
            this.activeTimers = this.activeTimers.filter(id => id !== message.timerId);
        }
        
        if (immediate) {
            // Release element back to pool
            if (message.release) {
                message.release();
            }
            this.messages = this.messages.filter(m => m !== message);
        } else {
            // Start exit animation
            message.element.classList.add('rift-kill-message--exit');
            message.element.classList.remove('rift-kill-message--enter');
            
            // Release after animation completes
            setTimeout(() => {
                if (message.release) {
                    message.release();
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
    
    /**
     * Test method to generate a simulated kill message
     * For development/debugging only
     * 
     * @param {boolean} [isHeadshot=false] - Whether to simulate a headshot
     * @param {boolean} [isSpecial=false] - Whether to include a special kill type
     */
    testKillMessage(isHeadshot = false, isSpecial = false) {
        const weapons = ['assault_rifle', 'shotgun', 'blaster', 'pistol', 'sniper', 'melee'];
        const specialTypes = ['REVENGE', 'DOUBLE KILL', 'THROUGH WALL', 'NO SCOPE', 'LONG SHOT'];
        const killers = ['Player', 'SharpShooter', 'Maverick', 'Shadow', 'Ghost'];
        const victims = ['Enemy', 'Grunt', 'Scout', 'Heavy', 'Sniper'];
        
        const data = {
            killer: killers[Math.floor(Math.random() * killers.length)],
            victim: victims[Math.floor(Math.random() * victims.length)],
            weapon: weapons[Math.floor(Math.random() * weapons.length)],
            isHeadshot: isHeadshot,
            specialType: isSpecial ? specialTypes[Math.floor(Math.random() * specialTypes.length)] : null
        };
        
        this.addKillMessage(data);
        
        console.log(`Test kill message: ${data.killer} killed ${data.victim} with ${data.weapon}`, 
            isHeadshot ? '(HEADSHOT)' : '', 
            data.specialType ? `(${data.specialType})` : '');
    }
    
    /**
     * Test method to generate a kill streak
     * For development/debugging only
     * 
     * @param {number} [killCount=3] - Number of kills to simulate
     * @param {string} [playerName='Player'] - Name of the player
     * @param {number} [delay=300] - Delay between kills in ms
     */
    testKillStreak(killCount = 3, playerName = 'Player', delay = 300) {
        const weapons = ['assault_rifle', 'shotgun', 'blaster', 'pistol', 'sniper', 'melee'];
        const victims = ['Enemy', 'Grunt', 'Scout', 'Heavy', 'Sniper'];
        
        // Reset any existing streak
        this._resetStreak();
        
        // Simulate a series of kills
        for (let i = 0; i < killCount; i++) {
            setTimeout(() => {
                const data = {
                    killer: playerName,
                    victim: victims[Math.floor(Math.random() * victims.length)] + '-' + i,
                    weapon: weapons[Math.floor(Math.random() * weapons.length)],
                    isHeadshot: Math.random() > 0.7,
                    specialType: null
                };
                
                this.addKillMessage(data);
                
            }, i * delay);
        }
        
        console.log(`Test kill streak: ${killCount} kills for ${playerName}`);
    }
}
