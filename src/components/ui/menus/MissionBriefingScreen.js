/**
 * MissionBriefingScreen.js
 * Integration file for the MissionBriefing component - initializes and registers
 * the mission briefing with the ScreenManager system.
 * 
 * @author Cline
 */

import { MissionBriefing } from './MissionBriefing.js';
import { EventManager } from '../../../core/EventManager.js';
import { UIConfig } from '../../../core/UIConfig.js';

export default class MissionBriefingScreen {
    /**
     * Creates a new MissionBriefingScreen handler
     * @param {Object} options - Configuration options
     * @param {World} options.world - Reference to the game world
     * @param {ScreenManager} options.screenManager - Reference to the screen manager
     */
    constructor(options = {}) {
        this.world = options.world;
        this.screenManager = options.screenManager;
        this.missionBriefing = null;
        this.isInitialized = false;
        
        // Configuration
        this.config = UIConfig.menus.missionBriefing;
        
        // Bind methods
        this._onShowMissionBriefing = this._onShowMissionBriefing.bind(this);
        this._onHideMissionBriefing = this._onHideMissionBriefing.bind(this);
    }
    
    /**
     * Initialize the mission briefing screen
     * @returns {MissionBriefingScreen} This instance for chaining
     */
    init() {
        if (this.isInitialized) {
            console.warn('MissionBriefingScreen already initialized');
            return this;
        }
        
        // Register with screen manager
        if (this.screenManager) {
            this._registerMissionBriefingScreen();
        } else {
            console.warn('No screen manager provided to MissionBriefingScreen');
        }
        
        // Register event listeners
        EventManager.on('ui:mission-briefing:shown', this._onShowMissionBriefing); // Standardized event name for showing mission briefing
        EventManager.on('ui:mission-briefing:hidden', this._onHideMissionBriefing); // Standardized event name for hiding mission briefing
        
        this.isInitialized = true;
        return this;
    }
    
    /**
     * Register the mission briefing screen with the screen manager
     * @private
     */
    _registerMissionBriefingScreen() {
        // Register the mission briefing screen with the screen manager
        const screenElement = this.screenManager.registerScreen('mission-briefing', {
            title: this.config.title || 'Mission Briefing',
            allowBackNav: true,
            className: 'rift-screen--mission-briefing',
            onShow: (data) => this._onShowMissionBriefing(data),
            onHide: () => this._onHideMissionBriefing()
        });
        
        // Create the mission briefing component inside the screen content
        const screenContent = screenElement.querySelector('.rift-screen__body');
        
        if (screenContent) {
            // Create the mission briefing instance
            this.missionBriefing = new MissionBriefing({
                world: this.world
            });
            
            // Append it to the screen content
            screenContent.appendChild(this.missionBriefing.element);
            
            // Initialize the mission briefing
            this.missionBriefing.init();
        }
    }
    
    /**
     * Handle show mission briefing event
     * @private
     * @param {Object} data - Event data
     */
    _onShowMissionBriefing(data = {}) {
        if (this.config.pauseGameWhenActive && this.world) {
            // Store the previous pause state
            this._wasPaused = this.world.isPaused;
            
            // Pause the game if it's not already paused
            if (!this._wasPaused) {
                this.world.pause();
            }
        }
        
        // If data contains mission info, set it
        if (data.mission && this.missionBriefing) {
            this.missionBriefing.setMission(data.mission);
        }
        
        // Emit standardized event that mission briefing is shown
        EventManager.emit('mission-briefing:shown', {
            timestamp: performance.now(),
            mission: data.mission,
            source: 'screen-manager'
        });
    }
    
    /**
     * Handle hide mission briefing event
     * @private
     */
    _onHideMissionBriefing() {
        // If we paused the game when opening, resume it now
        if (this.config.pauseGameWhenActive && this.world && !this._wasPaused) {
            this.world.resume();
        }
        
        // Emit standardized event that mission briefing is hidden
        EventManager.emit('mission-briefing:hidden', {
            timestamp: performance.now(),
            reason: 'user-action'
        });
    }
    
    /**
     * Show the mission briefing with a specific mission
     * @param {Object} mission - Mission data object
     * @param {Object} options - Additional options
     */
    show(mission, options = {}) {
        if (this.screenManager) {
            this.screenManager.showScreen('mission-briefing', {
                data: {
                    mission: mission,
                    ...options
                }
            });
        }
    }
    
    /**
     * Hide the mission briefing
     */
    hide() {
        if (this.screenManager && this.screenManager.currentScreen === 'mission-briefing') {
            this.screenManager.hideScreen();
        }
    }
    
    /**
     * Update a specific mission
     * @param {Object} mission - Mission data
     */
    updateMission(mission) {
        if (this.missionBriefing) {
            this.missionBriefing.setMission(mission);
        }
    }
    
    /**
     * Update a specific objective
     * @param {Object} objective - Objective data
     */
    updateObjective(objective) {
        if (this.missionBriefing) {
            this.missionBriefing.updateObjective(objective);
        }
    }
    
    /**
     * Update method called each frame
     * @param {number} delta - Time since last frame in seconds
     */
    update(delta) {
        // Only update if visible
        if (this.missionBriefing && this.screenManager?.currentScreen === 'mission-briefing') {
            this.missionBriefing.update(delta);
        }
    }
    
    /**
     * Cleanup and dispose of resources
     */
    dispose() {
        // Remove event listeners
        EventManager.off('ui:mission-briefing:shown', this._onShowMissionBriefing);
        EventManager.off('ui:mission-briefing:hidden', this._onHideMissionBriefing);
        
        // Dispose of the mission briefing component
        if (this.missionBriefing) {
            this.missionBriefing.dispose();
            this.missionBriefing = null;
        }
        
        this.isInitialized = false;
    }
}
