import { OrthographicCamera, Scene, Sprite, SpriteMaterial, TextureLoader, Group, Color } from 'three';
import { CONFIG } from './Config.js';
import * as DAT from 'dat.gui';
import { MinimapIntegration } from '../../app/minimapIntegration.js';

const PI25 = Math.PI * 0.25;
const PI75 = Math.PI * 0.75;

/**
* Used to manage the state of the user interface.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @author {@link https://github.com/robp94|robp94}
* Updated with modern FPS UI features
*/
class UIManager {

	/**
	* Constructs a new UI manager with the given values.
	*
	* @param {World} world - A reference to the world.
	*/
	constructor(world) {
		this.world = world;
		this.currentTime = 0;

		this.hitIndicationTime = CONFIG.UI.CROSSHAIRS.HIT_TIME;
		this.endTimeHitIndication = Infinity;

		this.damageIndicationTime = CONFIG.UI.DAMAGE_INDICATOR.TIME;
		this.endTimeDamageIndicationFront = Infinity;
		this.endTimeDamageIndicationRight = Infinity;
		this.endTimeDamageIndicationLeft = Infinity;
		this.endTimeDamageIndicationBack = Infinity;
		this.fragMessages = [];
		this.killStreakCount = 0;
		this.killStreakTimeout = null;
		this.hitMarkers = [];
		this.matchStartTime = null;
		this.showLowHealthEffect = false;
		this.lowHealthPulseIntensity = 0;

		this.html = {
			loadingScreen: document.getElementById('loadingScreen'),
			hudAmmo: document.getElementById('hudAmmo'),
			hudHealth: document.getElementById('hudHealth'),
			roundsLeft: document.getElementById('roundsLeft'),
			ammo: document.getElementById('ammo'),
			health: document.getElementById('health'),
			hudFragList: document.getElementById('hudFragList'),
			fragList: document.getElementById('fragList'),
			hudMinimap: document.getElementById('hudMinimap'),
			advancedMinimapContainer: document.getElementById('advancedMinimapContainer'),
			hudCompass: document.getElementById('hudCompass'),
			hudWeapons: document.getElementById('hudWeapons'),
			hudMatchTimer: this._createHUDElement('hudMatchTimer', 'Match Time: 00:00'),
			hudKillStreak: this._createHUDElement('hudKillStreak', ''),
			hudObjectives: this._createHUDElement('hudObjectives', ''),
			hudScore: this._createHUDElement('hudScore', 'Score: 0')
		};

		this.sprites = {
			crosshairs: null,
			frontIndicator: null,
			rightIndicator: null,
			leftIndicator: null,
			backIndicator: null,
			hitMarker: null,
			lowHealthOverlay: null
		};

		this.objectiveMarkers = new Group();
		this.hitMarkerGroup = new Group();

		// for rendering HUD sprites
		const width = window.innerWidth;
		const height = window.innerHeight;

		this.camera = new OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 1, 10);
		this.camera.position.z = 10;

		this.scene = new Scene();
		this.scene.add(this.objectiveMarkers);
		this.scene.add(this.hitMarkerGroup);

		// debugging
		this.datGui = null;

		this.debugParameter = {
			showRegions: false,
			showAxes: false,
			showPaths: false,
			showGraph: false,
			showSpawnPoints: false,
			showUUIDHelpers: false,
			showSkeletons: false,
			showItemRadius: false,
			showWireframe: false,
			showSpatialIndex: false,
			showFPS: true,
			enableFPSControls: () => {
				this.world.fpsControls.connect();
			}
		};

		// Advanced minimap integration
		this.minimapIntegration = null;

		// FPS counter variables
		this.fpsCounter = {
			frames: 0,
			lastTime: 0,
			fps: 0,
			fpsElement: null
		};

		// Audio feedback
		this.sounds = {
			hitConfirm: null,
			killConfirm: null,
			killStreak: null,
			lowHealth: null,
			weaponSwitch: null
		};

		// Setup FPS counter if enabled
		if (this.debugParameter.showFPS) {
			this._setupFPSCounter();
		}
	}

	/**
	* Creates a new HUD element and adds it to the DOM
	* @private
	* @param {String} id - Element ID
	* @param {String} initialText - Initial text content
	* @return {HTMLElement} The created element
	*/
	_createHUDElement(id, initialText) {
		const section = document.createElement('section');
		section.id = id;
		section.className = 'uiContainer hidden';
		
		const div = document.createElement('div');
		div.textContent = initialText;
		
		section.appendChild(div);
		document.body.appendChild(section);
		
		return section;
	}

	/**
	* Sets up FPS counter
	* @private
	*/
	_setupFPSCounter() {
		this.fpsCounter.fpsElement = document.createElement('div');
		this.fpsCounter.fpsElement.id = 'fpsCounter';
		this.fpsCounter.fpsElement.style.position = 'fixed';
		this.fpsCounter.fpsElement.style.top = '10px';
		this.fpsCounter.fpsElement.style.right = '10px';
		this.fpsCounter.fpsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
		this.fpsCounter.fpsElement.style.color = '#00ff00';
		this.fpsCounter.fpsElement.style.padding = '5px 10px';
		this.fpsCounter.fpsElement.style.borderRadius = '4px';
		this.fpsCounter.fpsElement.style.fontFamily = 'monospace';
		this.fpsCounter.fpsElement.style.zIndex = '1000';
		this.fpsCounter.fpsElement.textContent = '0 FPS';
		document.body.appendChild(this.fpsCounter.fpsElement);
	}

	/**
	* Updates FPS counter
	* @private
	* @param {Number} timestamp - Current timestamp
	*/
	_updateFPSCounter(timestamp) {
		if (!this.debugParameter.showFPS || !this.fpsCounter.fpsElement) return;

		this.fpsCounter.frames++;

		if (timestamp > this.fpsCounter.lastTime + 1000) {
			this.fpsCounter.fps = Math.round((this.fpsCounter.frames * 1000) / (timestamp - this.fpsCounter.lastTime));
			this.fpsCounter.lastTime = timestamp;
			this.fpsCounter.frames = 0;
			this.fpsCounter.fpsElement.textContent = `${this.fpsCounter.fps} FPS`;
			
			// Update color based on performance
			if (this.fpsCounter.fps >= 60) {
				this.fpsCounter.fpsElement.style.color = '#00ff00'; // Good FPS - green
			} else if (this.fpsCounter.fps >= 30) {
				this.fpsCounter.fpsElement.style.color = '#ffff00'; // Ok FPS - yellow
			} else {
				this.fpsCounter.fpsElement.style.color = '#ff0000'; // Poor FPS - red
			}
		}
	}

	/**
	* Initializes the UI manager.
	*
	* @return {UIManager} A reference to this UI manager.
	*/
	init() {
		this._buildFPSInterface();

		// Minimap overlay setup
		this.minimapCanvas = document.getElementById('minimapOverlay');
		this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
		
		// Get level bounds for coordinate mapping
		const levelConfig = this.world.assetManager && this.world.assetManager.configs ? 
						   this.world.assetManager.configs.get('level') : null;
		if (levelConfig && levelConfig.spatialIndex) {
			this.minimapWorldWidth = levelConfig.spatialIndex.width;
			this.minimapWorldDepth = levelConfig.spatialIndex.depth;
		} else {
			// Fallback defaults
			this.minimapWorldWidth = 125;
			this.minimapWorldDepth = 125;
		}
		this.minimapSize = 200; // px

		// Initialize the advanced minimap integration
		this.minimapIntegration = new MinimapIntegration(this.world);

		// Start match timer when initialized
		this.matchStartTime = performance.now();

		// Setup debugging GUI if needed
		this._setupDebugGUI();

		// Initialize audio elements if browser supports Audio API
		this._initAudio();

		// ensure to completely remove the loading screen from the DOM when it is not visible anymore
		if (this.html.loadingScreen) {
			this.html.loadingScreen.addEventListener('transitionend', (event) => {
				event.target.remove();
				this.html.loadingScreen = null;
			});

			// start to fade out the loading screen
			this.html.loadingScreen.classList.add('fade-out');
		} else {
			console.warn('Loading screen element not found in the DOM');
		}

		return this;
	}

	/**
	* Initialize audio feedback elements
	* @private
	*/
	_initAudio() {
		if (typeof Audio !== 'undefined') {
			// In a real implementation, these would be actual sound files
			// For now, we'll just create the Audio objects without sources
			this.sounds.hitConfirm = new Audio();
			this.sounds.killConfirm = new Audio();
			this.sounds.killStreak = new Audio();
			this.sounds.lowHealth = new Audio();
			this.sounds.weaponSwitch = new Audio();
		}
	}

	/**
	* Setup debug GUI with more options
	* @private
	*/
	_setupDebugGUI() {
		const world = this.world;

		if (world.debug) {
			const gui = new DAT.GUI({ width: 300 });
			const params = this.debugParameter;

			// nav mesh folder
			const folderNavMesh = gui.addFolder('Navigation Mesh');
			folderNavMesh.open();

			folderNavMesh.add(params, 'showRegions').name('show convex regions').onChange((value) => {
				world.helpers.convexRegionHelper.visible = value;
			});

			folderNavMesh.add(params, 'showSpatialIndex', 1, 30).name('show spatial index').onChange((value) => {
				world.helpers.spatialIndexHelper.visible = value;
			});

			folderNavMesh.add(params, 'showPaths', 1, 30).name('show navigation paths').onChange((value) => {
				for (const pathHelper of world.helpers.pathHelpers) {
					pathHelper.visible = value;
				}
			});

			folderNavMesh.add(params, 'showGraph').name('show graph').onChange((value) => {
				world.helpers.graphHelper.visible = value;
			});

			// world folder
			const folderWorld = gui.addFolder('World');
			folderWorld.open();

			folderWorld.add(params, 'showAxes').name('show axes helper').onChange((value) => {
				world.helpers.axesHelper.visible = value;
			});

			folderWorld.add(params, 'showSpawnPoints').name('show spawn points').onChange((value) => {
				world.helpers.spawnHelpers.visible = value;
			});

			folderWorld.add(params, 'showItemRadius').name('show item radius').onChange((value) => {
				for (const itemHelper of world.helpers.itemHelpers) {
					itemHelper.visible = value;
				}
			});

			folderWorld.add(params, 'showWireframe').name('show wireframe').onChange((value) => {
				const levelMesh = this.world.scene.getObjectByName('level');
				if (levelMesh && levelMesh.material) {
					levelMesh.material.wireframe = value;
				}
			});

			folderWorld.add(params, 'enableFPSControls').name('enable FPS controls');

			// enemy folder
			const folderEnemy = gui.addFolder('Enemy');
			folderEnemy.open();

			folderEnemy.add(params, 'showUUIDHelpers', 1, 30).name('show UUID helpers').onChange((value) => {
				for (const uuidHelper of world.helpers.uuidHelpers) {
					uuidHelper.visible = value;
				}
			});

			folderEnemy.add(params, 'showSkeletons', 1, 30).name('show skeletons').onChange((value) => {
				for (const skeletonHelper of world.helpers.skeletonHelpers) {
					skeletonHelper.visible = value;
				}
			});

			// UI folder
			const folderUI = gui.addFolder('UI Options');
			folderUI.open();

			folderUI.add(params, 'showFPS').name('show FPS counter').onChange((value) => {
				if (value) {
					this._setupFPSCounter();
				} else if (this.fpsCounter.fpsElement) {
					this.fpsCounter.fpsElement.remove();
					this.fpsCounter.fpsElement = null;
				}
			});

			gui.open();
			this.datGui = gui;
		}
	}

	/**
	* Update method of this manager. Called each simulation step.
	*
	* @param {Number} delta - The time delta.
	* @return {UIManager} A reference to this UI manager.
	*/
	update(delta) {
		const timestamp = performance.now();
		this.currentTime += delta;

		// Update FPS counter
		this._updateFPSCounter(timestamp);

		// Update match timer
		this._updateMatchTimer();

		// Update hit indication
		if (this.currentTime >= this.endTimeHitIndication) {
			this.hideHitIndication();
		}

		// Update damage indicators
		this._updateDamageIndicators();

		// Update hit markers
		this._updateHitMarkers(delta);

		// Update low health effect
		this._updateLowHealthEffect(delta);

		// frag list
		this._updateFragList();

		// Minimap update
		this._updateMinimap();

		// Update advanced minimap if initialized
		if (this.minimapIntegration && this.minimapIntegration.initialized) {
			this.minimapIntegration.update();
		}

		// Update objective markers if any
		this._updateObjectiveMarkers();

		// render UI
		this._render();

		return this;
	}

	/**
	* Updates the match timer display
	* @private
	*/
	_updateMatchTimer() {
		if (!this.matchStartTime || !this.html.hudMatchTimer) return;
		
		const elapsedSeconds = Math.floor((performance.now() - this.matchStartTime) / 1000);
		const minutes = Math.floor(elapsedSeconds / 60);
		const seconds = elapsedSeconds % 60;
		
		this.html.hudMatchTimer.querySelector('div').textContent = 
			`Match Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}

	/**
	* Updates all damage indicators
	* @private
	*/
	_updateDamageIndicators() {
		// damage indicators
		if (this.currentTime >= this.endTimeDamageIndicationFront && this.sprites.frontIndicator) {
			this.sprites.frontIndicator.visible = false;
		}

		if (this.currentTime >= this.endTimeDamageIndicationRight && this.sprites.rightIndicator) {
			this.sprites.rightIndicator.visible = false;
		}

		if (this.currentTime >= this.endTimeDamageIndicationLeft && this.sprites.leftIndicator) {
			this.sprites.leftIndicator.visible = false;
		}

		if (this.currentTime >= this.endTimeDamageIndicationBack && this.sprites.backIndicator) {
			this.sprites.backIndicator.visible = false;
		}
	}

	/**
	* Updates hit markers animation and lifetime
	* @private
	* @param {Number} delta - Time delta
	*/
	_updateHitMarkers(delta) {
		for (let i = this.hitMarkers.length - 1; i >= 0; i--) {
			const marker = this.hitMarkers[i];
			marker.lifetime -= delta;
			
			// Scale and fade out the hit marker
			const progress = 1 - (marker.lifetime / marker.duration);
			marker.sprite.scale.set(
				marker.initialScale * (1 + progress * 0.5),
				marker.initialScale * (1 + progress * 0.5),
				1
			);
			
			if (marker.sprite.material) {
				marker.sprite.material.opacity = 1 - progress;
			}
			
			if (marker.lifetime <= 0) {
				this.hitMarkerGroup.remove(marker.sprite);
				this.hitMarkers.splice(i, 1);
			}
		}
	}

	/**
	* Updates low health visual effect
	* @private
	* @param {Number} delta - Time delta
	*/
	_updateLowHealthEffect(delta) {
		if (!this.sprites.lowHealthOverlay) return;
		
		const player = this.world.player;
		if (!player) return;
		
		// Health threshold for showing the effect (30% health)
		const lowHealthThreshold = 30;
		
		if (player.health <= lowHealthThreshold) {
			this.showLowHealthEffect = true;
			
			// Pulse the overlay intensity based on health percentage
			const healthRatio = player.health / lowHealthThreshold;
			const pulseSpeed = 2.0 * (1 - healthRatio); // Faster pulse at lower health
			
			// Calculate pulse intensity
			this.lowHealthPulseIntensity += delta * pulseSpeed;
			const pulseValue = 0.3 + 0.2 * Math.sin(this.lowHealthPulseIntensity);
			
			this.sprites.lowHealthOverlay.visible = true;
			if (this.sprites.lowHealthOverlay.material) {
				this.sprites.lowHealthOverlay.material.opacity = pulseValue;
			}
			
			// Play low health sound if available (with cooldown)
			if (this.sounds.lowHealth && !this.sounds.lowHealth.playing && Math.sin(this.lowHealthPulseIntensity) > 0.9) {
				this.sounds.lowHealth.play();
				this.sounds.lowHealth.playing = true;
				setTimeout(() => { this.sounds.lowHealth.playing = false; }, 3000);
			}
		} else {
			this.showLowHealthEffect = false;
			this.sprites.lowHealthOverlay.visible = false;
		}
	}

	/**
	* Updates positions of objective markers in 3D space
	* @private
	*/
	_updateObjectiveMarkers() {
		// Placeholder for objective marker update logic
		// In a real implementation, this would update marker positions based on objectives
	}

	/**
	* Changes the style of the crosshairs in order to show a
	* sucessfull hit.
	*
	* @return {UIManager} A reference to this UI manager.
	*/
	showHitIndication() {
		if (this.sprites.crosshairs && this.sprites.crosshairs.material) {
			this.sprites.crosshairs.material.color.set(0xff0000);
			this.endTimeHitIndication = this.currentTime + this.hitIndicationTime;
			
			// Also spawn a hit marker
			this._spawnHitMarker();
			
			// Play hit confirm sound if available
			if (this.sounds.hitConfirm) {
				this.sounds.hitConfirm.play();
			}
		}

		return this;
	}

	/**
	* Creates a temporary hit marker at the center of the screen
	* @private
	*/
	_spawnHitMarker() {
		if (!this.sprites.hitMarker) return;
		
		// Clone the hit marker sprite
		const marker = this.sprites.hitMarker.clone();
		marker.visible = true;
		
		const markerSize = 24;
		marker.scale.set(markerSize, markerSize, 1);
		
		this.hitMarkerGroup.add(marker);
		
		// Add to the list of active hit markers
		this.hitMarkers.push({
			sprite: marker,
			lifetime: 0.5, // Duration in seconds
			duration: 0.5,
			initialScale: markerSize
		});
	}

	/**
	* Removes the hit indication of the crosshairs in order to show its
	* default state.
	*
	* @return {UIManager} A reference to this UI manager.
	*/
	hideHitIndication() {
		if (this.sprites.crosshairs && this.sprites.crosshairs.material) {
			this.sprites.crosshairs.material.color.set(0xffffff);
		}
		
		this.endTimeHitIndication = Infinity;

		return this;
	}

	/**
	* Shows radial elements around the crosshairs to visualize the attack direction
	* for a certain amount of time.
	*
	* @param {Number} angle - The angle that determines the radial element.
	* @param {Number} damage - Optional damage amount to display.
	* @return {UIManager} A reference to this UI manager.
	*/
	showDamageIndication(angle, damage = 0) {
		let indicatorToShow = null;

		if (angle >= -PI25 && angle <= PI25) {
			if (this.sprites.frontIndicator) {
				this.sprites.frontIndicator.visible = true;
				indicatorToShow = this.sprites.frontIndicator;
				this.endTimeDamageIndicationFront = this.currentTime + this.damageIndicationTime;
			}
		} else if (angle > PI25 && angle <= PI75) {
			if (this.sprites.rightIndicator) {
				this.sprites.rightIndicator.visible = true;
				indicatorToShow = this.sprites.rightIndicator;
				this.endTimeDamageIndicationRight = this.currentTime + this.damageIndicationTime;
			}
		} else if (angle >= -PI75 && angle < -PI25) {
			if (this.sprites.leftIndicator) {
				this.sprites.leftIndicator.visible = true;
				indicatorToShow = this.sprites.leftIndicator;
				this.endTimeDamageIndicationLeft = this.currentTime + this.damageIndicationTime;
			}
		} else {
			if (this.sprites.backIndicator) {
				this.sprites.backIndicator.visible = true;
				indicatorToShow = this.sprites.backIndicator;
				this.endTimeDamageIndicationBack = this.currentTime + this.damageIndicationTime;
			}
		}

		// If damage value is provided and the indicator has a material, show damage value
		if (damage > 0 && indicatorToShow && indicatorToShow.material) {
			// In a full implementation, this would create a floating damage number
			// For now we just make the indicator more visible based on damage
			const intensity = Math.min(1.0, damage / 50);
			indicatorToShow.material.opacity = 0.5 + intensity * 0.5;
		}

		return this;
	}

	/**
	* Shows the FPS interface.
	*
	* @return {UIManager} A reference to this UI manager.
	*/
	showFPSInterface() {
		if (this.sprites.crosshairs) {
			this.sprites.crosshairs.visible = true;
		}

		if (this.html.hudAmmo) {
			this.html.hudAmmo.classList.remove('hidden');
		}
		
		if (this.html.hudHealth) {
			this.html.hudHealth.classList.remove('hidden');
		}

		// Initialize advanced minimap with a proper delay to ensure world is loaded
		if (this.minimapIntegration && !this.minimapIntegration.initialized) {
			setTimeout(() => {
				try {
					console.log('Initializing minimap...');
					const success = this.minimapIntegration.init();
					if (success) {
						console.log('Minimap initialized successfully');
						// Call addAllEnemies explicitly to ensure enemies are displayed
						this.minimapIntegration.addAllEnemies();
					} else {
						console.error('Failed to initialize minimap');
					}
				} catch (error) {
					console.error('Error initializing minimap:', error);
				}
			}, 1000); // Longer delay to ensure world objects are fully loaded
		}
		
		if (this.minimapIntegration) {
			this.minimapIntegration.show();
		}

		// Show all the HUD elements
		if (this.html.hudMinimap) {
			this.html.hudMinimap.classList.remove('hidden');
		}
		
		if (this.html.advancedMinimapContainer) {
			this.html.advancedMinimapContainer.classList.remove('hidden');
		}

		if (this.html.hudCompass) {
			this.html.hudCompass.classList.remove('hidden');
		}
		
		if (this.html.hudWeapons) {
			this.html.hudWeapons.classList.remove('hidden');
		}
		
		if (this.html.hudMatchTimer) {
			this.html.hudMatchTimer.classList.remove('hidden');
		}
		
		if (this.html.hudKillStreak) {
			this.html.hudKillStreak.classList.remove('hidden');
		}
		
		if (this.html.hudScore) {
			this.html.hudScore.classList.remove('hidden');
		}
		
		if (this.html.hudObjectives) {
			this.html.hudObjectives.classList.remove('hidden');
		}

		this.updateAmmoStatus();
		this.updateHealthStatus();
		this._updateMatchTimer();

		return this;
	}

	/**
	* Hides the FPS interface.
	*
	* @return {UIManager} A reference to this UI manager.
	*/
	hideFPSInterface() {
		// Hide all HUD elements
		const hudElements = [
			'hudAmmo', 'hudHealth', 'hudMinimap', 'advancedMinimapContainer',
			'hudCompass', 'hudWeapons', 'hudMatchTimer', 'hudKillStreak',
			'hudScore', 'hudObjectives', 'hudFragList'
		];
		
		for (const element of hudElements) {
			if (this.html[element]) {
				this.html[element].classList.add('hidden');
			}
		}

		// Hide minimap
		if (this.minimapIntegration) {
			this.minimapIntegration.hide();
		}

		// Hide all sprites
		const sprites = [
			'crosshairs', 'frontIndicator', 'rightIndicator', 
			'leftIndicator', 'backIndicator', 'lowHealthOverlay'
		];
		
		for (const sprite of sprites) {
			if (this.sprites[sprite]) {
				this.sprites[sprite].visible = false;
			}
		}
		
		// Clear all hit markers
		this.hitMarkers = [];
		while (this.hitMarkerGroup.children.length > 0) {
			this.hitMarkerGroup.remove(this.hitMarkerGroup.children[0]);
		}

		return this;
	}

	/**
	* Sets the size of the UI manager.
	*
	* @param {Number} width - The width in pixels.
	* @param {Number} height - The height in pixels.
	* @return {UIManager} A reference to this UI manager.
	*/
	setSize(width, height) {
		this.camera.left = -width / 2;
		this.camera.right = width / 2;
		this.camera.top = height / 2;
		this.camera.bottom = -height / 2;
		this.camera.updateProjectionMatrix();

		return this;
	}

	/**
	 * Updates the UI element that displays the frags.
	 *
	 * @return {UIManager} A reference to this UI manager.
	 */
	_updateFragList() {
		if (!this.html.fragList || !this.html.hudFragList) {
			return this;
		}

		const fragMessages = this.fragMessages;

		// check for expired messages (new messages are at the end of the array)
		for (let i = (fragMessages.length - 1); i >= 0; i--) {
			const message = fragMessages[i];

			if (this.currentTime >= message.endTime) {
				fragMessages.splice(i, 1);

				// remove the visual representation of the frag message
				const fragList = this.html.fragList;
				if (fragList && message.html) {
					// Add fade-out animation before removal
					message.html.style.animation = 'fadeOut 0.3s ease-in-out';
					
					// Use animation end event to remove element
					message.html.addEventListener('animationend', () => {
						if (message.html.parentNode === fragList) {
							fragList.removeChild(message.html);
						}
					});
				}
			}
		}

		// hide html element if there are no elements
		if (fragMessages.length === 0 && this.html.hudFragList) {
			this.html.hudFragList.classList.add('hidden');
		}

		return this;
	}

	/**
	 * Adds a kill message to the kill message display.
	 * @param {GameEntity} fragger - The fragger.
	 * @param {GameEntity} victim - The defeated game entity.
	 * @return {UIManager} A reference to this UI manager.
	 */
	addFragMessage(fragger, victim) {
		if (!this.html.hudFragList || !this.html.fragList) {
			return this;
		}

		// make the list visible
		this.html.hudFragList.classList.remove('hidden');

		// create the frag message
		if (!fragger || !victim) {
			return this;
		}

		const string = fragger.name + ' fragged ' + victim.name;

		const fraggerSpan = document.createElement('span');
		fraggerSpan.style.color = '#00ff00';
		fraggerSpan.textContent = fragger.name;

		const middleSpan = document.createElement('span');
		middleSpan.textContent = ' fragged ';

		const victimSpan = document.createElement('span');
		victimSpan.style.color = '#ff0000';
		victimSpan.textContent = victim.name;

		// create the respective HTML
		const frag = document.createElement('li');
		frag.classList.add('fragEntry'); // Add the fragEntry class for styling
		frag.appendChild(fraggerSpan);
		frag.appendChild(middleSpan);
		frag.appendChild(victimSpan);

		// Add headshot indicator if it was a headshot (placeholder logic)
		const wasHeadshot = Math.random() < 0.3; // 30% chance it's a headshot for demo
		if (wasHeadshot) {
			const headshotSpan = document.createElement('span');
			headshotSpan.textContent = ' [HEADSHOT]';
			headshotSpan.style.color = '#ff9900';
			frag.appendChild(headshotSpan);
		}

		// save everything in a new message object
		const fragMessage = {
			text: string,
			endTime: this.currentTime + CONFIG.UI.FRAGS.TIME,
			html: frag
		};

		this.fragMessages.push(fragMessage);

		// append the HTML to the list
		const fragList = this.html.fragList;
		
		// Add to beginning instead of end for modern FPS style
		if (fragList.firstChild) {
			fragList.insertBefore(frag, fragList.firstChild);
		} else {
			fragList.appendChild(frag);
		}

		// Add fade-in animation
		frag.style.animation = 'fadeIn 0.3s ease-in-out';

		// Add kill streak counter if the fragger is the player
		if (fragger === this.world.player) {
			this._handleKillStreak();
			
			// Update player score
			if (this.html.hudScore) {
				const currentScoreText = this.html.hudScore.querySelector('div').textContent;
				const currentScore = parseInt(currentScoreText.replace('Score: ', ''));
				const pointsForKill = wasHeadshot ? 150 : 100;
				this.html.hudScore.querySelector('div').textContent = `Score: ${currentScore + pointsForKill}`;
				
				// Animate score change
				this.html.hudScore.classList.add('score-update');
				setTimeout(() => {
					this.html.hudScore.classList.remove('score-update');
				}, 500);
			}
			
			// Play kill confirm sound
			if (this.sounds.killConfirm) {
				this.sounds.killConfirm.play();
			}
		}

		return this;
	}

	/**
	* Handle kill streak logic and UI updates
	* @private
	*/
	_handleKillStreak() {
		// Clear any existing timeout
		if (this.killStreakTimeout) {
			clearTimeout(this.killStreakTimeout);
		}
		
		// Increment kill streak
		this.killStreakCount++;
		
		// Show kill streak notification
		if (this.html.hudKillStreak) {
			this.html.hudKillStreak.classList.remove('hidden');
			
			let streakText = '';
			if (this.killStreakCount === 3) {
				streakText = 'Triple Kill!';
			} else if (this.killStreakCount === 5) {
				streakText = 'Killing Spree!';
			} else if (this.killStreakCount === 10) {
				streakText = 'Rampage!';
			} else if (this.killStreakCount === 15) {
				streakText = 'Unstoppable!';
			} else if (this.killStreakCount === 20) {
				streakText = 'Godlike!';
			} else if (this.killStreakCount > 1) {
				streakText = `${this.killStreakCount}x Kill Streak`;
			}
			
			if (streakText) {
				this.html.hudKillStreak.querySelector('div').textContent = streakText;
				this.html.hudKillStreak.style.animation = 'pulseScale 0.5s ease-in-out';
				
				// Play kill streak sound for special streaks
				if ([3, 5, 10, 15, 20].includes(this.killStreakCount) && this.sounds.killStreak) {
					this.sounds.killStreak.play();
				}
				
				// Reset animation
				setTimeout(() => {
					this.html.hudKillStreak.style.animation = '';
				}, 500);
			}
		}
		
		// Reset streak after 10 seconds of no kills
		this.killStreakTimeout = setTimeout(() => {
			this.killStreakCount = 0;
			if (this.html.hudKillStreak) {
				this.html.hudKillStreak.classList.add('hidden');
			}
		}, 10000);
	}

	/**
	* Updates the UI with current ammo data.
	*
	* @return {UIManager} A reference to this UI manager.
	*/
	updateAmmoStatus() {
		const player = this.world.player;
		if (!player || !player.weaponSystem || !player.weaponSystem.currentWeapon) {
			return this;
		}
		
		const weapon = player.weaponSystem.currentWeapon;

		if (this.html.roundsLeft) {
			this.html.roundsLeft.textContent = weapon.roundsLeft;
		}
		
		if (this.html.ammo) {
			this.html.ammo.textContent = weapon.ammo;
		}

		return this;
	}

	/**
	* Updates the UI with current health data.
	*
	* @return {UIManager} A reference to this UI manager.
	*/
	updateHealthStatus() {
		const player = this.world.player;
		if (!player) {
			return this;
		}

		if (this.html.health) {
			this.html.health.textContent = player.health;
			
			// Change color based on health level
			if (player.health > 70) {
				this.html.health.style.color = '#00ff00'; // Green for good health
			} else if (player.health > 30) {
				this.html.health.style.color = '#ffff00'; // Yellow for medium health
			} else {
				this.html.health.style.color = '#ff0000'; // Red for low health
			}
		}

		return this;
	}

	/**
	* Adds a new objective to track
	* 
	* @param {String} id - Unique identifier
	* @param {String} text - Objective description
	* @param {Vector3} position - 3D position of the objective
	* @param {Boolean} isComplete - Whether objective is completed
	* @return {UIManager} A reference to this UI manager
	*/
	addObjective(id, text, position, isComplete = false) {
		// Add to objectives list
		if (this.html.hudObjectives) {
			const objectivesList = this.html.hudObjectives.querySelector('ul') || document.createElement('ul');
			
			if (!objectivesList.parentNode) {
				this.html.hudObjectives.appendChild(objectivesList);
			}
			
			const objectiveItem = document.createElement('li');
			objectiveItem.id = `objective-${id}`;
			objectiveItem.dataset.complete = isComplete ? 'true' : 'false';
			
			const checkbox = document.createElement('span');
			checkbox.className = 'objective-checkbox';
			checkbox.textContent = isComplete ? '✓' : '□';
			
			const objectiveText = document.createElement('span');
			objectiveText.className = 'objective-text';
			objectiveText.textContent = text;
			
			if (isComplete) {
				objectiveItem.classList.add('complete');
				objectiveText.style.textDecoration = 'line-through';
			}
			
			objectiveItem.appendChild(checkbox);
			objectiveItem.appendChild(objectiveText);
			objectivesList.appendChild(objectiveItem);
			
			// Show the objectives container
			this.html.hudObjectives.classList.remove('hidden');
		}
		
		// Add 3D marker if position is provided
		if (position) {
			// In a real implementation, this would create a 3D marker at the objective position
			// and add it to the objectiveMarkers group
		}
		
		return this;
	}

	/**
	* Updates objective completion status
	* 
	* @param {String} id - Objective identifier
	* @param {Boolean} isComplete - New completion status
	* @return {UIManager} A reference to this UI manager
	*/
	updateObjectiveStatus(id, isComplete) {
		const objectiveItem = document.getElementById(`objective-${id}`);
		
		if (objectiveItem) {
			objectiveItem.dataset.complete = isComplete ? 'true' : 'false';
			
			const checkbox = objectiveItem.querySelector('.objective-checkbox');
			if (checkbox) {
				checkbox.textContent = isComplete ? '✓' : '□';
			}
			
			const objectiveText = objectiveItem.querySelector('.objective-text');
			if (objectiveText) {
				if (isComplete) {
					objectiveItem.classList.add('complete');
					objectiveText.style.textDecoration = 'line-through';
				} else {
					objectiveItem.classList.remove('complete');
					objectiveText.style.textDecoration = 'none';
				}
			}
			
			// Animate the item
			objectiveItem.style.animation = 'pulseHighlight 0.5s ease-in-out';
			setTimeout(() => {
				objectiveItem.style.animation = '';
			}, 500);
		}
		
		return this;
	}

	/**
	* Creates the UI-elements for the FPS view.
	*
	* @return {UIManager} A reference to this UI manager.
	*/
	_buildFPSInterface() {
		try {
			const assetManager = this.world.assetManager;
			if (!assetManager || !assetManager.textures) {
				console.warn('AssetManager or textures not available for UI setup');
				return this;
			}

			// crosshairs
			const crosshairsTexture = assetManager.textures.get('crosshairs');
			if (crosshairsTexture) {
				const crosshairsMaterial = new SpriteMaterial({ map: crosshairsTexture, opacity: CONFIG.UI.CROSSHAIRS.OPACITY });
				const crosshairs = new Sprite(crosshairsMaterial);
				crosshairs.matrixAutoUpdate = false;
				crosshairs.visible = false;
				crosshairs.position.set(0, 0, 1);
				crosshairs.scale.set(CONFIG.UI.CROSSHAIRS.SCALE, CONFIG.UI.CROSSHAIRS.SCALE, 1);
				crosshairs.updateMatrix();
				this.scene.add(crosshairs);
				this.sprites.crosshairs = crosshairs;
			}

			// front indicator
			const frontIndicatorTexture = assetManager.textures.get('damageIndicatorFront');
			if (frontIndicatorTexture) {
				const frontIndicatorMaterial = new SpriteMaterial({ map: frontIndicatorTexture, opacity: CONFIG.UI.DAMAGE_INDICATOR.OPACITY });
				const frontIndicator = new Sprite(frontIndicatorMaterial);
				frontIndicator.matrixAutoUpdate = false;
				frontIndicator.visible = false;
				frontIndicator.position.set(0, 0, 1);
				frontIndicator.scale.set(CONFIG.UI.DAMAGE_INDICATOR.SCALE, CONFIG.UI.DAMAGE_INDICATOR.SCALE, 1);
				frontIndicator.updateMatrix();
				this.scene.add(frontIndicator);
				this.sprites.frontIndicator = frontIndicator;
			}

			// right indicator
			const rightIndicatorTexture = assetManager.textures.get('damageIndicatorRight');
			if (rightIndicatorTexture) {
				const rightIndicatorMaterial = new SpriteMaterial({ map: rightIndicatorTexture, opacity: CONFIG.UI.DAMAGE_INDICATOR.OPACITY });
				const rightIndicator = new Sprite(rightIndicatorMaterial);
				rightIndicator.matrixAutoUpdate = false;
				rightIndicator.visible = false;
				rightIndicator.position.set(0, 0, 1);
				rightIndicator.scale.set(CONFIG.UI.DAMAGE_INDICATOR.SCALE, CONFIG.UI.DAMAGE_INDICATOR.SCALE, 1);
				rightIndicator.updateMatrix();
				this.scene.add(rightIndicator);
				this.sprites.rightIndicator = rightIndicator;
			}

			// left indicator
			const leftIndicatorTexture = assetManager.textures.get('damageIndicatorLeft');
			if (leftIndicatorTexture) {
				const leftIndicatorMaterial = new SpriteMaterial({ map: leftIndicatorTexture, opacity: CONFIG.UI.DAMAGE_INDICATOR.OPACITY });
				const leftIndicator = new Sprite(leftIndicatorMaterial);
				leftIndicator.matrixAutoUpdate = false;
				leftIndicator.visible = false;
				leftIndicator.position.set(0, 0, 1);
				leftIndicator.scale.set(CONFIG.UI.DAMAGE_INDICATOR.SCALE, CONFIG.UI.DAMAGE_INDICATOR.SCALE, 1);
				leftIndicator.updateMatrix();
				this.scene.add(leftIndicator);
				this.sprites.leftIndicator = leftIndicator;
			}

			// back indicator
			const backIndicatorTexture = assetManager.textures.get('damageIndicatorBack');
			if (backIndicatorTexture) {
				const backIndicatorMaterial = new SpriteMaterial({ map: backIndicatorTexture, opacity: CONFIG.UI.DAMAGE_INDICATOR.OPACITY });
				const backIndicator = new Sprite(backIndicatorMaterial);
				backIndicator.matrixAutoUpdate = false;
				backIndicator.visible = false;
				backIndicator.position.set(0, 0, 1);
				backIndicator.scale.set(CONFIG.UI.DAMAGE_INDICATOR.SCALE, CONFIG.UI.DAMAGE_INDICATOR.SCALE, 1);
				backIndicator.updateMatrix();
				this.scene.add(backIndicator);
				this.sprites.backIndicator = backIndicator;
			}
			
			// Add hit marker sprite
			const hitMarkerTexture = assetManager.textures.get('hitMarker') || assetManager.textures.get('crosshairs');
			if (hitMarkerTexture) {
				const hitMarkerMaterial = new SpriteMaterial({ 
					map: hitMarkerTexture, 
					opacity: 0.8,
					transparent: true,
					depthTest: false
				});
				const hitMarker = new Sprite(hitMarkerMaterial);
				hitMarker.matrixAutoUpdate = false;
				hitMarker.visible = false;
				hitMarker.position.set(0, 0, 1);
				hitMarker.scale.set(20, 20, 1);
				hitMarker.updateMatrix();
				this.sprites.hitMarker = hitMarker;
			}
			
			// Add low health overlay
			// In a real implementation, this would use a red vignette texture
			const dummyTexture = new TextureLoader().load(
				'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
			);
			const lowHealthMaterial = new SpriteMaterial({
				map: dummyTexture,
				color: 0xff0000,
				opacity: 0,
				transparent: true,
				depthTest: false
			});
			const lowHealthOverlay = new Sprite(lowHealthMaterial);
			lowHealthOverlay.scale.set(2000, 2000, 1); // Very large to cover the screen
			lowHealthOverlay.position.set(0, 0, 0.5); // Behind other UI elements
			lowHealthOverlay.visible = false;
			this.scene.add(lowHealthOverlay);
			this.sprites.lowHealthOverlay = lowHealthOverlay;
			
		} catch (error) {
			console.error('Error building FPS interface:', error);
		}

		return this;
	}

	/**
	* Called when player switches weapons
	* 
	* @param {Weapon} newWeapon - The weapon being switched to
	* @return {UIManager} A reference to this UI manager
	*/
	onWeaponSwitch(newWeapon) {
		// Update ammo display
		this.updateAmmoStatus();
		
		// Play weapon switch sound if available
		if (this.sounds.weaponSwitch) {
			this.sounds.weaponSwitch.play();
		}
		
		// In a real implementation, this would animate the weapon change in the UI
		
		return this;
	}

	/**
	* Opens the debug interface.
	*
	* @return {UIManager} A reference to this UI manager.
	*/
	openDebugUI() {
		if (this.datGui) {
			this.datGui.open();
		}

		return this;
	}

	/**
	* Closes the debug interface.
	*
	* @return {UIManager} A reference to this UI manager.
	*/
	closeDebugUI() {
		if (this.datGui) {
			this.datGui.close();
		}

		return this;
	}

	/**
	* Renders the HUD sprites. This is done after rendering the actual 3D scene.
	*
	* @return {UIManager} A reference to this UI manager.
	*/
	_render() {
		try {
			if (!this.world || !this.world.renderer) {
				return this;
			}

			this.world.renderer.clearDepth();
			this.world.renderer.render(this.scene, this.camera);
		} catch (error) {
			console.error('Error rendering UI:', error);
		}

		return this;
	}

	/**
	* Updates the minimap overlay.
	*
	* @return {UIManager} A reference to this UI manager.
	*/
	_updateMinimap() {
		if (!this.minimapCtx || !this.world || !this.world.player) return;
		const ctx = this.minimapCtx;
		const size = this.minimapSize;
		ctx.clearRect(0, 0, size, size);

		// Helper: map world X/Z to minimap X/Y
		const mapToMinimap = (x, z) => {
			const mx = ((x + this.minimapWorldWidth / 2) / this.minimapWorldWidth) * size;
			const my = size - ((z + this.minimapWorldDepth / 2) / this.minimapWorldDepth) * size;
			return [mx, my];
		};

		// Draw background
		ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
		ctx.fillRect(0, 0, size, size);
		
		// Draw border
		ctx.strokeStyle = '#e63946';
		ctx.lineWidth = 2;
		ctx.strokeRect(0, 0, size, size);

		// Draw player
		const player = this.world.player;
		const [px, py] = mapToMinimap(player.position.x, player.position.z);
		// Draw player orientation as a triangle/arrow
		const angle = Math.atan2(player.forward.x, player.forward.z); // Yaw
		ctx.save();
		ctx.translate(px, py);
		ctx.rotate(-angle); // Canvas Y axis is down
		
		// Pulse effect for player marker
		const pulse = 0.8 + 0.2 * Math.sin(this.currentTime * 3);
		
		// Player triangle with pulse effect
		ctx.fillStyle = `rgba(0, 255, 0, ${pulse})`;
		ctx.beginPath();
		ctx.moveTo(0, -8); // tip
		ctx.lineTo(5, 6);
		ctx.lineTo(-5, 6);
		ctx.closePath();
		ctx.fill();
		
		// Add a center dot
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.arc(0, 0, 2, 0, 2 * Math.PI);
		ctx.fill();
		
		ctx.restore();

		// Draw enemies
		const competitors = this.world.competitors || [];
		for (const entity of competitors) {
			if (entity === player || entity.status !== 1 /* STATUS_ALIVE */) continue;
			
			const [ex, ey] = mapToMinimap(entity.position.x, entity.position.z);
			
			// Only show enemies in line of sight or that have fired recently
			const isVisible = this._isInLineOfSight(player, entity);
			const hasFiredRecently = entity.hasFiredRecently || false; // This would be set elsewhere
			
			if (isVisible || hasFiredRecently) {
				ctx.save();
				ctx.translate(ex, ey);
				
				// Pulse effect for enemies that fired recently
				if (hasFiredRecently) {
					const firePulse = 0.7 + 0.3 * Math.sin(this.currentTime * 5);
					ctx.fillStyle = `rgba(255, 60, 60, ${firePulse})`;
					ctx.beginPath();
					ctx.arc(0, 0, 7, 0, 2 * Math.PI);
					ctx.fill();
				}
				
				// Normal enemy dot
				ctx.fillStyle = isVisible ? '#ff3333' : 'rgba(255, 51, 51, 0.7)';
				ctx.beginPath();
				ctx.arc(0, 0, 5, 0, 2 * Math.PI);
				ctx.fill();
				
				// Direction indicator if visible
				if (isVisible && entity.forward) {
					const enemyAngle = Math.atan2(entity.forward.x, entity.forward.z);
					ctx.rotate(-enemyAngle);
					ctx.fillStyle = '#ff8888';
					ctx.beginPath();
					ctx.moveTo(0, -6);
					ctx.lineTo(3, 0);
					ctx.lineTo(-3, 0);
					ctx.closePath();
					ctx.fill();
				}
				
				ctx.restore();
			}
		}
		
		// Draw items, pickups, etc.
		this._drawMapItems(ctx, mapToMinimap);
		
		return this;
	}
	
	/**
	* Draw items on the minimap
	* @private
	* @param {CanvasRenderingContext2D} ctx - Canvas context
	* @param {Function} mapToMinimap - Coordinate mapping function
	*/
	_drawMapItems(ctx, mapToMinimap) {
		// Draw pickups, health, ammo, etc.
		const items = this.world.items || [];
		
		for (const item of items) {
			if (!item.position) continue;
			
			const [ix, iy] = mapToMinimap(item.position.x, item.position.z);
			ctx.save();
			ctx.translate(ix, iy);
			
			// Different colors/shapes for different item types
			let color = '#ffffff'; // Default
			let size = 3;
			
			if (item.type === 'health') {
				color = '#00ff00';
				size = 4;
			} else if (item.type === 'ammo') {
				color = '#ffff00';
				size = 3;
			} else if (item.type === 'weapon') {
				color = '#ff9900';
				size = 4;
			} else if (item.type === 'armor') {
				color = '#00ccff';
				size = 4;
			}
			
			// Draw with pulse effect for important items
			const isImportant = item.type === 'health' || item.type === 'weapon';
			if (isImportant) {
				const pulse = 0.7 + 0.3 * Math.sin(this.currentTime * 2);
				ctx.fillStyle = `rgba(${color.slice(1, 3)}, ${color.slice(3, 5)}, ${color.slice(5, 7)}, ${pulse})`;
				ctx.beginPath();
				ctx.arc(0, 0, size + 2, 0, 2 * Math.PI);
				ctx.fill();
			}
			
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(0, 0, size, 0, 2 * Math.PI);
			ctx.fill();
			
			ctx.restore();
		}
	}
	
	/**
	* Check if an entity is in line of sight from player
	* @private
	* @param {GameEntity} player - The player
	* @param {GameEntity} entity - The entity to check
	* @return {Boolean} Whether entity is in line of sight
	*/
	_isInLineOfSight(player, entity) {
		// This is a simplified check - in a real game this would use raycasting
		// to check for obstacles between player and entity
		
		// For now, just use a dot product check to see if entity is in front of player
		const toEntity = {
			x: entity.position.x - player.position.x,
			y: entity.position.y - player.position.y,
			z: entity.position.z - player.position.z
		};
		
		// Normalize
		const length = Math.sqrt(toEntity.x * toEntity.x + toEntity.y * toEntity.y + toEntity.z * toEntity.z);
		toEntity.x /= length;
		toEntity.y /= length;
		toEntity.z /= length;
		
		// Dot product with player's forward vector
		const dot = toEntity.x * player.forward.x + toEntity.y * player.forward.y + toEntity.z * player.forward.z;
		
		// If dot > 0, entity is in front of player
		// Also, check if close enough (within 50 units)
		return dot > 0.5 && length < 50;
	}
}

export { UIManager };