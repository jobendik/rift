import { EntityManager, Time, MeshGeometry, Vector3, CellSpacePartitioning } from 'yuka';
import { 
    WebGLRenderer, Scene, PerspectiveCamera, Color, AnimationMixer, Object3D, 
    SkeletonHelper, SRGBColorSpace, FogExp2, Fog, TextureLoader, 
    SpriteMaterial, Sprite, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial, 
    AdditiveBlending, Clock
} from 'three';
import { HemisphereLight, DirectionalLight, AmbientLight } from 'three';
import { AxesHelper } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { AssetManager } from './AssetManager.js';
import { SpawningManager } from './SpawningManager.js';
import { UIManager } from './UIManager.js';
import { FirstPersonControls } from '../controls/FirstPersonControls.js';
import { NavMeshUtils } from '../etc/NavMeshUtils.js';
import { SceneUtils } from '../etc/SceneUtils.js';
import { Level } from '../entities/Level.js';
import { Enemy } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { Bullet } from '../weapons/Bullet.js';
import { PathPlanner } from '../etc/PathPlanner.js';
import { EnhancedSky } from '../effects/EnhancedSky.js'; // Updated import
import { CONFIG } from './Config.js';
import { GameEventBridge } from './GameEventBridge.js'; // Add event bridge import

const currentIntersectionPoint = new Vector3();

/**
* Class for representing the game world. It's the key point where
* the scene and all game entities are created and managed.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @author {@link https://github.com/robp94|robp94}
*/
class World {

	/**
	* Constructs a new world object.
	*/
	constructor() {

		this.entityManager = new EntityManager();
		this.time = new Time();
		this.tick = 0;

		this.assetManager = null;
		this.navMesh = null;
		this.costTable = null;
		this.pathPlanner = null;
		this.spawningManager = new SpawningManager( this );
		this.uiManager = new UIManager( this );

		// Add event bridge for UI integration
		this.gameEventBridge = null;

		//

		this.renderer = null;
		this.camera = null;
		this.scene = null;
		this.fpsControls = null;
		this.orbitControls = null;
		this.useFPSControls = false;

		//

		this.player = null;
		this.sky = null; // Added sky reference
        
        // Sky and weather animation system
        this.environmentSystem = {
            sky: {
                enabled: true,             // Whether to animate the sky
                cycleDuration: 120,        // Full day/night cycle in seconds (2 minutes)
                currentTime: 0,            // Current time in the cycle
                lastTimeOfDay: 'day',      // Tracking last set time of day
                transitioning: false,      // Whether we're in a transition
                transitionParams: null,    // Parameters for current transition
            },
            weather: {
                enabled: true,             // Whether to animate weather
                currentType: 'clear',      // Current weather type
                targetType: 'clear',       // Target weather type for transitions
                transitionProgress: 1.0,    // Progress of current transition (1.0 = complete)
                transitionDuration: 10.0,   // Duration of weather transitions in seconds
                changeInterval: {
                    min: 20,               // Minimum time between weather changes (seconds)
                    max: 40                // Maximum time between weather changes (seconds)
                },
                nextChangeTime: 30,        // Time until next weather change
                types: {                   // Configuration for different weather types
                    'clear': {
                        fogDensity: 0,
                        fogColor: new Color(0x88CCEE),
                        cloudCoverage: 0.1,
                        rainIntensity: 0,
                        lightningFrequency: 0,
                        windStrength: 0.2
                    },
                    'cloudy': {
                        fogDensity: 0.0005,
                        fogColor: new Color(0xAAAAAA),
                        cloudCoverage: 0.6,
                        rainIntensity: 0,
                        lightningFrequency: 0,
                        windStrength: 0.5
                    },
                    'rainy': {
                        fogDensity: 0.001,
                        fogColor: new Color(0x666666),
                        cloudCoverage: 0.9,
                        rainIntensity: 0.5,
                        lightningFrequency: 0.1,
                        windStrength: 0.8
                    },
                    'storm': {
                        fogDensity: 0.002,
                        fogColor: new Color(0x444444),
                        cloudCoverage: 1.0,
                        rainIntensity: 1.0,
                        lightningFrequency: 0.4,
                        windStrength: 1.0
                    },
                    'foggy': {
                        fogDensity: 0.006,
                        fogColor: new Color(0xCCCCCC),
                        cloudCoverage: 0.3,
                        rainIntensity: 0,
                        lightningFrequency: 0,
                        windStrength: 0.1
                    }
                }
            },
            effects: {
                rain: null,          // Rain particle system
                clouds: null,        // Cloud sprites
                lightning: {
                    light: null,     // Lightning flash light
                    timer: 0,        // Time until next lightning
                    duration: 0      // Duration of current flash
                }
            },
            clock: new Clock()       // Independent clock for weather system
        };

		//

		this.enemyCount = CONFIG.BOT.COUNT;
		this.competitors = new Array();

		//

		this._animate = animate.bind( this );
		this._onWindowResize = onWindowResize.bind( this );

		//

		this.debug = false; // Set to false to disable orbit camera and debug mode

		this.helpers = {
			convexRegionHelper: null,
			spatialIndexHelper: null,
			axesHelper: null,
			graphHelper: null,
			pathHelpers: new Array(),
			spawnHelpers: new Array(),
			uuidHelpers: new Array(),
			skeletonHelpers: new Array(),
			itemHelpers: new Array()
		};

	}

	/**
	* Entry point for the game. It initializes the asset manager and then
	* starts to build the game environment.
	*
	* @return {World} A reference to this world object.
	*/
	init() {
		try {
			this.assetManager = new AssetManager();

			this.assetManager.init().then(() => {
				try {
					console.info('Initializing scene...');
					this._initScene();
					
					console.info('Initializing weather effects...');
					this._initWeatherEffects();
					
					console.info('Initializing level...');
					this._initLevel();
					
					console.info('Initializing enemies...');
					this._initEnemies();
					
					console.info('Initializing player...');
					this._initPlayer();
					
					console.info('Initializing controls...');
					this._initControls();
					
					console.info('Initializing UI...');
					this._initUI();

					console.info('Starting animation loop...');
					this._animate();
					
					console.info('World initialization complete!');
				} catch (error) {
					console.error('Error during world initialization process:', error);
					console.error('Error in function:', error.stack);
				}
			})
			.catch(error => {
				console.error('Error initializing AssetManager:', error);
			});

		} catch (error) {
			console.error('Critical error in World.init():', error);
			throw error;
		}

		return this;
	}

	/**
	* Adds the given game entity to the game world. This means it is
	* added to the entity manager and to the scene if it has a render component.
	*
	* @param {GameEntity} entity - The game entity to add.
	* @return {World} A reference to this world object.
	*/
	add( entity ) {

		this.entityManager.add( entity );

		if ( entity._renderComponent !== null ) {

			this.scene.add( entity._renderComponent );

		}

		return this;

	}

	/**
	* Removes the given game entity from the game world. This means it is
	* removed from the entity manager and from the scene if it has a render component.
	*
	* @param {GameEntity} entity - The game entity to remove.
	* @return {World} A reference to this world object.
	*/
	remove( entity ) {

		this.entityManager.remove( entity );

		if ( entity._renderComponent !== null ) {

			this.scene.remove( entity._renderComponent );

		}

		return this;

	}

	/**
	* Adds a bullet to the game world. The bullet is defined by the given
	* parameters and created by the method.
	*
	* @param {GameEntity} owner - The owner of the bullet.
	* @param {Ray} ray - The ray that defines the trajectory of this bullet.
	* @return {World} A reference to this world object.
	*/
	addBullet( owner, ray ) {

		const bulletLine = this.assetManager.models.get( 'bulletLine' ).clone();
		bulletLine.visible = false;

		const bullet = new Bullet( owner, ray );
		bullet.setRenderComponent( bulletLine, sync );

		this.add( bullet );

		return this;

	}

	/**
	* The method checks if compatible game entities intersect with a projectile.
	* The closest hitted game entity is returned. If no intersection is detected,
	* null is returned. A possible intersection point is stored into the second parameter.
	*
	* @param {Projectile} projectile - The projectile.
	* @param {Vector3} intersectionPoint - The intersection point.
	* @return {GameEntity} The hitted game entity.
	*/
	checkProjectileIntersection( projectile, intersectionPoint ) {

		const entities = this.entityManager.entities;
		let minDistance = Infinity;
		let hittedEntity = null;

		const owner = projectile.owner;
		const ray = projectile.ray;

		for ( let i = 0, l = entities.length; i < l; i ++ ) {

			const entity = entities[ i ];

			// do not test with the owner entity and only process entities with the correct interface

			if ( entity !== owner && entity.active && entity.checkProjectileIntersection ) {

				if ( entity.checkProjectileIntersection( ray, currentIntersectionPoint ) !== null ) {

					const squaredDistance = currentIntersectionPoint.squaredDistanceTo( ray.origin );

					if ( squaredDistance < minDistance ) {

						minDistance = squaredDistance;
						hittedEntity = entity;

						intersectionPoint.copy( currentIntersectionPoint );

					}

				}


			}

		}

		return hittedEntity;

	}

	/**
	* Finds the nearest item of the given item type for the given entity.
	*
	* @param {GameEntity} entity - The entity which searches for the item.
	* @param {Number} itemType - The requested item type.
	* @param {Object} result - The result object containing the item and the distance to it.
	* @return {Object} - The result object containing the item and the distance to it.
	*/
	getClosestItem( entity, itemType, result ) {

		// pick correct item list

		let itemList = this.spawningManager.getItemList( itemType );

		// determine closest item

		let closestItem = null;
		let minDistance = Infinity;

		for ( let i = 0, l = itemList.length; i < l; i ++ ) {

			const item = itemList[ i ];

			// consider only active items

			if ( item.active ) {

				const fromRegion = entity.currentRegion;
				const toRegion = item.currentRegion;

				const from = this.navMesh.getNodeIndex( fromRegion );
				const to = this.navMesh.getNodeIndex( toRegion );

				// use lookup table to find the distance between two nodes

				const distance = this.costTable.get( from, to );

				if ( distance < minDistance ) {

					minDistance = distance;
					closestItem = item;

				}

			}

		}

		//

		result.item = closestItem;
		result.distance = minDistance;

		return result;

	}
	
	/**
	* Sets the time of day for the sky, affecting lighting and atmosphere
	*
	* @param {string} timeOfDay - The time of day ('dawn', 'day', 'sunset', 'dusk', 'night')
	* @param {number} transitionDuration - Duration of transition in seconds (0 for instant)
	* @return {World} A reference to this world object.
	*/
	setTimeOfDay(timeOfDay, transitionDuration = 2.0) {
		if (this.sky) {
			console.info(`Setting time of day to: ${timeOfDay} with transition: ${transitionDuration}s`);
            
            // If we want instant change
            if (transitionDuration <= 0) {
                this.sky.setTimeOfDay(timeOfDay);
                this._updateLightingForTimeOfDay(timeOfDay);
                this.environmentSystem.sky.lastTimeOfDay = timeOfDay;
                return this;
            }
            
            // Otherwise set up transition
            const env = this.environmentSystem.sky;
            env.transitioning = true;
            env.transitionParams = {
                startTime: env.currentTime,
                duration: transitionDuration,
                fromTimeOfDay: env.lastTimeOfDay,
                toTimeOfDay: timeOfDay,
                progress: 0
            };
            
			// Store as target time of day
            this.environmentSystem.sky.lastTimeOfDay = timeOfDay;
		}
		
		return this;
	}
    
    /**
    * Set the weather type with optional transition
    *
    * @param {string} weatherType - The type of weather ('clear', 'cloudy', 'rainy', 'storm', 'foggy')
    * @param {number} transitionDuration - Time in seconds for the transition
    * @return {World} A reference to this world object.
    */
    setWeather(weatherType, transitionDuration = 10.0) {
        const weather = this.environmentSystem.weather;
        
        // Validate weather type
        if (!weather.types[weatherType]) {
            console.warn(`Invalid weather type: ${weatherType}`);
            return this;
        }
        
        console.info(`Setting weather to: ${weatherType} with transition: ${transitionDuration}s`);
        
        // Set up transition
        weather.currentType = weather.currentType || 'clear';
        weather.targetType = weatherType;
        weather.transitionProgress = 0;
        weather.transitionDuration = transitionDuration;
        
        return this;
    }
    
    /**
    * Updates the lighting to match the time of day
    * 
    * @param {string} timeOfDay - Time of day to set lighting for
    * @private
    */
    _updateLightingForTimeOfDay(timeOfDay) {
        // Get directional light
        const dirLight = this.scene.children.find(child => child.isDirectionalLight);
        if (dirLight) {
            // Adjust light color and intensity based on time of day
            switch(timeOfDay) {
                case 'dawn':
                    dirLight.color.setRGB(1.0, 0.8, 0.7);
                    dirLight.intensity = 0.7;
                    break;
                case 'day':
                    dirLight.color.setRGB(1.0, 1.0, 0.95);
                    dirLight.intensity = 1.0;
                    break;
                case 'sunset':
                    dirLight.color.setRGB(1.0, 0.6, 0.3);
                    dirLight.intensity = 0.8;
                    break;
                case 'dusk':
                    dirLight.color.setRGB(0.6, 0.5, 0.8);
                    dirLight.intensity = 0.5;
                    break;
                case 'night':
                    dirLight.color.setRGB(0.2, 0.2, 0.5);
                    dirLight.intensity = 0.3;
                    break;
            }
        }
        
        // Update ambient light if present
        const ambientLight = this.scene.children.find(child => child.isAmbientLight);
        if (ambientLight) {
            switch(timeOfDay) {
                case 'dawn':
                    ambientLight.intensity = 0.3;
                    ambientLight.color.setRGB(0.8, 0.6, 0.6);
                    break;
                case 'day':
                    ambientLight.intensity = 0.5;
                    ambientLight.color.setRGB(0.8, 0.8, 1.0);
                    break;
                case 'sunset':
                    ambientLight.intensity = 0.4;
                    ambientLight.color.setRGB(1.0, 0.7, 0.4);
                    break;
                case 'dusk':
                    ambientLight.intensity = 0.2;
                    ambientLight.color.setRGB(0.5, 0.5, 0.7);
                    break;
                case 'night':
                    ambientLight.intensity = 0.1;
                    ambientLight.color.setRGB(0.2, 0.2, 0.5);
                    break;
            }
        }
    }
    
    /**
    * Updates the environment (sky, weather, effects)
    * @param {number} delta - Time delta in seconds
    */
    updateEnvironment(delta) {
        this._updateSky(delta);
        this._updateWeather(delta);
    }
    
    /**
    * Updates the sky animation
    * @param {number} delta - Time delta in seconds
    * @private
    */
    _updateSky(delta) {
        if (!this.sky || !this.environmentSystem.sky.enabled) return;
        
        const env = this.environmentSystem.sky;
        
        // Handle transitions between time of day states
        if (env.transitioning && env.transitionParams) {
            const transition = env.transitionParams;
            transition.progress += delta / transition.duration;
            
            if (transition.progress >= 1.0) {
                // Transition complete
                this.sky.setTimeOfDay(transition.toTimeOfDay);
                env.transitioning = false;
                env.transitionParams = null;
            } else {
                // Interpolate sky parameters during transition
                // This would be done by directly manipulating the sky shader uniforms
                // for a smooth transition, but for simplicity we'll just update the
                // directional light to simulate a transition
                
                // Get sun position from sky
                const sunPosition = this.sky.material.uniforms.sunPosition.value;
                
                // Get the transition start and end sun positions based on time of day
                let fromSunPos = new Vector3();
                let toSunPos = new Vector3();
                
                switch(transition.fromTimeOfDay) {
                    case 'dawn': fromSunPos.set(0, 0.1, 1); break;
                    case 'day': fromSunPos.set(0, 1, 0.5); break;
                    case 'sunset': fromSunPos.set(1, 0.1, 0); break;
                    case 'dusk': fromSunPos.set(0, -0.1, 0); break;
                    case 'night': fromSunPos.set(0, -1, 0); break;
                }
                
                switch(transition.toTimeOfDay) {
                    case 'dawn': toSunPos.set(0, 0.1, 1); break;
                    case 'day': toSunPos.set(0, 1, 0.5); break;
                    case 'sunset': toSunPos.set(1, 0.1, 0); break;
                    case 'dusk': toSunPos.set(0, -0.1, 0); break;
                    case 'night': toSunPos.set(0, -1, 0); break;
                }
                
                // Interpolate positions
                sunPosition.copy(fromSunPos).lerp(toSunPos, transition.progress);
                sunPosition.normalize();
                
                // Update light position
                const dirLight = this.scene.children.find(child => child.isDirectionalLight);
                if (dirLight) {
                    dirLight.position.copy(sunPosition).multiplyScalar(1000);
                    
                    // Interpolate light color and intensity
                    let fromColor, toColor, fromIntensity, toIntensity;
                    
                    // Set values based on times of day
                    switch(transition.fromTimeOfDay) {
                        case 'dawn':
                            fromColor = new Color(1.0, 0.8, 0.7);
                            fromIntensity = 0.7;
                            break;
                        case 'day':
                            fromColor = new Color(1.0, 1.0, 0.95);
                            fromIntensity = 1.0;
                            break;
                        case 'sunset':
                            fromColor = new Color(1.0, 0.6, 0.3);
                            fromIntensity = 0.8;
                            break;
                        case 'dusk':
                            fromColor = new Color(0.6, 0.5, 0.8);
                            fromIntensity = 0.5;
                            break;
                        case 'night':
                            fromColor = new Color(0.2, 0.2, 0.5);
                            fromIntensity = 0.3;
                            break;
                    }
                    
                    switch(transition.toTimeOfDay) {
                        case 'dawn':
                            toColor = new Color(1.0, 0.8, 0.7);
                            toIntensity = 0.7;
                            break;
                        case 'day':
                            toColor = new Color(1.0, 1.0, 0.95);
                            toIntensity = 1.0;
                            break;
                        case 'sunset':
                            toColor = new Color(1.0, 0.6, 0.3);
                            toIntensity = 0.8;
                            break;
                        case 'dusk':
                            toColor = new Color(0.6, 0.5, 0.8);
                            toIntensity = 0.5;
                            break;
                        case 'night':
                            toColor = new Color(0.2, 0.2, 0.5);
                            toIntensity = 0.3;
                            break;
                    }
                    
                    // Interpolate color and intensity
                    dirLight.color.copy(fromColor).lerp(toColor, transition.progress);
                    dirLight.intensity = fromIntensity + (toIntensity - fromIntensity) * transition.progress;
                }
                
                // Update ambient light if present
                const ambientLight = this.scene.children.find(child => child.isAmbientLight);
                if (ambientLight) {
                    let fromColor, toColor, fromIntensity, toIntensity;
                    
                    // Set values based on times of day
                    switch(transition.fromTimeOfDay) {
                        case 'dawn':
                            fromColor = new Color(0.8, 0.6, 0.6);
                            fromIntensity = 0.3;
                            break;
                        case 'day':
                            fromColor = new Color(0.8, 0.8, 1.0);
                            fromIntensity = 0.5;
                            break;
                        case 'sunset':
                            fromColor = new Color(1.0, 0.7, 0.4);
                            fromIntensity = 0.4;
                            break;
                        case 'dusk':
                            fromColor = new Color(0.5, 0.5, 0.7);
                            fromIntensity = 0.2;
                            break;
                        case 'night':
                            fromColor = new Color(0.2, 0.2, 0.5);
                            fromIntensity = 0.1;
                            break;
                    }
                    
                    switch(transition.toTimeOfDay) {
                        case 'dawn':
                            toColor = new Color(0.8, 0.6, 0.6);
                            toIntensity = 0.3;
                            break;
                        case 'day':
                            toColor = new Color(0.8, 0.8, 1.0);
                            toIntensity = 0.5;
                            break;
                        case 'sunset':
                            toColor = new Color(1.0, 0.7, 0.4);
                            toIntensity = 0.4;
                            break;
                        case 'dusk':
                            toColor = new Color(0.5, 0.5, 0.7);
                            toIntensity = 0.2;
                            break;
                        case 'night':
                            toColor = new Color(0.2, 0.2, 0.5);
                            toIntensity = 0.1;
                            break;
                    }
                    
                    // Interpolate color and intensity
                    ambientLight.color.copy(fromColor).lerp(toColor, transition.progress);
                    ambientLight.intensity = fromIntensity + (toIntensity - fromIntensity) * transition.progress;
                }
            }
            
            // Force sky material update
            this.sky.material.needsUpdate = true;
            
            return;
        }
        
        // Normal sky animation when not in transition
        env.currentTime += delta;
        if (env.currentTime > env.cycleDuration) {
            env.currentTime = 0;
        }
        
        // Calculate normalized time (0 to 1 representing full day/night cycle)
        const normalizedTime = env.currentTime / env.cycleDuration;
        
        // Determine time of day
        let timeOfDay;
        if (normalizedTime < 0.2) {
            timeOfDay = 'dawn';
        } else if (normalizedTime < 0.45) {
            timeOfDay = 'day';
        } else if (normalizedTime < 0.55) {
            timeOfDay = 'sunset';
        } else if (normalizedTime < 0.8) {
            timeOfDay = 'dusk';
        } else {
            timeOfDay = 'night';
        }
        
        // Only update if time of day has changed
        if (timeOfDay !== env.lastTimeOfDay) {
            this.setTimeOfDay(timeOfDay, 3.0); // Transition over 3 seconds
        }
        
        // For smoother transitions, continuous sun movement
        if (this.sky.material && this.sky.material.uniforms) {
            const sunPosition = this.sky.material.uniforms.sunPosition.value;
            
            // Calculate sun position based on time
            const angle = normalizedTime * Math.PI * 2;
            const height = Math.sin(angle);
            const xzRadius = Math.cos(angle);
            const x = Math.sin(normalizedTime * Math.PI * 2) * xzRadius;
            const z = Math.cos(normalizedTime * Math.PI * 2) * xzRadius;
            
            // Update sun position slightly for continuous movement
            sunPosition.set(x, height, z).normalize();
            
            // Update directional light to match
            const dirLight = this.scene.children.find(child => child.isDirectionalLight);
            if (dirLight) {
                dirLight.position.copy(sunPosition.clone().multiplyScalar(1000));
            }
            
            this.sky.material.needsUpdate = true;
        }
    }
    
    /**
    * Updates the weather effects
    * @param {number} delta - Time delta in seconds
    * @private
    */
    _updateWeather(delta) {
        const weather = this.environmentSystem.weather;
        
        // Skip if weather is disabled
        if (!weather.enabled) return;
        
        // Process weather transitions
        if (weather.transitionProgress < 1.0 && weather.currentType !== weather.targetType) {
            weather.transitionProgress += delta / weather.transitionDuration;
            
            if (weather.transitionProgress >= 1.0) {
                // Transition complete
                weather.transitionProgress = 1.0;
                weather.currentType = weather.targetType;
            }
            
            // Interpolate between current and target weather properties
            const currentProps = weather.types[weather.currentType];
            const targetProps = weather.types[weather.targetType];
            const progress = weather.transitionProgress;
            
            // Interpolate fog
            if (this.scene.fog) {
                if (this.scene.fog.isFogExp2) {
                    // Exponential fog
                    const density = currentProps.fogDensity + (targetProps.fogDensity - currentProps.fogDensity) * progress;
                    this.scene.fog.density = density;
                } else {
                    // Linear fog - adjust near and far values
                    // (Would need to add near/far properties to weather types)
                }
                
                // Interpolate fog color
                this.scene.fog.color.copy(currentProps.fogColor).lerp(targetProps.fogColor, progress);
            }
            
            // Update rain effect intensity
            if (this.environmentSystem.effects.rain) {
                const rainIntensity = currentProps.rainIntensity + 
                                   (targetProps.rainIntensity - currentProps.rainIntensity) * progress;
                this._updateRainEffect(rainIntensity);
            }
            
            // Update cloud coverage
            if (this.environmentSystem.effects.clouds) {
                const cloudCoverage = currentProps.cloudCoverage + 
                                   (targetProps.cloudCoverage - currentProps.cloudCoverage) * progress;
                this._updateCloudEffect(cloudCoverage);
            }
            
            // Update lightning effect
            const lightningFreq = currentProps.lightningFrequency + 
                              (targetProps.lightningFrequency - currentProps.lightningFrequency) * progress;
            this._updateLightningEffect(lightningFreq, delta);
        } else {
            // Process random weather changes
            weather.nextChangeTime -= delta;
            
            if (weather.nextChangeTime <= 0) {
                // Time for a weather change
                const weatherTypes = Object.keys(weather.types);
                let newWeather;
                
                // Make sure we don't pick the same weather
                do {
                    const randomIndex = Math.floor(Math.random() * weatherTypes.length);
                    newWeather = weatherTypes[randomIndex];
                } while (newWeather === weather.currentType);
                
                // Set the new weather with a transition
                this.setWeather(newWeather);
                
                // Set time until next change
                const minTime = weather.changeInterval.min;
                const maxTime = weather.changeInterval.max;
                weather.nextChangeTime = minTime + Math.random() * (maxTime - minTime);
            }
            
            // Update weather effects
            const props = weather.types[weather.currentType];
            
            // Update lightning effect outside of transitions
            this._updateLightningEffect(props.lightningFrequency, delta);
        }
        
        // Animate rain and clouds regardless of transitions
        this._animateRain(delta);
        this._animateClouds(delta);
    }
    
    /**
    * Update the rain particle effect
    * @param {number} intensity - Rain intensity from 0 to 1
    * @private
    */
    _updateRainEffect(intensity) {
        const rain = this.environmentSystem.effects.rain;
        if (!rain) return;
        
        // Change visibility based on intensity
        rain.visible = intensity > 0.05;
        
        // Update opacity and number of particles based on intensity
        if (rain.material.opacity !== intensity) {
            rain.material.opacity = intensity;
        }
        
        // Scale number of active particles with intensity
        const particles = rain.geometry.attributes.position;
        const maxParticles = rain.userData.maxParticles;
        const activeParticles = Math.floor(maxParticles * intensity);
        
        rain.userData.activeParticles = activeParticles;
    }
    
    /**
    * Update the cloud effect
    * @param {number} coverage - Cloud coverage from 0 to 1
    * @private
    */
    _updateCloudEffect(coverage) {
        const clouds = this.environmentSystem.effects.clouds;
        if (!clouds || !clouds.children) return;
        
        // Adjust opacity and scale of cloud sprites based on coverage
        for (let i = 0; i < clouds.children.length; i++) {
            const cloud = clouds.children[i];
            
            // Only show clouds if coverage is significant
            cloud.visible = coverage > 0.05;
            
            // For simplicity, adjust opacity
            if (cloud.material) {
                cloud.material.opacity = Math.min(0.7 * coverage, 0.9);
            }
        }
    }
    
    /**
    * Update the lightning effect
    * @param {number} frequency - Lightning frequency from 0 to 1
    * @param {number} delta - Time delta in seconds
    * @private
    */
    _updateLightningEffect(frequency, delta) {
        const lightning = this.environmentSystem.effects.lightning;
        if (!lightning || !lightning.light) return;
        
        // If there's an active flash, update its duration
        if (lightning.duration > 0) {
            lightning.duration -= delta;
            
            if (lightning.duration <= 0) {
                // End the lightning flash
                lightning.light.intensity = 0;
                lightning.duration = 0;
            } else {
                // Flash decay
                const initialIntensity = 1.5;
                const t = 1.0 - (lightning.duration / 0.1); // normalize time
                lightning.light.intensity = initialIntensity * (1.0 - t*t);
            }
        } else {
            // Check if it's time for a new lightning flash
            lightning.timer -= delta;
            
            if (lightning.timer <= 0 && frequency > 0) {
                // Start a new lightning flash
                const baseInterval = 10.0; // base seconds between flashes
                const randomVariation = 5.0; // random variation in seconds
                
                // Higher frequency means more frequent lightning
                const interval = (baseInterval / frequency) * (1.0 - 0.5 * Math.random());
                lightning.timer = interval;
                
                // Check if it's actually time for visible lightning (randomize)
                if (Math.random() < frequency) {
                    // Lightning flash
                    lightning.light.intensity = 1.5;
                    lightning.duration = 0.1; // Flash duration in seconds
                    
                    // Randomly position the light in the sky
                    const radius = 500;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.random() * Math.PI * 0.5;
                    
                    lightning.light.position.set(
                        radius * Math.sin(phi) * Math.cos(theta),
                        radius * Math.cos(phi),
                        radius * Math.sin(phi) * Math.sin(theta)
                    );
                    
                    // Point light at a random position on the ground
                    const groundTarget = new Vector3(
                        Math.random() * 100 - 50,
                        0,
                        Math.random() * 100 - 50
                    );
                    
                    lightning.light.target = groundTarget;
                    
                    // Play thunder sound with delay based on distance
                    // (Would need audio support here)
                }
            }
        }
    }
    
    /**
    * Animate rain particles
    * @param {number} delta - Time delta in seconds
    * @private
    */
    _animateRain(delta) {
        const rain = this.environmentSystem.effects.rain;
        if (!rain || !rain.visible) return;
        
        const positions = rain.geometry.attributes.position;
        const velocities = rain.userData.velocities;
        const activeParticles = rain.userData.activeParticles;
        
        // Calculate raindrops falling
        for (let i = 0; i < activeParticles; i++) {
            // Calculate new position
            positions.array[i * 3 + 1] -= velocities[i] * delta;
            
            // Reset particles that fall below the floor
            if (positions.array[i * 3 + 1] < 0) {
                positions.array[i * 3] = Math.random() * 200 - 100 + this.camera.position.x;
                positions.array[i * 3 + 1] = 50 + Math.random() * 10;
                positions.array[i * 3 + 2] = Math.random() * 200 - 100 + this.camera.position.z;
            }
        }
        
        positions.needsUpdate = true;
    }
    
    /**
    * Animate cloud movement
    * @param {number} delta - Time delta in seconds
    * @private
    */
    _animateClouds(delta) {
        const clouds = this.environmentSystem.effects.clouds;
        if (!clouds || !clouds.children || clouds.children.length === 0) return;
        
        // Get the wind strength from the current weather
        const weather = this.environmentSystem.weather;
        const currentType = weather.currentType;
        const windStrength = weather.types[currentType].windStrength;
        
        // Animate cloud movement based on wind
        for (let i = 0; i < clouds.children.length; i++) {
            const cloud = clouds.children[i];
            
            // Move cloud along X axis
            cloud.position.x += windStrength * cloud.userData.speedFactor * delta;
            
            // Wrap around when cloud moves too far
            if (cloud.position.x > 400) {
                cloud.position.x = -400;
            } else if (cloud.position.x < -400) {
                cloud.position.x = 400;
            }
        }
        
        // Make the clouds follow the camera on Z axis
        clouds.position.z = this.camera.position.z;
    }

	/**
	* Inits all basic objects of the scene like the scene graph itself, the camera, lights
	* or the renderer.
	*
	* @return {World} A reference to this world object.
	*/
	_initScene() {
		try {
			// scene
			this.scene = new Scene();
			// Only set a background color if we don't have a sky
			this.scene.background = new Color(0x87CEEB); // light blue skybox
            
            // Add fog for weather system
            this.scene.fog = new FogExp2(0x88CCEE, 0.0005);

			// camera
			this.camera = new PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
			this.camera.position.set(0, 75, 100);
			this.camera.add(this.assetManager.listener);

			// helpers
			if (this.debug) {
				this.helpers.axesHelper = new AxesHelper(5);
				this.helpers.axesHelper.visible = false;
				this.scene.add(this.helpers.axesHelper);
			}

			// lights
			const hemiLight = new HemisphereLight(0xffffff, 0x444444, 0.4);
			hemiLight.position.set(0, 100, 0);
			this.scene.add(hemiLight);

			const dirLight = new DirectionalLight(0xffffff, 0.8);
			dirLight.position.set(-700, 1000, -750);
            dirLight.castShadow = true;
            
            // Improve shadow quality
            dirLight.shadow.mapSize.width = 2048;
            dirLight.shadow.mapSize.height = 2048;
            dirLight.shadow.camera.near = 0.5;
            dirLight.shadow.camera.far = 1500;
            dirLight.shadow.bias = -0.0005;
            
			this.scene.add(dirLight);
            
            // Add ambient light for better indoor/night visibility
            const ambientLight = new AmbientLight(0x404040, 0.5);
            this.scene.add(ambientLight);

			// Enhanced sky with error handling
			try {
				console.info('Creating enhanced sky...');
				this.sky = new EnhancedSky();
				this.sky.scale.setScalar(450000);
				
				// Set initial time of day - choose one that fits your game's mood
				this.setTimeOfDay('day', 0); // Instant change
				
				this.scene.add(this.sky);
				console.info('Enhanced sky added to scene');
				
				// Clear background color since sky replaces it
				this.scene.background = null;
			} catch (skyError) {
				console.error('Error creating enhanced sky:', skyError);
				// We'll keep the basic color background as fallback
			}

			// renderer
			this.renderer = new WebGLRenderer({antialias: true});
			this.renderer.setSize(window.innerWidth, window.innerHeight);
			this.renderer.autoClear = false;
			this.renderer.shadowMap.enabled = true;
			// Set the correct output color space for Three.js 155+
			this.renderer.outputColorSpace = SRGBColorSpace;
			document.body.appendChild(this.renderer.domElement);

			// event listeners
			window.addEventListener('resize', this._onWindowResize, false);

			console.info('Scene initialization complete');
			return this;
		} catch (error) {
			console.error('Error in _initScene:', error);
			throw error;
		}
	}
    
    /**
    * Initialize weather effects like rain, clouds, and lightning
    *
    * @return {World} A reference to this world object.
    */
    _initWeatherEffects() {
        try {
            console.info('Initializing weather effects');
            
            // Create rain particle system
            this._initRainEffect();
            
            // Create cloud sprites
            this._initCloudEffect();
            
            // Create lightning effect
            this._initLightningEffect();
            
            // Start with clear weather
            this.setWeather('clear', 0);
            
            console.info('Weather effects initialized successfully');
            return this;
        } catch (error) {
            console.error('Error initializing weather effects:', error);
            return this;
        }
    }
    
    /**
    * Initialize rain particle system
    * @private
    */
    _initRainEffect() {
        const particleCount = 5000;
        const rainGeometry = new BufferGeometry();
        const rainPositions = [];
        const rainVelocities = [];
        
        // Create initial raindrop positions
        for (let i = 0; i < particleCount; i++) {
            // Random position around the player
            rainPositions.push(
                Math.random() * 200 - 100, // x
                Math.random() * 50 + 10,   // y (above the player)
                Math.random() * 200 - 100  // z
            );
            
            // Each raindrop has a slightly different falling speed
            rainVelocities.push(20 + Math.random() * 10);
        }
        
        rainGeometry.setAttribute('position', new Float32BufferAttribute(rainPositions, 3));
        
        // Create rain material - simple white streaks
        const rainMaterial = new PointsMaterial({
            color: 0xaaaaaa,
            size: 0.5,
            transparent: true,
            opacity: 0.6,
            sizeAttenuation: true
        });
        
        // Create the particle system
        const rain = new Points(rainGeometry, rainMaterial);
        rain.userData = {
            velocities: rainVelocities,
            maxParticles: particleCount,
            activeParticles: 0 // Will be set based on intensity
        };
        
        // Start with rain hidden
        rain.visible = false;
        
        this.scene.add(rain);
        this.environmentSystem.effects.rain = rain;
    }
    
    /**
    * Initialize cloud sprites
    * @private
    */
    _initCloudEffect() {
        try {
            // Create a group to hold all clouds
            const clouds = new Object3D();
            clouds.position.y = 100; // Position above the world
            
            // Load cloud texture
            const textureLoader = new TextureLoader();
            
            // Create multiple cloud sprites with different properties
            const cloudCount = 30;
            
            // Normally would load actual cloud textures here
            const createCloud = (size, opacity) => {
                // Create a simple cloud material 
                const material = new SpriteMaterial({
                    color: 0xffffff,
                    opacity: opacity,
                    transparent: true
                });
                
                const cloudSprite = new Sprite(material);
                cloudSprite.scale.set(size, size/2, 1);
                
                // Random position in the sky
                cloudSprite.position.set(
                    Math.random() * 800 - 400,
                    Math.random() * 40 - 10,
                    Math.random() * 800 - 400
                );
                
                // Store cloud properties
                cloudSprite.userData = {
                    speedFactor: 0.5 + Math.random() * 1.5 // Different clouds move at different speeds
                };
                
                return cloudSprite;
            };
            
            // Create cloud sprites
            for (let i = 0; i < cloudCount; i++) {
                const size = 30 + Math.random() * 70;
                const opacity = 0.3 + Math.random() * 0.3;
                const cloud = createCloud(size, opacity);
                clouds.add(cloud);
            }
            
            // Start with clouds hidden
            clouds.visible = false;
            
            this.scene.add(clouds);
            this.environmentSystem.effects.clouds = clouds;
        } catch (error) {
            console.error('Error creating cloud effect:', error);
        }
    }
    
    /**
    * Initialize lightning effect
    * @private
    */
    _initLightningEffect() {
        try {
            // Create a point light for lightning flashes
            const lightning = {
                light: new DirectionalLight(0xaaaaff, 0),
                timer: 10, // Time until next lightning
                duration: 0  // Duration of current flash
            };
            
            lightning.light.position.set(0, 500, 0);
            this.scene.add(lightning.light);
            
            this.environmentSystem.effects.lightning = lightning;
        } catch (error) {
            console.error('Error creating lightning effect:', error);
        }
    }

	/**
	* Creates a specific amount of enemies.
	*
	* @return {World} A reference to this world object.
	*/
	_initEnemies() {

		// Add at the beginning of _initEnemies method
console.log("Available animations:", Array.from(this.assetManager.animations.keys()));


		const enemyCount = this.enemyCount;
		const navMesh = this.assetManager.navMesh;

		this.pathPlanner = new PathPlanner( navMesh );

		for ( let i = 0; i < enemyCount; i ++ ) {

			const renderComponent = SceneUtils.cloneWithSkinning( this.assetManager.models.get( 'soldier' ) );

			const enemy = new Enemy( this );
			enemy.name = 'Bot' + i;
			enemy.setRenderComponent( renderComponent, sync );

			// set animations

			const mixer = new AnimationMixer( renderComponent );

const idleClip = this.assetManager.animations.get('soldier_idle');
const runForwardClip = this.assetManager.animations.get('soldier_forward');
const runBackwardClip = this.assetManager.animations.get('soldier_backward');
const strafeLeftClip = this.assetManager.animations.get('soldier_left');
const strafeRightClip = this.assetManager.animations.get('soldier_right');
const death1Clip = this.assetManager.animations.get('soldier_death1\t'); // Note the \t tab character
const death2Clip = this.assetManager.animations.get('soldier_death2');

			const clips = [ idleClip, runForwardClip, runBackwardClip, strafeLeftClip, strafeRightClip, death1Clip, death2Clip ];

			enemy.setAnimations( mixer, clips );

			//

			this.add( enemy );
			this.competitors.push( enemy );
			this.spawningManager.respawnCompetitor( enemy );

			//

			if ( this.debug ) {

				const pathHelper = NavMeshUtils.createPathHelper();
				enemy.pathHelper = pathHelper;

				this.scene.add( pathHelper );
				this.helpers.pathHelpers.push( pathHelper );

				//

				const uuidHelper = SceneUtils.createUUIDLabel( enemy.uuid );
				uuidHelper.position.y = 2;
				uuidHelper.visible = false;

				renderComponent.add( uuidHelper );
				this.helpers.uuidHelpers.push( uuidHelper );

				//

				const skeletonHelper = new SkeletonHelper( renderComponent );
				skeletonHelper.visible = false;

				this.scene.add( skeletonHelper );
				this.helpers.skeletonHelpers.push( skeletonHelper );

			}

		}

		return this;

	}

	/**
	* Creates the actual level.
	*
	* @return {World} A reference to this world object.
	*/
	_initLevel() {

		// level entity

		const renderComponent = this.assetManager.models.get( 'level' );
		const mesh = renderComponent.getObjectByName( 'level' );

		const vertices = mesh.geometry.attributes.position.array;
		const indices = mesh.geometry.index.array;

		const geometry = new MeshGeometry( vertices, indices );
		const level = new Level( geometry );
		level.name = 'level';
		level.setRenderComponent( renderComponent, sync );

		this.add( level );

		// navigation mesh

		this.navMesh = this.assetManager.navMesh;
		this.costTable = this.assetManager.costTable;

		// spatial index

		const levelConfig = this.assetManager.configs.get( 'level' );

		const width = levelConfig.spatialIndex.width;
		const height = levelConfig.spatialIndex.height;
		const depth = levelConfig.spatialIndex.depth;
		const cellsX = levelConfig.spatialIndex.cellsX;
		const cellsY = levelConfig.spatialIndex.cellsY;
		const cellsZ = levelConfig.spatialIndex.cellsZ;

		this.navMesh.spatialIndex = new CellSpacePartitioning( width, height, depth, cellsX, cellsY, cellsZ );
		this.navMesh.updateSpatialIndex();

		this.helpers.spatialIndexHelper = NavMeshUtils.createCellSpaceHelper( this.navMesh.spatialIndex );
		this.scene.add( this.helpers.spatialIndexHelper );

		// init spawning points and items

		this.spawningManager.init();

		// debugging

		if ( this.debug ) {

			this.helpers.convexRegionHelper = NavMeshUtils.createConvexRegionHelper( this.navMesh );
			this.scene.add( this.helpers.convexRegionHelper );

			//

			this.helpers.graphHelper = NavMeshUtils.createGraphHelper( this.navMesh.graph, 0.2 );
			this.scene.add( this.helpers.graphHelper );

			//

			this.helpers.spawnHelpers = SceneUtils.createSpawnPointHelper( this.spawningManager.spawningPoints );
			this.scene.add( this.helpers.spawnHelpers );

		}

		return this;

	}

	/**
	* Creates the player instance.
	*
	* @return {World} A reference to this world object.
	*/
	_initPlayer() {

		const assetManager = this.assetManager;

		const player = new Player( this );

		// render component

		const body = new Object3D(); // dummy 3D object for adding spatial audios
		body.matrixAutoUpdate = false;
		player.setRenderComponent( body, sync );

		// audio

		const step1 = assetManager.cloneAudio( assetManager.audios.get( 'step1' ) );
		const step2 = assetManager.cloneAudio( assetManager.audios.get( 'step2' ) );

		// the following audios are unique and will be used only for the player (no cloning needed)

		const impact1 = assetManager.audios.get( 'impact1' );
		const impact2 = assetManager.audios.get( 'impact2' );
		const impact3 = assetManager.audios.get( 'impact3' );
		const impact4 = assetManager.audios.get( 'impact4' );
		const impact5 = assetManager.audios.get( 'impact5' );
		const impact6 = assetManager.audios.get( 'impact6' );
		const impact7 = assetManager.audios.get( 'impact7' );

		step1.setVolume( 0.5 );
		step2.setVolume( 0.5 );

		body.add( step1, step2 );
		body.add( impact1, impact2, impact3, impact4, impact5, impact6, impact7 );

		player.audios.set( 'step1', step1 );
		player.audios.set( 'step2', step2 );
		player.audios.set( 'impact1', impact1 );
		player.audios.set( 'impact2', impact2 );
		player.audios.set( 'impact3', impact3 );
		player.audios.set( 'impact4', impact4 );
		player.audios.set( 'impact5', impact5 );
		player.audios.set( 'impact6', impact6 );
		player.audios.set( 'impact7', impact7 );

		// animation

		const mixer = new AnimationMixer( player.head );

		const deathClip = this.assetManager.animations.get( 'player_death' );

		const clips = [ deathClip ];

		player.setAnimations( mixer, clips );

		// add the player to the world

		this.add( player );
		this.competitors.push( player );
		this.spawningManager.respawnCompetitor( player );

		// in dev mode we start with orbit controls

		if ( this.debug ) {

			player.deactivate();

		}

		//

		this.player = player;

		// Initialize the event bridge after creating the player
		this.gameEventBridge = new GameEventBridge(this);
		this.gameEventBridge.init(this.player);

		console.log('[World] Game event bridge initialized');

		return this;

	}

	/**
	* Inits the controls used by the player.
	*
	* @return {World} A reference to this world object.
	*/
	_initControls() {

		this.fpsControls = new FirstPersonControls( this.player );
		this.fpsControls.sync();

		this.fpsControls.addEventListener( 'lock', ( ) => {

			this.useFPSControls = true;

			this.orbitControls.enabled = false;
			this.camera.matrixAutoUpdate = false;

			this.player.activate();
			this.player.head.setRenderComponent( this.camera, syncCamera );

			this.uiManager.showFPSInterface();

			if ( this.debug ) {

				this.uiManager.closeDebugUI();

			}

		} );

		this.fpsControls.addEventListener( 'unlock', () => {
			// Different behavior based on debug mode
			if (!this.debug) {
				// In normal game mode (non-debug), we want to pause the game
				// but keep all the FPS state intact
				
				// Keep the player active and FPS controls ready
				// Just let the pointer lock overlay handle re-locking
				
				// We could pause the game here if needed:
				// this.paused = true;
				
				return;
			}

			// Debug mode behavior - switch to orbit camera
			this.useFPSControls = false;
			this.orbitControls.enabled = true;
			this.camera.matrixAutoUpdate = true;
			this.player.deactivate();
			this.player.head.setRenderComponent( null, null );
			this.uiManager.hideFPSInterface();
			this.uiManager.openDebugUI();
		} );

		//

		if ( this.debug ) {

			this.orbitControls = new OrbitControls( this.camera, this.renderer.domElement );
			this.orbitControls.maxDistance = 500;

		} else {
			// Create a dummy orbit controls object that does nothing
			// This prevents errors when pointer unlock happens
			this.orbitControls = {
				enabled: false
			};
		}
		
		// Automatically enable FPS controls when the game starts
		this.fpsControls.connect();

		return this;

	}

	/**
	* Inits the user interface.
	*
	* @return {World} A reference to this world object.
	*/
	_initUI() {
		try {
			console.info('Starting UI initialization...');
			
			// Make sure the UI manager initializes after DOM is ready
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', () => {
					this.uiManager.init();
					console.info('UI initialization complete (deferred)');
				});
			} else {
				this.uiManager.init();
				console.info('UI initialization complete');
			}
			
			return this;
		} catch (error) {
			console.error('Error in _initUI:', error);
			// Continue without UI
			return this;
		}
	}

	/**
	 * Helper method for UI system to show damage indication
	 * (Legacy compatibility - now handled via event bridge)
	 */
	showDamageIndication(angle) {
		// This method is kept for backward compatibility
		// The event bridge will handle this via events now
		console.log(`[World] Legacy damage indication at angle: ${angle}`);
	}

	/**
	 * Helper method for UI system to show hit indication  
	 * (Legacy compatibility - now handled via event bridge)
	 */
	showHitIndication() {
		// This method is kept for backward compatibility
		// The event bridge will handle this via events now
		console.log(`[World] Legacy hit indication`);
	}

	/**
	 * Helper method for UI system to update health status
	 * (Legacy compatibility - now handled via event bridge)
	 */
	updateHealthStatus() {
		// This method is kept for backward compatibility
		// The event bridge will handle this via events now
		console.log(`[World] Legacy health status update`);
	}

	/**
	 * Helper method for UI system to update ammo status
	 * (Legacy compatibility - now handled via event bridge)
	 */
	updateAmmoStatus() {
		// This method is kept for backward compatibility
		// The event bridge will handle this via events now  
		console.log(`[World] Legacy ammo status update`);
	}

	/**
	 * Helper method for UI system to add frag message
	 * (Legacy compatibility - now handled via event bridge)
	 */
	addFragMessage(killer, victim) {
		// Use the event bridge for kill notifications
		if (this.gameEventBridge) {
			this.gameEventBridge.onEnemyKilled(victim, killer);
		}
	}

	/**
	 * Helper method to open debug UI
	 * (Stub for compatibility)
	 */
	openDebugUI() {
		console.log('[World] Debug UI would open here');
	}

	/**
	 * Helper method to close debug UI
	 * (Stub for compatibility)
	 */
	closeDebugUI() {
		console.log('[World] Debug UI would close here');
	}

}

// used to sync Yuka Game Entities with three.js objects

function sync( entity, renderComponent ) {

	renderComponent.matrix.copy( entity.worldMatrix );

}

function syncCamera( entity, camera ) {

	camera.matrixWorld.copy( entity.worldMatrix );

}

// used when the browser window is resized

function onWindowResize() {

	const width = window.innerWidth;
	const height = window.innerHeight;

	this.camera.aspect = width / height;
	this.camera.updateProjectionMatrix();

	this.renderer.setSize( width, height );
	this.uiManager.setSize( width, height );

}

// game loop

function animate() {

	requestAnimationFrame( this._animate );

	this.time.update();

	this.tick ++;

	const delta = this.time.getDelta();

	// Always update FPS controls regardless of debug mode
	this.fpsControls.update( delta );

	this.spawningManager.update( delta );

	this.entityManager.update( delta );

	this.pathPlanner.update();
    
    // Update environment (sky and weather)
    this.updateEnvironment(delta);

	// Update the game event bridge
	if (this.gameEventBridge) {
		this.gameEventBridge.update();
	}

	this.renderer.clear();

	this.renderer.render( this.scene, this.camera );

	this.uiManager.update( delta );

}

export default new World();