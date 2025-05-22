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
import { EventBanner } from './EventBanner.js';
import { AchievementDisplay } from './AchievementDisplay.js';

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
        
        // Register event handlers
        this.registerEvents({
            'game:paused': () => this._onGamePaused(),
            'game:resumed': () => this._onGameResumed()
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
        // Create Notification Manager
        this.notificationManager = new NotificationManager({
            container: this.element,
            displayDuration: this.config.displayDuration || 4000,
            fadeDuration: this.config.fadeDuration || 500,
            cooldown: this.config.cooldown || 500,
            spacingDelay: this.config.spacingDelay || 500
        });
        this.notificationManager.init();
        this.addChild(this.notificationManager);
        
        // Create Kill Feed
        this.killFeed = new KillFeed({
            container: this.element,
            displayDuration: this.config.killFeedDuration || 5000,
            fadeDuration: this.config.fadeDuration || 500,
            maxMessages: this.config.maxKillMessages || 5,
            streakTimeout: this.config.killStreakTimeout || 10000
        });
        this.killFeed.init();
        this.addChild(this.killFeed);
        
        // Create Event Banner
        const eventConfig = this.config.events || {};
        this.eventBanner = new EventBanner({
            container: this.element,
            displayDuration: eventConfig.displayDuration || 3000,
            fadeDuration: eventConfig.fadeDuration || 1000
        });
        this.eventBanner.init();
        this.addChild(this.eventBanner);
        
        // Create Achievement Display
        this.achievementDisplay = new AchievementDisplay({
            container: this.element,
            displayDuration: this.config.achievementDuration || 5000,
            fadeDuration: this.config.fadeDuration || 500
        });
        this.achievementDisplay.init();
        this.addChild(this.achievementDisplay);
    }

    /**
     * Handle game paused event
     * @private
     */
    _onGamePaused() {
        // Pause any animations or timers for notifications
        if (this.notificationManager) this.notificationManager.pauseTimers();
        if (this.killFeed) this.killFeed.pauseTimers();
        if (this.eventBanner) this.eventBanner.pauseTimers();
        if (this.achievementDisplay) this.achievementDisplay.pauseTimers();
    }

    /**
     * Handle game resumed event
     * @private
     */
    _onGameResumed() {
        // Resume animations and timers for notifications
        if (this.notificationManager) this.notificationManager.resumeTimers();
        if (this.killFeed) this.killFeed.resumeTimers();
        if (this.eventBanner) this.eventBanner.resumeTimers();
        if (this.achievementDisplay) this.achievementDisplay.resumeTimers();
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