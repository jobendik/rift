/**
 * WorldMap.js
 * World map for overview navigation and objective tracking
 * 
 * @author Cline
 */

import UIComponent from '../UIComponent.js';
import EventManager from '../../../core/EventManager.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';

export default class WorldMap extends UIComponent {
    constructor(options = {}) {
        super({
            id: 'world-map',
            className: 'rift-world-map',
            autoInit: false, // We'll handle initialization manually
            ...options
        });
        
        // World reference
        this.world = options.world;
        
        // Configuration - provide fallback config if UIConfig is not available
        this.config = this._getConfig();
        
        // Map state
        this.isInitialized = false;
        this.currentZoom = 1;
        this.maxZoom = this.config.maxZoom || 3;
        this.minZoom = this.config.minZoom || 0.5;
        this.zoomStep = this.config.zoomStep || 0.25;
        this.panOffset = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.currentPosition = { x: 0, y: 0 };
        this.waypoints = [];
        this.objectives = [];
        this.discoveredAreas = {};
        this.currentArea = null;
        
        // DOM references
        this.mapContainer = null;
        this.mapImage = null;
        this.playerMarker = null;
        this.waypointContainer = null;
        this.objectiveContainer = null;
        this.areaLabels = null;
        this.zoomControls = null;
        this.legendContainer = null;
        
        // Bind methods
        this._bindMethods();
    }
    
    /**
     * Get configuration with fallbacks
     * @private
     * @returns {Object} Configuration object
     */
    _getConfig() {
        // Try to get UIConfig, but provide fallbacks if not available
        let uiConfig = {};
        try {
            // Dynamic import to avoid errors if UIConfig doesn't exist
            uiConfig = this.config?.worldMap || {};
        } catch (error) {
            console.warn('UIConfig.worldMap not available, using default config');
        }
        
        // Provide sensible defaults
        return {
            title: 'World Map',
            maxZoom: 3,
            minZoom: 0.5,
            zoomStep: 0.25,
            enableFogOfWar: true,
            centerOnPlayer: false,
            highlightCurrentArea: true,
            worldToMapScale: 1,
            mapOriginOffset: { x: 0, y: 0 },
            pauseGameWhenActive: true,
            ...uiConfig
        };
    }
    
    /**
     * Initialize the world map
     */
    init() {
        if (this.isInitialized) {
            console.warn('WorldMap already initialized');
            return this;
        }
        
        // Initialize parent component
        super.init();
        
        this._createMapElements();
        this._setupEventListeners();
        
        // Load initial data
        this._loadWorldData();
        
        this.isInitialized = true;
        console.log('WorldMap initialized successfully');
        return this;
    }
    
    /**
     * Create the map DOM elements
     * @private
     */
    _createMapElements() {
        if (!this.element) {
            console.error('WorldMap: Element not created by parent UIComponent');
            return;
        }
        
        // Create main map container
        this.mapContainer = DOMFactory.createElement('div', {
            className: 'rift-world-map__container',
            parent: this.element
        });
        
        // Create map header with title and controls
        const header = DOMFactory.createElement('div', {
            className: 'rift-world-map__header',
            parent: this.element
        });
        
        // Create title
        DOMFactory.createElement('h2', {
            className: 'rift-world-map__title',
            textContent: this.config.title || 'World Map',
            parent: header
        });
        
        // Create zoom controls
        this.zoomControls = DOMFactory.createElement('div', {
            className: 'rift-world-map__zoom-controls',
            parent: header
        });
        
        // Zoom in button
        const zoomInButton = DOMFactory.createElement('button', {
            className: 'rift-world-map__zoom-button rift-world-map__zoom-button--in',
            textContent: '+',
            parent: this.zoomControls,
            attributes: {
                'aria-label': 'Zoom in',
                'title': 'Zoom in'
            }
        });
        zoomInButton.addEventListener('click', this._onZoomIn);
        
        // Zoom level indicator
        this.zoomLevelIndicator = DOMFactory.createElement('span', {
            className: 'rift-world-map__zoom-level',
            textContent: '100%',
            parent: this.zoomControls
        });
        
        // Zoom out button
        const zoomOutButton = DOMFactory.createElement('button', {
            className: 'rift-world-map__zoom-button rift-world-map__zoom-button--out',
            textContent: '-',
            parent: this.zoomControls,
            attributes: {
                'aria-label': 'Zoom out',
                'title': 'Zoom out'
            }
        });
        zoomOutButton.addEventListener('click', this._onZoomOut);
        
        // Reset view button
        const resetButton = DOMFactory.createElement('button', {
            className: 'rift-world-map__reset-button',
            textContent: 'Reset View',
            parent: header
        });
        resetButton.addEventListener('click', this._onResetView);
        
        // Create map viewport for scrolling/zooming
        this.mapViewport = DOMFactory.createElement('div', {
            className: 'rift-world-map__viewport',
            parent: this.mapContainer
        });
        
        // Create map image container for transforms
        this.mapImageContainer = DOMFactory.createElement('div', {
            className: 'rift-world-map__image-container',
            parent: this.mapViewport
        });
        
        // Create actual map image element
        this.mapImage = DOMFactory.createElement('div', {
            className: 'rift-world-map__image',
            parent: this.mapImageContainer
        });
        
        // If we have a map URL from config, set as background
        if (this.config.mapImageUrl) {
            this.mapImage.style.backgroundImage = `url(${this.config.mapImageUrl})`;
        }
        
        // Create areas container for region highlighting
        this.areasContainer = DOMFactory.createElement('div', {
            className: 'rift-world-map__areas',
            parent: this.mapImageContainer
        });
        
        // Create fog of war overlay if enabled
        if (this.config.enableFogOfWar !== false) {
            this.fogOfWar = DOMFactory.createElement('div', {
                className: 'rift-world-map__fog-of-war',
                parent: this.mapImageContainer
            });
        }
        
        // Create area labels container
        this.areaLabels = DOMFactory.createElement('div', {
            className: 'rift-world-map__area-labels',
            parent: this.mapImageContainer
        });
        
        // Create objectives container
        this.objectiveContainer = DOMFactory.createElement('div', {
            className: 'rift-world-map__objectives',
            parent: this.mapImageContainer
        });
        
        // Create waypoints container
        this.waypointContainer = DOMFactory.createElement('div', {
            className: 'rift-world-map__waypoints',
            parent: this.mapImageContainer
        });
        
        // Create player marker
        this.playerMarker = DOMFactory.createElement('div', {
            className: 'rift-world-map__player-marker',
            parent: this.mapImageContainer
        });
        
        // Direction indicator inside player marker
        DOMFactory.createElement('div', {
            className: 'rift-world-map__player-direction',
            parent: this.playerMarker
        });
        
        // Create legend container
        this.legendContainer = DOMFactory.createElement('div', {
            className: 'rift-world-map__legend',
            parent: this.element
        });
        
        // Create legend items
        const legendItems = [
            { label: 'Player', className: 'rift-world-map__legend-item--player' },
            { label: 'Objective', className: 'rift-world-map__legend-item--objective' },
            { label: 'Waypoint', className: 'rift-world-map__legend-item--waypoint' },
            { label: 'Discovered Area', className: 'rift-world-map__legend-item--discovered' },
            { label: 'Unexplored', className: 'rift-world-map__legend-item--unexplored' }
        ];
        
        legendItems.forEach(item => {
            const legendItem = DOMFactory.createElement('div', {
                className: `rift-world-map__legend-item ${item.className}`,
                parent: this.legendContainer
            });
            
            const indicator = DOMFactory.createElement('div', {
                className: 'rift-world-map__legend-indicator',
                parent: legendItem
            });
            
            DOMFactory.createElement('span', {
                textContent: item.label,
                parent: legendItem
            });
        });
        
        // Footer with controls info
        const footer = DOMFactory.createElement('div', {
            className: 'rift-world-map__footer',
            parent: this.element
        });
        
        // Instructions
        DOMFactory.createElement('div', {
            className: 'rift-world-map__instructions',
            textContent: 'Drag to pan • Mouse wheel to zoom • Click to set waypoint',
            parent: footer
        });
        
        // Create waypoint button
        const setWaypointButton = DOMFactory.createElement('button', {
            className: 'rift-world-map__waypoint-button',
            textContent: 'Set Waypoint',
            parent: footer
        });
        setWaypointButton.addEventListener('click', () => {
            // Default to center of currently visible map if no specific point selected
            const center = {
                x: this.mapViewport.offsetWidth / 2 - this.panOffset.x,
                y: this.mapViewport.offsetHeight / 2 - this.panOffset.y
            };
            this._onSetWaypoint(center);
        });
        
        // Create clear waypoints button
        const clearWaypointsButton = DOMFactory.createElement('button', {
            className: 'rift-world-map__clear-button',
            textContent: 'Clear Waypoints',
            parent: footer
        });
        clearWaypointsButton.addEventListener('click', this._onClearWaypoints);
    }
    
    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        if (!this.mapViewport) {
            console.warn('WorldMap: mapViewport not available for event listeners');
            return;
        }
        
        // Map panning (dragging)
        this.mapViewport.addEventListener('mousedown', this._onDragStart);
        document.addEventListener('mousemove', this._onDragMove);
        document.addEventListener('mouseup', this._onDragEnd);
        
        // Zooming with mouse wheel
        this.mapViewport.addEventListener('wheel', this._onMouseWheel);
        
        // Clicking on map to set waypoint
        this.mapViewport.addEventListener('click', (e) => {
            // Only set waypoint if not dragging
            if (!this.isDragging) {
                // Calculate map coordinates relative to mapImageContainer
                const rect = this.mapImageContainer.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this._onSetWaypoint({ x, y });
            }
        });
        
        // Register game event listeners
        this.registerEvents({
            'player:position': this._onPlayerPositionUpdate,
            'objective:added': this._onObjectiveAdded,
            'objective:completed': this._onObjectiveCompleted,
            'objective:updated': this._onObjectiveUpdated,
            'area:discovered': this._onAreaDiscovered,
            'area:entered': this._onAreaEntered,
            'waypoint:added': this._onWaypointAdded,
            'waypoint:removed': this._onWaypointRemoved,
            'waypoint:cleared': this._onWaypointsCleared
        });
    }
    
    /**
     * Bind class methods to the instance
     * @private
     */
    _bindMethods() {
        this._onZoomIn = this._onZoomIn.bind(this);
        this._onZoomOut = this._onZoomOut.bind(this);
        this._onResetView = this._onResetView.bind(this);
        this._onDragStart = this._onDragStart.bind(this);
        this._onDragMove = this._onDragMove.bind(this);
        this._onDragEnd = this._onDragEnd.bind(this);
        this._onMouseWheel = this._onMouseWheel.bind(this);
        this._onPlayerPositionUpdate = this._onPlayerPositionUpdate.bind(this);
        this._onObjectiveAdded = this._onObjectiveAdded.bind(this);
        this._onObjectiveCompleted = this._onObjectiveCompleted.bind(this);
        this._onObjectiveUpdated = this._onObjectiveUpdated.bind(this);
        this._onAreaDiscovered = this._onAreaDiscovered.bind(this);
        this._onAreaEntered = this._onAreaEntered.bind(this);
        this._onSetWaypoint = this._onSetWaypoint.bind(this);
        this._onWaypointAdded = this._onWaypointAdded.bind(this);
        this._onWaypointRemoved = this._onWaypointRemoved.bind(this);
        this._onClearWaypoints = this._onClearWaypoints.bind(this);
        this._onWaypointsCleared = this._onWaypointsCleared.bind(this);
    }
    
    /**
     * Load world data from the game
     * @private
     */
    _loadWorldData() {
        if (!this.world) {
            console.warn('WorldMap: No world reference provided');
            return;
        }
        
        // Load areas/regions if available
        if (this.world.mapData?.areas) {
            this._loadAreas(this.world.mapData.areas);
        }
        
        // Load objectives if available
        if (this.world.objectives) {
            this.objectives = this.world.objectives;
            this._renderObjectives();
        }
        
        // Load player initial position
        if (this.world.player) {
            this.currentPosition = this._worldToMapCoordinates(
                this.world.player.position.x,
                this.world.player.position.z
            );
            this._updatePlayerMarker();
        }
        
        // Load discovered areas if available
        if (this.world.discoveredAreas) {
            this.discoveredAreas = { ...this.world.discoveredAreas };
            this._updateFogOfWar();
        }
    }
    
    /**
     * Load map areas/regions
     * @private
     * @param {Array} areas - Area data
     */
    _loadAreas(areas) {
        if (!this.areasContainer || !this.areaLabels) {
            console.warn('WorldMap: Area containers not available');
            return;
        }
        
        areas.forEach(area => {
            // Create area element
            const areaElement = DOMFactory.createElement('div', {
                className: `rift-world-map__area ${area.discovered ? 'rift-world-map__area--discovered' : ''}`,
                attributes: {
                    'data-area-id': area.id
                },
                styles: {
                    left: `${area.bounds.x}px`,
                    top: `${area.bounds.y}px`,
                    width: `${area.bounds.width}px`,
                    height: `${area.bounds.height}px`
                },
                parent: this.areasContainer
            });
            
            // Create area label
            const labelElement = DOMFactory.createElement('div', {
                className: `rift-world-map__area-label ${area.discovered ? 'rift-world-map__area-label--discovered' : 'rift-world-map__area-label--hidden'}`,
                textContent: area.name,
                attributes: {
                    'data-area-id': area.id
                },
                styles: {
                    left: `${area.labelPosition?.x || area.bounds.x + area.bounds.width / 2}px`,
                    top: `${area.labelPosition?.y || area.bounds.y + area.bounds.height / 2}px`
                },
                parent: this.areaLabels
            });
            
            // If area is already discovered, add to discovered areas
            if (area.discovered) {
                this.discoveredAreas[area.id] = true;
            }
        });
    }
    
    /**
     * Convert world coordinates to map coordinates
     * @private
     * @param {number} worldX - World X coordinate
     * @param {number} worldZ - World Z coordinate (Y in 2D map)
     * @returns {Object} Map coordinates {x, y}
     */
    _worldToMapCoordinates(worldX, worldZ) {
        // This implementation depends on the specific mapping between game world and map
        // For now, using a simple scaling factor from the config
        const scale = this.config.worldToMapScale || 1;
        
        return {
            x: worldX * scale + (this.config.mapOriginOffset?.x || 0),
            y: worldZ * scale + (this.config.mapOriginOffset?.y || 0)
        };
    }
    
    /**
     * Convert map coordinates to world coordinates
     * @private
     * @param {number} mapX - Map X coordinate
     * @param {number} mapY - Map Y coordinate
     * @returns {Object} World coordinates {x, z}
     */
    _mapToWorldCoordinates(mapX, mapY) {
        // Inverse of worldToMapCoordinates
        const scale = this.config.worldToMapScale || 1;
        
        return {
            x: (mapX - (this.config.mapOriginOffset?.x || 0)) / scale,
            z: (mapY - (this.config.mapOriginOffset?.y || 0)) / scale
        };
    }
    
    /**
     * Update player marker position and rotation
     * @private
     */
    _updatePlayerMarker() {
        if (!this.playerMarker) return;
        
        // Position the marker
        this.playerMarker.style.transform = `translate(${this.currentPosition.x}px, ${this.currentPosition.y}px)`;
        
        // Update player direction indicator if we have rotation
        if (this.world?.player?.rotation?.y !== undefined) {
            const directionIndicator = this.playerMarker.querySelector('.rift-world-map__player-direction');
            if (directionIndicator) {
                directionIndicator.style.transform = `rotate(${this.world.player.rotation.y}rad)`;
            }
        }
        
        // Center map on player if option enabled
        if (this.config.centerOnPlayer) {
            this._centerOnPlayer();
        }
    }
    
    /**
     * Center the map view on the player
     * @private
     */
    _centerOnPlayer() {
        if (!this.mapViewport || !this.currentPosition) return;
        
        const viewportWidth = this.mapViewport.offsetWidth;
        const viewportHeight = this.mapViewport.offsetHeight;
        
        this.panOffset = {
            x: (viewportWidth / 2) - this.currentPosition.x * this.currentZoom,
            y: (viewportHeight / 2) - this.currentPosition.y * this.currentZoom
        };
        
        this._updateMapTransform();
    }
    
    /**
     * Update map transform based on zoom and pan
     * @private
     */
    _updateMapTransform() {
        if (!this.mapImageContainer) return;
        
        this.mapImageContainer.style.transform = `translate(${this.panOffset.x}px, ${this.panOffset.y}px) scale(${this.currentZoom})`;
        
        // Update zoom level indicator
        if (this.zoomLevelIndicator) {
            this.zoomLevelIndicator.textContent = `${Math.round(this.currentZoom * 100)}%`;
        }
    }
    
    /**
     * Render objectives on the map
     * @private
     */
    _renderObjectives() {
        if (!this.objectiveContainer) return;
        
        // Clear existing objectives
        this.objectiveContainer.innerHTML = '';
        
        // Render each objective
        this.objectives.forEach(objective => {
            if (!objective.position) return;
            
            // Convert objective position to map coordinates
            const mapPos = this._worldToMapCoordinates(
                objective.position.x,
                objective.position.z
            );
            
            // Create objective marker
            const objectiveElement = DOMFactory.createElement('div', {
                className: `rift-world-map__objective ${objective.completed ? 'rift-world-map__objective--completed' : ''} ${objective.primary ? 'rift-world-map__objective--primary' : 'rift-world-map__objective--secondary'}`,
                attributes: {
                    'data-objective-id': objective.id,
                    'title': objective.title || 'Objective'
                },
                styles: {
                    transform: `translate(${mapPos.x}px, ${mapPos.y}px)`
                },
                parent: this.objectiveContainer
            });
            
            // Add click handler for objective details
            objectiveElement.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent waypoint creation
                this._showObjectiveDetails(objective);
            });
            
            // Add objective label
            if (objective.title) {
                DOMFactory.createElement('div', {
                    className: 'rift-world-map__objective-label',
                    textContent: objective.title,
                    parent: objectiveElement
                });
            }
            
            // Add objective icon based on type
            const iconClass = `rift-world-map__objective-icon rift-world-map__objective-icon--${objective.type || 'default'}`;
            DOMFactory.createElement('div', {
                className: iconClass,
                parent: objectiveElement
            });
        });
    }
    
    /**
     * Show objective details
     * @private
     * @param {Object} objective - Objective data
     */
    _showObjectiveDetails(objective) {
        EventManager.emit('ui:showModal', {
            id: 'objective-details',
            options: {
                data: objective
            }
        });
    }
    
    /**
     * Update fog of war based on discovered areas
     * @private
     */
    _updateFogOfWar() {
        if (!this.fogOfWar || !this.config.enableFogOfWar) return;
        
        // Update area elements
        const areaElements = this.areasContainer?.querySelectorAll('.rift-world-map__area') || [];
        areaElements.forEach(areaElement => {
            const areaId = areaElement.getAttribute('data-area-id');
            if (this.discoveredAreas[areaId]) {
                areaElement.classList.add('rift-world-map__area--discovered');
            }
        });
        
        // Update area labels
        const labelElements = this.areaLabels?.querySelectorAll('.rift-world-map__area-label') || [];
        labelElements.forEach(labelElement => {
            const areaId = labelElement.getAttribute('data-area-id');
            if (this.discoveredAreas[areaId]) {
                labelElement.classList.remove('rift-world-map__area-label--hidden');
                labelElement.classList.add('rift-world-map__area-label--discovered');
            }
        });
    }
    
    /**
     * Render waypoints on the map
     * @private
     */
    _renderWaypoints() {
        if (!this.waypointContainer) return;
        
        // Clear existing waypoints
        this.waypointContainer.innerHTML = '';
        
        // Render each waypoint
        this.waypoints.forEach((waypoint, index) => {
            // Create waypoint marker
            const waypointElement = DOMFactory.createElement('div', {
                className: `rift-world-map__waypoint ${waypoint.active ? 'rift-world-map__waypoint--active' : ''}`,
                attributes: {
                    'data-waypoint-id': waypoint.id || index,
                    'title': waypoint.name || `Waypoint ${index + 1}`
                },
                styles: {
                    transform: `translate(${waypoint.x}px, ${waypoint.y}px)`
                },
                parent: this.waypointContainer
            });
            
            // Add waypoint label if it has a name
            if (waypoint.name) {
                DOMFactory.createElement('div', {
                    className: 'rift-world-map__waypoint-label',
                    textContent: waypoint.name,
                    parent: waypointElement
                });
            }
            
            // Add context menu on right click
            waypointElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this._showWaypointContextMenu(waypoint, e.clientX, e.clientY);
            });
        });
    }
    
    /**
     * Show waypoint context menu
     * @private
     * @param {Object} waypoint - Waypoint data
     * @param {number} x - Client X position
     * @param {number} y - Client Y position
     */
    _showWaypointContextMenu(waypoint, x, y) {
        // Create context menu element
        const contextMenu = DOMFactory.createElement('div', {
            className: 'rift-world-map__context-menu',
            styles: {
                left: `${x}px`,
                top: `${y}px`
            },
            appendToBody: true
        });
        
        // Add menu items
        const setActiveItem = DOMFactory.createElement('div', {
            className: 'rift-world-map__context-menu-item',
            textContent: 'Set as Active Waypoint',
            parent: contextMenu
        });
        setActiveItem.addEventListener('click', () => {
            this._setActiveWaypoint(waypoint);
            this._removeContextMenu();
        });
        
        const renameItem = DOMFactory.createElement('div', {
            className: 'rift-world-map__context-menu-item',
            textContent: 'Rename Waypoint',
            parent: contextMenu
        });
        renameItem.addEventListener('click', () => {
            this._renameWaypoint(waypoint);
            this._removeContextMenu();
        });
        
        const removeItem = DOMFactory.createElement('div', {
            className: 'rift-world-map__context-menu-item',
            textContent: 'Remove Waypoint',
            parent: contextMenu
        });
        removeItem.addEventListener('click', () => {
            this._removeWaypoint(waypoint);
            this._removeContextMenu();
        });
        
        // Handle click outside to close
        setTimeout(() => {
            document.addEventListener('click', this._removeContextMenu);
        }, 0);
    }
    
    /**
     * Remove context menu
     * @private
     */
    _removeContextMenu() {
        const menu = document.querySelector('.rift-world-map__context-menu');
        if (menu) {
            menu.parentNode.removeChild(menu);
        }
        document.removeEventListener('click', this._removeContextMenu);
    }
    
    /**
     * Set active waypoint
     * @private
     * @param {Object} waypoint - Waypoint to activate
     */
    _setActiveWaypoint(waypoint) {
        // Deactivate all waypoints
        this.waypoints.forEach(wp => wp.active = false);
        
        // Activate the selected waypoint
        waypoint.active = true;
        
        // Emit event for game systems
        EventManager.emit('waypoint:activated', {
            id: waypoint.id,
            position: this._mapToWorldCoordinates(waypoint.x, waypoint.y)
        });
        
        // Update waypoint rendering
        this._renderWaypoints();
    }
    
    /**
     * Rename waypoint
     * @private
     * @param {Object} waypoint - Waypoint to rename
     */
    _renameWaypoint(waypoint) {
        // Use modal to get new name
        EventManager.emit('ui:showModal', {
            id: 'rename-waypoint',
            options: {
                data: {
                    waypoint,
                    callback: (newName) => {
                        waypoint.name = newName;
                        this._renderWaypoints();
                        
                        // Emit event
                        EventManager.emit('waypoint:updated', {
                            id: waypoint.id,
                            name: newName
                        });
                    }
                }
            }
        });
    }
    
    /**
     * Remove a waypoint
     * @private
     * @param {Object} waypoint - Waypoint to remove
     */
    _removeWaypoint(waypoint) {
        const index = this.waypoints.findIndex(wp => wp === waypoint);
        if (index !== -1) {
            this.waypoints.splice(index, 1);
            
            // Emit event
            EventManager.emit('waypoint:removed', {
                id: waypoint.id
            });
            
            // Update waypoint rendering
            this._renderWaypoints();
        }
    }
    
    /**
     * Update the component (called each frame)
     * @param {number} delta - Time since last frame in seconds
     */
    update(delta) {
        // No regular updates needed for now
        return this;
    }
    
    /**
     * Clean up resources when component is disposed
     */
    dispose() {
        // Remove event listeners
        document.removeEventListener('mousemove', this._onDragMove);
        document.removeEventListener('mouseup', this._onDragEnd);
        
        // Call parent dispose method to handle common cleanup
        super.dispose();
    }
    
    /**
     * Public Methods
     */
    
    /**
     * Focus on a specific area
     * @public
     * @param {string} areaId - Area identifier
     */
    focusOnArea(areaId) {
        const areaElement = this.areasContainer?.querySelector(`[data-area-id="${areaId}"]`);
        if (areaElement) {
            // Calculate area center
            const bounds = areaElement.getBoundingClientRect();
            const centerX = bounds.left + bounds.width / 2;
            const centerY = bounds.top + bounds.height / 2;
            
            // Center map on area
            if (this.mapViewport) {
                const viewportWidth = this.mapViewport.offsetWidth;
                const viewportHeight = this.mapViewport.offsetHeight;
                
                this.panOffset = {
                    x: (viewportWidth / 2) - centerX,
                    y: (viewportHeight / 2) - centerY
                };
                
                this._updateMapTransform();
            }
        }
    }
    
    /**
     * Highlight an objective
     * @public
     * @param {string} objectiveId - Objective identifier
     */
    highlightObjective(objectiveId) {
        // Remove existing highlights
        const objectives = this.objectiveContainer?.querySelectorAll('.rift-world-map__objective') || [];
        objectives.forEach(obj => obj.classList.remove('rift-world-map__objective--highlighted'));
        
        // Add highlight to target objective
        const targetObjective = this.objectiveContainer?.querySelector(`[data-objective-id="${objectiveId}"]`);
        if (targetObjective) {
            targetObjective.classList.add('rift-world-map__objective--highlighted');
        }
    }
    
    /**
     * Event Handlers
     */
    
    /**
     * Handle zoom in button click
     * @private
     */
    _onZoomIn() {
        this.currentZoom = Math.min(this.maxZoom, this.currentZoom + this.zoomStep);
        this._updateMapTransform();
    }
    
    /**
     * Handle zoom out button click
     * @private
     */
    _onZoomOut() {
        this.currentZoom = Math.max(this.minZoom, this.currentZoom - this.zoomStep);
        this._updateMapTransform();
    }
    
    /**
     * Handle reset view button click
     * @private
     */
    _onResetView() {
        this.currentZoom = 1;
        this.panOffset = { x: 0, y: 0 };
        
        if (this.config.centerOnPlayer && this.currentPosition) {
            this._centerOnPlayer();
        } else {
            this._updateMapTransform();
        }
    }
    
    /**
     * Handle drag start
     * @private
     * @param {MouseEvent} e - Mouse event
     */
    _onDragStart(e) {
        // Only start dragging on left mouse button
        if (e.button !== 0) return;
        
        this.isDragging = true;
        this.dragStart = {
            x: e.clientX - this.panOffset.x,
            y: e.clientY - this.panOffset.y
        };
        
        // Prevent text selection during drag
        e.preventDefault();
    }
    
    /**
     * Handle drag move
     * @private
     * @param {MouseEvent} e - Mouse event
     */
    _onDragMove(e) {
        if (!this.isDragging) return;
        
        this.panOffset = {
            x: e.clientX - this.dragStart.x,
            y: e.clientY - this.dragStart.y
        };
        
        this._updateMapTransform();
    }
    
    /**
     * Handle drag end
     * @private
     * @param {MouseEvent} e - Mouse event
     */
    _onDragEnd(e) {
        // Only process if we were dragging
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        // Small timeout to prevent click events from firing immediately after drag
        setTimeout(() => {
            this.isDragging = false;
        }, 50);
    }
    
    /**
     * Handle mouse wheel for zooming
     * @private
     * @param {WheelEvent} e - Wheel event
     */
    _onMouseWheel(e) {
        e.preventDefault();
        
        // Determine zoom direction
        const zoomAmount = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
        
        // Calculate new zoom level
        const newZoom = Math.max(
            this.minZoom,
            Math.min(this.maxZoom, this.currentZoom + zoomAmount)
        );
        
        // Only proceed if zoom actually changes
        if (newZoom === this.currentZoom) return;
        
        // Get mouse position relative to viewport
        const rect = this.mapViewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate point under mouse in map coordinates before zoom
        const mapX = (mouseX - this.panOffset.x) / this.currentZoom;
        const mapY = (mouseY - this.panOffset.y) / this.currentZoom;
        
        // Update zoom level
        this.currentZoom = newZoom;
        
        // Calculate new offset to keep point under mouse
        this.panOffset = {
            x: mouseX - mapX * this.currentZoom,
            y: mouseY - mapY * this.currentZoom
        };
        
        this._updateMapTransform();
    }
    
    /**
     * Handle player position update
     * @private
     * @param {Object} data - Player position data
     */
    _onPlayerPositionUpdate(data) {
        if (!data || !data.position) return;
        
        this.currentPosition = this._worldToMapCoordinates(
            data.position.x,
            data.position.z
        );
        
        this._updatePlayerMarker();
    }
    
    /**
     * Handle objective added event
     * @private
     * @param {Object} data - Objective data
     */
    _onObjectiveAdded(data) {
        if (!data || !data.objective) return;
        
        // Add to objectives array
        this.objectives.push(data.objective);
        
        // Re-render objectives
        this._renderObjectives();
    }
    
    /**
     * Handle objective completed event
     * @private
     * @param {Object} data - Objective data
     */
    _onObjectiveCompleted(data) {
        if (!data || !data.id) return;
        
        // Find and update objective
        const objective = this.objectives.find(obj => obj.id === data.id);
        if (objective) {
            objective.completed = true;
            
            // Re-render objectives
            this._renderObjectives();
        }
    }
    
    /**
     * Handle objective updated event
     * @private
     * @param {Object} data - Objective data
     */
    _onObjectiveUpdated(data) {
        if (!data || !data.objective) return;
        
        // Find and update objective
        const index = this.objectives.findIndex(obj => obj.id === data.objective.id);
        if (index !== -1) {
            this.objectives[index] = data.objective;
        } else {
            // If not found, add it
            this.objectives.push(data.objective);
        }
        
        // Re-render objectives
        this._renderObjectives();
    }
    
    /**
     * Handle area discovered event
     * @private
     * @param {Object} data - Area data
     */
    _onAreaDiscovered(data) {
        if (!data || !data.areaId) return;
        
        // Mark area as discovered
        this.discoveredAreas[data.areaId] = true;
        
        // Update fog of war
        this._updateFogOfWar();
    }
    
    /**
     * Handle area entered event
     * @private
     * @param {Object} data - Area data
     */
    _onAreaEntered(data) {
        if (!data || !data.areaId) return;
        
        // Update current area
        this.currentArea = data.areaId;
        
        // Highlight current area if we want to
        if (this.config.highlightCurrentArea) {
            // Remove highlight from all areas
            const areaElements = this.areasContainer?.querySelectorAll('.rift-world-map__area') || [];
            areaElements.forEach(area => {
                area.classList.remove('rift-world-map__area--current');
            });
            
            // Add highlight to current area
            const currentArea = this.areasContainer?.querySelector(`[data-area-id="${data.areaId}"]`);
            if (currentArea) {
                currentArea.classList.add('rift-world-map__area--current');
            }
        }
    }
    
    /**
     * Handle set waypoint
     * @private
     * @param {Object} position - Map coordinates {x, y}
     */
    _onSetWaypoint(position) {
        // Create waypoint with unique ID
        const waypoint = {
            id: `waypoint-${Date.now()}`,
            x: position.x,
            y: position.y,
            active: true,
            name: `Waypoint ${this.waypoints.length + 1}`
        };
        
        // Deactivate any existing waypoints
        this.waypoints.forEach(wp => wp.active = false);
        
        // Add new waypoint
        this.waypoints.push(waypoint);
        
        // Render waypoints
        this._renderWaypoints();
        
        // Emit event for game systems
        EventManager.emit('waypoint:added', {
            id: waypoint.id,
            position: this._mapToWorldCoordinates(waypoint.x, waypoint.y),
            name: waypoint.name
        });
    }
    
    /**
     * Handle waypoint added event
     * @private
     * @param {Object} data - Waypoint data
     */
    _onWaypointAdded(data) {
        if (!data || !data.position) return;
        
        // Convert world position to map coordinates if necessary
        let mapPosition;
        if (data.position.x !== undefined && data.position.z !== undefined) {
            mapPosition = this._worldToMapCoordinates(data.position.x, data.position.z);
        } else {
            mapPosition = data.position;
        }
        
        // Create waypoint
        const waypoint = {
            id: data.id || `waypoint-${Date.now()}`,
            x: mapPosition.x,
            y: mapPosition.y,
            active: data.active !== false,
            name: data.name || `Waypoint ${this.waypoints.length + 1}`
        };
        
        // If this waypoint will be active, deactivate others
        if (waypoint.active) {
            this.waypoints.forEach(wp => wp.active = false);
        }
        
        // Add waypoint
        this.waypoints.push(waypoint);
        
        // Render waypoints
        this._renderWaypoints();
    }
    
    /**
     * Handle waypoint removed event
     * @private
     * @param {Object} data - Waypoint data
     */
    _onWaypointRemoved(data) {
        if (!data || !data.id) return;
        
        // Find and remove waypoint
        const index = this.waypoints.findIndex(wp => wp.id === data.id);
        if (index !== -1) {
            this.waypoints.splice(index, 1);
            
            // Render waypoints
            this._renderWaypoints();
        }
    }
    
    /**
     * Handle clear waypoints button click
     * @private
     */
    _onClearWaypoints() {
        this.waypoints = [];
        
        // Render waypoints (clears container)
        this._renderWaypoints();
        
        // Emit event for game systems
        EventManager.emit('waypoint:cleared', {});
    }
    
    /**
     * Handle waypoints cleared event
     * @private
     */
    _onWaypointsCleared() {
        this.waypoints = [];
        
        // Render waypoints (clears container)
        this._renderWaypoints();
    }
}