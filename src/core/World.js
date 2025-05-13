import { EntityManager, Time, MeshGeometry, Vector3, CellSpacePartitioning } from 'yuka';
import { WebGLRenderer, Scene, PerspectiveCamera, Color, AnimationMixer, Object3D, SkeletonHelper, SRGBColorSpace } from 'three';
import { HemisphereLight, DirectionalLight } from 'three';
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
	* @return {World} A reference to this world object.
	*/
	setTimeOfDay(timeOfDay) {
		if (this.sky) {
			console.info(`Setting time of day to: ${timeOfDay}`);
			this.sky.setTimeOfDay(timeOfDay);
			
			// Update directional light to match sun position
			const dirLight = this.scene.children.find(child => child.isDirectionalLight);
			if (dirLight) {
				// Get sun position from sky shader
				const sunPos = this.sky.material.uniforms.sunPosition.value;
				dirLight.position.copy(sunPos.clone().multiplyScalar(1000));
				
				// Adjust light color based on time of day
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
		}
		
		return this;
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
			this.scene.background = new Color( 0xffffff );

			// camera
			this.camera = new PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 0.1, 1000 );
			this.camera.position.set( 0, 75, 100 );
			this.camera.add( this.assetManager.listener );

			// helpers
			if ( this.debug ) {
				this.helpers.axesHelper = new AxesHelper( 5 );
				this.helpers.axesHelper.visible = false;
				this.scene.add( this.helpers.axesHelper );
			}

			// lights
			const hemiLight = new HemisphereLight( 0xffffff, 0x444444, 0.4 );
			hemiLight.position.set( 0, 100, 0 );
			this.scene.add( hemiLight );

			const dirLight = new DirectionalLight( 0xffffff, 0.8 );
			dirLight.position.set( - 700, 1000, - 750 );
			this.scene.add( dirLight );

			// Enhanced sky with error handling
			try {
				console.info('Creating enhanced sky...');
				this.sky = new EnhancedSky();
				this.sky.scale.setScalar(450000);
				
				// Set initial time of day - choose one that fits your game's mood
				this.setTimeOfDay('sunset');
				
				this.scene.add(this.sky);
				console.info('Enhanced sky added to scene');
				
				// Clear background color since sky replaces it
				this.scene.background = null;
			} catch (skyError) {
				console.error('Error creating enhanced sky:', skyError);
				// Continue with a basic color background as fallback
				this.scene.background = new Color(0x87CEEB); // light blue skybox
			}

			// renderer
			this.renderer = new WebGLRenderer( { antialias: true } );
			this.renderer.setSize( window.innerWidth, window.innerHeight );
			this.renderer.autoClear = false;
			this.renderer.shadowMap.enabled = true;
			// Set the correct output color space for Three.js 155+
			this.renderer.outputColorSpace = SRGBColorSpace;
			document.body.appendChild( this.renderer.domElement );

			// event listeners
			window.addEventListener( 'resize', this._onWindowResize, false );

			console.info('Scene initialization complete');
			return this;
		} catch (error) {
			console.error('Error in _initScene:', error);
			throw error;
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
			this.uiManager.init();
			console.info('UI initialization complete');
			return this;
		} catch (error) {
			console.error('Error in _initUI:', error);
			// Continue without UI
			return this;
		}
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

	this.renderer.clear();

	this.renderer.render( this.scene, this.camera );

	this.uiManager.update( delta );

}

export default new World();