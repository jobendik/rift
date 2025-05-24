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
import { EnhancedNotificationManager } from './EnhancedNotificationManager.js';
import { EnhancedKillFeed } from './EnhancedKillFeed.js';
import { EnhancedEventBanner } from './EnhancedEventBanner.js';
import { EnhancedAchievementDisplay } from './EnhancedAchievementDisplay.js';
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

        // Component references
        this.notificationManager = null;
        this.killFeed = null;
        this.eventBanner = null;
        this.achievementDisplay = null;
    }

    /**
     * Initialize the notification system component and all subcomponents
     */
    init() {
        if (this.isInitialized) return this;
        
        // Call parent init first
        super.init();
        
        // Set initialized flag early to prevent infinite recursion
        this.isInitialized = true;
        
        // Initialize components
        this._initComponents();
        
        // Register event handlers with standardized event names
        this.registerEvents({
            'game:paused': this._onGamePaused.bind(this),
            'game:resumed': this._onGameResumed.bind(this),
            'enemy:killed': this._onEnemyKilled.bind(this),
            'player:died': this._onPlayerDied.bind(this),
            'notification:request': this._onNotificationRequest.bind(this),
            'objective:completed': this._onObjectiveCompleted.bind(this),
            'objective:failed': this._onObjectiveFailed.bind(this),
            'round:end': this._onRoundEnd.bind(this),
            'player:levelup': this._onPlayerLevelUp.bind(this)
        });
        
        return this;
    }

    /**
     * Update the notification system and all subcomponents
     * 
     * @param {number} delta - Time since last update in ms
     */
    update(delta) {
        if (!this.isActive || !this.isVisible || !this.world) return;

        // Update components
        if (this.notificationManager) this.notificationManager.update(delta);
        if (this.killFeed) this.killFeed.update(delta);
        if (this.eventBanner) this.eventBanner.update(delta);
        if (this.achievementDisplay) this.achievementDisplay.update(delta);
        
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
        // Dispose children first
        if (this.notificationManager) this.notificationManager.dispose();
        if (this.killFeed) this.killFeed.dispose();
        if (this.eventBanner) this.eventBanner.dispose();
        if (this.achievementDisplay) this.achievementDisplay.dispose();
        
        // Call parent dispose method to handle unsubscribing events and DOM removal
        super.dispose();
        
        return this;
    }

    /**
     * Initialize notification components
     * @private
     */
    _initComponents() {
        // Create Enhanced Notification Manager with element pooling for better performance
        this.notificationManager = new EnhancedNotificationManager({
            container: this.element,
            displayDuration: this.config.displayDuration || 4000,
            fadeDuration: this.config.fadeDuration || 500,
            cooldown: this.config.cooldown || 500,
            spacingDelay: this.config.spacingDelay || 500,
            maxNotifications: this.config.maxNotifications || 5
        });
        this.notificationManager.init();
        this.addChild(this.notificationManager);
        
        // Create Enhanced Kill Feed with element pooling for better performance
        this.killFeed = new EnhancedKillFeed({
            container: this.element,
            displayDuration: this.config.killFeedDuration || 5000,
            fadeDuration: this.config.fadeDuration || 500,
            maxMessages: this.config.maxKillMessages || 5,
            streakTimeout: this.config.killStreakTimeout || 10000
        });
        this.killFeed.init();
        this.addChild(this.killFeed);
        
        // Create Enhanced Event Banner with element pooling for better performance
        const eventConfig = this.config.events || {};
        this.eventBanner = new EnhancedEventBanner({
            container: this.element,
            displayDuration: eventConfig.displayDuration || 3000,
            fadeDuration: eventConfig.fadeDuration || 1000,
            poolSize: eventConfig.poolSize || 10,
            maxPoolSize: eventConfig.maxPoolSize || 30
        });
        this.eventBanner.init();
        this.addChild(this.eventBanner);
        
        // Create Enhanced Achievement Display with element pooling for better performance
        const achievementConfig = this.config.achievements || {};
        this.achievementDisplay = new EnhancedAchievementDisplay({
            container: this.element,
            displayDuration: this.config.achievementDuration || 5000,
            fadeDuration: this.config.fadeDuration || 500,
            initialPoolSize: achievementConfig.initialPoolSize || 5,
            maxPoolSize: achievementConfig.maxPoolSize || 20
        });
        this.achievementDisplay.init();
        this.addChild(this.achievementDisplay);
    }

    /**
     * Handle game:paused event
     * @param {Object} event - Standardized event object
     * @private
     */
    _onGamePaused(event) {
        // Pause any animations or timers for notifications
        if (this.notificationManager) this.notificationManager.pauseTimers();
        if (this.killFeed) this.killFeed.pauseTimers();
        if (this.eventBanner) this.eventBanner.pauseTimers();
        if (this.achievementDisplay) this.achievementDisplay.pauseTimers();
    }

    /**
     * Handle game:resumed event
     * @param {Object} event - Standardized event object
     * @private
     */
    _onGameResumed(event) {
        // Resume animations and timers for notifications
        if (this.notificationManager) this.notificationManager.resumeTimers();
        if (this.killFeed) this.killFeed.resumeTimers();
        if (this.eventBanner) this.eventBanner.resumeTimers();
        if (this.achievementDisplay) this.achievementDisplay.resumeTimers();
    }
    
    /**
     * Handle enemy:killed event
     * @param {Object} event - Standardized combat event
     * @private
     */
    _onEnemyKilled(event) {
        // Format kill message for KillFeed
        const killData = {
            killer: event.source?.name || 'Player',
            victim: event.target?.name || 'Enemy',
            weapon: event.weapon?.type || 'weapon',
            isHeadshot: event.isHeadshot || false,
            isCritical: event.isCritical || false
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
     * Handle notification:request event
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
        if (this.notificationManager) {
            this.notificationManager.addNotification(text, type, options);
        }
    }

    /**
     * Add a kill feed message
     * @public
     * @param {object} data - Kill data including killer, victim, weapon, etc.
     */
    addKillMessage(data) {
        if (this.killFeed) {
            this.killFeed.addKillMessage(data);
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
        if (this.killFeed) {
            this.killFeed.showKillStreak(playerName, streakType, kills);
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
        if (this.eventBanner) {
            this.eventBanner.showBanner(text, type, options);
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
        if (this.eventBanner) {
            this.eventBanner.showRoundOutcome(outcome, subtitle);
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
        if (this.achievementDisplay) {
            this.achievementDisplay.showAchievement(achievement);
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
     * Test method to show sample notifications
     * For development/debugging only
     * @public
     * @param {string} type - Type of notification to test
     */
    testNotification(type = 'info') {
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
