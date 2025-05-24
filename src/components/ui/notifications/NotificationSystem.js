/**
 * NotificationSystem Component
 *
 * Coordinates all notification-related UI components:
 * - Notification Manager (general notifications)
 * - Kill Feed (kill events)
 * - Event Banners (major game events)
 * - Achievements (player accomplishments)
 * 
 * Acts as a central manager for notifications, similar to how
 * HUDSystem manages HUD components and CombatSystem manages combat feedback.
 *
 * @extends UIComponent
 */

import UIComponent from '../UIComponent.js';
import { NotificationManager } from './NotificationManager.js';
import { KillFeed } from './KillFeed.js';
import { EventManager } from '../../../core/EventManager.js';

class NotificationSystem extends UIComponent {
    /**
     * Create a new NotificationSystem component
     * 
     * @param {Object} world - The game world object
     * @param {Object} options - Component configuration options
     */
    constructor(world, options = {}) {
        super({
            id: options.id || 'notification-system',
            className: 'rift-notification-system',
            container: options.container || document.body,
            autoInit: false, // Prevent auto-init to control initialization order
            ...options
        });

        this.world = world;
        this.config = this.config.notifications || {};
        this.useExistingElements = options.useExistingElements || false;
        this.existingElements = options.existingElements || {};

        // Component references
        this.notificationManager = null;
        this.killFeed = null;
        this.eventBanner = null;
        this.achievementDisplay = null;
        
        // Initialize immediately to prevent timing issues
        this.init();
    }

    /**
     * Initialize the notification system component and all subcomponents
     */
    init() {
        if (this.isInitialized) return this;
        
        console.log('[NotificationSystem] Initializing...');
        
        // Call parent init first
        super.init();
        
        // Set initialized flag early to prevent infinite recursion
        this.isInitialized = true;
        
        // Initialize components with error handling
        this._initComponents();
        
        // Register event handlers with standardized event names
        this.registerEvents({
            'game:paused': this._onGamePaused.bind(this),
            'game:resumed': this._onGameResumed.bind(this),
            'enemy:killed': this._onEnemyKilled.bind(this),
            'player:died': this._onPlayerDied.bind(this),
            'notification:displayed': this._onNotificationRequest.bind(this),
            'objective:completed': this._onObjectiveCompleted.bind(this),
            'objective:failed': this._onObjectiveFailed.bind(this),
            'round:end': this._onRoundEnd.bind(this),
            'player:levelup': this._onPlayerLevelUp.bind(this),
            'kill:confirmed': this._onKillConfirmed.bind(this)
        });
        
        console.log('[NotificationSystem] Initialized successfully');
        
        return this;
    }

    /**
     * Update the notification system and all subcomponents
     * 
     * @param {number} delta - Time since last update in ms
     */
    update(delta) {
        if (!this.isActive || !this.isVisible) return;

        // Update components
        if (this.notificationManager && typeof this.notificationManager.update === 'function') {
            this.notificationManager.update(delta);
        }
        if (this.killFeed && typeof this.killFeed.update === 'function') {
            this.killFeed.update(delta);
        }
        if (this.eventBanner && typeof this.eventBanner.update === 'function') {
            this.eventBanner.update(delta);
        }
        if (this.achievementDisplay && typeof this.achievementDisplay.update === 'function') {
            this.achievementDisplay.update(delta);
        }
        
        return this;
    }

    /**
     * Update the size of notification system components
     * 
     * @param {number} width - New width in pixels
     * @param {number} height - New height in pixels
     */
    setSize(width, height) {
        // Pass size updates to any components that need it
        if (this.notificationManager && this.notificationManager.setSize) {
            this.notificationManager.setSize(width, height);
        }
        
        if (this.killFeed && this.killFeed.setSize) {
            this.killFeed.setSize(width, height);
        }
        
        if (this.eventBanner && this.eventBanner.setSize) {
            this.eventBanner.setSize(width, height);
        }
        
        if (this.achievementDisplay && this.achievementDisplay.setSize) {
            this.achievementDisplay.setSize(width, height);
        }
        
        return this;
    }

    /**
     * Clean up resources when disposing the component
     */
    dispose() {
        console.log('[NotificationSystem] Disposing...');
        
        // Dispose children first
        if (this.notificationManager && typeof this.notificationManager.dispose === 'function') {
            this.notificationManager.dispose();
        }
        if (this.killFeed && typeof this.killFeed.dispose === 'function') {
            this.killFeed.dispose();
        }
        if (this.eventBanner && typeof this.eventBanner.dispose === 'function') {
            this.eventBanner.dispose();
        }
        if (this.achievementDisplay && typeof this.achievementDisplay.dispose === 'function') {
            this.achievementDisplay.dispose();
        }
        
        // Call parent dispose method to handle unsubscribing events and DOM removal
        super.dispose();
        
        return this;
    }

    /**
     * Initialize notification components
     * @private
     */
    _initComponents() {
        try {
            // Create Notification Manager
            console.log('[NotificationSystem] Creating NotificationManager...');
            this.notificationManager = new NotificationManager({
                container: this.element,
                displayDuration: this.config.displayDuration || 4000,
                fadeDuration: this.config.fadeDuration || 500,
                cooldown: this.config.cooldown || 500,
                spacingDelay: this.config.spacingDelay || 500,
                maxNotifications: this.config.maxNotifications || 5
            });
            this.addChild(this.notificationManager);
            console.log('[NotificationSystem] NotificationManager created successfully');
        } catch (error) {
            console.error('[NotificationSystem] Error creating NotificationManager:', error);
        }
        
        try {
            // Create Kill Feed
            console.log('[NotificationSystem] Creating KillFeed...');
            this.killFeed = new KillFeed({
                container: this.element,
                messageDuration: this.config.killFeedDuration || 6000,
                fadeDuration: this.config.fadeDuration || 500,
                maxMessages: this.config.maxKillMessages || 10,
                streakMinimum: this.config.killStreakMinimum || 3
            });
            this.addChild(this.killFeed);
            console.log('[NotificationSystem] KillFeed created successfully');
        } catch (error) {
            console.error('[NotificationSystem] Error creating KillFeed:', error);
        }
        
        // Create placeholder event banner (using a simple div for now)
        try {
            console.log('[NotificationSystem] Creating EventBanner placeholder...');
            this.eventBanner = {
                showBanner: (text, type, options) => {
                    console.log(`[EventBanner] ${type}: ${text}`, options);
                    // Use notification manager as fallback
                    if (this.notificationManager) {
                        this.notificationManager.addNotification(text, type === 'objective' ? 'info' : type, {
                            title: options?.title,
                            duration: options?.duration
                        });
                    }
                },
                showRoundOutcome: (outcome, subtitle) => {
                    console.log(`[EventBanner] Round ${outcome}: ${subtitle}`);
                    if (this.notificationManager) {
                        const type = outcome === 'victory' ? 'success' : outcome === 'defeat' ? 'error' : 'info';
                        this.notificationManager.addNotification(subtitle || `Round ${outcome}`, type, {
                            title: outcome.charAt(0).toUpperCase() + outcome.slice(1),
                            duration: 5000
                        });
                    }
                },
                update: () => {},
                dispose: () => {}
            };
            console.log('[NotificationSystem] EventBanner placeholder created');
        } catch (error) {
            console.error('[NotificationSystem] Error creating EventBanner:', error);
        }
        
        // Create placeholder achievement display
        try {
            console.log('[NotificationSystem] Creating AchievementDisplay placeholder...');
            this.achievementDisplay = {
                showAchievement: (achievement) => {
                    console.log(`[AchievementDisplay] ${achievement.title}: ${achievement.description}`);
                    if (this.notificationManager) {
                        this.notificationManager.addNotification(achievement.description, 'success', {
                            title: achievement.title,
                            duration: 6000
                        });
                    }
                },
                update: () => {},
                dispose: () => {}
            };
            console.log('[NotificationSystem] AchievementDisplay placeholder created');
        } catch (error) {
            console.error('[NotificationSystem] Error creating AchievementDisplay:', error);
        }
    }

    /**
     * Handle game:paused event
     * @param {Object} event - Standardized event object
     * @private
     */
    _onGamePaused(event) {
        // Pause any animations or timers for notifications
        if (this.notificationManager && this.notificationManager.pauseTimers) {
            this.notificationManager.pauseTimers();
        }
        if (this.killFeed && this.killFeed.pauseTimers) {
            this.killFeed.pauseTimers();
        }
    }

    /**
     * Handle game:resumed event
     * @param {Object} event - Standardized event object
     * @private
     */
    _onGameResumed(event) {
        // Resume animations and timers for notifications
        if (this.notificationManager && this.notificationManager.resumeTimers) {
            this.notificationManager.resumeTimers();
        }
        if (this.killFeed && this.killFeed.resumeTimers) {
            this.killFeed.resumeTimers();
        }
    }
    
    /**
     * Handle enemy:killed event
     * @param {Object} event - Standardized combat event
     * @private
     */
    _onEnemyKilled(event) {
        console.log('[NotificationSystem] Enemy killed event:', event);
        
        // Format kill message for KillFeed
        const killData = {
            killer: event.source?.name || 'Player',
            victim: event.target?.name || 'Enemy',
            weapon: event.weapon?.type || 'weapon',
            isHeadshot: event.isHeadshot || false,
            isCritical: event.isCritical || false,
            specialType: event.specialType || null
        };
        
        // Add to kill feed
        this.addKillMessage(killData);
        
        // Check for kill streaks
        if (event.killStreak) {
            this.showKillStreak(
                killData.killer,
                this._getStreakType(event.killStreak.count),
                event.killStreak.count
            );
        }
    }
    
    /**
     * Handle kill:confirmed event (alternative event name)
     * @param {Object} event - Standardized kill event
     * @private
     */
    _onKillConfirmed(event) {
        console.log('[NotificationSystem] Kill confirmed event:', event);
        this._onEnemyKilled(event);
    }
    
    /**
     * Handle player:died event
     * @param {Object} event - Standardized player death event
     * @private
     */
    _onPlayerDied(event) {
        // Show death notification
        const options = {
            title: 'You Died',
            icon: 'skull',
            priority: 3
        };
        
        // Show relevant message based on death cause
        let message = 'You have been eliminated';
        let type = 'error';
        
        if (event.source) {
            if (event.source.type === 'enemy') {
                message = `Killed by ${event.source.name || 'Enemy'}`;
            } else if (event.source.type === 'environment') {
                message = `Killed by ${event.source.name || 'the environment'}`;
            }
        }
        
        this.addNotification(message, type, options);
    }
    
    /**
     * Handle notification:displayed event
     * @param {Object} event - Standardized notification event
     * @private
     */
    _onNotificationRequest(event) {
        this.addNotification(
            event.message, 
            event.category || 'info', 
            {
                title: event.title || '',
                icon: event.icon || null,
                duration: event.duration || null,
                priority: event.priority || 1,
                id: event.id || null
            }
        );
    }
    
    /**
     * Handle objective:completed event
     * @param {Object} event - Standardized objective event
     * @private
     */
    _onObjectiveCompleted(event) {
        // Show objective completion banner
        this.showBanner(
            event.name || 'Objective Complete', 
            'objective',
            {
                title: 'Objective Completed',
                subtitle: event.description || '',
                duration: event.duration || 4000
            }
        );
    }
    
    /**
     * Handle objective:failed event
     * @param {Object} event - Standardized objective event
     * @private
     */
    _onObjectiveFailed(event) {
        // Show objective failed banner
        this.showBanner(
            event.name || 'Objective Failed', 
            'danger',
            {
                title: 'Objective Failed',
                subtitle: event.description || '',
                duration: event.duration || 4000
            }
        );
    }
    
    /**
     * Handle round:end event
     * @param {Object} event - Standardized round event
     * @private
     */
    _onRoundEnd(event) {
        if (event.outcome) {
            this.showRoundOutcome(event.outcome, event.message || '');
        }
    }
    
    /**
     * Handle player:levelup event
     * @param {Object} event - Standardized player level event
     * @private
     */
    _onPlayerLevelUp(event) {
        // Show level up notification
        this.showBanner(
            `Level ${event.level || 'Up'}`, 
            'success',
            {
                title: 'Level Up',
                subtitle: event.message || 'You have reached a new level!',
                duration: 5000
            }
        );
        
        // Show achievements if any
        if (event.rewards && event.rewards.length > 0) {
            event.rewards.forEach(reward => {
                if (reward.type === 'achievement') {
                    const achievementData = {
                        title: reward.name || 'Achievement Unlocked',
                        description: reward.description || '',
                        type: 'achievement',
                        value: reward.value || null,
                        iconUrl: reward.iconUrl || null
                    };
                    this.showAchievement(achievementData);
                }
            });
        }
    }
    
    /**
     * Get streak type based on kill count
     * @param {number} kills - Kill count
     * @returns {string} - Streak type descriptor
     * @private
     */
    _getStreakType(kills) {
        if (kills >= 10) return 'unstoppable';
        if (kills >= 8) return 'dominating';
        if (kills >= 5) return 'rampage';
        if (kills >= 3) return 'killing-spree';
        return 'streak';
    }

    /**
     * Add a notification
     * @public
     * @param {string} text - Notification text
     * @param {string} type - Notification type: 'info', 'success', 'warning', 'error'
     * @param {object} options - Additional notification options
     */
    addNotification(text, type = 'info', options = {}) {
        console.log(`[NotificationSystem] Adding notification: ${type} - ${text}`);
        if (this.notificationManager && typeof this.notificationManager.addNotification === 'function') {
            this.notificationManager.addNotification(text, type, options);
        } else {
            console.warn('[NotificationSystem] NotificationManager not available:', text);
        }
    }

    /**
     * Add a kill feed message
     * @public
     * @param {object} data - Kill data including killer, victim, weapon, etc.
     */
    addKillMessage(data) {
        console.log(`[NotificationSystem] Adding kill message:`, data);
        if (this.killFeed && typeof this.killFeed.addKillMessage === 'function') {
            this.killFeed.addKillMessage(data);
        } else {
            console.warn('[NotificationSystem] KillFeed not available, using notification fallback');
            // Fallback to notification
            this.addNotification(`${data.killer} eliminated ${data.victim}${data.isHeadshot ? ' (Headshot)' : ''}`, 'info', {
                title: 'Elimination',
                duration: 3000
            });
        }
    }

    /**
     * Show a kill streak notification
     * @public
     * @param {string} playerName - Name of the player with the streak
     * @param {string} streakType - Type of streak (e.g., 'killing-spree', 'rampage')
     * @param {number} kills - Number of kills in the streak
     */
    showKillStreak(playerName, streakType, kills) {
        console.log(`[NotificationSystem] Kill streak: ${playerName} - ${streakType} (${kills})`);
        if (this.killFeed && typeof this.killFeed.addKillStreak === 'function') {
            this.killFeed.addKillStreak({
                player: playerName,
                streakType: streakType,
                killCount: kills
            });
        } else {
            // Fallback to notification
            this.addNotification(`${playerName} ${this._getStreakText(kills)}!`, 'success', {
                title: 'Kill Streak',
                duration: 4000
            });
        }
    }

    /**
     * Show an event banner
     * @public
     * @param {string} text - Banner text
     * @param {string} type - Banner type: 'default', 'objective', 'alert', 'success', 'danger'
     * @param {object} options - Additional options (title, subtitle, duration)
     */
    showBanner(text, type = 'default', options = {}) {
        console.log(`[NotificationSystem] Showing banner: ${type} - ${text}`);
        if (this.eventBanner && typeof this.eventBanner.showBanner === 'function') {
            this.eventBanner.showBanner(text, type, options);
        } else {
            console.warn('[NotificationSystem] EventBanner not available, using notification fallback');
        }
    }

    /**
     * Show a match event banner (legacy method for compatibility with UIManager)
     * @public
     * @param {string} text - Banner text
     * @param {string} className - CSS class for styling
     */
    showMatchEvent(text, className = '') {
        const type = this._mapClassNameToType(className);
        this.showBanner(text, type);
    }

    /**
     * Show a round outcome banner (victory, defeat, draw)
     * @public
     * @param {string} outcome - The outcome: 'victory', 'defeat', or 'draw'
     * @param {string} subtitle - Optional subtitle text
     */
    showRoundOutcome(outcome, subtitle = '') {
        console.log(`[NotificationSystem] Round outcome: ${outcome} - ${subtitle}`);
        if (this.eventBanner && typeof this.eventBanner.showRoundOutcome === 'function') {
            this.eventBanner.showRoundOutcome(outcome, subtitle);
        } else {
            console.warn('[NotificationSystem] EventBanner not available for round outcome');
        }
    }

    /**
     * Show an achievement
     * @public
     * @param {object} achievement - Achievement data object
     * @param {string} achievement.title - Achievement title
     * @param {string} achievement.description - Achievement description
     * @param {string} achievement.type - Achievement type: 'achievement', 'unlock', 'milestone', 'challenge'
     * @param {string} achievement.iconUrl - Optional URL to achievement icon
     * @param {number} achievement.value - Optional XP or point value
     * @param {object} achievement.progress - Optional progress data for cumulative achievements
     */
    showAchievement(achievement) {
        console.log(`[NotificationSystem] Achievement: ${achievement.title}`, achievement);
        if (this.achievementDisplay && typeof this.achievementDisplay.showAchievement === 'function') {
            this.achievementDisplay.showAchievement(achievement);
        } else {
            console.warn('[NotificationSystem] AchievementDisplay not available, using notification fallback');
        }
    }
    
    /**
     * Helper method to map CSS class names to banner types
     * @private
     * @param {string} className - CSS class name
     * @returns {string} - Banner type
     */
    _mapClassNameToType(className) {
        if (className.includes('objective')) return 'objective';
        if (className.includes('alert')) return 'alert';
        if (className.includes('success')) return 'success';
        if (className.includes('danger')) return 'danger';
        return 'default';
    }
    
    /**
     * Get streak text based on kill count (for fallback)
     * @private
     * @param {number} killCount - Number of kills
     * @returns {string} - Streak description text
     */
    _getStreakText(killCount) {
        if (killCount >= 15) return 'is godlike';
        if (killCount >= 10) return 'is unstoppable';
        if (killCount >= 7) return 'is on a rampage';
        if (killCount >= 5) return 'is dominating';
        if (killCount >= 3) return 'is on a killing spree';
        return 'is on a streak';
    }
    
    /**
     * Test method to show sample notifications
     * For development/debugging only
     * @public
     * @param {string} type - Type of notification to test
     */
    testNotification(type = 'info') {
        console.log(`[NotificationSystem] Testing notification: ${type}`);
        
        switch (type) {
            case 'info':
                this.addNotification('Test notification message', 'info', { title: 'Info' });
                break;
            case 'success':
                this.addNotification('Mission completed successfully', 'success', { title: 'Success' });
                break;
            case 'warning':
                this.addNotification('Low ammunition, find ammo soon', 'warning', { title: 'Warning' });
                break;
            case 'error':
                this.addNotification('Connection interrupted', 'error', { title: 'Error' });
                break;
            case 'kill':
                this.addKillMessage({
                    killer: 'Player1',
                    victim: 'Enemy42',
                    weapon: 'shotgun',
                    isHeadshot: Math.random() > 0.5
                });
                break;
            case 'streak':
                this.showKillStreak('Player1', 'killing-spree', 5);
                break;
            case 'banner':
                this.showBanner('New Objective', 'objective', {
                    title: 'Mission Update',
                    subtitle: 'Reach the extraction point'
                });
                break;
            case 'victory':
                this.showRoundOutcome('victory', 'Mission completed in record time');
                break;
            case 'achievement':
                this.showAchievement({
                    title: 'Sharpshooter',
                    description: 'Hit 10 consecutive headshots',
                    type: 'achievement',
                    value: 500,
                    iconUrl: 'assets/icons/achievement_headshot.png'
                });
                break;
            default:
                this.addNotification('Test notification message', 'info');
                break;
        }
    }
}

export { NotificationSystem };
