/**
 * EnhancedAchievementDisplay Component
 * 
 * Manages and displays achievement notifications with optimized DOM operations:
 * - Uses ElementPool for efficient element reuse
 * - Reduced garbage collection from frequent achievement displays
 * - Optimized animation transitions
 * - Improved performance for multiple achievement triggers
 * 
 * @extends UIComponent
 */

import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { EventManager } from '../../../core/EventManager.js';
import { ElementPool } from '../../../utils/ElementPool.js';

export class EnhancedAchievementDisplay extends UIComponent {
    /**
     * Create a new EnhancedAchievementDisplay
     * 
     * @param {Object} options - Component options
     * @param {number} options.displayDuration - Default display time in ms
     * @param {number} options.fadeDuration - Animation duration in ms
     * @param {number} options.initialPoolSize - Initial number of elements to pre-create
     * @param {number} options.maxPoolSize - Maximum number of elements the pool can grow to
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
        this.initialPoolSize = options.initialPoolSize || 5;
        this.maxPoolSize = options.maxPoolSize || 20;
        
        // Internal state
        this.currentAchievement = null;
        this.queue = [];
        this.activeAchievements = []; // Track active achievements with release functions
        this.activeTimer = null;
        this.isPaused = false;
        this.pauseStartTime = 0;
        this.pausedRemainingTime = 0;
        this.eventSubscriptions = [];
        this.elementPool = null;
    }
    
    /**
     * Initialize the achievement display and element pool
     */
    init() {
        if (!this.element) {
            this._createRootElement();
        }
        
        // Initialize element pool
        this._initializeElementPool();
        
        // Set up event listeners
        this._setupEventListeners();
        
        this.isInitialized = true;
        return this;
    }
    
    /**
     * Initialize element pool for achievement elements
     * @private
     */
    _initializeElementPool() {
        this.elementPool = new ElementPool({
            elementType: 'div',
            className: 'rift-achievement',
            container: this.element,
            initialSize: this.initialPoolSize,
            maxSize: this.maxPoolSize,
            useBlocks: true,
            blockSize: 5,
            createFn: () => {
                // Create base achievement element structure that will be reused
                const container = document.createElement('div');
                container.className = 'rift-achievement';
                
                // These are the parts that will always be needed
                const iconContainer = document.createElement('div');
                iconContainer.className = 'rift-achievement__icon';
                container.appendChild(iconContainer);
                
                const content = document.createElement('div');
                content.className = 'rift-achievement__content';
                container.appendChild(content);
                
                // Header area
                const header = document.createElement('div');
                header.className = 'rift-achievement__header';
                content.appendChild(header);
                
                // Label for type
                const label = document.createElement('div');
                label.className = 'rift-achievement__label';
                header.appendChild(label);
                
                // Title
                const title = document.createElement('h3');
                title.className = 'rift-achievement__title';
                content.appendChild(title);
                
                // Dismiss button
                const dismissBtn = document.createElement('div');
                dismissBtn.className = 'rift-achievement__dismiss';
                dismissBtn.innerHTML = '&times;';
                container.appendChild(dismissBtn);
                
                return container;
            },
            resetFn: (element) => {
                // Restore base class and remove any type-specific classes
                element.className = 'rift-achievement';
                
                // Reset icon container
                const iconContainer = element.querySelector('.rift-achievement__icon');
                while (iconContainer.firstChild) {
                    iconContainer.removeChild(iconContainer.firstChild);
                }
                
                // Reset header area
                const header = element.querySelector('.rift-achievement__header');
                const label = header.querySelector('.rift-achievement__label');
                label.textContent = '';
                
                // Remove any value element if exists
                const valueElement = header.querySelector('.rift-achievement__value');
                if (valueElement) {
                    header.removeChild(valueElement);
                }
                
                // Reset title
                const title = element.querySelector('.rift-achievement__title');
                title.textContent = '';
                
                // Remove description if exists
                const content = element.querySelector('.rift-achievement__content');
                const description = content.querySelector('.rift-achievement__description');
                if (description) {
                    content.removeChild(description);
                }
                
                // Remove progress if exists
                const progress = content.querySelector('.rift-achievement__progress');
                if (progress) {
                    content.removeChild(progress);
                }
                
                // Ensure any click handlers are removed from dismiss button
                const dismissBtn = element.querySelector('.rift-achievement__dismiss');
                const clone = dismissBtn.cloneNode(true);
                dismissBtn.parentNode.replaceChild(clone, dismissBtn);
                
                // Reset visibility state
                element.classList.remove('rift-achievement--show');
                element.style.display = 'none';
                
                return element;
            }
        });
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
     * Create the root container element
     * @private
     */
    _createRootElement() {
        this.element = DOMFactory.createElement('div', {
            id: this.id,
            className: this.className
        });
        
        this.container.appendChild(this.element);
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
        // If queue is getting too long, limit it to prevent memory issues
        if (this.queue.length >= this.maxPoolSize) {
            this.queue = this.queue.slice(-this.maxPoolSize + 1);
        }
        
        // If already showing an achievement, queue this one
        if (this.currentAchievement) {
            this.queue.push(achievement);
            return;
        }
        
        // Get element from pool
        const { element, release } = this.elementPool.acquire();
        
        // Configure the achievement element
        this._configureAchievementElement(element, achievement);
        
        // Track current achievement
        this.currentAchievement = {
            element,
            data: achievement,
            release,
            startTime: Date.now(),
            duration: achievement.duration || this.displayDuration
        };
        
        // Add to active achievements list
        this.activeAchievements.push(this.currentAchievement);
        
        // Make visible
        element.style.display = '';
        
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
     * Configure an achievement element with data
     * 
     * @private
     * @param {HTMLElement} element - The element to configure
     * @param {Object} achievement - Achievement data
     */
    _configureAchievementElement(element, achievement) {
        // Reset type-specific classes
        element.className = 'rift-achievement';
        
        // Add appropriate type class
        switch (achievement.type) {
            case 'unlock':
                element.classList.add('rift-achievement--unlock');
                break;
            case 'milestone':
                element.classList.add('rift-achievement--milestone');
                break;
            case 'challenge':
                element.classList.add('rift-achievement--challenge');
                break;
        }
        
        // Configure icon
        const iconContainer = element.querySelector('.rift-achievement__icon');
        if (achievement.iconUrl) {
            const iconImage = document.createElement('img');
            iconImage.className = 'rift-achievement__icon-image';
            iconImage.src = achievement.iconUrl;
            iconImage.alt = achievement.title || 'Achievement';
            iconContainer.appendChild(iconImage);
        }
        
        // Configure header
        const header = element.querySelector('.rift-achievement__header');
        
        // Set label
        const label = header.querySelector('.rift-achievement__label');
        label.textContent = this._getTypeLabel(achievement.type);
        
        // Add value if provided
        if (achievement.value) {
            let valueElement = header.querySelector('.rift-achievement__value');
            if (!valueElement) {
                valueElement = document.createElement('div');
                valueElement.className = 'rift-achievement__value';
                header.appendChild(valueElement);
            }
            valueElement.textContent = `+${achievement.value}`;
        }
        
        // Set title
        const title = element.querySelector('.rift-achievement__title');
        title.textContent = achievement.title;
        
        // Get content container
        const content = element.querySelector('.rift-achievement__content');
        
        // Add description if provided
        if (achievement.description) {
            let description = content.querySelector('.rift-achievement__description');
            if (!description) {
                description = document.createElement('p');
                description.className = 'rift-achievement__description';
                content.appendChild(description);
            }
            description.textContent = achievement.description;
        }
        
        // Add progress bar if provided
        if (achievement.progress) {
            let progressContainer = content.querySelector('.rift-achievement__progress');
            if (!progressContainer) {
                progressContainer = document.createElement('div');
                progressContainer.className = 'rift-achievement__progress';
                content.appendChild(progressContainer);
            } else {
                // Clear existing content
                while (progressContainer.firstChild) {
                    progressContainer.removeChild(progressContainer.firstChild);
                }
            }
            
            // Progress label
            const progressLabel = document.createElement('div');
            progressLabel.className = 'rift-achievement__progress-label';
            
            // Progress text
            const progressText = document.createElement('span');
            progressText.textContent = 'Progress';
            progressLabel.appendChild(progressText);
            
            // Progress value
            const progressValue = document.createElement('span');
            progressValue.textContent = `${achievement.progress.current}/${achievement.progress.max}`;
            progressLabel.appendChild(progressValue);
            
            progressContainer.appendChild(progressLabel);
            
            // Progress bar
            const progressBar = document.createElement('div');
            progressBar.className = 'rift-achievement__progress-bar';
            
            // Progress fill
            const progressPercentage = Math.min(100, (achievement.progress.current / achievement.progress.max) * 100);
            const progressFill = document.createElement('div');
            progressFill.className = 'rift-achievement__progress-fill';
            progressFill.style.width = `${progressPercentage}%`;
            
            progressBar.appendChild(progressFill);
            progressContainer.appendChild(progressBar);
        }
        
        // Add click handler to dismiss button
        const dismissBtn = element.querySelector('.rift-achievement__dismiss');
        dismissBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dismissCurrent();
        });
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
        
        // Release all active achievements back to the pool
        this.activeAchievements.forEach(achievement => {
            if (achievement && achievement.release) {
                achievement.release();
            }
        });
        this.activeAchievements = [];
        this.currentAchievement = null;
        
        // Dispose the element pool
        if (this.elementPool) {
            this.elementPool.dispose();
            this.elementPool = null;
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
        
        // Pause any animations in all active achievements
        this.activeAchievements.forEach(achievement => {
            if (!achievement || !achievement.element) return;
            
            const progressBar = achievement.element.querySelector('.rift-achievement__progress-fill');
            if (progressBar) {
                progressBar.style.animationPlayState = 'paused';
            }
        });
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
        
        // Resume any animations in all active achievements
        this.activeAchievements.forEach(achievement => {
            if (!achievement || !achievement.element) return;
            
            const progressBar = achievement.element.querySelector('.rift-achievement__progress-fill');
            if (progressBar) {
                progressBar.style.animationPlayState = 'running';
            }
        });
        
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
            dismissed.release();
            
            // Remove from active achievements
            this.activeAchievements = this.activeAchievements.filter(a => a !== dismissed);
            this.currentAchievement = null;
            
            // Show next achievement if any
            this._showNextAchievementInQueue();
        } else {
            // Hide with animation
            dismissed.element.classList.remove('rift-achievement--show');
            
            // Remove after animation
            setTimeout(() => {
                dismissed.release();
                
                // Remove from active achievements
                this.activeAchievements = this.activeAchievements.filter(a => a !== dismissed);
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
    
    /**
     * Get usage statistics for the element pool
     * 
     * @returns {Object} Pool statistics
     */
    getPoolStats() {
        return this.elementPool ? this.elementPool.getStats() : null;
    }
}
