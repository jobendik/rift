/**
 * RoundSummary.js
 * Component for displaying end-of-round statistics and summary
 * 
 * @author Cline
 */

import UIComponent from '../UIComponent.js';
import DOMFactory from '../../../utils/DOMFactory.js';
import EventManager from '../../../core/EventManager.js';
import WorldMap from './WorldMap.js';

export default class RoundSummary extends UIComponent {
    /**
     * Create a new round summary component
     * @param {Object} options - Configuration options
     * @param {Object} options.world - World instance
     */
    constructor(options = {}) {
        super({
            id: 'round-summary',
            className: 'rift-round-summary',
            autoInit: false  // Prevent auto-initialization
        });
        
        this.world = options.world || null;
        this.config = this._getConfig();
        
        // State
        this.roundData = null;
        this.isInitialized = false;
        this.activeTab = this.config.defaultTab || 'performance';
        
        // Components
        this.map = null;
        
        // DOM Elements
        this.headerElement = null;
        this.titleElement = null;
        this.outcomeElement = null;
        this.contentElement = null;
        this.mainElement = null;
        this.tabsElement = null;
        this.mapElement = null;
        this.footerElement = null;
        this.actionsElement = null;
        this.mapContainer = null;
        
        // Tab panels - initialize as empty object
        this.panels = {
            performance: null,
            leaderboard: null,
            rewards: null
        };
        
        // Bind methods
        this._onTabClick = this._onTabClick.bind(this);
        this._onButtonAction = this._onButtonAction.bind(this);
        this._buildMapSection = this._buildMapSection.bind(this);
        
        // Manual initialization after all properties are set
        this.init();
    }
    
    /**
     * Get configuration with fallbacks
     * @private
     * @returns {Object} Configuration object
     */
    _getConfig() {
        let uiConfig = {};
        try {
            // Try to access UIConfig if available
            if (typeof UIConfig !== 'undefined' && UIConfig?.menus?.roundSummary) {
                uiConfig = UIConfig.menus.roundSummary;
            }
        } catch (error) {
            console.warn('UIConfig not available, using round summary defaults');
        }
        
        // Return defaults merged with any available config
        return {
            title: 'Round Summary',
            defaultTab: 'performance',
            showMap: true,
            enableHeatmap: true,
            mapDefaultZoom: 0.75,
            sections: {
                achievements: true,
                progression: true
            },
            continuationOptions: {
                nextRound: true,
                mainMenu: true,
                customize: true
            },
            pauseGameWhenActive: false,
            ...uiConfig
        };
    }
    
    /**
     * Initialize the round summary component
     * @returns {RoundSummary} This instance for chaining
     */
    init() {
        if (this.isInitialized) return this;
        
        this._buildLayout();
        this._setupEventListeners();
        
        this.isInitialized = true;
        return this;
    }
    
    /**
     * Build the basic layout structure
     * @private
     */
    _buildLayout() {
        // Header section
        this.headerElement = DOMFactory.createElement('div', {
            className: 'rift-round-summary__header',
            parent: this.element
        });
        
        this.titleElement = DOMFactory.createElement('h2', {
            className: 'rift-round-summary__title',
            textContent: this.config.title || 'Round Summary',
            parent: this.headerElement
        });
        
        this.outcomeElement = DOMFactory.createElement('div', {
            className: 'rift-round-summary__outcome',
            parent: this.headerElement
        });
        
        // Content section
        this.contentElement = DOMFactory.createElement('div', {
            className: 'rift-round-summary__content',
            parent: this.element
        });
        
        // Main content area
        this.mainElement = DOMFactory.createElement('div', {
            className: 'rift-round-summary__main',
            parent: this.contentElement
        });
        
        // Tab navigation
        this.tabsElement = DOMFactory.createElement('div', {
            className: 'rift-round-summary__tabs',
            parent: this.mainElement
        });
        
        // Create tabs
        this._createTab('performance', 'Performance');
        this._createTab('leaderboard', 'Leaderboard');
        this._createTab('rewards', 'Rewards');
        
        // Create tab panels (now that this.panels is properly initialized)
        this.panels.performance = this._createPanel('performance');
        this.panels.leaderboard = this._createPanel('leaderboard');
        this.panels.rewards = this._createPanel('rewards');
        
        // Map section (will be populated later)
        if (this.config.showMap) {
            this._buildMapSection();
        }
        
        // Footer section
        this.footerElement = DOMFactory.createElement('div', {
            className: 'rift-round-summary__footer',
            parent: this.element
        });
        
        const infoElement = DOMFactory.createElement('div', {
            className: 'rift-round-summary__info',
            parent: this.footerElement
        });
        
        DOMFactory.createElement('div', {
            className: 'rift-round-summary__map-name',
            parent: infoElement
        });
        
        const durationElement = DOMFactory.createElement('div', {
            className: 'rift-round-summary__duration',
            parent: infoElement
        });
        
        DOMFactory.createElement('span', {
            className: 'rift-round-summary__duration-icon',
            innerHTML: '<svg width="12" height="12" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12S17.5 2 12 2M12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20M15 13H11V7H13V11H15V13Z"/></svg>',
            parent: durationElement
        });
        
        DOMFactory.createElement('span', {
            className: 'rift-round-summary__duration-value',
            parent: durationElement
        });
        
        // Action buttons
        this.actionsElement = DOMFactory.createElement('div', {
            className: 'rift-round-summary__actions',
            parent: this.footerElement
        });
    }
    
    /**
     * Create a tab button
     * @private
     * @param {string} id - Tab identifier
     * @param {string} label - Tab display label
     * @returns {HTMLElement} The created tab element
     */
    _createTab(id, label) {
        const tabElement = DOMFactory.createElement('div', {
            className: `rift-round-summary__tab ${id === this.activeTab ? 'rift-round-summary__tab--active' : ''}`.trim(),
            dataset: { tab: id },
            textContent: label,
            parent: this.tabsElement
        });
        
        tabElement.addEventListener('click', this._onTabClick);
        return tabElement;
    }
    
    /**
     * Create a tab panel
     * @private
     * @param {string} id - Panel identifier
     * @returns {HTMLElement} The created panel element
     */
    _createPanel(id) {
        return DOMFactory.createElement('div', {
            className: `rift-round-summary__panel ${id === this.activeTab ? 'rift-round-summary__panel--active' : ''}`.trim(),
            dataset: { panel: id },
            parent: this.mainElement
        });
    }
    
    /**
     * Build map section
     * @private
     */
    _buildMapSection() {
        this.mapElement = DOMFactory.createElement('div', {
            className: 'rift-round-summary__map',
            parent: this.contentElement
        });
        
        DOMFactory.createElement('div', {
            className: 'rift-round-summary__map-title',
            textContent: 'Battle Map',
            parent: this.mapElement
        });
        
        this.mapContainer = DOMFactory.createElement('div', {
            className: 'rift-round-summary__map-container',
            parent: this.mapElement
        });
        
        // Heatmap toggle button
        if (this.config.enableHeatmap) {
            const heatmapToggle = DOMFactory.createElement('div', {
                className: 'rift-round-summary__heatmap-toggle',
                parent: this.mapContainer
            });
            
            DOMFactory.createElement('span', {
                className: 'rift-round-summary__heatmap-toggle-icon',
                parent: heatmapToggle
            });
            
            DOMFactory.createElement('span', {
                textContent: 'Heatmap',
                parent: heatmapToggle
            });
            
            heatmapToggle.addEventListener('click', () => this._toggleHeatmap());
        }
    }
    
    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        // Register events with EventManager
        this.registerEvents({
            'round:completed': (data) => this.show(data),
            'round:stats:update': (data) => this.updateStats(data)
        });
    }
    
    /**
     * Handle tab click events
     * @private
     * @param {Event} event - Click event
     */
    _onTabClick(event) {
        const tabId = event.currentTarget.dataset.tab;
        this.setActiveTab(tabId);
    }
    
    /**
     * Set active tab
     * @param {string} tabId - Tab identifier
     */
    setActiveTab(tabId) {
        if (!this.panels[tabId]) return;
        
        // Update active tab
        this.activeTab = tabId;
        
        // Update tab button states
        const tabs = this.tabsElement.querySelectorAll('.rift-round-summary__tab');
        tabs.forEach(tab => {
            tab.classList.toggle('rift-round-summary__tab--active', tab.dataset.tab === tabId);
        });
        
        // Update panel visibility
        Object.keys(this.panels).forEach(panelId => {
            const panel = this.panels[panelId];
            panel.classList.toggle('rift-round-summary__panel--active', panelId === tabId);
        });
        
        // Trigger event
        EventManager.trigger('ui:roundSummary:tabChanged', { tab: tabId });
    }
    
    /**
     * Handle button actions
     * @private
     * @param {Event} event - Click event
     */
    _onButtonAction(event) {
        const action = event.currentTarget.dataset.action;
        
        switch (action) {
            case 'next-round':
                EventManager.trigger('game:round:next');
                this.hide();
                break;
                
            case 'main-menu':
                EventManager.trigger('ui:showScreen', { screen: 'main-menu' });
                this.hide();
                break;
                
            case 'customize':
                EventManager.trigger('ui:showScreen', { screen: 'customization' });
                this.hide();
                break;
        }
    }
    
    /**
     * Toggle heatmap visibility
     * @private
     */
    _toggleHeatmap() {
        if (this.map) {
            const isVisible = this.map.toggleHeatmap();
            EventManager.trigger('ui:roundSummary:heatmapToggled', { visible: isVisible });
        }
    }
    
    /**
     * Build performance section content
     * @private
     * @param {Object} stats - Player statistics data
     */
    _buildPerformanceSection(stats) {
        const panel = this.panels.performance;
        panel.innerHTML = '';
        
        // Performance section
        const performanceSection = DOMFactory.createElement('div', {
            className: 'rift-round-summary__performance',
            parent: panel
        });
        
        DOMFactory.createElement('h3', {
            className: 'rift-round-summary__section-title',
            textContent: 'Your Performance',
            parent: performanceSection
        });
        
        const statsGrid = DOMFactory.createElement('div', {
            className: 'rift-round-summary__stats-grid',
            parent: performanceSection
        });
        
        // Create stat blocks
        this._createStat(statsGrid, 'Kills', stats.kills || 0, 1);
        this._createStat(statsGrid, 'Deaths', stats.deaths || 0, 2);
        this._createStat(statsGrid, 'K/D Ratio', stats.kdRatio?.toFixed(2) || '0.00', 3);
        this._createStat(statsGrid, 'Accuracy', `${stats.accuracy?.toFixed(1) || 0}%`, 4);
        this._createStat(statsGrid, 'Score', stats.score || 0, 1);
        this._createStat(statsGrid, 'Headshots', stats.headshots || 0, 2);
        this._createStat(statsGrid, 'Damage Dealt', stats.damageDealt || 0, 3);
        this._createStat(statsGrid, 'Damage Taken', stats.damageTaken || 0, 4);
        
        // Achievements section (if any achievements)
        if (this.config.sections.achievements && stats.achievements?.length > 0) {
            this._buildAchievementSection(stats.achievements);
        }
        
        // Progression section
        if (this.config.sections.progression) {
            this._buildProgressionSection(stats.xp, stats.level);
        }
    }
    
    /**
     * Create a statistics block
     * @private
     * @param {HTMLElement} container - Parent container
     * @param {string} label - Stat label
     * @param {string|number} value - Stat value
     * @param {number} delayIndex - Animation delay index (1-based)
     * @returns {HTMLElement} The created stat element
     */
    _createStat(container, label, value, delayIndex = 1) {
        const statEl = DOMFactory.createElement('div', {
            className: `rift-round-summary__stat rift-round-summary__animate rift-round-summary__animate--delay-${delayIndex}`,
            parent: container
        });
        
        DOMFactory.createElement('div', {
            className: 'rift-round-summary__stat-value',
            textContent: value,
            parent: statEl
        });
        
        DOMFactory.createElement('div', {
            className: 'rift-round-summary__stat-label',
            textContent: label,
            parent: statEl
        });
        
        return statEl;
    }
    
    /**
     * Build achievement section
     * @private
     * @param {Array} achievements - Achievement data
     */
    _buildAchievementSection(achievements) {
        const panel = this.panels.performance;
        
        const achievementsSection = DOMFactory.createElement('div', {
            className: 'rift-round-summary__achievements',
            parent: panel
        });
        
        DOMFactory.createElement('h3', {
            className: 'rift-round-summary__section-title',
            textContent: 'Achievements',
            parent: achievementsSection
        });
        
        const achievementsList = DOMFactory.createElement('div', {
            className: 'rift-round-summary__achievements-list',
            parent: achievementsSection
        });
        
        // Create achievement items
        achievements.forEach((achievement, index) => {
            const achievementItem = DOMFactory.createElement('div', {
                className: `rift-round-summary__achievement rift-round-summary__animate rift-round-summary__animate--delay-${index % 4 + 1}`,
                parent: achievementsList
            });
            
            const iconElement = DOMFactory.createElement('div', {
                className: 'rift-round-summary__achievement-icon',
                parent: achievementItem
            });
            
            // Add icon or placeholder
            if (achievement.icon) {
                iconElement.innerHTML = achievement.icon;
            }
            
            const infoElement = DOMFactory.createElement('div', {
                className: 'rift-round-summary__achievement-info',
                parent: achievementItem
            });
            
            DOMFactory.createElement('div', {
                className: 'rift-round-summary__achievement-title',
                textContent: achievement.title,
                parent: infoElement
            });
            
            DOMFactory.createElement('div', {
                className: 'rift-round-summary__achievement-description',
                textContent: achievement.description,
                parent: infoElement
            });
            
            if (achievement.value) {
                const valueElement = DOMFactory.createElement('div', {
                    className: 'rift-round-summary__achievement-value',
                    textContent: `+${achievement.value} XP`,
                    parent: infoElement
                });
            }
        });
    }
    
    /**
     * Build progression section
     * @private
     * @param {Object} xp - XP data
     * @param {number} level - Current level
     */
    _buildProgressionSection(xp, level) {
        const panel = this.panels.performance;
        
        const progressionSection = DOMFactory.createElement('div', {
            className: 'rift-round-summary__progression',
            parent: panel
        });
        
        DOMFactory.createElement('h3', {
            className: 'rift-round-summary__section-title',
            textContent: 'Progression',
            parent: progressionSection
        });
        
        const xpBlock = DOMFactory.createElement('div', {
            className: 'rift-round-summary__xp rift-round-summary__animate',
            parent: progressionSection
        });
        
        const xpHeader = DOMFactory.createElement('div', {
            className: 'rift-round-summary__xp-header',
            parent: xpBlock
        });
        
        DOMFactory.createElement('div', {
            className: 'rift-round-summary__xp-title',
            textContent: 'Experience Earned',
            parent: xpHeader
        });
        
        DOMFactory.createElement('div', {
            className: 'rift-round-summary__xp-value',
            textContent: `+${xp?.earned || 0} XP`,
            parent: xpHeader
        });
        
        const xpBarContainer = DOMFactory.createElement('div', {
            className: 'rift-round-summary__xp-bar-container',
            parent: xpBlock
        });
        
        const xpBar = DOMFactory.createElement('div', {
            className: 'rift-round-summary__xp-bar',
            parent: xpBarContainer
        });
        
        const xpLevel = DOMFactory.createElement('div', {
            className: 'rift-round-summary__xp-level',
            parent: xpBlock
        });
        
        DOMFactory.createElement('div', {
            textContent: `Level ${level}`,
            parent: xpLevel
        });
        
        DOMFactory.createElement('div', {
            textContent: `${xp?.current || 0}/${xp?.required || 1000} XP`,
            parent: xpLevel
        });
        
        // Set XP bar width (with small delay for animation)
        setTimeout(() => {
            const percentage = ((xp?.current || 0) / (xp?.required || 1000)) * 100;
            xpBar.style.width = `${Math.min(100, percentage)}%`;
        }, 100);
    }
    
    /**
     * Build leaderboard section
     * @private
     * @param {Array} players - Player data for leaderboard
     */
    _buildLeaderboardSection(players) {
        const panel = this.panels.leaderboard;
        panel.innerHTML = '';
        
        DOMFactory.createElement('h3', {
            className: 'rift-round-summary__section-title',
            textContent: 'Match Leaderboard',
            parent: panel
        });
        
        const table = DOMFactory.createElement('table', {
            className: 'rift-round-summary__leaderboard',
            parent: panel
        });
        
        // Table header
        const thead = DOMFactory.createElement('thead', {
            className: 'rift-round-summary__leaderboard-header',
            parent: table
        });
        
        const headerRow = DOMFactory.createElement('tr', {
            parent: thead
        });
        
        ['Rank', 'Player', 'Score', 'Kills', 'Deaths', 'K/D', 'Accuracy'].forEach(headText => {
            DOMFactory.createElement('th', {
                textContent: headText,
                parent: headerRow
            });
        });
        
        // Table body
        const tbody = DOMFactory.createElement('tbody', {
            parent: table
        });
        
        // Create player rows sorted by score
        players
            .sort((a, b) => b.score - a.score)
            .forEach((player, index) => {
                const isUser = player.isUser;
                const rowClass = isUser ? 'rift-round-summary__player-row' : '';
                
                const row = DOMFactory.createElement('tr', {
                    className: rowClass,
                    parent: tbody
                });
                
                // Rank cell
                DOMFactory.createElement('td', {
                    textContent: index + 1,
                    parent: row
                });
                
                // Player name cell
                const nameCell = DOMFactory.createElement('td', {
                    parent: row
                });
                
                const nameWrapper = DOMFactory.createElement('div', {
                    className: 'rift-round-summary__player-name',
                    parent: nameCell
                });
                
                // Player level indicator
                DOMFactory.createElement('span', {
                    className: 'rift-round-summary__player-level',
                    textContent: player.level || 1,
                    parent: nameWrapper
                });
                
                DOMFactory.createElement('span', {
                    textContent: player.name,
                    parent: nameWrapper
                });
                
                // Other stats
                DOMFactory.createElement('td', {
                    textContent: player.score || 0,
                    parent: row
                });
                
                DOMFactory.createElement('td', {
                    textContent: player.kills || 0,
                    parent: row
                });
                
                DOMFactory.createElement('td', {
                    textContent: player.deaths || 0,
                    parent: row
                });
                
                DOMFactory.createElement('td', {
                    textContent: player.kdRatio?.toFixed(2) || '0.00',
                    parent: row
                });
                
                DOMFactory.createElement('td', {
                    textContent: `${player.accuracy?.toFixed(1) || 0}%`,
                    parent: row
                });
            });
    }
    
    /**
     * Build rewards section
     * @private
     * @param {Array} rewards - Rewards data
     */
    _buildRewardsSection(rewards) {
        const panel = this.panels.rewards;
        panel.innerHTML = '';
        
        DOMFactory.createElement('h3', {
            className: 'rift-round-summary__section-title',
            textContent: 'Rewards',
            parent: panel
        });
        
        const rewardsList = DOMFactory.createElement('div', {
            className: 'rift-round-summary__rewards-list',
            parent: panel
        });
        
        // Create reward items
        rewards.forEach((reward, index) => {
            const rewardItem = DOMFactory.createElement('div', {
                className: `rift-round-summary__reward rift-round-summary__animate rift-round-summary__animate--delay-${index % 4 + 1}`,
                parent: rewardsList
            });
            
            const iconElement = DOMFactory.createElement('div', {
                className: 'rift-round-summary__reward-icon',
                parent: rewardItem
            });
            
            // Add icon or placeholder
            if (reward.icon) {
                iconElement.innerHTML = reward.icon;
            }
            
            DOMFactory.createElement('div', {
                className: 'rift-round-summary__reward-title',
                textContent: reward.name,
                parent: rewardItem
            });
            
            DOMFactory.createElement('div', {
                className: 'rift-round-summary__reward-value',
                textContent: reward.value,
                parent: rewardItem
            });
            
            DOMFactory.createElement('div', {
                className: 'rift-round-summary__reward-description',
                textContent: reward.description,
                parent: rewardItem
            });
        });
    }
    
    /**
     * Populate footer action buttons based on configuration
     * @private
     */
    _populateActionButtons() {
        this.actionsElement.innerHTML = '';
        const options = this.config.continuationOptions;
        
        if (options.nextRound) {
            const nextRoundBtn = DOMFactory.createElement('button', {
                className: 'rift-round-summary__button rift-round-summary__button--primary',
                textContent: 'Next Round',
                dataset: { action: 'next-round' },
                parent: this.actionsElement
            });
            nextRoundBtn.addEventListener('click', this._onButtonAction);
        }
        
        if (options.mainMenu) {
            const mainMenuBtn = DOMFactory.createElement('button', {
                className: 'rift-round-summary__button rift-round-summary__button--secondary',
                textContent: 'Main Menu',
                dataset: { action: 'main-menu' },
                parent: this.actionsElement
            });
            mainMenuBtn.addEventListener('click', this._onButtonAction);
        }
        
        if (options.customize) {
            const customizeBtn = DOMFactory.createElement('button', {
                className: 'rift-round-summary__button rift-round-summary__button--secondary',
                textContent: 'Customize',
                dataset: { action: 'customize' },
                parent: this.actionsElement
            });
            customizeBtn.addEventListener('click', this._onButtonAction);
        }
    }
    
    /**
     * Initialize the map component
     * @private
     */
    _initMap() {
        if (!this.mapContainer || this.map) return;
        
        // Create the map component
        this.map = new WorldMap({
            containerId: this.mapContainer.id,
            world: this.world,
            height: '100%',
            width: '100%',
            initialZoom: this.config.mapDefaultZoom || 0.75
        });
        
        this.map.init();
        
        // Apply any round data to the map
        if (this.roundData?.mapData) {
            this.map.setMapData(this.roundData.mapData);
        }
    }
    
    /**
     * Show the round summary
     * @param {Object} data - Round data
     */
    show(data) {
        if (!this.isInitialized) this.init();
        
        this.roundData = data;
        
        // Set outcome
        this._setOutcome(data.outcome);
        
        // Build panel content
        this._buildPerformanceSection(data.stats);
        this._buildLeaderboardSection(data.players || []);
        
        if (data.rewards && data.rewards.length > 0) {
            this._buildRewardsSection(data.rewards);
        }
        
        // Set map name and round duration
        const mapNameEl = this.footerElement.querySelector('.rift-round-summary__map-name');
        if (mapNameEl) {
            mapNameEl.textContent = data.mapName || 'Unknown Map';
        }
        
        const durationEl = this.footerElement.querySelector('.rift-round-summary__duration-value');
        if (durationEl) {
            const minutes = Math.floor(data.duration / 60);
            const seconds = Math.floor(data.duration % 60);
            durationEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Initialize map if showing
        if (this.config.showMap) {
            this._initMap();
        }
        
        // Set up action buttons
        this._populateActionButtons();
        
        // Make element visible
        this.element.style.display = 'flex';
        
        // Set active tab
        this.setActiveTab(this.activeTab);
        
        // Trigger event
        EventManager.trigger('ui:roundSummary:shown', { data });
        
        return this;
    }
    
    /**
     * Set the outcome display
     * @param {string} outcome - Match outcome (victory, defeat, draw)
     * @private
     */
    _setOutcome(outcome) {
        if (!this.outcomeElement) return;
        
        // Reset classes
        this.outcomeElement.className = 'rift-round-summary__outcome';
        
        // Set outcome text and class
        let outcomeText = 'Unknown';
        let outcomeClass = '';
        
        switch (outcome) {
            case 'victory':
                outcomeText = 'Victory';
                outcomeClass = 'rift-round-summary__outcome--victory';
                break;
                
            case 'defeat':
                outcomeText = 'Defeat';
                outcomeClass = 'rift-round-summary__outcome--defeat';
                break;
                
            case 'draw':
                outcomeText = 'Draw';
                outcomeClass = 'rift-round-summary__outcome--draw';
                break;
        }
        
        this.outcomeElement.textContent = outcomeText;
        this.outcomeElement.classList.add(outcomeClass);
    }
    
    /**
     * Update statistics display based on new data
     * @param {Object} data - Updated stats data
     */
    updateStats(data) {
        if (!this.isInitialized || !this.roundData) return;
        
        // Merge the updated stats with existing roundData
        this.roundData = { ...this.roundData, ...data };
        
        // Update specific sections based on what data was provided
        if (data.stats) {
            this._buildPerformanceSection(data.stats);
        }
        
        if (data.players) {
            this._buildLeaderboardSection(data.players);
        }
        
        if (data.rewards) {
            this._buildRewardsSection(data.rewards);
        }
        
        // Update map data if provided
        if (data.mapData && this.map) {
            this.map.setMapData(data.mapData);
        }
        
        // Trigger event
        EventManager.trigger('ui:roundSummary:updated', { data });
    }
    
    /**
     * Hide the round summary
     */
    hide() {
        // Hide element
        this.element.style.display = 'none';
        
        // Trigger event
        EventManager.trigger('ui:roundSummary:hidden');
        
        return this;
    }
    
    /**
     * Dispose of the component
     */
    dispose() {
        // Clean up event listeners
        const tabs = this.tabsElement?.querySelectorAll('.rift-round-summary__tab') || [];
        tabs.forEach(tab => tab.removeEventListener('click', this._onTabClick));
        
        // Clean up button listeners
        const buttons = this.actionsElement?.querySelectorAll('button') || [];
        buttons.forEach(button => button.removeEventListener('click', this._onButtonAction));
        
        // Clean up map if it exists
        if (this.map) {
            this.map.dispose();
            this.map = null;
        }
        
        // Clean up heatmap toggle if exists
        const heatmapToggle = this.mapContainer?.querySelector('.rift-round-summary__heatmap-toggle');
        if (heatmapToggle) {
            heatmapToggle.removeEventListener('click', this._toggleHeatmap);
        }
        
        // Clear references
        this.roundData = null;
        this.panels = {};
        
        // Call parent dispose
        super.dispose();
    }
}