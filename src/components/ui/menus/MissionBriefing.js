/**
 * MissionBriefing.js
 * Component for displaying mission details, objectives, and rewards
 * 
 * @author Cline
 */

import UIComponent from '../UIComponent.js';
import EventManager from '../../../core/EventManager.js';
import DOMFactory from '../../../utils/DOMFactory.js';
import UIConfig from '../../../core/UIConfig.js';

export default class MissionBriefing extends UIComponent {
    /**
     * Create a new mission briefing component
     * @param {Object} options - Configuration options
     * @param {World} options.world - Reference to the game world
     */
    constructor(options = {}) {
        super({
            id: 'mission-briefing',
            className: 'rift-mission-briefing',
            ...options
        });
        
        this.world = options.world;
        this.config = UIConfig.menus.missionBriefing;
        this.worldMap = null;
        
        // State
        this.currentMission = null;
        this.objectives = new Map();
        this.rewards = new Map();
        
        // DOM Element references
        this.elements = {
            header: null,
            title: null,
            status: null,
            content: null,
            details: null,
            description: null,
            difficulty: null,
            objectivesContainer: null,
            objectivesList: null,
            rewardsContainer: null,
            rewardsList: null,
            map: null,
            mapContainer: null,
            footer: null,
            location: null,
            time: null,
            actions: null
        };
        
        // Bind methods
        this._onObjectiveClick = this._onObjectiveClick.bind(this);
        this._onStartMissionClick = this._onStartMissionClick.bind(this);
        this._onCancelMissionClick = this._onCancelMissionClick.bind(this);
    }
    
    /**
     * Initialize the mission briefing component
     * @returns {MissionBriefing} This instance for chaining
     */
    init() {
        // Create DOM structure
        this._createElements();
        
        // Register event handlers
        this.registerEvents({
            'mission:update': (data) => this._onMissionUpdate(data),
            'objective:update': (data) => this._onObjectiveUpdate(data)
        });
        
        this.isInitialized = true;
        return this;
    }
    
    /**
     * Set the current mission details
     * @param {Object} mission - Mission data
     * @param {string} mission.id - Unique mission identifier
     * @param {string} mission.title - Mission title
     * @param {string} mission.description - Mission description
     * @param {string} mission.status - Mission status (active, pending, completed, failed)
     * @param {number} mission.difficulty - Mission difficulty (1-5)
     * @param {string} mission.location - Mission location name
     * @param {Object} mission.position - Mission position in world coordinates
     * @param {Object[]} mission.objectives - Array of mission objectives
     * @param {Object[]} mission.rewards - Array of mission rewards
     */
    setMission(mission) {
        if (!mission) return this;
        
        this.currentMission = mission;
        
        // Update title and status
        if (this.elements.title) {
            this.elements.title.textContent = mission.title || 'Mission';
        }
        
        if (this.elements.status) {
            // Remove existing status classes
            this.elements.status.className = 'rift-mission-briefing__status';
            
            // Add appropriate status class and text
            const status = mission.status || 'pending';
            this.elements.status.classList.add(`rift-mission-briefing__status--${status}`);
            this.elements.status.textContent = status.toUpperCase();
        }
        
        // Update description
        if (this.elements.description) {
            this.elements.description.textContent = mission.description || '';
        }
        
        // Update difficulty stars
        if (this.elements.difficulty) {
            this._updateDifficulty(mission.difficulty || this.config.defaultDifficulty);
        }
        
        // Update location and time
        if (this.elements.location) {
            this.elements.location.textContent = mission.location || 'Unknown Location';
        }
        
        if (this.elements.time) {
            const estimatedTime = mission.estimatedTime || '00:00';
            this.elements.time.textContent = estimatedTime;
        }
        
        // Clear existing objectives and rewards
        this.objectives.clear();
        this.rewards.clear();
        
        // Update objectives
        if (mission.objectives && mission.objectives.length > 0) {
            this._createObjectives(mission.objectives);
        }
        
        // Update rewards
        if (mission.rewards && mission.rewards.length > 0) {
            this._createRewards(mission.rewards);
        }
        
        // Update map if available
        if (this.config.showMap && mission.position && this.elements.mapContainer) {
            this._updateMap(mission);
        }
        
        return this;
    }
    
    /**
     * Update a specific objective
     * @param {Object} objective - Objective data
     * @param {string} objective.id - Objective identifier
     * @param {string} objective.text - Objective text
     * @param {boolean} objective.completed - Whether the objective is completed
     * @param {boolean} objective.isPrimary - Whether this is a primary objective
     * @param {Object} objective.position - Position in world coordinates
     */
    updateObjective(objective) {
        if (!objective || !objective.id) return this;
        
        // Check if we have this objective
        if (!this.objectives.has(objective.id)) {
            // Create new objective if it doesn't exist
            this._createObjectiveElement(objective);
            return this;
        }
        
        const objectiveElement = this.objectives.get(objective.id);
        if (!objectiveElement) return this;
        
        // Update text if provided
        if (objective.text && objectiveElement.textElement) {
            objectiveElement.textElement.textContent = objective.text;
        }
        
        // Update completed state if provided
        if (typeof objective.completed === 'boolean') {
            if (objective.completed) {
                objectiveElement.element.classList.add('rift-mission-briefing__objective--completed');
            } else {
                objectiveElement.element.classList.remove('rift-mission-briefing__objective--completed');
            }
        }
        
        // Update position if provided
        if (objective.position && objectiveElement.locationButton) {
            objectiveElement.position = objective.position;
        }
        
        // Update primary/secondary status
        if (typeof objective.isPrimary === 'boolean' && objectiveElement.element) {
            if (objective.isPrimary) {
                objectiveElement.element.classList.add('rift-mission-briefing__objective--primary');
            } else {
                objectiveElement.element.classList.remove('rift-mission-briefing__objective--primary');
            }
        }
        
        return this;
    }
    
    /**
     * Update method called each frame
     * @param {number} delta - Time since last frame in seconds
     * @returns {MissionBriefing} This instance for chaining
     */
    update(delta) {
        // Update map if needed
        if (this.worldMap && this.worldMap.update) {
            this.worldMap.update(delta);
        }
        
        return this;
    }
    
    /**
     * Create the DOM structure for the mission briefing
     * @private
     */
    _createElements() {
        // Create header
        this.elements.header = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__header',
            parent: this.element
        });
        
        this.elements.title = DOMFactory.createElement('h2', {
            className: 'rift-mission-briefing__title',
            textContent: this.config.title || 'Mission Briefing',
            parent: this.elements.header
        });
        
        this.elements.status = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__status rift-mission-briefing__status--pending',
            textContent: 'PENDING',
            parent: this.elements.header
        });
        
        // Create content area (split into details and map)
        this.elements.content = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__content',
            parent: this.element
        });
        
        // Details section (left side)
        this.elements.details = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__details',
            parent: this.elements.content
        });
        
        this.elements.description = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__description',
            parent: this.elements.details
        });
        
        // Create difficulty indicator
        this.elements.difficulty = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__difficulty',
            parent: this.elements.details
        });
        
        const difficultyLabel = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__difficulty-label',
            textContent: 'Difficulty:',
            parent: this.elements.difficulty
        });
        
        this.elements.difficultyStars = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__difficulty-stars',
            parent: this.elements.difficulty
        });
        
        // Create default stars
        this._updateDifficulty(this.config.defaultDifficulty);
        
        // Create objectives section
        this.elements.objectivesContainer = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__objectives',
            parent: this.elements.details
        });
        
        DOMFactory.createElement('h3', {
            className: 'rift-mission-briefing__objectives-title',
            textContent: 'Objectives',
            parent: this.elements.objectivesContainer
        });
        
        this.elements.objectivesList = DOMFactory.createElement('ul', {
            className: 'rift-mission-briefing__objective-list',
            parent: this.elements.objectivesContainer
        });
        
        // Create rewards section
        this.elements.rewardsContainer = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__rewards',
            parent: this.elements.details
        });
        
        DOMFactory.createElement('h3', {
            className: 'rift-mission-briefing__rewards-title',
            textContent: 'Rewards',
            parent: this.elements.rewardsContainer
        });
        
        this.elements.rewardsList = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__rewards-list',
            parent: this.elements.rewardsContainer
        });
        
        // Map section (right side)
        if (this.config.showMap) {
            this.elements.map = DOMFactory.createElement('div', {
                className: 'rift-mission-briefing__map',
                parent: this.elements.content
            });
            
            this.elements.mapContainer = DOMFactory.createElement('div', {
                className: 'rift-mission-briefing__map-container',
                parent: this.elements.map
            });
            
            // Map controls
            const mapControls = DOMFactory.createElement('div', {
                className: 'rift-mission-briefing__map-controls',
                parent: this.elements.map
            });
            
            // Zoom in button
            const zoomInButton = DOMFactory.createElement('button', {
                className: 'rift-mission-briefing__map-button',
                textContent: '+',
                parent: mapControls,
                attributes: {
                    'aria-label': 'Zoom in',
                    'type': 'button'
                }
            });
            
            zoomInButton.addEventListener('click', () => {
                if (this.worldMap && this.worldMap.zoomIn) {
                    this.worldMap.zoomIn();
                }
            });
            
            // Zoom out button
            const zoomOutButton = DOMFactory.createElement('button', {
                className: 'rift-mission-briefing__map-button',
                textContent: '-',
                parent: mapControls,
                attributes: {
                    'aria-label': 'Zoom out',
                    'type': 'button'
                }
            });
            
            zoomOutButton.addEventListener('click', () => {
                if (this.worldMap && this.worldMap.zoomOut) {
                    this.worldMap.zoomOut();
                }
            });
            
            // Center on objective button
            const centerButton = DOMFactory.createElement('button', {
                className: 'rift-mission-briefing__map-button',
                textContent: '⊙',
                parent: mapControls,
                attributes: {
                    'aria-label': 'Center on objective',
                    'type': 'button'
                }
            });
            
            centerButton.addEventListener('click', () => {
                if (this.currentMission && this.currentMission.position && this.worldMap && this.worldMap.centerOn) {
                    this.worldMap.centerOn(this.currentMission.position);
                }
            });
        }
        
        // Create footer with location and action buttons
        this.elements.footer = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__footer',
            parent: this.element
        });
        
        // Left side - info
        const infoContainer = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__info',
            parent: this.elements.footer
        });
        
        const locationContainer = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__location',
            parent: infoContainer
        });
        
        DOMFactory.createElement('span', {
            textContent: 'Location: ',
            parent: locationContainer
        });
        
        this.elements.location = DOMFactory.createElement('span', {
            className: 'rift-mission-briefing__location-text',
            parent: locationContainer
        });
        
        const timeContainer = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__time',
            parent: infoContainer
        });
        
        DOMFactory.createElement('span', {
            className: 'rift-mission-briefing__time-icon',
            textContent: '⏱️',
            parent: timeContainer
        });
        
        DOMFactory.createElement('span', {
            textContent: 'Est. Time: ',
            parent: timeContainer
        });
        
        this.elements.time = DOMFactory.createElement('span', {
            className: 'rift-mission-briefing__time-text',
            parent: timeContainer
        });
        
        // Right side - action buttons
        this.elements.actions = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__actions',
            parent: this.elements.footer
        });
        
        // Cancel button
        const cancelButton = DOMFactory.createElement('button', {
            className: 'rift-mission-briefing__button rift-mission-briefing__button--secondary',
            textContent: 'Cancel',
            parent: this.elements.actions,
            attributes: {
                'type': 'button'
            }
        });
        
        cancelButton.addEventListener('click', this._onCancelMissionClick);
        
        // Start mission button
        const startButton = DOMFactory.createElement('button', {
            className: 'rift-mission-briefing__button rift-mission-briefing__button--primary',
            textContent: 'Start Mission',
            parent: this.elements.actions,
            attributes: {
                'type': 'button'
            }
        });
        
        startButton.addEventListener('click', this._onStartMissionClick);
    }
    
    /**
     * Update difficulty stars display
     * @private
     * @param {number} difficulty - Difficulty level (1-5)
     */
    _updateDifficulty(difficulty) {
        if (!this.elements.difficultyStars) return;
        
        // Clear existing stars
        this.elements.difficultyStars.innerHTML = '';
        
        // Constrain to valid range
        const level = Math.min(Math.max(1, difficulty), 5);
        
        // Create stars
        for (let i = 1; i <= 5; i++) {
            const starClass = i <= level 
                ? 'rift-mission-briefing__difficulty-star' 
                : 'rift-mission-briefing__difficulty-star rift-mission-briefing__difficulty-star--inactive';
                
            DOMFactory.createElement('div', {
                className: starClass,
                parent: this.elements.difficultyStars
            });
        }
    }
    
    /**
     * Create objectives from mission data
     * @private
     * @param {Object[]} objectives - Array of objective data
     */
    _createObjectives(objectives) {
        if (!this.elements.objectivesList) return;
        
        // Clear existing objectives
        this.elements.objectivesList.innerHTML = '';
        this.objectives.clear();
        
        // Sort objectives (primary first if configured)
        let sortedObjectives = [...objectives];
        
        if (this.config.objectives.prioritizePrimary) {
            sortedObjectives.sort((a, b) => {
                if (a.isPrimary && !b.isPrimary) return -1;
                if (!a.isPrimary && b.isPrimary) return 1;
                return 0;
            });
        }
        
        // Create objective elements
        sortedObjectives.forEach(objective => {
            this._createObjectiveElement(objective);
        });
    }
    
    /**
     * Create a single objective element
     * @private
     * @param {Object} objective - Objective data
     */
    _createObjectiveElement(objective) {
        if (!this.elements.objectivesList || !objective) return;
        
        const objectiveElement = DOMFactory.createElement('li', {
            className: `rift-mission-briefing__objective ${objective.completed ? 'rift-mission-briefing__objective--completed' : ''} ${objective.isPrimary ? 'rift-mission-briefing__objective--primary' : ''}`,
            parent: this.elements.objectivesList
        });
        
        objectiveElement.dataset.objectiveId = objective.id;
        
        const checkmark = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__objective-check',
            parent: objectiveElement
        });
        
        const textElement = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__objective-text',
            textContent: objective.text || 'Mission objective',
            parent: objectiveElement
        });
        
        // Add location button if enabled and position is provided
        let locationButton = null;
        if (this.config.objectives.showLocationButton && objective.position) {
            locationButton = DOMFactory.createElement('div', {
                className: 'rift-mission-briefing__objective-location',
                parent: objectiveElement
            });
            
            DOMFactory.createElement('span', {
                className: 'rift-mission-briefing__objective-location-icon',
                textContent: '📍',
                parent: locationButton
            });
            
            DOMFactory.createElement('span', {
                textContent: 'Locate',
                parent: locationButton
            });
            
            locationButton.addEventListener('click', (e) => {
                this._onObjectiveClick(objective.id, objective.position);
                e.stopPropagation();
            });
        }
        
        // Store reference to objective element
        this.objectives.set(objective.id, {
            element: objectiveElement,
            checkmark: checkmark,
            textElement: textElement,
            locationButton: locationButton,
            position: objective.position,
            data: objective
        });
    }
    
    /**
     * Create rewards display
     * @private
     * @param {Object[]} rewards - Array of reward data
     */
    _createRewards(rewards) {
        if (!this.elements.rewardsList) return;
        
        // Clear existing rewards
        this.elements.rewardsList.innerHTML = '';
        this.rewards.clear();
        
        // Create reward elements
        rewards.forEach(reward => {
            this._createRewardElement(reward);
        });
    }
    
    /**
     * Create a single reward element
     * @private
     * @param {Object} reward - Reward data
     * @param {string} reward.id - Unique reward identifier
     * @param {string} reward.type - Type of reward (xp, item, etc)
     * @param {string} reward.name - Display name of the reward
     * @param {number|string} reward.value - Value of the reward
     * @param {string} reward.icon - Icon to display (character or class name)
     */
    _createRewardElement(reward) {
        if (!this.elements.rewardsList || !reward) return;
        
        const rewardElement = DOMFactory.createElement('div', {
            className: `rift-mission-briefing__reward`,
            parent: this.elements.rewardsList
        });
        
        rewardElement.dataset.rewardId = reward.id;
        rewardElement.dataset.rewardType = reward.type;
        
        // Icon element
        const iconElement = DOMFactory.createElement('div', {
            className: `rift-mission-briefing__reward-icon ${reward.iconClass || ''}`,
            parent: rewardElement
        });
        
        if (reward.icon) {
            iconElement.textContent = reward.icon;
        }
        
        // Container for value and label
        const infoContainer = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__reward-info',
            parent: rewardElement
        });
        
        // Value element
        const valueElement = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__reward-value',
            textContent: reward.value || '',
            parent: infoContainer
        });
        
        // Label element
        const labelElement = DOMFactory.createElement('div', {
            className: 'rift-mission-briefing__reward-label',
            textContent: reward.name || reward.type || 'Reward',
            parent: infoContainer
        });
        
        // Store reference to reward element
        this.rewards.set(reward.id, {
            element: rewardElement,
            iconElement: iconElement,
            valueElement: valueElement,
            labelElement: labelElement,
            data: reward
        });
    }
    
    /**
     * Update the map display
     * @private
     * @param {Object} mission - Mission data
     */
    _updateMap(mission) {
        // If we have a WorldMap instance already, update it
        if (this.worldMap) {
            if (mission.position && this.worldMap.centerOn) {
                this.worldMap.centerOn(mission.position);
            }
            
            // TODO: Add missions to the map when that API is available
            return;
        }
        
        // Otherwise, check if we can create one
        if (!this.world || !this.elements.mapContainer) {
            return;
        }
        
        // See if WorldMap class is available
        try {
            // Dynamic import of WorldMap
            import('./WorldMap.js').then(module => {
                const WorldMap = module.default;
                
                // Create a new WorldMap instance
                this.worldMap = new WorldMap({
                    world: this.world,
                    container: this.elements.mapContainer,
                    parentComponent: this
                });
                
                this.worldMap.init();
                
                // Set initial zoom level
                if (this.worldMap.setZoom && this.config.mapDefaultZoom) {
                    this.worldMap.setZoom(this.config.mapDefaultZoom);
                }
                
                // Center on mission position
                if (mission.position && this.worldMap.centerOn) {
                    this.worldMap.centerOn(mission.position);
                }
                
                // TODO: Add missions to the map when that API is available
            });
        } catch (error) {
            console.error('Failed to load WorldMap:', error);
        }
    }
    
    /**
     * Handle mission update event
     * @private
     * @param {Object} data - Event data
     */
    _onMissionUpdate(data) {
        this.setMission(data);
    }
    
    /**
     * Handle objective update event
     * @private
     * @param {Object} data - Event data
     */
    _onObjectiveUpdate(data) {
        this.updateObjective(data);
    }
    
    /**
     * Handle objective location click
     * @private
     * @param {string} objectiveId - Objective identifier
     * @param {Object} position - Position in world coordinates
     */
    _onObjectiveClick(objectiveId, position) {
        // Center map on objective position
        if (position && this.worldMap && this.worldMap.centerOn) {
            this.worldMap.centerOn(position);
        }
        
        // Emit event for other systems
        EventManager.emit('objective:focus', {
            objectiveId: objectiveId,
            position: position
        });
    }
    
    /**
     * Handle start mission button click
     * @private
     */
    _onStartMissionClick() {
        if (!this.currentMission) return;
        
        // Emit event that mission was started
        EventManager.emit('mission:start', {
            missionId: this.currentMission.id,
            mission: this.currentMission
        });
        
        // Close the mission briefing screen
        EventManager.emit('ui:hideScreen');
    }
    
    /**
     * Handle cancel mission button click
     * @private
     */
    _onCancelMissionClick() {
        if (!this.currentMission) return;
        
        // Emit event that mission was cancelled
        EventManager.emit('mission:cancel', {
            missionId: this.currentMission.id,
            mission: this.currentMission
        });
        
        // Close the mission briefing screen
        EventManager.emit('ui:hideScreen');
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        // Clean up WorldMap if it exists
        if (this.worldMap && typeof this.worldMap.dispose === 'function') {
            this.worldMap.dispose();
            this.worldMap = null;
        }
        
        // Clear stored references
        this.objectives.clear();
        this.rewards.clear();
        this.elements = {};
        
        // Call parent for standard cleanup
        super.dispose();
    }
}
