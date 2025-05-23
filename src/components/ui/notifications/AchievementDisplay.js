/**
 * AchievementDisplay Component
 * 
 * Manages and displays achievement notifications:
 * - Unlocked achievements
 * - Milestone completions
 * - Challenge completions
 * - Reward unlocks
 * 
 * Provides rewarding feedback for player progress with
 * visually distinctive notifications.
 * 
 * @extends UIComponent
 */

import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { EventManager } from '../../../core/EventManager.js';

export class AchievementDisplay extends UIComponent {
    /**
     * Create a new AchievementDisplay
     * 
     * @param {Object} options - Component options
     * @param {number} options.displayDuration - Default display time in ms
     * @param {number} options.fadeDuration - Animation duration in ms
     */
    constructor(options = {}) {
        super({
            autoInit: false,
            id: options.id || 'achievement-display',
            className: 'rift-achievement-container',
            container: options.container || document.body,
            ...options
        });
        
        // Configuration
        this.displayDuration = options.displayDuration || 5000;
        this.fadeDuration = options.fadeDuration || 500;
        
        // Internal state
        this.currentAchievement = null;
        this.queue = [];
        this.activeTimer = null;
        this.isPaused = false;
        this.pauseStartTime = 0;
        this.pausedRemainingTime = 0;
        this.eventSubscriptions = [];
    }
    
    /**
     * Initialize the achievement display
     */
    init() {
        if (!this.element) {
            this._createRootElement();
        }
        
        // Set up event listeners
        this._setupEventListeners();
        
        this.isInitialized = true;
        return this;
    }
    
    /**
     * Set up event listeners for achievements and game state
     * @private
     */
    _setupEventListeners() {
        this.eventSubscriptions.push(
            EventManager.subscribe('achievement:unlocked', this._onAchievementUnlocked.bind(this))
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('game:paused', this.pauseTimers.bind(this))
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('game:resumed', this.resumeTimers.bind(this))
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('challenge:completed', this._onChallengeCompleted.bind(this))
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('item:unlocked', this._onItemUnlocked.bind(this))
        );
    }
    
    /**
     * Show an achievement notification
     * 
     * @param {Object} achievement - Achievement data
     * @param {string} achievement.title - Achievement title
     * @param {string} achievement.description - Achievement description
     * @param {string} achievement.type - Achievement type: 'achievement', 'unlock', 'milestone', 'challenge'
     * @param {string} achievement.iconUrl - Optional URL to achievement icon
     * @param {number} achievement.value - Optional XP or point value
     * @param {Object} achievement.progress - Optional progress data for cumulative achievements
     * @param {number} achievement.progress.current - Current progress value
     * @param {number} achievement.progress.max - Maximum progress value
     * @param {number} achievement.duration - Optional custom display duration
     * @returns {Object} - Achievement notification object
     */
    showAchievement(achievement) {
        // If already showing an achievement, queue this one
        if (this.currentAchievement) {
            this.queue.push(achievement);
            return;
        }
        
        // Create achievement element
        const element = this._createAchievementElement(achievement);
        
        // Add to DOM
        document.body.appendChild(element);
        
        // Track current achievement
        this.currentAchievement = {
            element,
            data: achievement,
            startTime: Date.now(),
            duration: achievement.duration || this.displayDuration
        };
        
        // Show with animation after a brief delay
        setTimeout(() => {
            element.classList.add('rift-achievement--show');
        }, 10);
        
        // Set up auto-dismiss timer
        this.activeTimer = setTimeout(() => {
            this._dismissCurrentAchievement();
        }, this.currentAchievement.duration);
        
        return this.currentAchievement;
    }
    
    /**
     * Update the achievement display
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
        // Clear active timer
        if (this.activeTimer) {
            clearTimeout(this.activeTimer);
            this.activeTimer = null;
        }
        
        // Remove current achievement if exists
        if (this.currentAchievement && this.currentAchievement.element) {
            if (this.currentAchievement.element.parentNode) {
                this.currentAchievement.element.parentNode.removeChild(this.currentAchievement.element);
            }
            this.currentAchievement = null;
        }
        
        // Unsubscribe from events
        this.eventSubscriptions.forEach(subscription => {
            EventManager.unsubscribe(subscription);
        });
        this.eventSubscriptions = [];
        
        // Clear queue
        this.queue = [];
        
        // Call parent dispose
        super.dispose();
        
        return this;
    }
    
    /**
     * Handle achievement:unlocked event
     * @param {Object} event - Standardized achievement event
     * @private
     */
    _onAchievementUnlocked(event) {
        const achievementData = {
            title: event.name || 'Achievement Unlocked',
            description: event.description || '',
            type: 'achievement',
            iconUrl: event.iconUrl || null,
            value: event.value || null,
            progress: event.progress || null,
            duration: event.duration || this.displayDuration
        };
        
        this.showAchievement(achievementData);
        
        // Emit notification
        EventManager.emit('notification:displayed', {
            message: event.name || 'Achievement Unlocked',
            category: 'achievement',
            duration: 5000,
            priority: 2,
            id: `achievement-${event.id || Date.now()}`,
            icon: event.iconUrl
        });
    }
    
    /**
     * Handle challenge:completed event
     * @param {Object} event - Standardized challenge event
     * @private
     */
    _onChallengeCompleted(event) {
        const challengeData = {
            title: event.name || 'Challenge Completed',
            description: event.description || '',
            type: 'challenge',
            iconUrl: event.iconUrl || null,
            value: event.value || null,
            progress: event.progress || null,
            duration: event.duration || this.displayDuration
        };
        
        this.showAchievement(challengeData);
    }
    
    /**
     * Handle item:unlocked event
     * @param {Object} event - Standardized item unlock event
     * @private
     */
    _onItemUnlocked(event) {
        const unlockData = {
            title: event.name || 'Item Unlocked',
            description: event.description || '',
            type: 'unlock',
            iconUrl: event.iconUrl || null,
            value: event.value || null,
            duration: event.duration || this.displayDuration
        };
        
        this.showAchievement(unlockData);
    }
    
    /**
     * Pause achievement timer
     */
    pauseTimers() {
        if (this.isPaused || !this.currentAchievement) return;
        
        this.isPaused = true;
        this.pauseStartTime = Date.now();
        
        // Calculate remaining time
        const elapsedTime = this.pauseStartTime - this.currentAchievement.startTime;
        this.pausedRemainingTime = Math.max(0, this.currentAchievement.duration - elapsedTime);
        
        // Clear the active timer
        if (this.activeTimer) {
            clearTimeout(this.activeTimer);
            this.activeTimer = null;
        }
        
        // Pause any animations
        if (this.currentAchievement.element) {
            const progressBar = this.currentAchievement.element.querySelector('.rift-achievement__progress-fill');
            if (progressBar) {
                progressBar.style.animationPlayState = 'paused';
            }
        }
    }
    
    /**
     * Resume achievement timer after pause
     */
    resumeTimers() {
        if (!this.isPaused || !this.currentAchievement) return;
        
        this.isPaused = false;
        
        // Update start time to account for pause duration
        const pauseDuration = Date.now() - this.pauseStartTime;
        this.currentAchievement.startTime += pauseDuration;
        
        // Set new timer with remaining time
        this.activeTimer = setTimeout(() => {
            this._dismissCurrentAchievement();
        }, this.pausedRemainingTime);
        
        // Resume any animations
        if (this.currentAchievement.element) {
            const progressBar = this.currentAchievement.element.querySelector('.rift-achievement__progress-fill');
            if (progressBar) {
                progressBar.style.animationPlayState = 'running';
            }
        }
        
        this.pausedRemainingTime = 0;
    }
    
    /**
     * Dismiss the current achievement immediately
     * 
     * @returns {Object} - The achievement that was dismissed
     */
    dismissCurrent() {
        return this._dismissCurrentAchievement(true);
    }
    
    /**
     * Create an achievement notification DOM element
     * 
     * @private
     * @param {Object} achievement - Achievement data
     * @returns {HTMLElement} - Achievement DOM element
     */
    _createAchievementElement(achievement) {
        // Determine achievement type class
        let typeClass = '';
        switch (achievement.type) {
            case 'unlock':
                typeClass = 'rift-achievement--unlock';
                break;
            case 'milestone':
                typeClass = 'rift-achievement--milestone';
                break;
            case 'challenge':
                typeClass = 'rift-achievement--challenge';
                break;
            default:
                typeClass = ''; // Default achievement type
        }
        
        // Create main container
        const container = DOMFactory.createElement({
            type: 'div',
            classes: ['rift-achievement', typeClass]
        });
        
        // Create icon container
        const iconContainer = DOMFactory.createElement({
            type: 'div',
            classes: ['rift-achievement__icon']
        });
        
        // Add icon image if provided
        if (achievement.iconUrl) {
            const iconImage = DOMFactory.createElement({
                type: 'img',
                classes: ['rift-achievement__icon-image'],
                attributes: {
                    src: achievement.iconUrl,
                    alt: achievement.title || 'Achievement'
                }
            });
            iconContainer.appendChild(iconImage);
        }
        
        container.appendChild(iconContainer);
        
        // Create content container
        const content = DOMFactory.createElement({
            type: 'div',
            classes: ['rift-achievement__content']
        });
        
        // Create header with title and optional value
        const header = DOMFactory.createElement({
            type: 'div',
            classes: ['rift-achievement__header']
        });
        
        // Achievement label (e.g., "ACHIEVEMENT UNLOCKED")
        const typeLabel = this._getTypeLabel(achievement.type);
        const label = DOMFactory.createElement({
            type: 'div',
            classes: ['rift-achievement__label'],
            text: typeLabel
        });
        header.appendChild(label);
        
        // Add value if provided (e.g., "+500 XP")
        if (achievement.value) {
            const value = DOMFactory.createElement({
                type: 'div',
                classes: ['rift-achievement__value'],
                text: `+${achievement.value}`
            });
            header.appendChild(value);
        }
        
        content.appendChild(header);
        
        // Achievement title
        const title = DOMFactory.createElement({
            type: 'h3',
            classes: ['rift-achievement__title'],
            text: achievement.title
        });
        content.appendChild(title);
        
        // Achievement description
        if (achievement.description) {
            const description = DOMFactory.createElement({
                type: 'p',
                classes: ['rift-achievement__description'],
                text: achievement.description
            });
            content.appendChild(description);
        }
        
        // Add progress bar if provided
        if (achievement.progress) {
            const progressContainer = DOMFactory.createElement({
                type: 'div',
                classes: ['rift-achievement__progress']
            });
            
            // Progress label
            const progressLabel = DOMFactory.createElement({
                type: 'div',
                classes: ['rift-achievement__progress-label']
            });
            
            // Progress text (e.g., "Progress")
            const progressText = DOMFactory.createElement({
                type: 'span',
                text: 'Progress'
            });
            progressLabel.appendChild(progressText);
            
            // Progress value (e.g., "8/10")
            const progressValue = DOMFactory.createElement({
                type: 'span',
                text: `${achievement.progress.current}/${achievement.progress.max}`
            });
            progressLabel.appendChild(progressValue);
            
            progressContainer.appendChild(progressLabel);
            
            // Progress bar
            const progressBar = DOMFactory.createElement({
                type: 'div',
                classes: ['rift-achievement__progress-bar']
            });
            
            // Progress fill
            const progressPercentage = Math.min(100, (achievement.progress.current / achievement.progress.max) * 100);
            const progressFill = DOMFactory.createElement({
                type: 'div',
                classes: ['rift-achievement__progress-fill'],
                styles: {
                    width: `${progressPercentage}%`
                }
            });
            
            progressBar.appendChild(progressFill);
            progressContainer.appendChild(progressBar);
            
            content.appendChild(progressContainer);
        }
        
        container.appendChild(content);
        
        // Add dismiss button
        const dismissBtn = DOMFactory.createElement({
            type: 'div',
            classes: ['rift-achievement__dismiss']
        });
        
        // Add "X" to dismiss button
        dismissBtn.innerHTML = '&times;';
        
        // Add click handler
        dismissBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dismissCurrent();
        });
        
        container.appendChild(dismissBtn);
        
        return container;
    }
    
    /**
     * Get the appropriate label for an achievement type
     * 
     * @private
     * @param {string} type - Achievement type
     * @returns {string} - Formatted label text
     */
    _getTypeLabel(type) {
        switch (type) {
            case 'unlock':
                return 'ITEM UNLOCKED';
            case 'milestone':
                return 'MILESTONE REACHED';
            case 'challenge':
                return 'CHALLENGE COMPLETED';
            default:
                return 'ACHIEVEMENT UNLOCKED';
        }
    }
    
    /**
     * Dismiss the current achievement and show the next in queue
     * 
     * @private
     * @param {boolean} immediate - Whether to skip exit animation
     * @returns {Object} - The achievement that was dismissed
     */
    _dismissCurrentAchievement(immediate = false) {
        if (!this.currentAchievement) return null;
        
        // Clear active timer
        if (this.activeTimer) {
            clearTimeout(this.activeTimer);
            this.activeTimer = null;
        }
        
        const dismissed = this.currentAchievement;
        
        if (immediate) {
            // Remove immediately
            if (dismissed.element.parentNode) {
                dismissed.element.parentNode.removeChild(dismissed.element);
            }
            this.currentAchievement = null;
            
            // Show next achievement if any
            this._showNextAchievementInQueue();
        } else {
            // Hide with animation
            dismissed.element.classList.remove('rift-achievement--show');
            
            // Remove after animation
            setTimeout(() => {
                if (dismissed.element.parentNode) {
                    dismissed.element.parentNode.removeChild(dismissed.element);
                }
                this.currentAchievement = null;
                
                // Show next achievement if any
                this._showNextAchievementInQueue();
            }, this.fadeDuration);
        }
        
        return dismissed;
    }
    
    /**
     * Show the next achievement in the queue if any
     * 
     * @private
     */
    _showNextAchievementInQueue() {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            setTimeout(() => {
                this.showAchievement(next);
            }, 500); // Small delay between achievements
        }
    }
}
