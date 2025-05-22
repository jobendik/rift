/**
 * WeatherSystem.js
 * 
 * Manages weather effects in the game, including rain, snow, fog, and lightning.
 * Handles both visual effects and their integration with game systems.
 */

import UIComponent from '../UIComponent.js';
import { EventManager } from '../../../core/EventManager.js';

class WeatherSystem extends UIComponent {
    /**
     * Creates a new WeatherSystem instance.
     * @param {Object} options - Configuration options
     * @param {World} options.world - World instance
     */
    constructor(options = {}) {
        super({
            id: 'weather-system',
            className: 'rift-weather',
            template: `
                <div class="rift-weather__rain"></div>
                <div class="rift-weather__snow"></div>
                <div class="rift-weather__fog"></div>
                <div class="rift-weather__screen-effect"></div>
                <div class="rift-weather__lightning"></div>
                <div class="rift-weather__overlay"></div>
            `,
            container: options.container || document.body,
            autoInit: false, // Prevent auto-initialization
            ...options
        });

        this.world = options.world;
        
        // Get config with fallbacks to prevent undefined errors
        this.config = this._getConfig();
        this.weatherConfig = this.config.weather || {};
        this.currentType = 'clear';
        this.currentIntensity = 'none';
        this.isInitialized = false;
        this.isPaused = false;
        this.isTransitioning = false;
        this.transitionTimer = 0;
        this.lightningTimer = 0;
        this.particles = {
            rain: [],
            snow: []
        };
        this.fogLayers = [];
        this.audioSources = {};
        
        // Weather element references
        this.elements = {
            rain: null,
            snow: null,
            fog: null,
            lightning: null,
            screenEffect: null,
            overlay: null
        };

        // Bind methods
        this._updateRain = this._updateRain.bind(this);
        this._updateSnow = this._updateSnow.bind(this);
        this._updateFog = this._updateFog.bind(this);
        this._updateLightning = this._updateLightning.bind(this);
        this._onResize = this._onResize.bind(this);
        this._onViewportChange = this._onViewportChange.bind(this);
    }

    /**
     * Initialize the weather system
     */
    /**
     * Get configuration with fallbacks
     * @private
     * @returns {Object} Configuration object
     */
    _getConfig() {
        let config = {};
        try {
            // Try to access UIConfig if available
            if (typeof UIConfig !== 'undefined') {
                config = UIConfig || {};
            }
        } catch (error) {
            console.warn('UIConfig not available, using weather system defaults');
        }

        // Create default weather config if not available
        if (!config.weather) {
            config.weather = {
                transitionDuration: 2,
                audio: { enabled: false },
                rain: {
                    dropCount: { light: 100, moderate: 200, heavy: 300, storm: 400 },
                    dropHeight: { min: 10, max: 20 },
                    dropAngle: { min: 70, max: 85 },
                    dropDrift: { min: 5, max: 20 },
                    duration: { min: 0.5, max: 1.5 },
                    opacity: { min: 0.5, max: 0.8 },
                    appliesScreenOverlay: true
                },
                snow: {
                    flakeCount: { light: 50, moderate: 100, heavy: 200, storm: 300 },
                    flakeSize: { min: 2, max: 5 },
                    horizontalDrift: { min: 10, max: 30 },
                    duration: { min: 3, max: 8 },
                    wobbleAmount: { min: 5, max: 15 },
                    opacity: { min: 0.4, max: 0.9 },
                    appliesScreenOverlay: true
                },
                fog: {
                    layerCount: 3,
                    layerOpacity: { min: 0.2, max: 0.6 },
                    driftSpeed: { min: 5, max: 15 },
                    density: { light: 0.3, moderate: 0.5, heavy: 0.7, storm: 0.9 },
                    appliesScreenOverlay: true
                },
                lightning: {
                    enabled: true,
                    interval: { min: 3, max: 15 },
                    flashCount: { min: 1, max: 3 },
                    flashDuration: { min: 0.1, max: 0.3 },
                    flashIntensity: { min: 0.3, max: 0.8 },
                    thunderDelay: { min: 0.2, max: 2 },
                    screenShakeEnabled: true,
                    screenShakeIntensity: 0.3
                }
            };
        }
        
        return config;
    }

    init() {
        if (this.isInitialized) return this;

        // Call parent init first
        super.init();
        
        // Set initialized flag early to prevent infinite recursion
        this.isInitialized = true;

        // Get element references
        this.elements.rain = this.element.querySelector('.rift-weather__rain');
        this.elements.snow = this.element.querySelector('.rift-weather__snow');
        this.elements.fog = this.element.querySelector('.rift-weather__fog');
        this.elements.lightning = this.element.querySelector('.rift-weather__lightning');
        this.elements.screenEffect = this.element.querySelector('.rift-weather__screen-effect');
        this.elements.overlay = this.element.querySelector('.rift-weather__overlay');

        // Register events
        this.registerEvents({
            'window:resize': this._onResize,
            'viewport:change': this._onViewportChange
        });

        // Initial setup
        this._setupFogLayers();
        this.setWeatherType('clear');
        
        this.isInitialized = true;
        return this;
    }

    /**
     * Update the weather system
     * @param {number} delta - Time elapsed since last update in seconds
     */
    update(delta) {
        if (!this.isInitialized || !this.isVisible || this.isPaused) return;

        // Handle weather transitions
        if (this.isTransitioning) {
            this.transitionTimer -= delta;
            if (this.transitionTimer <= 0) {
                this.isTransitioning = false;
            }
        }

        // Update current weather effects
        switch (this.currentType) {
            case 'rain':
                this._updateRain(delta);
                break;
            case 'snow':
                this._updateSnow(delta);
                break;
            case 'fog':
                this._updateFog(delta);
                break;
        }

        // Update lightning for storm conditions
        if (this.currentIntensity === 'storm' && 
            (this.currentType === 'rain' || this.currentType === 'snow')) {
            this._updateLightning(delta);
        }
    }

    /**
     * Set the current weather type and intensity
     * @param {string} type - Weather type ('rain', 'snow', 'fog', 'clear')
     * @param {string} intensity - Weather intensity ('light', 'moderate', 'heavy', 'storm')
     */
    setWeatherType(type = 'clear', intensity = 'moderate') {
        // Validate inputs
        const validTypes = ['rain', 'snow', 'fog', 'clear'];
        const validIntensities = ['light', 'moderate', 'heavy', 'storm'];
        
        if (!validTypes.includes(type)) {
            console.warn(`[WeatherSystem] Invalid weather type: ${type}`);
            type = 'clear';
        }
        
        if (type !== 'clear' && !validIntensities.includes(intensity)) {
            console.warn(`[WeatherSystem] Invalid weather intensity: ${intensity}`);
            intensity = 'moderate';
        }

        // Skip if same weather and intensity
        if (this.currentType === type && this.currentIntensity === intensity && !this.isPaused) {
            return this;
        }

        // Clear previous weather styles
        this.element.classList.remove(
            'rift-weather--rain',
            'rift-weather--snow',
            'rift-weather--fog',
            'rift-weather--light',
            'rift-weather--moderate',
            'rift-weather--heavy',
            'rift-weather--storm'
        );

        // Clear screen effects
        this.elements.screenEffect.classList.remove(
            'rift-weather__screen-effect--rain',
            'rift-weather__screen-effect--snow',
            'rift-weather__screen-effect--fog'
        );

        // Clear screen overlays
        this.elements.overlay.classList.remove(
            'rift-weather__overlay--rain'
        );

        // Update current weather properties
        this.currentType = type;
        this.currentIntensity = type === 'clear' ? 'none' : intensity;

        if (type !== 'clear') {
            // Start transition
            this.isTransitioning = true;
            this.transitionTimer = this.weatherConfig.transitionDuration;

            // Add appropriate classes
            this.element.classList.add(`rift-weather--${type}`);
            this.element.classList.add(`rift-weather--${intensity}`);
            
            // Set up specific weather
            switch (type) {
                case 'rain':
                    this._setupRain();
                    
                    // Apply screen effect for rain
                    if (this.weatherConfig.rain.appliesScreenOverlay) {
                        this.elements.screenEffect.classList.add('rift-weather__screen-effect--rain');
                        this.elements.overlay.classList.add('rift-weather__overlay--rain');
                    }
                    break;
                    
                case 'snow':
                    this._setupSnow();
                    
                    // Apply screen effect for snow
                    if (this.weatherConfig.snow.appliesScreenOverlay) {
                        this.elements.screenEffect.classList.add('rift-weather__screen-effect--snow');
                    }
                    break;
                    
                case 'fog':
                    this._updateFogIntensity();
                    
                    // Apply screen effect for fog
                    if (this.weatherConfig.fog.appliesScreenOverlay) {
                        this.elements.screenEffect.classList.add('rift-weather__screen-effect--fog');
                    }
                    break;
            }

            // Start audio if enabled
            if (this.weatherConfig.audio?.enabled) {
                this._setupAudio();
            }
        } else {
            // Clear weather
            this._clearRain();
            this._clearSnow();
            
            // Stop all audio
            if (this.weatherConfig.audio?.enabled) {
                this._stopAudio();
            }
        }

        // Emit weather change event
        EventManager.emit('weather:changed', {
            type: this.currentType,
            intensity: this.currentIntensity,
            transition: this.isTransitioning
        });

        return this;
    }

    /**
     * Pause weather effects (for game pause)
     */
    pause() {
        if (this.isPaused) return this;
        
        this.isPaused = true;
        
        // Pause CSS animations
        this.element.style.animationPlayState = 'paused';
        this.elements.rain.style.animationPlayState = 'paused';
        this.elements.snow.style.animationPlayState = 'paused';
        this.elements.fog.style.animationPlayState = 'paused';
        
        // Pause all child elements
        const animatedElements = this.element.querySelectorAll('[class*="rift-weather__"]');
        animatedElements.forEach(el => {
            el.style.animationPlayState = 'paused';
        });

        // Pause audio
        if (this.weatherConfig.audio?.enabled) {
            this._pauseAudio();
        }
        
        return this;
    }

    /**
     * Resume weather effects (when game unpauses)
     */
    resume() {
        if (!this.isPaused) return this;
        
        this.isPaused = false;
        
        // Resume CSS animations
        this.element.style.animationPlayState = 'running';
        this.elements.rain.style.animationPlayState = 'running';
        this.elements.snow.style.animationPlayState = 'running';
        this.elements.fog.style.animationPlayState = 'running';
        
        // Resume all child elements
        const animatedElements = this.element.querySelectorAll('[class*="rift-weather__"]');
        animatedElements.forEach(el => {
            el.style.animationPlayState = 'running';
        });
        
        // Resume audio
        if (this.weatherConfig.audio?.enabled) {
            this._resumeAudio();
        }
        
        return this;
    }

    /**
     * Handle window resize events
     * @private
     */
    _onResize() {
        this._clearRain();
        this._clearSnow();
        
        if (this.currentType === 'rain') {
            this._setupRain();
        } else if (this.currentType === 'snow') {
            this._setupSnow();
        }
    }

    /**
     * Handle viewport changes (rotation, size)
     * @private
     */
    _onViewportChange() {
        this._onResize();
    }

    /**
     * Set up rain particles
     * @private
     */
    _setupRain() {
        // Clear existing rain
        this._clearRain();
        
        // Get drop count based on intensity
        const config = this.weatherConfig.rain;
        let dropCount = config.dropCount[this.currentIntensity];
        
        // Create rain drops
        for (let i = 0; i < dropCount; i++) {
            const drop = document.createElement('div');
            drop.className = 'rift-weather__raindrop';
            
            // Set random properties using CSS variables
            const height = this._getRandomRange(config.dropHeight.min, config.dropHeight.max);
            const angle = this._getRandomRange(config.dropAngle.min, config.dropAngle.max);
            const drift = this._getRandomRange(config.dropDrift.min, config.dropDrift.max);
            const duration = this._getRandomRange(config.duration.min, config.duration.max);
            const delay = Math.random();
            const opacity = this._getRandomRange(config.opacity.min, config.opacity.max);
            
            drop.style.setProperty('--drop-height', height);
            drop.style.setProperty('--drop-angle', angle);
            drop.style.setProperty('--drop-drift', drift);
            drop.style.setProperty('--rift-rain-duration', `${duration}s`);
            drop.style.setProperty('--drop-delay', delay);
            drop.style.opacity = opacity;
            
            // Position randomly
            drop.style.left = `${Math.random() * 100}%`;
            drop.style.top = `${Math.random() * 100}%`;
            
            // Add to container
            this.elements.rain.appendChild(drop);
            this.particles.rain.push(drop);
        }
    }

    /**
     * Clear rain particles
     * @private
     */
    _clearRain() {
        while (this.elements.rain.firstChild) {
            this.elements.rain.removeChild(this.elements.rain.firstChild);
        }
        this.particles.rain = [];
    }

    /**
     * Set up snow particles
     * @private
     */
    _setupSnow() {
        // Clear existing snow
        this._clearSnow();
        
        // Get flake count based on intensity
        const config = this.weatherConfig.snow;
        let flakeCount = config.flakeCount[this.currentIntensity];
        
        // Create snowflakes
        for (let i = 0; i < flakeCount; i++) {
            const flake = document.createElement('div');
            flake.className = 'rift-weather__snowflake';
            
            // Set random properties using CSS variables
            const size = this._getRandomRange(config.flakeSize.min, config.flakeSize.max);
            const drift = this._getRandomRange(config.horizontalDrift.min, config.horizontalDrift.max);
            const duration = this._getRandomRange(config.duration.min, config.duration.max);
            const delay = Math.random();
            const wobble = this._getRandomRange(config.wobbleAmount.min, config.wobbleAmount.max);
            const opacity = this._getRandomRange(config.opacity.min, config.opacity.max);
            
            flake.style.setProperty('--flake-size', size);
            flake.style.setProperty('--flake-drift', drift);
            flake.style.setProperty('--rift-snow-duration', `${duration}s`);
            flake.style.setProperty('--flake-delay', delay);
            flake.style.setProperty('--flake-wobble', wobble);
            flake.style.opacity = opacity;
            
            // Position randomly
            flake.style.left = `${Math.random() * 100}%`;
            flake.style.top = `${Math.random() * 100}%`;
            
            // Add to container
            this.elements.snow.appendChild(flake);
            this.particles.snow.push(flake);
        }
    }

    /**
     * Clear snow particles
     * @private
     */
    _clearSnow() {
        while (this.elements.snow.firstChild) {
            this.elements.snow.removeChild(this.elements.snow.firstChild);
        }
        this.particles.snow = [];
    }

    /**
     * Set up fog layers for parallax effect
     * @private
     */
    _setupFogLayers() {
        // Clear existing fog layers
        this._clearFogLayers();
        
        const config = this.weatherConfig.fog;
        const layerCount = config.layerCount || 3;
        
        // Create fog layers for parallax effect
        for (let i = 0; i < layerCount; i++) {
            const layer = document.createElement('div');
            layer.className = 'rift-weather__fog-layer';
            
            // Set layer-specific properties
            const opacity = this._getRandomRange(config.layerOpacity.min, config.layerOpacity.max);
            const speed = this._getRandomRange(config.driftSpeed.min, config.driftSpeed.max);
            const offset = i * 33; // Distribute initial positions
            
            layer.style.setProperty('--layer-opacity', opacity);
            layer.style.setProperty('--layer-speed', speed);
            layer.style.setProperty('--layer-offset', offset);
            
            // Offset vertically
            layer.style.top = `${(i * 100 / layerCount)}%`;
            layer.style.height = `${100 / layerCount * 2}%`; // Overlap layers
            
            // Add to container
            this.elements.fog.appendChild(layer);
            this.fogLayers.push(layer);
        }
    }

    /**
     * Clear fog layers
     * @private
     */
    _clearFogLayers() {
        while (this.elements.fog.firstChild) {
            this.elements.fog.removeChild(this.elements.fog.firstChild);
        }
        this.fogLayers = [];
    }

    /**
     * Update fog intensity based on current intensity setting
     * @private
     */
    _updateFogIntensity() {
        if (!this.isInitialized) return;
        
        const config = this.weatherConfig.fog;
        const density = config.density[this.currentIntensity];
        
        // Set base fog density
        this.elements.fog.style.setProperty('--rift-fog-density', density);
    }

    /**
     * Update rain animation
     * @param {number} delta - Time elapsed since last update
     * @private
     */
    _updateRain(delta) {
        // Dynamic updates for rain if needed
    }

    /**
     * Update snow animation
     * @param {number} delta - Time elapsed since last update
     * @private
     */
    _updateSnow(delta) {
        // Dynamic updates for snow if needed
    }

    /**
     * Update fog animation
     * @param {number} delta - Time elapsed since last update
     * @private
     */
    _updateFog(delta) {
        // Dynamic updates for fog if needed
    }

    /**
     * Update lightning effects
     * @param {number} delta - Time elapsed since last update
     * @private
     */
    _updateLightning(delta) {
        const lightning = this.weatherConfig.lightning;
        if (!lightning.enabled) return;
        
        this.lightningTimer -= delta;
        
        if (this.lightningTimer <= 0) {
            // Create new lightning flash
            this._createLightningFlash();
            
            // Set next lightning timer
            const interval = this._getRandomRange(
                lightning.interval.min,
                lightning.interval.max
            );
            this.lightningTimer = interval;
        }
    }

    /**
     * Create a lightning flash effect
     * @private 
     */
    _createLightningFlash() {
        const lightning = this.weatherConfig.lightning;
        const flashCount = Math.floor(this._getRandomRange(
            lightning.flashCount.min,
            lightning.flashCount.max
        ));
        
        // Reset any existing animation
        this.elements.lightning.style.animation = 'none';
        this.elements.lightning.offsetHeight; // Force reflow
        
        // Build the animation for multiple flashes
        let keyframes = '';
        let totalDuration = 0;
        let intensity = this._getRandomRange(
            lightning.flashIntensity.min, 
            lightning.flashIntensity.max
        );
        
        // Create first flash
        let flashDuration = this._getRandomRange(
            lightning.flashDuration.min,
            lightning.flashDuration.max
        );
        
        this.elements.lightning.style.setProperty('--flash-intensity', intensity);
        
        // Start flash animation
        this.elements.lightning.style.animation = 
            `rift-lightning-flash ${flashDuration * flashCount * 2}s ease-out`;
        
        // Trigger screen shake if enabled
        if (lightning.screenShakeEnabled) {
            EventManager.emit('screen:shake', {
                intensity: lightning.screenShakeIntensity,
                duration: flashDuration * 2
            });
        }
        
        // Play thunder sound after delay if audio enabled
        if (this.weatherConfig.audio?.enabled) {
            const thunderDelay = this._getRandomRange(
                lightning.thunderDelay.min,
                lightning.thunderDelay.max
            );
            
            setTimeout(() => {
                this._playThunderSound();
            }, thunderDelay * 1000);
        }
    }

    /**
     * Set up audio for current weather
     * @private
     */
    _setupAudio() {
        // This would be implemented to create and play appropriate audio sources
        // For integration with game's audio system
        console.log(`[WeatherSystem] Setting up audio for ${this.currentType} (${this.currentIntensity})`);
    }

    /**
     * Play thunder sound
     * @private
     */
    _playThunderSound() {
        // This would be implemented to play thunder sound through game's audio system
        console.log('[WeatherSystem] Playing thunder sound');
    }

    /**
     * Pause all weather audio
     * @private
     */
    _pauseAudio() {
        // This would be implemented to pause weather audio
        console.log('[WeatherSystem] Pausing weather audio');
    }

    /**
     * Resume all weather audio
     * @private
     */
    _resumeAudio() {
        // This would be implemented to resume weather audio
        console.log('[WeatherSystem] Resuming weather audio');
    }

    /**
     * Stop all weather audio
     * @private
     */
    _stopAudio() {
        // This would be implemented to stop and clean up weather audio
        console.log('[WeatherSystem] Stopping weather audio');
    }

    /**
     * Get a random value within a range
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random value between min and max
     * @private
     */
    _getRandomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Clean up resources when component is destroyed
     */
    dispose() {
        // Clean up particles
        this._clearRain();
        this._clearSnow();
        this._clearFogLayers();
        
        // Stop audio
        if (this.weatherConfig.audio?.enabled) {
            this._stopAudio();
        }
        
        // Unregister events and remove element
        super.dispose();
    }
}





export { WeatherSystem };