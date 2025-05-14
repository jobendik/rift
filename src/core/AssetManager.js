import { LoadingManager, AnimationLoader, AudioLoader, TextureLoader, Mesh } from 'three';
import { Sprite, SpriteMaterial, DoubleSide, AudioListener, PositionalAudio, SRGBColorSpace } from 'three';
import { LineSegments, LineBasicMaterial, MeshBasicMaterial, BufferGeometry, Vector3, PlaneGeometry } from 'three';
import { LinearFilter } from 'three'; // Added LinearFilter import
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { NavMeshLoader, CostTable } from 'yuka';
import { CONFIG } from './Config.js';

/**
* Class for representing the global asset manager. It is responsible
* for loading and parsing all assets from the backend and provide
* the result in a series of maps.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class AssetManager {

	/**
	* Constructs a new asset manager with the given values.
	*/
	constructor() {
		console.log('AssetManager: Initializing with path prefix fix');
		
		this.loadingManager = new LoadingManager();

		this.animationLoader = new AnimationLoader(this.loadingManager);
		this.audioLoader = new AudioLoader(this.loadingManager);
		this.textureLoader = new TextureLoader(this.loadingManager);
		this.gltfLoader = new GLTFLoader(this.loadingManager);
		this.navMeshLoader = new NavMeshLoader();

		this.listener = new AudioListener();

		this.animations = new Map();
		this.audios = new Map();
		this.configs = new Map();
		this.models = new Map();
		this.textures = new Map();

		this.navMesh = null;
		this.costTable = null;

		// Add error handlers for loaders
		this.loadingManager.onError = (url) => {
			console.error('AssetManager: Loading error for', url);
		};
		
		// Add global progress logger
		this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
			console.info(`AssetManager: Loading progress ${itemsLoaded}/${itemsTotal} - ${url}`);
		};
	}

	/**
	* Initializes the asset manager. All assets are prepared so they
	* can be used by the game.
	*
	* @return {Promise} Resolves when all assets are ready.
	*/
	init() {
		console.info('AssetManager: Initialization started');

		try {
			this._loadAnimations();
			this._loadAudios();
			this._loadConfigs();
			this._loadModels();
			this._loadTextures();
			this._loadNavMesh();
		} catch (error) {
			console.error('AssetManager: Error during initialization:', error);
			// Still continue with promise to not block the application completely
		}

		return new Promise((resolve, reject) => {
			this.loadingManager.onLoad = () => {
				console.info('AssetManager: All assets loaded successfully!');
				resolve();
			};
		});
	}

	/**
	* Clones the given audio source.
	*
	* @param {PositionalAudio} source - A positional audio.
	* @return {PositionalAudio} A clone of the given audio.
	*/
	cloneAudio(source) {
		if (!source) {
			console.error('AssetManager: Attempted to clone null audio source');
			return null;
		}

		try {
			const audio = new source.constructor(source.listener);
			audio.buffer = source.buffer;
			return audio;
		} catch (error) {
			console.error('AssetManager: Error cloning audio:', error);
			return null;
		}
	}

	/**
	* Loads all external animations from the backend.
	*
	* @return {AssetManager} A reference to this asset manager.
	*/
	_loadAnimations() {
		console.info('AssetManager: Loading animations');
		const animationLoader = this.animationLoader;

		// player - removed leading slash
		animationLoader.load('animations/player.json', (clips) => {
			console.info('AssetManager: Player animations loaded:', clips.length);
			for (const clip of clips) {
				this.animations.set(clip.name, clip);
			}
		}, undefined, (error) => {
			console.error('AssetManager: Error loading player animations:', error);
		});

		// blaster - removed leading slash
		animationLoader.load('animations/blaster.json', (clips) => {
			console.info('AssetManager: Blaster animations loaded:', clips.length);
			for (const clip of clips) {
				this.animations.set(clip.name, clip);
			}
		}, undefined, (error) => {
			console.error('AssetManager: Error loading blaster animations:', error);
		});

		// shotgun - removed leading slash
		animationLoader.load('animations/shotgun.json', (clips) => {
			console.info('AssetManager: Shotgun animations loaded:', clips.length);
			for (const clip of clips) {
				this.animations.set(clip.name, clip);
			}
		}, undefined, (error) => {
			console.error('AssetManager: Error loading shotgun animations:', error);
		});

		// assault rifle - removed leading slash
		animationLoader.load('animations/assaultRifle.json', (clips) => {
			console.info('AssetManager: Assault rifle animations loaded:', clips.length);
			for (const clip of clips) {
				this.animations.set(clip.name, clip);
			}
		}, undefined, (error) => {
			console.error('AssetManager: Error loading assault rifle animations:', error);
		});

		// Load enemy animations from separate files
		const gltfLoader = this.gltfLoader;
		// Helper function to extract animation from GLB
		const loadEnemyAnimation = (file, animName) => {
			console.info(`AssetManager: Loading enemy animation: ${animName}`);
			 // Check if we should try loading external files
			const loadExternalAnimations = false; // Set to true when animation files are available
			
			if (loadExternalAnimations) {
				// Use path that will work with GitHub Pages
				const basePath = window.location.pathname.includes('/rift/') ? '/rift/models/' : 'models/';
				gltfLoader.load(`${basePath}${file}`, (gltf) => {
					if (gltf.animations && gltf.animations.length > 0) {
						const anim = gltf.animations[0];
						anim.name = animName;
						this.animations.set(animName, anim);
						console.info(`AssetManager: Enemy animation loaded: ${animName}`);
					} else {
						console.error(`AssetManager: No animations found in ${file}`);
					}
				}, undefined, (error) => {
					console.error(`AssetManager: Error loading enemy animation ${animName}:`, error);
					// Continue loading other assets even if this one fails
				});
			} else {
				console.info(`AssetManager: Skipping external animation file for ${animName}`);
			}
		};

		// Comment out individual animation loading since files don't exist yet
		// Will use animations from the main soldier.glb model instead
		/*
		loadEnemyAnimation('enemy_idle.glb', 'soldier_idle');
		loadEnemyAnimation('enemy_forward.glb', 'soldier_forward');
		loadEnemyAnimation('enemy_backward.glb', 'soldier_backward');
		loadEnemyAnimation('enemy_left.glb', 'soldier_left');
		loadEnemyAnimation('enemy_right.glb', 'soldier_right');
		loadEnemyAnimation('enemy_death1.glb', 'soldier_death1');
		loadEnemyAnimation('enemy_death2.glb', 'soldier_death2');
		*/

		// Note: The soldier model loaded later in _loadModels will provide the animations

		return this;
	}

	/**
	* Loads all audios from the backend.
	*
	* @return {AssetManager} A reference to this asset manager.
	*/
	_loadAudios() {
		console.info('AssetManager: Loading audios');
		const audioLoader = this.audioLoader;
		const audios = this.audios;
		const listener = this.listener;

		try {
			const blasterShot = new PositionalAudio(listener);
			blasterShot.matrixAutoUpdate = false;

			const shotgunShot = new PositionalAudio(listener);
			shotgunShot.matrixAutoUpdate = false;

			const assaultRifleShot = new PositionalAudio(listener);
			assaultRifleShot.matrixAutoUpdate = false;

			const reload = new PositionalAudio(listener);
			reload.matrixAutoUpdate = false;

			const shotgunShotReload = new PositionalAudio(listener);
			shotgunShotReload.matrixAutoUpdate = false;

			const step1 = new PositionalAudio(listener);
			step1.matrixAutoUpdate = false;

			const step2 = new PositionalAudio(listener);
			step2.matrixAutoUpdate = false;

			const impact1 = new PositionalAudio(listener);
			impact1.setVolume(CONFIG.AUDIO.VOLUME_IMPACT);
			impact1.matrixAutoUpdate = false;

			const impact2 = new PositionalAudio(listener);
			impact2.setVolume(CONFIG.AUDIO.VOLUME_IMPACT);
			impact2.matrixAutoUpdate = false;

			const impact3 = new PositionalAudio(listener);
			impact3.setVolume(CONFIG.AUDIO.VOLUME_IMPACT);
			impact3.matrixAutoUpdate = false;

			const impact4 = new PositionalAudio(listener);
			impact4.setVolume(CONFIG.AUDIO.VOLUME_IMPACT);
			impact4.matrixAutoUpdate = false;

			const impact5 = new PositionalAudio(listener);
			impact5.setVolume(CONFIG.AUDIO.VOLUME_IMPACT);
			impact5.matrixAutoUpdate = false;

			const impact6 = new PositionalAudio(listener);
			impact6.setVolume(CONFIG.AUDIO.VOLUME_IMPACT);
			impact6.matrixAutoUpdate = false;

			const impact7 = new PositionalAudio(listener);
			impact7.setVolume(CONFIG.AUDIO.VOLUME_IMPACT);
			impact7.matrixAutoUpdate = false;

			const health = new PositionalAudio(listener);
			health.matrixAutoUpdate = false;

			const ammo = new PositionalAudio(listener);
			ammo.matrixAutoUpdate = false;

			const loadAudio = (path, target, name) => {
				audioLoader.load('audios/' + path, // removed leading slash
					buffer => {
						console.info(`AssetManager: Audio loaded: ${name}`);
						target.setBuffer(buffer);
					},
					undefined,
					error => {
						console.error(`AssetManager: Error loading audio ${name}:`, error);
					}
				);
			};

			loadAudio('machinegun.mp3', blasterShot, 'blaster_shot');
			loadAudio('shotgun_shot.ogg', shotgunShot, 'shotgun_shot');
			loadAudio('assault_rifle_shot.ogg', assaultRifleShot, 'assault_rifle_shot');
			loadAudio('reload.ogg', reload, 'reload');
			loadAudio('shotgun_shot_reload.ogg', shotgunShotReload, 'shotgun_shot_reload');
			loadAudio('step1.ogg', step1, 'step1');
			loadAudio('step2.ogg', step2, 'step2');
			loadAudio('impact1.ogg', impact1, 'impact1');
			loadAudio('impact2.ogg', impact2, 'impact2');
			loadAudio('impact3.ogg', impact3, 'impact3');
			loadAudio('impact4.ogg', impact4, 'impact4');
			loadAudio('impact5.ogg', impact5, 'impact5');
			loadAudio('impact6.ogg', impact6, 'impact6');
			loadAudio('impact7.ogg', impact7, 'impact7');
			loadAudio('health.ogg', health, 'health');
			loadAudio('ammo.ogg', ammo, 'ammo');

			audios.set('blaster_shot', blasterShot);
			audios.set('shotgun_shot', shotgunShot);
			audios.set('assault_rifle_shot', assaultRifleShot);
			audios.set('reload', reload);
			audios.set('shotgun_shot_reload', shotgunShotReload);
			audios.set('step1', step1);
			audios.set('step2', step2);
			audios.set('impact1', impact1);
			audios.set('impact2', impact2);
			audios.set('impact3', impact3);
			audios.set('impact4', impact4);
			audios.set('impact5', impact5);
			audios.set('impact6', impact6);
			audios.set('impact7', impact7);
			audios.set('health', health);
			audios.set('ammo', ammo);
		} catch (error) {
			console.error('AssetManager: Error setting up audio:', error);
		}

		return this;
	}

	/**
	* Loads all configurations from the backend.
	*
	* @return {AssetManager} A reference to this asset manager.
	*/
	_loadConfigs() {
		console.info('AssetManager: Loading configurations');
		const loadingManager = this.loadingManager;
		const configs = this.configs;

		// level config
		loadingManager.itemStart('levelConfig');

		// Removed leading slash
		fetch('config/level.json')
			.then(response => {
				if (!response.ok) {
					throw new Error(`HTTP error ${response.status}`);
				}
				return response.json();
			})
			.then(json => {
				console.info('AssetManager: Level config loaded successfully');
				configs.set('level', json);
				loadingManager.itemEnd('levelConfig');
			})
			.catch(error => {
				console.error('AssetManager: Error loading level config:', error);
				loadingManager.itemError('levelConfig');
			});

		return this;
	}

	/**
	* Loads all models from the backend.
	*
	* @return {AssetManager} A reference to this asset manager.
	*/
	_loadModels() {
		console.info('AssetManager: Loading models');
		const gltfLoader = this.gltfLoader;
		const textureLoader = this.textureLoader;
		const models = this.models;
		const animations = this.animations;

		try {
			// shadow for soldiers - removed leading slash
			console.info('AssetManager: Loading shadow texture');
			const shadowTexture = textureLoader.load('textures/shadow.png', 
				texture => {
					console.info('AssetManager: Shadow texture loaded successfully');
					texture.colorSpace = SRGBColorSpace;
					texture.needsUpdate = true;
				}, 
				undefined, 
				error => {
					console.error('AssetManager: Error loading shadow texture:', error);
				}
			);
			
			const planeGeometry = new PlaneGeometry();
			const planeMaterial = new MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.4 });

			const shadowPlane = new Mesh(planeGeometry, planeMaterial);
			shadowPlane.position.set(0, 0.05, 0);
			shadowPlane.rotation.set(-Math.PI * 0.5, 0, 0);
			shadowPlane.scale.multiplyScalar(2);
			shadowPlane.matrixAutoUpdate = false;
			shadowPlane.updateMatrix();

			// soldier - removed leading slash
			console.info('AssetManager: Loading soldier model');
			gltfLoader.load('models/soldier.glb', 
				(gltf) => {
					console.info('AssetManager: Soldier model loaded successfully');
					const renderComponent = gltf.scene;
					
					// If we're using separate animation files, don't extract animations from model
					// Comment this line if using separate animation files:
					renderComponent.animations = gltf.animations;

					renderComponent.matrixAutoUpdate = false;
					renderComponent.updateMatrix();

					renderComponent.traverse((object) => {
						if (object.isMesh) {
							object.material.side = DoubleSide;
							object.matrixAutoUpdate = false;
							object.updateMatrix();
						}
					});

					renderComponent.add(shadowPlane);
					models.set('soldier', renderComponent);

					// If we're using separate animation files, comment these lines:
					for (let animation of gltf.animations) {
						animations.set(animation.name, animation);
					}
				},
				undefined,
				(error) => {
					console.error('AssetManager: Error loading soldier model:', error);
				}
			);

			// level - removed leading slash
			console.info('AssetManager: Loading level model');
			gltfLoader.load('models/level.glb', 
				(gltf) => {
					console.info('AssetManager: Level model loaded successfully');
					const renderComponent = gltf.scene;
					renderComponent.matrixAutoUpdate = false;
					renderComponent.updateMatrix();

					renderComponent.traverse((object) => {
						object.matrixAutoUpdate = false;
						object.updateMatrix();
					});

					// add lightmap manually since glTF does not support this type of texture so far
					console.info('AssetManager: Loading lightmap texture');
					const mesh = renderComponent.getObjectByName('level');
					if (mesh) {
						// UPDATED LIGHTMAP HANDLING - FIXED CODE
						textureLoader.load('textures/lightmap.png', 
							function(texture) {
								console.info('AssetManager: Lightmap texture loaded successfully');
								
								// Proper texture settings for lightmaps
								texture.colorSpace = SRGBColorSpace;
								texture.flipY = false;
								texture.minFilter = LinearFilter;
								texture.magFilter = LinearFilter;
								texture.generateMipmaps = false;
								
								// Assign to material
								mesh.material.lightMap = texture;
								mesh.material.lightMapIntensity = 1.5; // Adjust as needed
								
								// In newer Three.js versions, specify UV channel for lightmap
								// 0 = first UV set, 1 = second UV set (typically used for lightmaps)
								mesh.material.lightMapUv = 1; 
								
								// Apply anisotropy to diffuse texture if available
								if (mesh.material.map) {
									mesh.material.map.anisotropy = 4;
								}
								
								mesh.material.needsUpdate = true;
								
								console.info('AssetManager: Lightmap applied successfully');
							},
							undefined,
							error => {
								console.error('AssetManager: Error loading lightmap texture:', error);
							}
						);
					} else {
						console.error('AssetManager: Level mesh not found in the loaded model');
					}

					models.set('level', renderComponent);
				},
				undefined,
				(error) => {
					console.error('AssetManager: Error loading level model:', error);
				}
			);

			// Load weapon models with error handling
			const loadWeaponModel = (path, modelName) => {
				console.info(`AssetManager: Loading ${modelName} model`);
				// removed leading slash
				gltfLoader.load('models/' + path, 
					(gltf) => {
						console.info(`AssetManager: ${modelName} model loaded successfully`);
						const renderComponent = gltf.scene;
						renderComponent.matrixAutoUpdate = false;
						renderComponent.updateMatrix();

						renderComponent.traverse((object) => {
							object.matrixAutoUpdate = false;
							object.updateMatrix();
						});

						models.set(modelName, renderComponent);
					},
					undefined,
					(error) => {
						console.error(`AssetManager: Error loading ${modelName} model:`, error);
					}
				);
			};

			// Load weapon models - filenames only
			loadWeaponModel('blaster_high.glb', 'blaster_high');
			loadWeaponModel('blaster_low.glb', 'blaster_low');
			loadWeaponModel('shotgun_high.glb', 'shotgun_high');
			loadWeaponModel('shotgun_low.glb', 'shotgun_low');
			loadWeaponModel('assaultRifle_high.glb', 'assaultRifle_high');
			loadWeaponModel('assaultRifle_low.glb', 'assaultRifle_low');
			loadWeaponModel('healthPack.glb', 'healthPack');

			// muzzle sprite - removed leading slash
			console.info('AssetManager: Loading muzzle texture');
			const muzzleTexture = textureLoader.load('textures/muzzle.png',
				texture => {
					console.info('AssetManager: Muzzle texture loaded successfully');
					texture.colorSpace = SRGBColorSpace;
					texture.needsUpdate = true;
				},
				undefined,
				error => {
					console.error('AssetManager: Error loading muzzle texture:', error);
				}
			);

			const muzzleMaterial = new SpriteMaterial({ map: muzzleTexture });
			const muzzle = new Sprite(muzzleMaterial);
			muzzle.matrixAutoUpdate = false;
			muzzle.visible = false;

			models.set('muzzle', muzzle);

			// bullet line
			const bulletLineGeometry = new BufferGeometry();
			const bulletLineMaterial = new LineBasicMaterial({ color: 0xfbf8e6 });

			bulletLineGeometry.setFromPoints([new Vector3(), new Vector3(0, 0, -1)]);

			const bulletLine = new LineSegments(bulletLineGeometry, bulletLineMaterial);
			bulletLine.matrixAutoUpdate = false;

			models.set('bulletLine', bulletLine);
		} catch (error) {
			console.error('AssetManager: Error in _loadModels:', error);
		}

		return this;
	}

	/**
	* Loads all textures from the backend.
	*
	* @return {AssetManager} A reference to this asset manager.
	*/
	_loadTextures() {
		console.info('AssetManager: Loading UI textures');
		const textureLoader = this.textureLoader;

		try {
			const loadTexture = (path, name) => {
				console.info(`AssetManager: Loading texture: ${name}`);
				// removed leading slash
				let texture = textureLoader.load('textures/' + path,
					texture => {
						console.info(`AssetManager: Texture loaded successfully: ${name}`);
						texture.colorSpace = SRGBColorSpace;
						texture.needsUpdate = true;
					},
					undefined,
					error => {
						console.error(`AssetManager: Error loading texture ${name}:`, error);
					}
				);
				
				// Initial properties setting
				texture.colorSpace = SRGBColorSpace;
				texture.needsUpdate = true;
				this.textures.set(name, texture);
			};

			loadTexture('crosshairs.png', 'crosshairs');
			loadTexture('damageIndicatorFront.png', 'damageIndicatorFront');
			loadTexture('damageIndicatorRight.png', 'damageIndicatorRight');
			loadTexture('damageIndicatorLeft.png', 'damageIndicatorLeft');
			loadTexture('damageIndicatorBack.png', 'damageIndicatorBack');
		} catch (error) {
			console.error('AssetManager: Error in _loadTextures:', error);
		}

		return this;
	}

	/**
	* Loads the navigation mesh from the backend.
	*
	* @return {AssetManager} A reference to this asset manager.
	*/
	_loadNavMesh() {
		const navMeshLoader = this.navMeshLoader;
		const loadingManager = this.loadingManager;

		loadingManager.itemStart('navmesh');
		console.info('AssetManager: Loading navigation mesh');

		// removed leading slash
		navMeshLoader.load('navmeshes/navmesh.glb')
			.then((navMesh) => {
				this.navMesh = navMesh;
				console.info('AssetManager: Navigation mesh loaded successfully');
				loadingManager.itemEnd('navmesh');
			})
			.catch(error => {
				console.error('AssetManager: Error loading navigation mesh:', error);
				loadingManager.itemError('navmesh');
			});

		//

		loadingManager.itemStart('costTable');
		console.info('AssetManager: Loading cost table');

		// removed leading slash
		fetch('navmeshes/costTable.json')
			.then(response => {
				if (!response.ok) {
					throw new Error(`HTTP error ${response.status}`);
				}
				return response.json();
			})
			.then(json => {
				this.costTable = new CostTable().fromJSON(json);
				console.info('AssetManager: Cost table loaded successfully');
				loadingManager.itemEnd('costTable');
			})
			.catch(error => {
				console.error('AssetManager: Error loading cost table:', error);
				loadingManager.itemError('costTable');
			});

		return this;
	}
}

export { AssetManager };