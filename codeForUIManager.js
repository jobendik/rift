import { OrthographicCamera, Scene, Sprite, SpriteMaterial, TextureLoader, Group, Color, Vector2, Vector3, Raycaster, MathUtils } from 'three';
import { CONFIG } from '../core/Config.js';
import * as DAT from 'dat.gui';
import { MinimapIntegration } from '../ui/hud/minimapIntegration.js';

const PI25 = Math.PI * 0.25;
const PI75 = Math.PI * 0.75;

/**
* Advanced UI manager for a modern FPS experience.
* Provides immersive visual feedback, progression system, and enhanced game feel.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @author {@link https://github.com/robp94|robp94}
* Extensively upgraded for immersive gameplay.
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

        // Core UI timing
        this.hitIndicationTime = CONFIG.UI.CROSSHAIRS.HIT_TIME;
        this.endTimeHitIndication = Infinity;
        this.damageIndicationTime = CONFIG.UI.DAMAGE_INDICATOR.TIME;
        this.endTimeDamageIndicationFront = Infinity;
        this.endTimeDamageIndicationRight = Infinity;
        this.endTimeDamageIndicationLeft = Infinity;
        this.endTimeDamageIndicationBack = Infinity;

        // Gameplay tracking
        this.fragMessages = [];
        this.killStreakCount = 0;
        this.killStreakTimeout = null;
        this.hitMarkers = [];
        this.matchStartTime = null;
        this.showLowHealthEffect = false;
        this.lowHealthPulseIntensity = 0;
        this.lastDamageTime = 0;
        this.lastHealTime = 0;
        this.screenShakeIntensity = 0;
        this.victoryState = false;
        this.storeDamageDirection = null;

        // Player progression
        this.playerLevel = 1;
        this.playerXP = 0;
        this.xpToNextLevel = 1000; // Base XP needed to level up
        this.totalXP = 0;
        this.skillPoints = 0;
        this.playerRank = "Recruit";

        // Dynamic crosshair state
        this.crosshairState = {
            moving: false,
            firing: false,
            onEnemy: false,
            onHeadshot: false,
            expanded: false
        };

        // Damage numbers
        this.damageNumbers = [];

        // Powerups/buffs
        this.activePowerups = [];

        // Objective markers
        this.objectiveMarkers = [];

        // Notification queue
        this.notifications = [];
        this.lastNotificationTime = 0;

        // Environmental indicators
        this.footstepIndicators = [];
        this.dangerZones = new Map();

        // Player stamina
        this.stamina = 100;
        this.staminaMax = 100;
        this.staminaRegenRate = 10; // per second
        this.staminaDecreaseRate = 20; // per second while sprinting

        // Enemy targeting
        this.targetedEnemy = null;
        this.lastEnemyHealthUpdate = 0;

        // Weather effects
        this.weatherActive = false;
        this.weatherType = "none";
        this.raindrops = [];

        // UI element references
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

            // Create new UI elements
            hudMatchTimer: this._createHUDElement('hudMatchTimer', 'Match Time: 00:00'),
            hudKillStreak: this._createHUDElement('hudKillStreak', ''),
            hudObjectives: this._createHUDElement('hudObjectives', ''),
            hudScore: this._createHUDElement('hudScore', 'Score: 0'),
            damageFlash: this._createHUDElement('damageFlash', ''),
            healEffect: this._createHUDElement('healEffect', ''),
            playerLevel: this._createHUDElement('playerLevel', 'Level 1'),
            experienceBar: this._createExperienceBar(),
            notificationArea: this._createHUDElement('notificationArea', ''),
            matchEventsBanner: this._createHUDElement('matchEventsBanner', ''),
            powerupIndicator: this._createHUDElement('powerupIndicator', ''),
            dynamicCrosshair: this._createDynamicCrosshair(),
            weaponWheel: this._createWeaponWheel(),
            roundEndScreen: this._createRoundEndScreen(),
            victoryOverlay: this._createHUDElement('victoryOverlay', ''),
            staminaContainer: this._createStaminaBar(),
            reloadAnimation: this._createHUDElement('reloadAnimation', 'RELOADING...'),
            enemyHealthContainer: this._createEnemyHealthBar(),
            damageDirectionRing: this._createHUDElement('damageDirectionRing', ''),
            worldMap: this._createWorldMap(),
            missionBriefing: this._createMissionBriefing(), // Called here
            achievementPopup: this._createAchievementPopup(),
            weatherEffectsOverlay: this._createHUDElement('weatherEffectsOverlay', ''),
            warningOverlay: this._createHUDElement('warningOverlay', '')
        };

        // Visual sprites
        this.sprites = {
            crosshairs: null,
            frontIndicator: null,
            rightIndicator: null,
            leftIndicator: null,
            backIndicator: null,
            hitMarker: null,
            lowHealthOverlay: null,
        };

        // 3D object groups
        this.objectiveMarkersGroup = new Group();
        this.hitMarkerGroup = new Group();
        this.environmentalEffectsGroup = new Group();
        this.damageNumbersGroup = new Group();

        // Camera setup for HUD rendering
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera = new OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 1, 10);
        this.camera.position.z = 10;

        // Scene setup
        this.scene = new Scene();
        this.scene.add(this.objectiveMarkersGroup);
        this.scene.add(this.hitMarkerGroup);
        this.scene.add(this.environmentalEffectsGroup);
        this.scene.add(this.damageNumbersGroup);

        // Raycaster for 3D UI interactions
        this.raycaster = new Raycaster();
        this.mouse = new Vector2();

        // Debugging
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
            showDamageNumbers: true,
            showNotifications: true,
            enableScreenShake: true,
            enableDynamicWeather: false,
            enableFPSControls: () => {
                if (this.world && this.world.fpsControls) {
                    this.world.fpsControls.connect();
                }
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
            weaponSwitch: null,
            levelUp: null,
            notification: null,
            victory: null,
            powerupPickup: null,
            powerupExpired: null,
            objectiveComplete: null,
            screenShake: null,
            reload: null,
            footstep: null,
            healing: null,
            achievement: null
        };

        // Setup FPS counter if enabled
        if (this.debugParameter.showFPS) {
            this._setupFPSCounter();
        }

        // Event listeners
        this._setupEventListeners();
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

        if (initialText) {
            const div = document.createElement('div');
            div.textContent = initialText;
            section.appendChild(div);
        }

        document.body.appendChild(section);
        return section;
    }

    /**
    * Creates the experience bar for the progression system
    * @private
    * @return {HTMLElement} The experience bar container
    */
    _createExperienceBar() {
        const container = document.createElement('section');
        container.id = 'experienceBar';
        container.className = 'uiContainer hidden';

        const fillBar = document.createElement('div');
        fillBar.id = 'experienceFill';
        fillBar.style.width = '0%';

        container.appendChild(fillBar);
        document.body.appendChild(container);

        return container;
    }

    /**
    * Creates the stamina bar for sprint/abilities
    * @private
    * @return {HTMLElement} The stamina bar container
    */
    _createStaminaBar() {
        const container = document.createElement('div');
        container.id = 'staminaContainer';
        container.className = 'hidden'; // Initially hidden

        const fillBar = document.createElement('div');
        fillBar.id = 'staminaFill';
        fillBar.style.width = '100%';

        container.appendChild(fillBar);
        document.body.appendChild(container);

        return container;
    }

    /**
    * Creates enemy health display
    * @private
    * @return {HTMLElement} The enemy health container
    */
    _createEnemyHealthBar() {
        const container = document.createElement('div');
        container.id = 'enemyHealthContainer';
        container.className = 'enemy-health-container'; // Hidden by default via CSS

        const nameDiv = document.createElement('div');
        nameDiv.className = 'enemy-name';
        nameDiv.textContent = 'Enemy';

        const barDiv = document.createElement('div');
        barDiv.className = 'enemy-health-bar';

        const fillDiv = document.createElement('div');
        fillDiv.className = 'enemy-health-fill';
        barDiv.appendChild(fillDiv);

        const armorDiv = document.createElement('div');
        armorDiv.className = 'enemy-armor';
        armorDiv.style.width = '0%';
        barDiv.appendChild(armorDiv);

        container.appendChild(nameDiv);
        container.appendChild(barDiv);
        document.body.appendChild(container);

        return container;
    }

    /**
    * Creates the world map interface
    * @private
    * @return {HTMLElement} The world map container
    */
    _createWorldMap() {
        const container = document.createElement('div');
        container.id = 'worldMap'; // Hidden by default via CSS unless 'active' class is present

        const content = document.createElement('div');
        content.className = 'world-map-content';

        // Create the legend
        const legend = document.createElement('div');
        legend.className = 'map-legend';

        const legendItems = [
            { color: 'rgba(0, 255, 0, 0.8)', label: 'You' },
            { color: 'rgba(255, 0, 0, 0.8)', label: 'Enemies' },
            { color: 'rgba(33, 150, 243, 0.8)', label: 'Objectives' },
            { color: 'rgba(76, 175, 80, 0.8)', label: 'Health' },
            { color: 'rgba(255, 152, 0, 0.8)', label: 'Weapons' }
        ];

        legendItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'map-legend-item';

            const colorDiv = document.createElement('div');
            colorDiv.className = 'map-legend-color';
            colorDiv.style.backgroundColor = item.color;

            const labelDiv = document.createElement('div');
            labelDiv.textContent = item.label;

            itemDiv.appendChild(colorDiv);
            itemDiv.appendChild(labelDiv);
            legend.appendChild(itemDiv);
        });

        content.appendChild(legend);
        container.appendChild(content);

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.className = 'continue-button'; // Assuming styles for this class exist
        closeButton.textContent = 'CLOSE MAP';
        closeButton.style.position = 'absolute';
        closeButton.style.bottom = '20px';
        closeButton.style.right = '20px';

        closeButton.addEventListener('click', () => {
            container.classList.remove('active');
        });

        content.appendChild(closeButton);
        document.body.appendChild(container);

        return container;
    }

    /**
    * Creates the mission briefing screen
    * @private
    * @return {HTMLElement} The mission briefing container
    */
    _createMissionBriefing() {
        const container = document.createElement('div');
        container.id = 'missionBriefing';
        // Don't add the 'active' class initially

        const content = document.createElement('div');
        content.className = 'briefing-content';

        // Header
        const header = document.createElement('div');
        header.className = 'briefing-header';

        const title = document.createElement('h2');
        title.textContent = 'MISSION BRIEFING';

        const subtitle = document.createElement('p');
        subtitle.textContent = 'Operation: RIFT INCURSION';

        header.appendChild(title);
        header.appendChild(subtitle);
        content.appendChild(header);

        // Description
        const description = document.createElement('div');
        description.className = 'briefing-description';
        description.innerHTML = `
            Welcome, Operative. Your mission is to infiltrate the enemy base and eliminate hostile forces.
            Secure the area and complete all objectives to ensure mission success.
            <br><br>
            Be advised: Enemy forces are well-armed and prepared for your arrival.
        `;
        content.appendChild(description);

        // Objectives
        const objectives = document.createElement('div');
        objectives.className = 'briefing-objectives';
        objectives.innerHTML = '<h3>OBJECTIVES:</h3>';

        const objectivesList = [
            'Eliminate all enemy combatants',
            'Secure the control point',
            'Find all collectibles (0/3)',
            'Extract safely from the area'
        ];

        objectivesList.forEach(obj => {
            const objDiv = document.createElement('div');
            objDiv.className = 'briefing-objective';

            const marker = document.createElement('div');
            marker.className = 'briefing-objective-marker';

            const text = document.createElement('div');
            text.textContent = obj;

            objDiv.appendChild(marker);
            objDiv.appendChild(text);
            objectives.appendChild(objDiv);
        });

        content.appendChild(objectives);

        // Controls
        const controls = document.createElement('div');
        controls.className = 'briefing-controls';

        const startButton = document.createElement('button');
        startButton.textContent = 'START MISSION';
        startButton.addEventListener('click', () => {
            // Hide the briefing
            container.classList.remove('active');

            // Start the game by connecting FPS controls AND starting the animation loop
            if (this.world) {
                // Connect FPS controls
                if (this.world.fpsControls) {
                    this.world.fpsControls.connect();
                }

                // Start the game loop if it was paused
                if (this.world.startGameLoop && typeof this.world.startGameLoop === 'function') {
                    this.world.startGameLoop();
                }

                // Make sure the game is running
                this.world.isGamePaused = false;
            }
        });

        controls.appendChild(startButton);
        content.appendChild(controls);

        container.appendChild(content);
        document.body.appendChild(container);

        return container;
    }


    /**
    * Creates the achievement popup
    * @private
    * @return {HTMLElement} The achievement popup
    */
    _createAchievementPopup() {
        const container = document.createElement('div');
        container.id = 'achievementPopup'; // Hidden by default via CSS unless 'active' class is present

        const icon = document.createElement('div');
        icon.className = 'achievement-icon';
        icon.textContent = '🏆';

        const details = document.createElement('div');
        details.className = 'achievement-details';

        const title = document.createElement('div');
        title.className = 'achievement-title';
        title.textContent = 'Achievement Unlocked';

        const description = document.createElement('div');
        description.className = 'achievement-description';
        description.textContent = 'You unlocked an achievement!';

        details.appendChild(title);
        details.appendChild(description);

        container.appendChild(icon);
        container.appendChild(details);

        document.body.appendChild(container);

        return container;
    }

    /**
    * Creates the dynamic crosshair elements
    * @private
    * @return {HTMLElement} The crosshair container
    */
    _createDynamicCrosshair() {
        const container = document.createElement('div');
        container.id = 'dynamicCrosshair';
        container.className = 'hidden'; // Initially hidden

        // Create the crosshair parts
        const parts = ['center', 'top', 'right', 'bottom', 'left'];

        for (const part of parts) {
            const element = document.createElement('div');
            element.className = `crosshair-part crosshair-${part}`;
            container.appendChild(element);
        }

        // Create dynamic hitmarker
        const hitmarker = document.createElement('div');
        hitmarker.className = 'hitmarker'; // Hidden by default via CSS

        for (let i = 0; i < 4; i++) {
            const part = document.createElement('div');
            part.className = 'hitmarker-part';
            hitmarker.appendChild(part);
        }

        container.appendChild(hitmarker);

        document.body.appendChild(container);
        return container;
    }

    /**
    * Creates the weapon wheel menu
    * @private
    * @return {HTMLElement} The weapon wheel container
    */
    _createWeaponWheel() {
        const container = document.createElement('div');
        container.id = 'weaponWheel'; // Hidden by default via CSS unless 'active' class is present

        const wheelContainer = document.createElement('div');
        wheelContainer.className = 'wheel-container';

        // Create center of wheel
        const wheelCenter = document.createElement('div');
        wheelCenter.className = 'wheel-center';
        wheelCenter.textContent = 'SELECT WEAPON';
        wheelContainer.appendChild(wheelCenter);

        // This would normally create segments based on available weapons
        // For demonstration we'll create 6 segments
        const numSegments = 6;
        const weaponTypes = ['Pistol', 'Rifle', 'Shotgun', 'SMG', 'Sniper', 'Melee'];

        for (let i = 0; i < numSegments; i++) {
            const segment = document.createElement('div');
            segment.className = 'wheel-segment';
            segment.style.setProperty('--rotation', `${(360 / numSegments) * i}deg`);
            segment.style.transform = `rotate(${(360 / numSegments) * i}deg)`;

            const icon = document.createElement('div');
            icon.className = 'wheel-icon';
            icon.setAttribute('data-weapon', weaponTypes[i]);
            icon.textContent = weaponTypes[i].substring(0, 1); // First letter as placeholder

            segment.appendChild(icon);
            wheelContainer.appendChild(segment);

            // Add event listeners
            segment.addEventListener('mouseenter', () => {
                wheelCenter.textContent = weaponTypes[i].toUpperCase();
            });

            segment.addEventListener('mouseleave', () => {
                wheelCenter.textContent = 'SELECT WEAPON';
            });

            segment.addEventListener('click', () => {
                this._selectWeapon(weaponTypes[i]);
                container.classList.remove('active');
            });
        }

        container.appendChild(wheelContainer);
        document.body.appendChild(container);
        return container;
    }

    /**
    * Creates the round end summary screen
    * @private
    * @return {HTMLElement} The round end screen
    */
    _createRoundEndScreen() {
        const container = document.createElement('div');
        container.id = 'roundEndScreen'; // Hidden by default via CSS unless 'active' class is present

        const summary = document.createElement('div');
        summary.className = 'round-summary';

        // Header
        const header = document.createElement('div');
        header.className = 'summary-header';

        const title = document.createElement('h2');
        title.textContent = 'MATCH SUMMARY';

        const subtitle = document.createElement('p');
        subtitle.textContent = 'Your performance this round';

        header.appendChild(title);
        header.appendChild(subtitle);
        summary.appendChild(header);

        // Stats
        const stats = document.createElement('div');
        stats.className = 'summary-stats';

        // Create placeholder stat cards
        const statTypes = [
            { label: 'Kills', value: '0' },
            { label: 'Deaths', value: '0' },
            { label: 'K/D Ratio', value: '0.0' },
            { label: 'Accuracy', value: '0%' },
            { label: 'Headshots', value: '0' },
            { label: 'XP Earned', value: '0' }
        ];

        for (const stat of statTypes) {
            const card = document.createElement('div');
            card.className = 'stat-card';

            const value = document.createElement('div');
            value.className = 'stat-value';
            value.textContent = stat.value;
            value.id = `stat-${stat.label.toLowerCase().replace('/', '-')}`;

            const label = document.createElement('div');
            label.className = 'stat-label';
            label.textContent = stat.label;

            card.appendChild(value);
            card.appendChild(label);
            stats.appendChild(card);
        }

        summary.appendChild(stats);

        // Continue button
        const button = document.createElement('button');
        button.className = 'continue-button';
        button.textContent = 'CONTINUE';
        button.addEventListener('click', () => {
            container.classList.remove('active');
            this._startNewRound();
        });

        summary.appendChild(button);
        container.appendChild(summary);
        document.body.appendChild(container);

        return container;
    }

    /**
    * Sets up FPS counter
    * @private
    */
    _setupFPSCounter() {
        if (this.fpsCounter.fpsElement) return; // Already setup
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
     * Set up DOM event listeners
     * @private
     */
    _setupEventListeners() {
        // Weapon wheel toggle (right mouse button)
        this._contextMenuHandler = (e) => {
            if (this.world && this.world.player && typeof this.world.player.isActive === 'function' && this.world.player.isActive() && !this.world.isGamePaused) {
                e.preventDefault();
                this.toggleWeaponWheel();
            }
        };
        document.addEventListener('contextmenu', this._contextMenuHandler);

        // Mouse move for weapon wheel
        this._mouseMoveHandler = (e) => {
            if(this.world && this.world.isGamePaused && !this.html.missionBriefing.classList.contains('active')) return; // Don't process if game is paused by other means

            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            if (this.html.dynamicCrosshair && !this.html.dynamicCrosshair.classList.contains('hidden')) {
                this._updateCrosshairState(true, this.crosshairState.firing, this.crosshairState.onEnemy, this.crosshairState.onHeadshot);
            }
        };
        document.addEventListener('mousemove', this._mouseMoveHandler);

        // Mouse down for weapon firing state
        this._mouseDownHandler = (e) => {
            if(this.world && this.world.isGamePaused) return;
            if (e.button === 0) { // Left click
                this._updateCrosshairState(this.crosshairState.moving, true, this.crosshairState.onEnemy, this.crosshairState.onHeadshot);
                if (this.crosshairState.onEnemy) {
                    this.showHitMarkerAnimation(this.crosshairState.onHeadshot);
                }
            }
        };
        document.addEventListener('mousedown', this._mouseDownHandler);

        // Mouse up for weapon firing state
        this._mouseUpHandler = (e) => {
            if(this.world && this.world.isGamePaused) return;
            if (e.button === 0) { // Left click
                this._updateCrosshairState(this.crosshairState.moving, false, this.crosshairState.onEnemy, this.crosshairState.onHeadshot);
            }
        };
        document.addEventListener('mouseup', this._mouseUpHandler);

        // Key press events
        this._keyDownHandler = (e) => {
            if(this.world && this.world.isGamePaused && !this.html.missionBriefing.classList.contains('active') && e.key !== 'b' && e.key !== 'B') return; // Allow 'B' for briefing toggle even if paused

            if (e.key === 'Tab') {
                e.preventDefault();
                this._showScoreboard(true);
            }
            if ((e.key === 'r' || e.key === 'R') && !(this.world && this.world.isGamePaused)) this._startReloadAnimation();
            if ((e.key === 'm' || e.key === 'M') && !(this.world && this.world.isGamePaused)) this.toggleWorldMap();
            if (!isNaN(parseInt(e.key)) && parseInt(e.key) >= 1 && parseInt(e.key) <= 9 && !(this.world && this.world.isGamePaused)) {
                this._selectWeaponByIndex(parseInt(e.key) - 1);
            }
            if (e.key === 'Shift' && !(this.world && this.world.isGamePaused)) this._startSprint();
            if (e.key === 'b' || e.key === 'B') this.toggleMissionBriefing(); // Toggle handles pause state
            if ((e.key === 'q' || e.key === 'Q') && !(this.world && this.world.isGamePaused)) this._createPing();
        };
        document.addEventListener('keydown', this._keyDownHandler);

        // Key release events
        this._keyUpHandler = (e) => {
            if(this.world && this.world.isGamePaused && !this.html.missionBriefing.classList.contains('active')) return;

            if (e.key === 'Tab') this._showScoreboard(false);
            if (e.key === 'Shift') this._stopSprint();
        };
        document.addEventListener('keyup', this._keyUpHandler);
    }

    /**
     * Start reload animation
     */
    _startReloadAnimation() {
        if (!this.html.reloadAnimation) return;
        this.html.reloadAnimation.classList.add('active');
        if (this.sounds.reload && typeof this.sounds.reload.play === 'function') this.sounds.reload.play();
        setTimeout(() => {
            this.html.reloadAnimation.classList.remove('active');
            this.updateAmmoStatus();
        }, 2000);
    }

    /**
     * Start sprinting
     * @private
     */
    _startSprint() {
        this.isSprinting = true;
        if (this.html.staminaContainer) this.html.staminaContainer.classList.remove('hidden');
    }

    /**
     * Stop sprinting
     * @private
     */
    _stopSprint() {
        this.isSprinting = false;
        if (this.stamina >= this.staminaMax && this.html.staminaContainer && !this.html.staminaContainer.classList.contains('hidden')) {
            setTimeout(() => {
                if (!this.isSprinting && this.stamina >= this.staminaMax) this.html.staminaContainer.classList.add('hidden');
            }, 2000);
        }
    }

    /**
     * Create ping marker in the world
     * @private
     */
    _createPing() {
        this.addNotification('Pinged location', 'notification-objective');
    }

    /**
    * Shows the mission briefing screen and ensures the game is paused
    * This should be called after the player clicks the PLAY button
    */
    showMissionBriefing() {
        if (!this.html.missionBriefing) return;

        // Show the mission briefing
        this.html.missionBriefing.classList.add('active');

        // Ensure the game is completely paused
        if (this.world) {
            // Disconnect FPS controls to prevent player movement
            if (this.world.fpsControls) {
                this.world.fpsControls.disconnect();
            }

            // Pause the game loop if there's a method for it
            if (this.world.pauseGameLoop && typeof this.world.pauseGameLoop === 'function') {
                this.world.pauseGameLoop();
            }

            // Set a flag to indicate the game is paused
            this.world.isGamePaused = true;
        }
    }

    /**
    * Toggle mission briefing visibility
    * This method should NOT be called automatically anymore - only through UI actions
    */
    toggleMissionBriefing() {
        if (!this.html.missionBriefing) return;

        const isActive = this.html.missionBriefing.classList.contains('active');

        if (isActive) {
            this.html.missionBriefing.classList.remove('active');

            // Resume the game
            if (this.world) {
                // Connect FPS controls
                if (this.world.fpsControls) {
                    this.world.fpsControls.connect();
                }

                // Start the game loop if it was paused
                if (this.world.startGameLoop && typeof this.world.startGameLoop === 'function') {
                    this.world.startGameLoop();
                }

                // Set flag to indicate game is running
                this.world.isGamePaused = false;
            }
        } else {
            this.html.missionBriefing.classList.add('active');

            // Pause the game
            if (this.world) {
                // Disconnect FPS controls
                if (this.world.fpsControls) {
                    this.world.fpsControls.disconnect();
                }

                // Pause the game loop
                if (this.world.pauseGameLoop && typeof this.world.pauseGameLoop === 'function') {
                    this.world.pauseGameLoop();
                }

                // Set flag to indicate game is paused
                this.world.isGamePaused = true;
            }
        }
    }


    /**
     * Toggle world map visibility
     */
    toggleWorldMap() {
        if (!this.html.worldMap) return;
        const isActive = this.html.worldMap.classList.contains('active');
        if (isActive) {
            this.html.worldMap.classList.remove('active');
        } else {
            this.html.worldMap.classList.add('active');
            this._updateWorldMap();
        }
    }

    /**
     * Update world map with current game state
     * @private
     */
    _updateWorldMap() {
        if (!this.html.worldMap || !this.html.worldMap.classList.contains('active')) return;
        const content = this.html.worldMap.querySelector('.world-map-content');
        if (!content) return;

        const legend = content.querySelector('.map-legend');
        const closeButton = content.querySelector('.continue-button');
        content.innerHTML = '';
        if(legend) content.appendChild(legend);

        const player = this.world.player;
        if (player && player.position && player.forward) {
            const playerMarker = document.createElement('div');
            playerMarker.className = 'map-player-marker';
            const mapWidth = content.offsetWidth;
            const mapHeight = content.offsetHeight;
            const maxWorldWidth = this.minimapWorldWidth || 125;
            const maxWorldDepth = this.minimapWorldDepth || 125;
            const x = ((player.position.x + maxWorldWidth / 2) / maxWorldWidth) * mapWidth;
            const y = ((maxWorldDepth - (player.position.z + maxWorldDepth / 2)) / maxWorldDepth) * mapHeight;
            playerMarker.style.left = `${x}px`;
            playerMarker.style.top = `${y}px`;
            const angle = Math.atan2(player.forward.x, player.forward.z);
            const directionIndicator = document.createElement('div');
            directionIndicator.style.cssText = 'position:absolute;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:10px solid white;top:-10px;left:-5px;transform-origin:50% 100%;transform:rotate(' + (-angle) + 'rad);';
            playerMarker.appendChild(directionIndicator);
            content.appendChild(playerMarker);
        }

        const competitors = this.world.competitors || [];
        competitors.forEach(entity => {
            if (entity === player || !entity.position || (typeof entity.status !== 'undefined' && entity.status !== 1) ) return;
            const enemyMarker = document.createElement('div');
            enemyMarker.className = 'map-enemy-marker';
            const mapWidth = content.offsetWidth;
            const mapHeight = content.offsetHeight;
            const maxWorldWidth = this.minimapWorldWidth || 125;
            const maxWorldDepth = this.minimapWorldDepth || 125;
            const x = ((entity.position.x + maxWorldWidth / 2) / maxWorldWidth) * mapWidth;
            const y = ((maxWorldDepth - (entity.position.z + maxWorldDepth / 2)) / maxWorldDepth) * mapHeight;
            enemyMarker.style.left = `${x}px`;
            enemyMarker.style.top = `${y}px`;
            content.appendChild(enemyMarker);
        });

        this.objectiveMarkers.forEach(marker => {
            if (!marker.worldPosition) return;
            const objectiveMarker = document.createElement('div');
            objectiveMarker.className = 'map-objective-marker';
            if (marker.completed) objectiveMarker.style.backgroundColor = 'rgba(76, 175, 80, 0.8)';
            else if (marker.type === 'danger') objectiveMarker.style.backgroundColor = 'rgba(244, 67, 54, 0.8)';
            else if (marker.type === 'optional') objectiveMarker.style.backgroundColor = 'rgba(255, 152, 0, 0.8)';
            else objectiveMarker.style.backgroundColor = 'rgba(33, 150, 243, 0.8)';
            const mapWidth = content.offsetWidth;
            const mapHeight = content.offsetHeight;
            const maxWorldWidth = this.minimapWorldWidth || 125;
            const maxWorldDepth = this.minimapWorldDepth || 125;
            const x = ((marker.worldPosition.x + maxWorldWidth / 2) / maxWorldWidth) * mapWidth;
            const y = ((maxWorldDepth - (marker.worldPosition.z + maxWorldDepth / 2)) / maxWorldDepth) * mapHeight;
            objectiveMarker.style.left = `${x}px`;
            objectiveMarker.style.top = `${y}px`;
            content.appendChild(objectiveMarker);
        });
        if(closeButton) content.appendChild(closeButton);
    }

    /**
     * Shows hit marker animation
     * @param {Boolean} isHeadshot - Whether it was a headshot
     * @param {Boolean} isCritical - Whether it was a critical hit
     */
    showHitMarkerAnimation(isHeadshot = false, isCritical = false) {
        if (!this.html.dynamicCrosshair) return;
        const hitmarker = this.html.dynamicCrosshair.querySelector('.hitmarker');
        if (!hitmarker) return;
        hitmarker.classList.remove('show', 'critical', 'headshot');
        void hitmarker.offsetWidth;
        hitmarker.classList.add('show');
        if (isHeadshot) hitmarker.classList.add('headshot');
        if (isCritical) hitmarker.classList.add('critical');
        if (this.sounds.hitConfirm && typeof this.sounds.hitConfirm.play === 'function') this.sounds.hitConfirm.play();
    }

    /**
     * Show or hide the scoreboard
     * @private
     * @param {Boolean} show - Whether to show or hide
     */
    _showScoreboard(show) {
        if (show) console.log('Showing scoreboard (placeholder)');
        else console.log('Hiding scoreboard (placeholder)');
    }

    /**
    * Initializes the UI manager.
    */
    init() {
        // Build the FPS-mode HUD
        this._buildFPSInterface();

        // Minimap overlay setup
        this.minimapCanvas = document.getElementById('minimapOverlay');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

        // Get level bounds for coordinate mapping
        const levelConfig = this.world.assetManager && this.world.assetManager.configs
            ? this.world.assetManager.configs.get('level')
            : null;
        if (levelConfig && levelConfig.spatialIndex) {
            this.minimapWorldWidth = levelConfig.spatialIndex.width;
            this.minimapWorldDepth = levelConfig.spatialIndex.depth;
        } else {
            // Fallback defaults
            this.minimapWorldWidth = 125;
            this.minimapWorldDepth = 125;
        }
        this.minimapSize = 200; // px

        // Make sure the minimap container exists and is properly set up
        const minimapContainer = document.getElementById('advancedMinimapContainer');
        if (minimapContainer) {
            // Ensure the container is visible
            minimapContainer.classList.remove('hidden');
        } else {
            console.warn('Advanced minimap container not found in the DOM');
        }

        // Initialize the advanced minimap integration
        if (typeof MinimapIntegration !== 'undefined' && this.world) {
            this.minimapIntegration = new MinimapIntegration(this.world);
            if (typeof this.minimapIntegration.init === 'function') {
                 this.minimapIntegration.init();
            }
        } else {
            console.warn('MinimapIntegration or world not available for initialization.');
        }

        // Start match timer when initialized
        this.matchStartTime = performance.now();

        // Setup debugging GUI if needed
        this._setupDebugGUI();

        // Initialize audio elements if browser supports Audio API
        this._initAudio();

        // Create sample objectives for demonstration
        this._createSampleObjectives();

        // Add welcome notification
        this.addNotification('Welcome to RIFT! Eliminate all enemies', 'notification-objective');

        // Initialize player level display
        this._updateExperienceBar();

        // REMOVE THIS - no auto-display of mission briefing
        // setTimeout(() => {
        //     this.toggleMissionBriefing(); // Do not call toggle which implies game was running.
        // }, 1000);                         // Call showMissionBriefing() from game manager when ready.

        // Ensure the loading screen is fully removed once its fade-out completes
        if (this.html.loadingScreen) {
            this.html.loadingScreen.addEventListener('transitionend', (event) => {
                if (event.target === this.html.loadingScreen) {
                    event.target.remove();
                    this.html.loadingScreen = null;
                }
            });
            this.html.loadingScreen.classList.add('fade-out');
        } else {
            console.warn('Loading screen element not found in the DOM');
        }

        // Create achievement pop-up as a demo
        setTimeout(() => {
            this.showAchievement('First Blood', 'Eliminate your first enemy');
        }, 3000);

        // Add any sample objectives to the minimap
        if (this.minimapIntegration && this.minimapIntegration.initialized) {
            this._createSampleMinimapObjectives();
        }

        return this;
    }


    /**
     * Create sample minimap objectives to demonstrate functionality
     * @private
     */
    _createSampleMinimapObjectives() {
        if (!this.minimapIntegration || typeof this.minimapIntegration.addObjective !== 'function') return;
        const objectives = [
            { id: 'main1_map', position: new Vector3(20, 0, 30), type: 'primary', label: 'Main Objective Area' },
            { id: 'collect1_map', position: new Vector3(-15, 0, 25), type: 'secondary', label: 'Collectible 1 Area' },
            { id: 'collect2_map', position: new Vector3(35, 0, -10), type: 'secondary', label: 'Collectible 2 Area' },
            { id: 'collect3_map', position: new Vector3(-30, 0, -25), type: 'secondary', label: 'Collectible 3 Area' }
        ];
        objectives.forEach(obj => this.minimapIntegration.addObjective(obj.id, obj.position, obj.type, obj.label));
    }


    /**
     * Show achievement popup
     * @param {String} title - Achievement title
     * @param {String} description - Achievement description
     */
    showAchievement(title, description) {
        if (!this.html.achievementPopup) return;
        const titleElement = this.html.achievementPopup.querySelector('.achievement-title');
        const descElement = this.html.achievementPopup.querySelector('.achievement-description');
        if (titleElement) titleElement.textContent = title;
        if (descElement) descElement.textContent = description;
        this.html.achievementPopup.classList.add('active');
        if (this.sounds.achievement && typeof this.sounds.achievement.play === 'function') this.sounds.achievement.play();
        setTimeout(() => this.html.achievementPopup.classList.remove('active'), 4000);
    }

    /**
     * Create sample objectives for demonstration
     * @private
     */
    _createSampleObjectives() {
        this.addObjective('main1_obj', 'Eliminate all enemies', null, false);
        this.addObjective('main2_obj', 'Secure the control point', new Vector3(20, 0, 30), false, 'standard');
        this.addObjective('side1_obj', 'Find all collectibles (0/3)', null, false);
        // Note: _add3DObjectiveMarker is called inside addObjective if position is provided.
    }

    /**
    * Initialize audio feedback elements
    * @private
    */
    _initAudio() {
        if (typeof Audio !== 'undefined') {
            this.sounds.hitConfirm = new Audio(); this.sounds.killConfirm = new Audio();
            this.sounds.killStreak = new Audio(); this.sounds.lowHealth = new Audio();
            this.sounds.weaponSwitch = new Audio(); this.sounds.levelUp = new Audio();
            this.sounds.notification = new Audio(); this.sounds.victory = new Audio();
            this.sounds.powerupPickup = new Audio(); this.sounds.powerupExpired = new Audio();
            this.sounds.objectiveComplete = new Audio(); this.sounds.screenShake = new Audio();
            this.sounds.reload = new Audio(); this.sounds.footstep = new Audio();
            this.sounds.healing = new Audio(); this.sounds.achievement = new Audio();
        } else console.warn("Audio API not supported.");
    }

    /**
    * Setup debug GUI with more options
    * @private
    */
    _setupDebugGUI() {
        const world = this.world;
        if (world && world.debug && typeof DAT !== 'undefined' && DAT.GUI) {
            if (this.datGui) this.datGui.destroy();
            this.datGui = new DAT.GUI({ width: 300 });
            const params = this.debugParameter;
            const fNav = this.datGui.addFolder('Navigation Mesh');
            fNav.add(params, 'showRegions').name('show convex regions').onChange(v => { if (world.helpers?.convexRegionHelper) world.helpers.convexRegionHelper.visible = v; });
            fNav.add(params, 'showSpatialIndex').name('show spatial index').onChange(v => { if (world.helpers?.spatialIndexHelper) world.helpers.spatialIndexHelper.visible = v; });
            fNav.add(params, 'showPaths').name('show navigation paths').onChange(v => { if (world.helpers?.pathHelpers) world.helpers.pathHelpers.forEach(h => h.visible = v); });
            fNav.add(params, 'showGraph').name('show graph').onChange(v => { if (world.helpers?.graphHelper) world.helpers.graphHelper.visible = v; });
            const fWorld = this.datGui.addFolder('World');
            fWorld.add(params, 'showAxes').name('show axes helper').onChange(v => { if (world.helpers?.axesHelper) world.helpers.axesHelper.visible = v; });
            fWorld.add(params, 'showSpawnPoints').name('show spawn points').onChange(v => { if (world.helpers?.spawnHelpers) world.helpers.spawnHelpers.visible = v; });
            fWorld.add(params, 'showItemRadius').name('show item radius').onChange(v => { if (world.helpers?.itemHelpers) world.helpers.itemHelpers.forEach(h => h.visible = v); });
            fWorld.add(params, 'showWireframe').name('show wireframe').onChange(v => { const l = world.scene?.getObjectByName('level'); if (l?.material) l.material.wireframe = v; });
            if (params.enableFPSControls) fWorld.add(params, 'enableFPSControls').name('enable FPS controls');
            const fEnemy = this.datGui.addFolder('Enemy');
            fEnemy.add(params, 'showUUIDHelpers').name('show UUID helpers').onChange(v => { if (world.helpers?.uuidHelpers) world.helpers.uuidHelpers.forEach(h => h.visible = v); });
            fEnemy.add(params, 'showSkeletons').name('show skeletons').onChange(v => { if (world.helpers?.skeletonHelpers) world.helpers.skeletonHelpers.forEach(h => h.visible = v); });
            const fUI = this.datGui.addFolder('UI Options');
            fUI.add(params, 'showFPS').name('show FPS counter').onChange(v => { if (v) {this._setupFPSCounter(); if(this.fpsCounter.fpsElement) this.fpsCounter.fpsElement.style.display = '';} else if (this.fpsCounter.fpsElement) this.fpsCounter.fpsElement.style.display = 'none'; });
            fUI.add(params, 'showDamageNumbers').name('show damage numbers');
            fUI.add(params, 'showNotifications').name('show notifications');
            fUI.add(params, 'enableScreenShake').name('enable screen shake');
            fUI.add(params, 'enableDynamicWeather').name('enable weather').onChange(v => v ? this._startWeatherEffect('rain') : this._stopWeatherEffect());
            const fTest = this.datGui.addFolder('Test Features');
            fTest.add({ fn: () => this.addXP(100) }, 'fn').name('Add 100 XP');
            fTest.add({ fn: () => this.showDamageFlash() }, 'fn').name('Damage Flash');
            fTest.add({ fn: () => this.showHealEffect() }, 'fn').name('Heal Effect');
            fTest.add({ fn: () => this.addFragMessage({ name: 'Player' }, { name: 'Enemy' }) }, 'fn').name('Add Kill Feed');
            fTest.add({ fn: () => this.addNotification('Test Warn!', 'notification-warning') }, 'fn').name('Warn Notification');
            fTest.add({ fn: () => this.showMatchEvent('Test Event!', 'event-test') }, 'fn').name('Match Event');
            fTest.add({ fn: () => this.addPowerup('speed', 'Speed Boost', 10) }, 'fn').name('Speed Powerup');
            fTest.add({ fn: () => this.triggerScreenShake(0.5) }, 'fn').name('Screen Shake');
            fTest.add({ fn: () => this.showVictory() }, 'fn').name('Show Victory');
            fTest.add({ fn: () => this.addFootstepIndicator(new Vector3(Math.random()*5,0,Math.random()*5), 'enemy')}, 'fn').name('Enemy Footstep');
            fTest.add({ fn: () => this._startReloadAnimation() }, 'fn').name('Reload Anim');
            fTest.add({ fn: () => this.showHitMarkerAnimation(true, true) }, 'fn').name('Crit Headshot Marker');
            fTest.add({ fn: () => this.showDamageDirection(Math.PI) }, 'fn').name('Damage Dir (Back)');
            fTest.add({ fn: () => this.toggleWorldMap() }, 'fn').name('Toggle Map');
            fTest.add({ fn: () => this.toggleMissionBriefing() }, 'fn').name('Toggle Briefing');
            fTest.add({ fn: () => this.showAchievement('Test Ach', 'Desc for test ach.') }, 'fn').name('Show Achievement');
            fTest.add({ fn: () => this.showWarningOverlay(true) }, 'fn').name('Warn Overlay On');
            fTest.add({ fn: () => this.showWarningOverlay(false) }, 'fn').name('Warn Overlay Off');
        }
    }

    /**
     * Start weather effect
     * @param {String} type - Weather type (rain, snow)
     */
    _startWeatherEffect(type) {
        if (!this.html.weatherEffectsOverlay || this.weatherActive) return;
        this.weatherActive = true; this.weatherType = type;
        this.html.weatherEffectsOverlay.innerHTML = ''; this.raindrops = [];
        if (type === 'rain') {
            for (let i = 0; i < 50; i++) this._createRaindrop();
            this._animateRaindrops();
        }
    }

    /**
     * Create a raindrop element
     * @private
     */
    _createRaindrop() {
        if (!this.html.weatherEffectsOverlay) return;
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        const x = Math.random() * window.innerWidth;
        const y = -Math.random() * window.innerHeight * 0.5 - 10;
        drop.style.left = `${x}px`; drop.style.top = `${y}px`;
        const length = Math.random() * 15 + 10;
        const fallSpeed = Math.random() * 2 + 3;
        drop.style.height = `${length}px`;
        this.html.weatherEffectsOverlay.appendChild(drop);
        this.raindrops.push({ element: drop, x: x, y: y, speed: fallSpeed, length: length });
    }

    /**
     * Animate raindrops if weather is active
     * @private
     */
    _animateRaindrops() {
        if (!this.weatherActive || this.weatherType !== 'rain') return;
        this.raindrops.forEach(drop => {
            drop.y += drop.speed;
            if (drop.y > window.innerHeight) {
                drop.y = -drop.length - Math.random() * 50;
                drop.x = Math.random() * window.innerWidth;
                drop.element.style.left = `${drop.x}px`;
            }
            drop.element.style.top = `${drop.y}px`;
        });
        requestAnimationFrame(() => this._animateRaindrops());
    }


    /**
     * Stop all weather effects
     */
    _stopWeatherEffect() {
        this.weatherActive = false; this.weatherType = "none"; this.raindrops = [];
        if (this.html.weatherEffectsOverlay) this.html.weatherEffectsOverlay.innerHTML = '';
    }

    /**
     * Show or hide warning overlay
     * @param {Boolean} show - Whether to show or hide
     */
    showWarningOverlay(show) {
        if (!this.html.warningOverlay) return;
        if (show) this.html.warningOverlay.classList.add('active');
        else this.html.warningOverlay.classList.remove('active');
    }

    /**
     * Show damage direction indicator
     * @param {Number} angle - Angle in radians (0 is forward, PI/2 is right, etc.)
     */
    showDamageDirection(angle) {
        if (!this.html.damageDirectionRing) return;
        const indicator = document.createElement('div');
        indicator.className = 'damage-direction';
        const cssAngle = MathUtils.radToDeg(angle) - 90;
        indicator.style.transform = `rotate(${cssAngle}deg)`;
        this.html.damageDirectionRing.appendChild(indicator);
        this.html.damageDirectionRing.classList.add('active');
        setTimeout(() => {
            if (indicator.parentNode) indicator.remove();
            if (this.html.damageDirectionRing.children.length === 0) this.html.damageDirectionRing.classList.remove('active');
        }, 800);
    }

    /**
    * Update method of this manager. Called each simulation step.
    * @param {Number} delta - The time delta.
    * @return {UIManager} A reference to this UI manager.
    */
    update(delta) {
        if (this.world && this.world.isGamePaused && !this.html.missionBriefing.classList.contains('active')) { // If paused by other means, only update minimal UI
             this._updateFPSCounter(performance.now());
             // maybe update a pause menu if active
            return this;
        }
         if (this.world && this.world.isGamePaused && this.html.missionBriefing.classList.contains('active')) { // If paused for mission briefing
             this._updateFPSCounter(performance.now());
             // Potentially update parts of the briefing screen if it's animated, but generally it's static.
            return this;
        }


        const timestamp = performance.now();
        this.currentTime += delta;
        this._updateFPSCounter(timestamp);
        this._updateMatchTimer();
        if (this.sprites.crosshairs && this.currentTime >= this.endTimeHitIndication) this.hideHitIndication();
        this._updateDamageIndicators();
        this._updateHitMarkers(delta);
        this._updateLowHealthEffect(delta);
        this._updateFragList();
        this._updateMinimap();
        if (this.minimapIntegration?.initialized && typeof this.minimapIntegration.update === 'function') this.minimapIntegration.update();
        this._updateObjectiveMarkers(delta);
        this._updateDamageNumbers(delta);
        this._updateNotifications(delta);
        this._updatePowerups(delta);
        this._updateFootstepIndicators(delta);
        this._updateScreenShake(delta);
        this._updateDynamicCrosshair(delta);
        this._updateStamina(delta);
        this._updateEnemyTargeting(delta);
        // this._render(); // Usually not needed for DOM HUD
        return this;
    }

    /**
     * Update enemy targeting
     * @private
     */
    _updateEnemyTargeting(delta) {
        if (this.currentTime - this.lastEnemyHealthUpdate < 0.1 && this.targetedEnemy) return;
        this.lastEnemyHealthUpdate = this.currentTime;
        const player = this.world.player;
        if (!player?.position || !player.forward) return;
        if(!this.targetingRaycaster) this.targetingRaycaster = new Raycaster();
        this.targetingRaycaster.set(player.position, player.forward.clone());
        const competitors = this.world.competitors || [];
        let closestEnemy = null, closestDistance = Infinity;
        const MAX_TARGET_DISTANCE = 50, TARGETING_FOV_DOT = 0.9;
        for (const entity of competitors) {
            if (entity === player || !entity.position || !entity.active) continue;
            const distance = entity.position.distanceTo(player.position);
            if (distance < MAX_TARGET_DISTANCE) {
                const toEntity = entity.position.clone().sub(player.position).normalize();
                if (player.forward.dot(toEntity) > TARGETING_FOV_DOT && distance < closestDistance) {
                    closestEnemy = entity; closestDistance = distance;
                }
            }
        }
        if (closestEnemy !== this.targetedEnemy) {
            this.targetedEnemy = closestEnemy; this._updateEnemyHealthBar();
        } else if (this.targetedEnemy && this.html.enemyHealthContainer.classList.contains('active')) {
            this._updateEnemyHealthBar();
        }
    }

    /**
     * Update enemy health bar display
     * @private
     */
    _updateEnemyHealthBar() {
        if (!this.html.enemyHealthContainer) return;
        if (this.targetedEnemy && this.targetedEnemy.active && typeof this.targetedEnemy.health !== 'undefined') {
            this.html.enemyHealthContainer.classList.add('active');
            const nameEl = this.html.enemyHealthContainer.querySelector('.enemy-name');
            if (nameEl) nameEl.textContent = this.targetedEnemy.name || 'Enemy';
            const healthFill = this.html.enemyHealthContainer.querySelector('.enemy-health-fill');
            if (healthFill) {
                const hMax = this.targetedEnemy.maxHealth || 100;
                healthFill.style.width = `${Math.max(0, (this.targetedEnemy.health / hMax) * 100)}%`;
            }
            const armorFill = this.html.enemyHealthContainer.querySelector('.enemy-armor');
            if (armorFill) {
                const aMax = this.targetedEnemy.maxArmor || 0;
                const armorPercent = aMax > 0 ? ((this.targetedEnemy.armor || 0) / aMax * 100) : 0;
                armorFill.style.width = `${Math.max(0, armorPercent)}%`;
                armorFill.style.display = armorPercent > 0 ? 'block' : 'none';
            }
        } else {
            this.html.enemyHealthContainer.classList.remove('active');
            this.targetedEnemy = null;
        }
    }

    /**
     * Update stamina bar
     * @private
     */
    _updateStamina(delta) {
        const player = this.world.player;
        if (!player) return;
        if (this.isSprinting && player.isMoving) {
            this.stamina = Math.max(0, this.stamina - this.staminaDecreaseRate * delta);
            if (this.stamina === 0) { this._stopSprint(); this.addNotification("Stamina depleted!", "notification-warning"); }
        } else {
            if (this.stamina < this.staminaMax) this.stamina = Math.min(this.staminaMax, this.stamina + this.staminaRegenRate * delta);
            if (this.stamina >= this.staminaMax && !this.isSprinting && this.html.staminaContainer && !this.html.staminaContainer.classList.contains('hidden')) {
                if (!this.staminaHideTimeout) {
                    this.staminaHideTimeout = setTimeout(() => {
                        if (this.stamina >= this.staminaMax && !this.isSprinting) this.html.staminaContainer.classList.add('hidden');
                        this.staminaHideTimeout = null;
                    }, 1500);
                }
            }
        }
        if (this.html.staminaContainer) {
            const fillBar = document.getElementById('staminaFill');
            if (fillBar) fillBar.style.width = `${(this.stamina / this.staminaMax) * 100}%`;
            this.html.staminaContainer.classList.toggle('stamina-low', this.stamina < this.staminaMax * 0.3);
            if (this.isSprinting || this.stamina < this.staminaMax) {
                this.html.staminaContainer.classList.remove('hidden');
                if(this.staminaHideTimeout) { clearTimeout(this.staminaHideTimeout); this.staminaHideTimeout = null; }
            }
        }
    }

    /**
     * Updates the dynamic crosshair based on player state
     * @private
     */
    _updateDynamicCrosshair(delta) {
        if (!this.html.dynamicCrosshair || this.html.dynamicCrosshair.classList.contains('hidden')) return;
        const player = this.world.player;
        if (!player?.velocity || !player.forward) return;
        const isMoving = player.isMoving || (Math.abs(player.velocity.x) > 0.1 || Math.abs(player.velocity.z) > 0.1);
        if (isMoving !== this.crosshairState.moving) this._updateCrosshairState(isMoving, this.crosshairState.firing, this.crosshairState.onEnemy, this.crosshairState.onHeadshot);
        if(!this.crosshairRaycaster) this.crosshairRaycaster = new Raycaster();
        this.crosshairRaycaster.set(player.position, player.forward.clone()); this.crosshairRaycaster.far = 75;
        const competitors = this.world.competitors || [];
        let hitEnemy = false, hitHeadshot = false;
        for (const entity of competitors) {
            if (entity === player || !entity.active || !entity.mesh) continue;
            const intersects = this.crosshairRaycaster.intersectObject(entity.mesh, true);
            if (intersects.length > 0) {
                hitEnemy = true;
                if(this.targetedEnemy === entity && Math.random() < 0.3) hitHeadshot = true;
                break;
            }
        }
        if (hitEnemy !== this.crosshairState.onEnemy || hitHeadshot !== this.crosshairState.onHeadshot) {
            this._updateCrosshairState(this.crosshairState.moving, this.crosshairState.firing, hitEnemy, hitHeadshot);
        }
    }

    /**
     * Updates the crosshair visual state
     * @private
     */
    _updateCrosshairState(moving, firing, onEnemy, onHeadshot) {
        if (!this.html.dynamicCrosshair) return;
        this.crosshairState.moving = moving; this.crosshairState.firing = firing;
        this.crosshairState.onEnemy = onEnemy; this.crosshairState.onHeadshot = onHeadshot;
        this.html.dynamicCrosshair.classList.toggle('crosshair-moving', moving);
        this.html.dynamicCrosshair.classList.toggle('crosshair-firing', firing);
        this.html.dynamicCrosshair.classList.toggle('crosshair-enemy', onEnemy);
        this.html.dynamicCrosshair.classList.toggle('crosshair-headshot', onHeadshot);
        let expansion = CONFIG.UI.CROSSHAIRS.BASE_SPREAD || 2;
        if (moving) expansion += (CONFIG.UI.CROSSHAIRS.MOVE_SPREAD_MOD || 4);
        if (firing) expansion += (CONFIG.UI.CROSSHAIRS.FIRE_SPREAD_MOD || 8);
        const parts = this.html.dynamicCrosshair.querySelectorAll('.crosshair-part:not(.crosshair-center)');
        parts.forEach(part => {
            const baseOffset = 2;
            if (part.classList.contains('crosshair-top')) part.style.transform = `translateY(-${baseOffset + expansion}px)`;
            else if (part.classList.contains('crosshair-bottom')) part.style.transform = `translateY(${baseOffset + expansion}px)`;
            else if (part.classList.contains('crosshair-left')) part.style.transform = `translateX(-${baseOffset + expansion}px)`;
            else if (part.classList.contains('crosshair-right')) part.style.transform = `translateX(${baseOffset + expansion}px)`;
        });
    }

    /**
     * Updates screen shake effect
     * @private
     */
    _updateScreenShake(delta) {
        if (!this.debugParameter.enableScreenShake || this.screenShakeIntensity <= 0) {
            if (document.body.style.transform !== 'translate(0px, 0px)') document.body.style.transform = 'translate(0px, 0px)';
            return;
        }
        this.screenShakeIntensity -= this.screenShakeIntensity * (CONFIG.UI.SCREEN_SHAKE_DECAY || 4) * delta;
        if (this.screenShakeIntensity < 0.01) {
            this.screenShakeIntensity = 0; document.body.style.transform = 'translate(0px, 0px)'; return;
        }
        const shakeAmount = this.screenShakeIntensity * (CONFIG.UI.SCREEN_SHAKE_MULTIPLIER || 5);
        document.body.style.transform = `translate(${(Math.random()*2-1)*shakeAmount}px, ${(Math.random()*2-1)*shakeAmount}px)`;
    }

    /**
     * Updates all footstep indicators
     * @private
     */
    _updateFootstepIndicators(delta) {
        for (let i = this.footstepIndicators.length - 1; i >= 0; i--) {
            const indicator = this.footstepIndicators[i]; indicator.lifetime -= delta;
            if (indicator.lifetime <= 0) {
                if (indicator.element?.parentNode) {
                    indicator.element.classList.add('fade-out');
                    setTimeout(() => { if(indicator.element?.parentNode) indicator.element.remove(); }, 500);
                }
                this.footstepIndicators.splice(i, 1);
            } else if(indicator.element) {
                indicator.element.style.opacity = Math.max(0, indicator.lifetime / (CONFIG.UI.FOOTSTEP_DURATION || 1.5)).toString();
            }
        }
    }

    /**
     * Updates all power-up indicators
     * @private
     */
    _updatePowerups(delta) {
        for (let i = this.activePowerups.length - 1; i >= 0; i--) {
            const powerup = this.activePowerups[i]; powerup.timeRemaining -= delta;
            if (powerup.element) {
                const timerEl = powerup.element.querySelector('.powerup-timer');
                if (timerEl) timerEl.textContent = Math.ceil(Math.max(0, powerup.timeRemaining)).toString();
                const expiringThr = CONFIG.UI.POWERUP_EXPIRING_THRESHOLD || 3;
                if (powerup.timeRemaining <= expiringThr && !powerup.element.classList.contains('expiring')) powerup.element.classList.add('expiring');
            }
            if (powerup.timeRemaining <= 0) {
                if (powerup.element?.parentNode) {
                    powerup.element.classList.add('powerup-expired-animation');
                    setTimeout(() => { if (powerup.element?.parentNode) powerup.element.remove(); }, 500);
                }
                if (this.sounds.powerupExpired?.play) this.sounds.powerupExpired.play();
                this.addNotification(`${powerup.name} expired!`, 'notification-warning');
                this.activePowerups.splice(i, 1);
                if (this.activePowerups.length === 0 && this.html.powerupIndicator) this.html.powerupIndicator.classList.add('hidden');
            }
        }
    }

    /**
     * Updates all notification elements
     * @private
     */
    _updateNotifications(delta) {
        const cooldown = CONFIG.UI.NOTIFICATION_COOLDOWN || 0.5;
        const canShow = this.html.notificationArea ? this.html.notificationArea.children.length === 0 : true;
        if (this.notifications.length > 0 && (this.currentTime - this.lastNotificationTime > cooldown || canShow )) {
            this._processNotificationQueue();
        }
    }

    /**
     * Updates all damage number elements
     * @private
     */
    _updateDamageNumbers(delta) {
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const dn = this.damageNumbers[i]; dn.lifetime -= delta;
            if (dn.targetEntity?.position && this.world.camera) {
                const worldPos = dn.targetEntity.position.clone().add(dn.offset);
                const screenPos = worldPos.project(this.world.camera);
                const x = (screenPos.x*0.5+0.5)*window.innerWidth;
                const y = (screenPos.y*-0.5+0.5)*window.innerHeight;
                if (dn.element) {
                    dn.element.style.left = `${x}px`;
                    dn.element.style.top = `${y - (((CONFIG.UI.DAMAGE_NUMBER_DURATION||1.5)-dn.lifetime)*30)}px`;
                }
            } else if (dn.element && !dn.targetEntity) {
                 dn.element.style.transform = `translateY(-${(((CONFIG.UI.DAMAGE_NUMBER_DURATION||1.5)-dn.lifetime)*(CONFIG.UI.DAMAGE_NUMBER_RISE_SPEED||30))}px) translateX(${dn.initialOffsetX||0}px)`;
            }
            if (dn.element) dn.element.style.opacity = Math.max(0, (dn.lifetime/(CONFIG.UI.DAMAGE_NUMBER_DURATION||1.5))).toString();
            if (dn.lifetime <= 0) {
                if (dn.element?.parentNode) dn.element.remove();
                this.damageNumbers.splice(i, 1);
            }
        }
    }

    /**
    * Updates the match timer display
    * @private
    */
    _updateMatchTimer() {
        if (!this.matchStartTime || !this.html.hudMatchTimer?.firstChild) return;
        const elapsedS = Math.floor((performance.now() - this.matchStartTime) / 1000);
        const timerDiv = this.html.hudMatchTimer.querySelector('div');
        if(timerDiv) timerDiv.textContent = `Match Time: ${Math.floor(elapsedS/60).toString().padStart(2,'0')}:${(elapsedS%60).toString().padStart(2,'0')}`;
    }

    /**
    * Updates all damage indicators (radial ones around crosshair)
    * @private
    */
    _updateDamageIndicators() {
        if (this.currentTime >= this.endTimeDamageIndicationFront && this.sprites.frontIndicator) { this.sprites.frontIndicator.visible = false; this.endTimeDamageIndicationFront = Infinity; }
        if (this.currentTime >= this.endTimeDamageIndicationRight && this.sprites.rightIndicator) { this.sprites.rightIndicator.visible = false; this.endTimeDamageIndicationRight = Infinity; }
        if (this.currentTime >= this.endTimeDamageIndicationLeft && this.sprites.leftIndicator) { this.sprites.leftIndicator.visible = false; this.endTimeDamageIndicationLeft = Infinity; }
        if (this.currentTime >= this.endTimeDamageIndicationBack && this.sprites.backIndicator) { this.sprites.backIndicator.visible = false; this.endTimeDamageIndicationBack = Infinity; }
    }

    /**
    * Updates hit markers animation and lifetime (for 3D hit markers, if any)
    * @private
    */
    _updateHitMarkers(delta) {
        for (let i = this.hitMarkers.length - 1; i >= 0; i--) {
            const marker = this.hitMarkers[i]; marker.lifetime -= delta;
            const progress = 1 - (marker.lifetime / marker.duration);
            if (marker.sprite?.scale) marker.sprite.scale.set(marker.initialScale*(1+progress*0.5), marker.initialScale*(1+progress*0.5), 1);
            if (marker.sprite?.material) marker.sprite.material.opacity = 1 - progress;
            if (marker.lifetime <= 0) { if(marker.sprite) this.hitMarkerGroup.remove(marker.sprite); this.hitMarkers.splice(i, 1); }
        }
    }

    /**
    * Updates low health visual effect (screen overlay)
    * @private
    */
    _updateLowHealthEffect(delta) {
        if (!this.sprites.lowHealthOverlay) return;
        const player = this.world.player;
        if (!player || typeof player.health === 'undefined') return;
        const lowThr = CONFIG.PLAYER.LOW_HEALTH_THRESHOLD || 30;
        const critThr = CONFIG.PLAYER.CRITICAL_HEALTH_THRESHOLD || 15;
        if (player.health <= lowThr) {
            if (!this.showLowHealthEffect) {
                this.showLowHealthEffect = true; if (this.sprites.lowHealthOverlay) this.sprites.lowHealthOverlay.visible = true;
                if (this.sounds.lowHealth?.play && !this.sounds.lowHealth.isPlaying) { this.sounds.lowHealth.play(); this.sounds.lowHealth.isPlaying = true; }
            }
            const healthRatio = Math.max(0, player.health / lowThr);
            const pulseSpeedMult = CONFIG.UI.LOW_HEALTH_PULSE_SPEED_MAX - (healthRatio * (CONFIG.UI.LOW_HEALTH_PULSE_SPEED_MAX - CONFIG.UI.LOW_HEALTH_PULSE_SPEED_MIN));
            this.lowHealthPulseIntensity += delta * pulseSpeedMult;
            const pulseValue = CONFIG.UI.LOW_HEALTH_OPACITY_BASE + CONFIG.UI.LOW_HEALTH_OPACITY_PULSE * Math.abs(Math.sin(this.lowHealthPulseIntensity));
            if (this.sprites.lowHealthOverlay?.material) this.sprites.lowHealthOverlay.material.opacity = pulseValue;
            if (this.html.hudHealth) this.html.hudHealth.classList.add('low-health-pulse');
            this.showWarningOverlay(player.health <= critThr);
        } else {
            if (this.showLowHealthEffect) {
                this.showLowHealthEffect = false; if (this.sprites.lowHealthOverlay) this.sprites.lowHealthOverlay.visible = false; this.lowHealthPulseIntensity = 0;
                if (this.sounds.lowHealth?.pause && this.sounds.lowHealth.isPlaying) { this.sounds.lowHealth.pause(); this.sounds.lowHealth.currentTime=0; this.sounds.lowHealth.isPlaying=false; }
                if (this.html.hudHealth) this.html.hudHealth.classList.remove('low-health-pulse');
                this.showWarningOverlay(false);
            }
        }
    }

    /**
    * Updates positions of objective markers in 3D space and their on-screen indicators.
    * @private
    */
    _updateObjectiveMarkers(delta) {
        const player = this.world.player;
        if (!player?.position || !this.world.camera) return;
        const screenW = window.innerWidth, screenH = window.innerHeight;
        const padding = CONFIG.UI.OBJECTIVE_MARKER_SCREEN_PADDING || 20;
        for (const marker of this.objectiveMarkers) {
            if (!marker.worldPosition || !marker.element) continue;
            const distance = player.position.distanceTo(marker.worldPosition);
            if (marker.distanceElement) marker.distanceElement.textContent = `${Math.round(distance)}m`;
            const screenPos = marker.worldPosition.clone().project(this.world.camera);
            let isOnScreen = screenPos.z < 1 && Math.abs(screenPos.x)<=1 && Math.abs(screenPos.y)<=1;
            if (isOnScreen) {
                const x = (screenPos.x*0.5+0.5)*screenW, y = (screenPos.y*-0.5+0.5)*screenH;
                marker.element.style.left = `${x}px`; marker.element.style.top = `${y}px`;
                marker.element.classList.remove('hidden');
                marker.element.style.opacity = `${1-Math.min(1,distance/(CONFIG.UI.OBJECTIVE_MARKER_FADE_DISTANCE||100))}`;
                if (marker.offscreenIndicator && !marker.offscreenIndicator.classList.contains('hidden')) marker.offscreenIndicator.classList.add('hidden');
            } else {
                marker.element.classList.add('hidden');
                if (marker.offscreenIndicator) {
                    let edgeX, edgeY;
                    const xNDC = screenPos.z > 1 ? -screenPos.x : screenPos.x; // Flip if behind
                    const yNDC = screenPos.z > 1 ? -screenPos.y : screenPos.y; // Flip if behind
                    const M = screenH/screenW;
                    if (Math.abs(yNDC/xNDC) < M) {
                        edgeX = (xNDC > 0) ? screenW-padding : padding;
                        edgeY = ((yNDC/xNDC)*(edgeX - screenW/2)) + screenH/2;
                    } else {
                        edgeY = (yNDC < 0) ? screenH-padding : padding; // Screen Y is inverted from NDC Y
                        edgeX = ((xNDC/yNDC)*(edgeY - screenH/2)) + screenW/2;
                    }
                    edgeX = Math.max(padding, Math.min(screenW-padding, edgeX));
                    edgeY = Math.max(padding, Math.min(screenH-padding, edgeY));
                    marker.offscreenIndicator.style.left = `${edgeX}px`; marker.offscreenIndicator.style.top = `${edgeY}px`;
                    const realScreenX = (screenPos.x*0.5+0.5)*screenW; // Original projection for angle
                    const realScreenY = (screenPos.y*-0.5+0.5)*screenH;
                    const indicatorAngle = Math.atan2(realScreenY - edgeY, realScreenX - edgeX) * (180/Math.PI);
                    marker.offscreenIndicator.style.setProperty('--rotation', `${indicatorAngle}deg`);
                    marker.offscreenIndicator.classList.remove('hidden'); marker.offscreenIndicator.style.opacity = '1';
                }
            }
        }
    }

    /**
    * Changes the style of the crosshairs in order to show a sucessfull hit.
    * @return {UIManager} A reference to this UI manager.
    */
    showHitIndication() {
        if (this.sprites.crosshairs?.material) {
            this.sprites.crosshairs.material.color.set(0xff0000);
            this.endTimeHitIndication = this.currentTime + this.hitIndicationTime;
        }
        this.showHitMarkerAnimation(this.crosshairState.onHeadshot, false);
        if (this.sounds.hitConfirm?.play) this.sounds.hitConfirm.play();
        return this;
    }

    /**
    * Creates a temporary 3D hit marker sprite at the center of the screen
    * @private
    */
    _spawnHitMarker() {
        if (!this.sprites.hitMarker || !this.hitMarkerGroup) return;
        const markerSprite = this.sprites.hitMarker.clone(); markerSprite.visible = true;
        const markerSize = CONFIG.UI.HIT_MARKER_3D_SIZE || 24;
        markerSprite.scale.set(markerSize, markerSize, 1);
        this.hitMarkerGroup.add(markerSprite);
        this.hitMarkers.push({ sprite: markerSprite, lifetime: CONFIG.UI.HIT_MARKER_3D_DURATION||0.5, duration: CONFIG.UI.HIT_MARKER_3D_DURATION||0.5, initialScale: markerSize });
    }

    /**
    * Removes the hit indication of the sprite crosshairs.
    * @return {UIManager} A reference to this UI manager.
    */
    hideHitIndication() {
        if (this.sprites.crosshairs?.material) this.sprites.crosshairs.material.color.set(0xffffff);
        this.endTimeHitIndication = Infinity; return this;
    }

    /**
    * Shows radial elements around the sprite crosshairs to visualize the attack direction.
    * @param {Number} angle - The angle that determines the radial element.
    * @param {Number} damage - Optional damage amount to display.
    * @return {UIManager} A reference to this UI manager.
    */
    showDamageIndication(angle, damage = 0) {
        let indicatorToShow = null; const damageIndTime = this.damageIndicationTime || CONFIG.UI.DAMAGE_INDICATOR.TIME;
        if (angle >= -PI25 && angle <= PI25) { if (this.sprites.frontIndicator) { this.sprites.frontIndicator.visible=true; indicatorToShow=this.sprites.frontIndicator; this.endTimeDamageIndicationFront=this.currentTime+damageIndTime;}}
        else if (angle > PI25 && angle <= PI75) { if (this.sprites.rightIndicator) { this.sprites.rightIndicator.visible=true; indicatorToShow=this.sprites.rightIndicator; this.endTimeDamageIndicationRight=this.currentTime+damageIndTime;}}
        else if (angle >= -PI75 && angle < -PI25) { if (this.sprites.leftIndicator) { this.sprites.leftIndicator.visible=true; indicatorToShow=this.sprites.leftIndicator; this.endTimeDamageIndicationLeft=this.currentTime+damageIndTime;}}
        else { if (this.sprites.backIndicator) { this.sprites.backIndicator.visible=true; indicatorToShow=this.sprites.backIndicator; this.endTimeDamageIndicationBack=this.currentTime+damageIndTime;}}
        if (damage>0 && indicatorToShow?.material) {
            const intensity = Math.min(1.0, damage/(CONFIG.UI.DAMAGE_INDICATOR_MAX_DAMAGE_FOR_OPACITY||50));
            indicatorToShow.material.opacity = (CONFIG.UI.DAMAGE_INDICATOR_BASE_OPACITY||0.5) + intensity*(CONFIG.UI.DAMAGE_INDICATOR_OPACITY_SCALE||0.5);
        }
        if (damage>0) {
            this.showDamageFlash(); this.showDamageDirection(angle);
            const shakeThr = CONFIG.UI.SCREEN_SHAKE_DAMAGE_THRESHOLD||20;
            if (damage > shakeThr) {
                const shakeInt = Math.min(CONFIG.UI.SCREEN_SHAKE_MAX_INTENSITY||2.5, damage/(CONFIG.UI.SCREEN_SHAKE_DAMAGE_SCALAR||40));
                this.triggerScreenShake(shakeInt);
            }
        }
        this.storeDamageDirection = angle; return this;
    }

    /**
     * Shows a screen flash effect when taking damage
     */
    showDamageFlash() {
        if (!this.html.damageFlash) return;
        const flashCD = CONFIG.UI.DAMAGE_FLASH_COOLDOWN||0.2;
        if (this.currentTime - this.lastDamageTime < flashCD) return; this.lastDamageTime = this.currentTime;
        this.html.damageFlash.classList.remove('damage-flash-active'); void this.html.damageFlash.offsetWidth;
        this.html.damageFlash.classList.add('damage-flash-active');
        if(CONFIG.UI.ENABLE_BLOOD_SPLATTER_EFFECT) this._createBloodSplatter();
    }

    /**
     * Create blood splatter effect on screen
     * @private
     */
    _createBloodSplatter() {
        if(!document.body) return;
        const numSplats = Math.floor(Math.random()*(CONFIG.UI.BLOOD_SPLATTER_MAX_COUNT||3))+(CONFIG.UI.BLOOD_SPLATTER_MIN_COUNT||1);
        for (let i=0; i<numSplats; i++) {
            const splat=document.createElement('div'); splat.className='blood-splatter';
            let x,y; const margin=CONFIG.UI.BLOOD_SPLATTER_SCREEN_MARGIN_PERCENT||0.3;
            switch(Math.floor(Math.random()*4)){ /* ... positioning logic ... */ }
            // Simplified positioning:
            x = Math.random()*window.innerWidth; y = Math.random()*window.innerHeight*margin; // Example for top edge bias
            splat.style.left=`${x}px`; splat.style.top=`${y}px`;
            const size=(CONFIG.UI.BLOOD_SPLATTER_MIN_SIZE||30)+Math.random()*(CONFIG.UI.BLOOD_SPLATTER_SIZE_VARIANCE||50);
            splat.style.width=`${size}px`; splat.style.height=`${size}px`;
            const rot=Math.random()*360; splat.style.transform=`rotate(${rot}deg) scale(0.8)`; splat.style.opacity='0';
            document.body.appendChild(splat);
            setTimeout(()=>{splat.style.transform=`rotate(${rot}deg) scale(1)`; splat.style.opacity=`${CONFIG.UI.BLOOD_SPLATTER_MAX_OPACITY||0.7}`;},50);
            setTimeout(()=>{splat.style.opacity='0'; setTimeout(()=>{if(splat.parentNode)splat.remove();},CONFIG.UI.BLOOD_SPLATTER_FADEOUT_DURATION||500);},CONFIG.UI.BLOOD_SPLATTER_LINGER_DURATION||2000);
        }
    }

    /**
     * Shows a healing screen effect
     */
    showHealEffect() {
        if (!this.html.healEffect) return;
        const healCD = CONFIG.UI.HEAL_EFFECT_COOLDOWN||0.3;
        if (this.currentTime-this.lastHealTime < healCD) return; this.lastHealTime = this.currentTime;
        this.html.healEffect.classList.remove('heal-effect-active'); void this.html.healEffect.offsetWidth;
        this.html.healEffect.classList.add('heal-effect-active');
        if (this.html.hudHealth) {
            this.html.hudHealth.classList.add('healing-feedback');
            setTimeout(()=>{if(this.html.hudHealth)this.html.hudHealth.classList.remove('healing-feedback');},CONFIG.UI.HEAL_EFFECT_DURATION||2000);
        }
        if (this.sounds.healing?.play) this.sounds.healing.play();
    }

    /**
     * Trigger screen shake effect with given intensity
     * @param {Number} intensity - Shake intensity
     */
    triggerScreenShake(intensity) {
        if (!this.debugParameter.enableScreenShake) return;
        const maxInt = CONFIG.UI.SCREEN_SHAKE_MAX_INTENSITY||1.0;
        this.screenShakeIntensity = Math.min(maxInt, this.screenShakeIntensity+intensity);
        this.screenShakeIntensity = Math.max(0, this.screenShakeIntensity);
        if (this.sounds.screenShake?.play && !this.sounds.screenShake.isPlaying) {
            this.sounds.screenShake.play(); this.sounds.screenShake.isPlaying=true;
            setTimeout(()=>{this.sounds.screenShake.isPlaying=false;},this.sounds.screenShake.duration?this.sounds.screenShake.duration*1000:500);
        }
    }

    /**
     * Show victory overlay and effects
     */
    showVictory() {
        if (this.victoryState || !this.html.victoryOverlay) return; this.victoryState=true;
        this.html.victoryOverlay.classList.add('active');
        if (this.sounds.victory?.play) this.sounds.victory.play();
        this.showMatchEvent('VICTORY!', 'event-victory');
        const summaryDelay = CONFIG.UI.VICTORY_SUMMARY_DELAY||3000;
        setTimeout(()=>this._showRoundSummary(), summaryDelay);
    }

    /**
     * Show the end of round summary screen
     * @private
     */
    _showRoundSummary() {
        if (!this.html.roundEndScreen) return;
        const stats = this.world.gameStats||{kills:0,deaths:0,headshots:0,totalDamage:0,shotsFired:0,shotsHit:0};
        const kills=stats.kills, deaths=stats.deaths, kd=deaths>0?(kills/deaths).toFixed(1):kills.toFixed(1);
        const acc=stats.shotsFired>0?Math.round((stats.shotsHit/stats.shotsFired)*100):0;
        const hs=stats.headshots, xpEarned=this.totalXP-(this.xpAtRoundStart||0);
        const elK=document.getElementById('stat-kills'); if(elK)elK.textContent=kills.toString();
        const elD=document.getElementById('stat-deaths'); if(elD)elD.textContent=deaths.toString();
        const elKD=document.getElementById('stat-k-d-ratio'); if(elKD)elKD.textContent=kd;
        const elAcc=document.getElementById('stat-accuracy'); if(elAcc)elAcc.textContent=`${acc}%`;
        const elHS=document.getElementById('stat-headshots'); if(elHS)elHS.textContent=hs.toString();
        const elXP=document.getElementById('stat-xp-earned'); if(elXP)elXP.textContent=xpEarned.toString();
        this.html.roundEndScreen.classList.add('active');
    }

    /**
     * Start a new round by resetting game state relevant to UI
     * @private
     */
    _startNewRound() {
        this.fragMessages.forEach(m=>{if(m.element?.parentNode)m.element.remove();}); this.fragMessages=[];
        if(this.html.fragList)this.html.fragList.innerHTML='';
        this.killStreakCount=0; if(this.killStreakTimeout)clearTimeout(this.killStreakTimeout); this.killStreakTimeout=null;
        if(this.html.hudKillStreak?.firstChild)this.html.hudKillStreak.firstChild.textContent='';
        this.matchStartTime=performance.now(); this.showLowHealthEffect=false; this.lowHealthPulseIntensity=0;
        this.lastDamageTime=0; this.lastHealTime=0; this.screenShakeIntensity=0; document.body.style.transform='translate(0px,0px)';
        this.victoryState=false; if(this.html.victoryOverlay)this.html.victoryOverlay.classList.remove('active');
        if(this.html.roundEndScreen)this.html.roundEndScreen.classList.remove('active');
        this.storeDamageDirection=null; this.xpAtRoundStart=this.totalXP;
        this.activePowerups.forEach(p=>{if(p.element?.parentNode)p.element.remove();}); this.activePowerups=[];
        if(this.html.powerupIndicator)this.html.powerupIndicator.innerHTML='';
        this.notifications.forEach(n=>{if(n.element?.parentNode)n.element.remove();});this.notifications=[];
        if(this.html.notificationArea)this.html.notificationArea.innerHTML=''; this.lastNotificationTime=0;
        this.footstepIndicators.forEach(f=>{if(f.element?.parentNode)f.element.remove();});this.footstepIndicators=[];
        this.damageNumbers.forEach(d=>{if(d.element?.parentNode)d.element.remove();});this.damageNumbers=[];
        const player=this.world.player; if(player){this.stamina=this.staminaMax; if(this.html.staminaContainer)this.html.staminaContainer.classList.add('hidden');}
        this.updateHealthStatus(); this.updateAmmoStatus(); this._updateExperienceBar();
        this.addNotification('New Round Started!', 'notification-objective');
    }

    /**
     * Updates the frag list in the UI (removes old messages)
     * @private
     */
    _updateFragList() {
        if (!this.html.fragList) return;
        const duration = CONFIG.UI.FRAG_MESSAGE_DURATION||5; const now=this.currentTime;
        for (let i=this.fragMessages.length-1;i>=0;i--) {
            const msg=this.fragMessages[i];
            if(now-msg.time > duration){
                if(msg.element?.parentNode){msg.element.classList.add('fade-out'); setTimeout(()=>{if(msg.element?.parentNode)msg.element.remove();},500);}
                this.fragMessages.splice(i,1);
            }
        }
    }

    /**
     * Updates the basic canvas minimap with player and enemy positions
     * @private
     */
    _updateMinimap() {
        if(!this.minimapCtx||!this.world.player?.position)return;
        const p=this.world.player, mapS=this.minimapSize, wW=this.minimapWorldWidth, wD=this.minimapWorldDepth;
        this.minimapCtx.clearRect(0,0,mapS,mapS);
        this.minimapCtx.fillStyle=CONFIG.MINIMAP.BACKGROUND_COLOR||'rgba(0,0,0,0.3)'; this.minimapCtx.fillRect(0,0,mapS,mapS);
        if(CONFIG.MINIMAP.SHOW_GRID){/*...grid drawing...*/};
        const pX=((p.position.x+wW/2)/wW)*mapS, pY=((wD-(p.position.z+wD/2))/wD)*mapS;
        this.minimapCtx.save(); this.minimapCtx.translate(pX,pY);
        const pAng=Math.atan2(p.forward.x,p.forward.z); this.minimapCtx.rotate(-pAng);
        this.minimapCtx.beginPath(); const pIS=CONFIG.MINIMAP.PLAYER_ICON_SIZE||5;
        this.minimapCtx.moveTo(0,-pIS); this.minimapCtx.lineTo(-pIS*0.6,pIS*0.6); this.minimapCtx.lineTo(pIS*0.6,pIS*0.6);
        this.minimapCtx.closePath(); this.minimapCtx.fillStyle=CONFIG.MINIMAP.PLAYER_COLOR||'rgba(0,255,0,0.9)'; this.minimapCtx.fill();
        this.minimapCtx.restore();
        if(CONFIG.MINIMAP.SHOW_PLAYER_FOV){/*...FOV drawing...*/};
        (this.world.competitors||[]).forEach(e=>{
            if(e===p||!e.position||!e.active||!this._isEntityVisibleOnMinimap(p,e))return;
            const eX=((e.position.x+wW/2)/wW)*mapS, eY=((wD-(e.position.z+wD/2))/wD)*mapS;
            this.minimapCtx.beginPath(); this.minimapCtx.arc(eX,eY,CONFIG.MINIMAP.ENEMY_ICON_SIZE||3,0,Math.PI*2);
            this.minimapCtx.fillStyle=CONFIG.MINIMAP.ENEMY_COLOR||'rgba(255,0,0,0.9)'; this.minimapCtx.fill();
        });
        this.objectiveMarkers.forEach(m=>{/*...objective drawing on minimap...*/});
        if(CONFIG.MINIMAP.SHOW_BORDER){/*...border drawing...*/};
    }

    /**
     * Check if an entity is visible on the minimap (basic checks)
     * @private
     */
    _isEntityVisibleOnMinimap(player, entity) {
        if (!player?.position||!entity?.position)return false;
        const dist=player.position.distanceTo(entity.position);
        const maxRange=(this.minimapWorldWidth+this.minimapWorldDepth)/2*(CONFIG.MINIMAP.EFFECTIVE_RANGE_SCALE||1.0);
        if(dist>maxRange)return false;
        if(CONFIG.MINIMAP.USE_FOV_FOR_ENEMIES){
            const toE=entity.position.clone().sub(player.position).normalize();
            if(player.forward.dot(toE)<(CONFIG.MINIMAP.ENEMY_FOV_DOT_THRESHOLD||-0.2))return false;
        }
        return true;
    }

    /**
     * Render the UI scene (if using Three.js for HUD elements like sprites)
     * @private
     */
    _render() { /* ... if using Three.js for HUD ... */ }

    /**
     * Builds the first person shooter interface by making elements visible.
     * @private
     */
    _buildFPSInterface() {
        document.querySelectorAll('.uiContainer').forEach(c=>c.classList.remove('hidden'));
        if(this.html.dynamicCrosshair)this.html.dynamicCrosshair.classList.remove('hidden');
        if(this.html.staminaContainer)this.html.staminaContainer.classList.add('hidden');
        if(this.html.dynamicCrosshair)this._updateCrosshairState(false,false,false,false);
        this.updateHealthStatus(); this.updateAmmoStatus(); return this;
    }

    /**
     * Select a weapon by name (called from weapon wheel)
     * @private
     */
    _selectWeapon(weaponName) {
        if(this.world.player?.weaponSystem?.equipWeaponByName)this.world.player.weaponSystem.equipWeaponByName(weaponName);
        else console.warn(`Cannot equip weapon: ${weaponName}`);
        if(this.sounds.weaponSwitch?.play)this.sounds.weaponSwitch.play();
        this.addNotification(`Switched to ${weaponName}`,'notification-weapon'); this.updateAmmoStatus();
    }

    /**
     * Select a weapon by index (e.g., from number key press)
     * @private
     */
    _selectWeaponByIndex(index) {
        if(this.world.player?.weaponSystem?.equipWeaponByIndex)this.world.player.weaponSystem.equipWeaponByIndex(index);
        else console.warn(`Cannot equip by index: ${index}`);
        this.updateAmmoStatus();
    }

    /**
     * Toggle weapon wheel visibility
     */
    toggleWeaponWheel() {
        if(!this.html.weaponWheel)return;
        const isActive=this.html.weaponWheel.classList.contains('active');
        if(isActive)this.html.weaponWheel.classList.remove('active');
        else this.html.weaponWheel.classList.add('active');
    }

    /**
     * Adds a kill feed message to the UI
     * @param {Object} killer - The killer entity
     * @param {Object} victim - The victim entity
     * @param {String} weaponType - Optional weapon type/icon identifier
     */
    addFragMessage(killer, victim, weaponType = 'unknown') {
        if(!this.html.hudFragList||!this.html.fragList)return;
        const msgEl=document.createElement('div'); msgEl.className='frag-message';
        const killEl=document.createElement('span'); killEl.className='killer-name'; killEl.textContent=(killer?.name)?killer.name:'Unknown';
        if(killer===this.world.player)killEl.classList.add('player-killer');
        const weapEl=document.createElement('span'); weapEl.className=`weapon-icon weapon-${weaponType}`;
        const victEl=document.createElement('span'); victEl.className='victim-name'; victEl.textContent=(victim?.name)?victim.name:'Unknown';
        if(victim===this.world.player)victEl.classList.add('player-victim');
        msgEl.append(killEl,weapEl,victEl); this.html.fragList.prepend(msgEl);
        this.fragMessages.push({killer,victim,weaponType,time:this.currentTime,element:msgEl});
        if(killer===this.world.player)this._incrementKillStreak();
        this.html.hudFragList.classList.remove('hidden');
        if(killer===this.world.player && this.sounds.killConfirm?.play)this.sounds.killConfirm.play();
    }

    /**
     * Increment kill streak counter and display UI feedback
     * @private
     */
    _incrementKillStreak() {
        if(this.killStreakTimeout)clearTimeout(this.killStreakTimeout); this.killStreakCount++;
        if(this.html.hudKillStreak){
            const div=this.html.hudKillStreak.querySelector('div');
            if(this.killStreakCount>1){if(div)div.textContent=`Kill Streak: ${this.killStreakCount}`; this.html.hudKillStreak.classList.remove('hidden','fade-out'); void this.html.hudKillStreak.offsetWidth; this.html.hudKillStreak.classList.add('active');}
        }
        const timeoutDur=CONFIG.GAMEPLAY.KILL_STREAK_TIMEOUT||10000;
        this.killStreakTimeout=setTimeout(()=>{
            this.killStreakCount=0; if(this.html.hudKillStreak){this.html.hudKillStreak.classList.add('fade-out'); setTimeout(()=>{if(this.killStreakCount===0){this.html.hudKillStreak.classList.add('hidden');this.html.hudKillStreak.classList.remove('active','fade-out');if(this.html.hudKillStreak.firstChild)this.html.hudKillStreak.firstChild.textContent='';}},500);}
        },timeoutDur);
        let msg='',xp=0,evClass='';
        switch(this.killStreakCount){case 3:msg='Triple Kill!';xp=CONFIG.XP.TRIPLE_KILL||150;evClass='event-triple-kill';break; case 5:msg='Killing Spree!';xp=CONFIG.XP.KILLING_SPREE||250;evClass='event-killing-spree';break; /*...more streaks...*/};
        if(msg){this.showMatchEvent(msg,evClass); if(xp>0)this.addXP(xp); if(this.sounds.killStreak?.play)this.sounds.killStreak.play();}
    }

    /**
     * Shows a major match event (kill streak, objective, etc) in a banner
     * @param {String} text - Event text to display
     * @param {String} className - CSS class for styling the event type
     */
    showMatchEvent(text, className = '') {
        if(!this.html.matchEventsBanner)return;
        const el=document.createElement('div'); el.className=`match-event ${className}`; el.textContent=text;
        this.html.matchEventsBanner.innerHTML=''; this.html.matchEventsBanner.appendChild(el);
        this.html.matchEventsBanner.classList.remove('hidden','fade-out'); void this.html.matchEventsBanner.offsetWidth; this.html.matchEventsBanner.classList.add('active');
        const dispDur=CONFIG.UI.MATCH_EVENT_DISPLAY_DURATION||3000, fadeDur=CONFIG.UI.MATCH_EVENT_FADE_DURATION||1000;
        if(this.matchEventTimeout)clearTimeout(this.matchEventTimeout); if(this.matchEventFadeTimeout)clearTimeout(this.matchEventFadeTimeout);
        this.matchEventTimeout=setTimeout(()=>{if(this.html.matchEventsBanner)this.html.matchEventsBanner.classList.add('fade-out'); this.matchEventFadeTimeout=setTimeout(()=>{if(this.html.matchEventsBanner){this.html.matchEventsBanner.classList.add('hidden');this.html.matchEventsBanner.classList.remove('active','fade-out');}},fadeDur);},dispDur);
    }

    /**
     * Add a notification to the queue to be displayed sequentially
     * @param {String} text - Notification text
     * @param {String} className - CSS class for styling
     */
    addNotification(text, className = 'notification-info') {
        if(!this.debugParameter.showNotifications)return;
        this.notifications.push({text,className,timeAdded:this.currentTime});
        const canShow=this.html.notificationArea?this.html.notificationArea.children.length===0:true;
        if(this.notifications.length===1&&(this.currentTime-this.lastNotificationTime>(CONFIG.UI.NOTIFICATION_COOLDOWN||0.5)||canShow))this._processNotificationQueue();
    }

    /**
     * Display a notification from the queue.
     * @private
     */
    _processNotificationQueue() {
        if(this.notifications.length===0||!this.html.notificationArea)return;
        const data=this.notifications.shift(); if(!data)return;
        this._showNotification(data.text,data.className); this.lastNotificationTime=this.currentTime;
        if(this.notifications.length>0)setTimeout(()=>this._processNotificationQueue(),(CONFIG.UI.NOTIFICATION_SPACING_DELAY||500));
    }

    /**
     * Actually creates and shows a single notification element.
     * @private
     */
    _showNotification(text, className) {
        if(!this.html.notificationArea)return;
        const el=document.createElement('div'); el.className=`notification ${className}`; el.textContent=text;
        this.html.notificationArea.prepend(el); this.html.notificationArea.classList.remove('hidden');
        if(this.sounds.notification?.play)this.sounds.notification.play();
        const dispDur=CONFIG.UI.NOTIFICATION_DISPLAY_DURATION||4000, fadeDur=CONFIG.UI.NOTIFICATION_FADE_DURATION||500;
        setTimeout(()=>{el.classList.add('fade-out'); setTimeout(()=>{if(el.parentNode)el.remove(); if(this.html.notificationArea.children.length===0){/*this.html.notificationArea.classList.add('hidden');*/}},fadeDur);},dispDur);
    }


    /**
     * Add XP to player and update progression UI
     * @param {Number} amount - Amount of XP to add
     */
    addXP(amount) {
        if(amount<=0)return; this.playerXP+=amount; this.totalXP+=amount; let leveledUp=false;
        while(this.playerXP>=this.xpToNextLevel){
            this.playerXP-=this.xpToNextLevel; this.playerLevel++; leveledUp=true;
            this.xpToNextLevel=Math.round((CONFIG.XP.BASE_XP_PER_LEVEL||1000)*Math.pow(this.playerLevel,CONFIG.XP.LEVEL_SCALING_FACTOR||1.2));
            this._updatePlayerRank(); this.skillPoints++;
            this.showMatchEvent(`Level Up! Level ${this.playerLevel}`,'event-level-up');
            this.addNotification(`Skill Point Earned! Total: ${this.skillPoints}`,'notification-level');
            if(this.sounds.levelUp?.play)this.sounds.levelUp.play();
        }
        this._updateExperienceBar();
    }

    /**
     * Update player rank based on current level
     * @private
     */
    _updatePlayerRank() {
        const ranks=CONFIG.RANKS||[{level:1,name:'Recruit'},{level:5,name:'Corporal'}]; let newRank=ranks[0].name;
        for(const r of ranks){if(this.playerLevel>=r.level)newRank=r.name; else break;}
        if(newRank!==this.playerRank){this.addNotification(`Promoted to ${newRank}!`,'notification-rank'); this.playerRank=newRank;}
    }

    /**
     * Update experience bar display (level, rank, XP fill)
     * @private
     */
    _updateExperienceBar() {
        if(!this.html.experienceBar||!this.html.playerLevel)return;
        const div=this.html.playerLevel.querySelector('div'); if(div)div.textContent=`Level ${this.playerLevel} - ${this.playerRank}`;
        const fill=document.getElementById('experienceFill');
        if(fill)fill.style.width=`${Math.max(0,Math.min(100,(this.xpToNextLevel>0?(this.playerXP/this.xpToNextLevel)*100:0)))}%`;
        this.html.experienceBar.classList.remove('hidden'); this.html.playerLevel.classList.remove('hidden');
    }

    /**
     * Add a powerup to the player's active list and UI
     * @param {String} type - Powerup type
     * @param {String} name - Display name of the powerup
     * @param {Number} duration - Duration in seconds
     */
    addPowerup(type, name, duration) {
        const idx=this.activePowerups.findIndex(p=>p.type===type);
        if(idx>=0){
            const p=this.activePowerups[idx]; p.timeRemaining=Math.max(p.timeRemaining,duration);
            if(p.element){const t=p.element.querySelector('.powerup-timer'); if(t)t.textContent=Math.ceil(p.timeRemaining).toString(); if(p.element.classList.contains('expiring')&&p.timeRemaining>(CONFIG.UI.POWERUP_EXPIRING_THRESHOLD||3))p.element.classList.remove('expiring');}
            this.addNotification(`${name} refreshed!`,'notification-powerup');
        }else{
            const cont=document.createElement('div'); cont.className=`powerup-item powerup-${type}`;
            const icon=document.createElement('div'); icon.className='powerup-icon'; icon.innerHTML=this._getPowerupIcon(type);
            const lbl=document.createElement('div'); lbl.className='powerup-label'; lbl.textContent=name;
            const tmr=document.createElement('div'); tmr.className='powerup-timer'; tmr.textContent=Math.ceil(duration).toString();
            cont.append(icon,lbl,tmr);
            if(this.html.powerupIndicator){this.html.powerupIndicator.appendChild(cont);this.html.powerupIndicator.classList.remove('hidden');}
            this.activePowerups.push({type,name,timeRemaining:duration,element:cont});
            this.addNotification(`${name} activated!`,'notification-powerup');
            if(this.sounds.powerupPickup?.play)this.sounds.powerupPickup.play();
        }
    }

    /**
     * Get icon HTML/emoji for given powerup type
     * @private
     */
    _getPowerupIcon(type) {
        const icons=CONFIG.UI.POWERUP_ICONS||{damage:'⚔️',speed:'🏃',armor:'🛡️'}; return icons[type]||'⭐';
    }

    /**
     * Add a 3D objective marker at the given position with a DOM element.
     * @private
     */
    _add3DObjectiveMarker(id, position, type = 'standard', label = '') {
        if(!document.body)return;
        const el=document.createElement('div'); el.className=`objective-marker ${type}-objective hidden`; el.dataset.id=id;
        const icon=document.createElement('div'); icon.className='objective-icon'; let lblEl=null;
        if(label){lblEl=document.createElement('div');lblEl.className='objective-label';lblEl.textContent=label;}
        const distEl=document.createElement('div'); distEl.className='objective-distance'; distEl.textContent='0m';
        el.appendChild(icon); if(lblEl)el.appendChild(lblEl); el.appendChild(distEl); document.body.appendChild(el);
        const offscr=document.createElement('div'); offscr.className=`offscreen-indicator ${type}-objective hidden`; document.body.appendChild(offscr);
        this.objectiveMarkers.push({id,worldPosition:position.clone(),element:el,labelElement:lblEl,distanceElement:distEl,offscreenIndicator:offscr,type,label,completed:false});
    }

    /**
     * Add an objective to the objectives list UI
     * @param {String} id - Unique identifier for the objective
     * @param {String} text - Objective description text
     * @param {Vector3} [position=null] - Optional world position for creating a 3D marker
     * @param {Boolean} [completed=false] - Whether objective is initially completed
     * @param {String} [type='standard'] - Type of objective for marker styling if position is given
     */
    addObjective(id, text, position = null, completed = false, type = 'standard') {
        if(!this.html.hudObjectives)return; let list=this.html.hudObjectives.querySelector('.objectives-list');
        if(!list){const h=document.createElement('h3');h.textContent="OBJECTIVES";this.html.hudObjectives.prepend(h);list=document.createElement('div');list.className='objectives-list';this.html.hudObjectives.appendChild(list);}
        const el=document.createElement('div'); el.className='objective-item'; el.dataset.id=id; if(completed)el.classList.add('completed');
        const chk=document.createElement('div'); chk.className='objective-checkbox';
        const txtEl=document.createElement('div'); txtEl.className='objective-text'; txtEl.textContent=text;
        el.append(chk,txtEl); list.appendChild(el); this.html.hudObjectives.classList.remove('hidden');
        if(position)this._add3DObjectiveMarker(`marker_${id}`,position,type,text.substring(0,25));
    }

    /**
     * Mark an objective as completed in the UI
     * @param {String} id - Objective ID (from addObjective)
     */
    completeObjective(id) {
        const el=document.querySelector(`.objective-item[data-id="${id}"]`); if(el)el.classList.add('completed');
        const marker=this.objectiveMarkers.find(m=>m.id===`marker_${id}`||m.label===id);
        if(marker){marker.completed=true;if(marker.element){marker.element.classList.add('completed');marker.element.style.opacity='0.5';}if(marker.offscreenIndicator)marker.offscreenIndicator.classList.add('completed');}
        this.addNotification('Objective Completed!','notification-objective');
        if(this.sounds.objectiveComplete?.play)this.sounds.objectiveComplete.play();
        this.showMatchEvent('Objective Complete!','event-objective');
        const all=document.querySelectorAll('.objective-item'),done=document.querySelectorAll('.objective-item.completed');
        if(all.length>0&&all.length===done.length){this.addNotification('All Objectives Cleared!','notification-victory');}
    }

    /**
     * Add a visual footstep indicator on screen
     * @param {Vector3} position - World position of the footstep
     * @param {String} type - Entity type ('enemy', 'friendly') for styling
     */
    addFootstepIndicator(position, type = 'enemy') {
        if(!this.world.camera||!document.body)return;
        const scrPos=position.clone().project(this.world.camera);
        if(Math.abs(scrPos.x)<=1&&Math.abs(scrPos.y)<=1&&scrPos.z<1){
            const x=(scrPos.x*0.5+0.5)*window.innerWidth, y=(scrPos.y*-0.5+0.5)*window.innerHeight;
            const el=document.createElement('div'); el.className=`footstep-indicator ${type}-footstep`;
            el.style.left=`${x}px`; el.style.top=`${y}px`; document.body.appendChild(el);
            this.footstepIndicators.push({element:el,lifetime:CONFIG.UI.FOOTSTEP_DURATION||1.5,type});
            if(this.sounds.footstep?.play&&type==='enemy'&&CONFIG.AUDIO.PLAY_ENEMY_FOOTSTEP_SOUNDS)this.sounds.footstep.play();
        }
    }

    /**
     * Show a floating damage number at a world position
     * @param {Vector3} position - World position where damage occurred
     * @param {Number} value - Damage value
     * @param {Boolean} [isCritical=false] - Whether it's a critical hit for special styling
     * @param {Object} [targetEntity=null] - Optional entity the number should follow
     */
    showDamageNumber(position, value, isCritical = false, targetEntity = null) {
        if(!this.debugParameter.showDamageNumbers||!position||!this.world.camera||!document.body)return;
        const el=document.createElement('div'); el.className='damage-number'; if(isCritical)el.classList.add('critical');
        el.textContent=isCritical?`${Math.round(value)}!`:Math.round(value).toString();
        const worldPos=position.clone();
        const rndX=(Math.random()-0.5)*(CONFIG.UI.DAMAGE_NUMBER_SPREAD||20),rndY=(Math.random()-0.5)*(CONFIG.UI.DAMAGE_NUMBER_SPREAD||10);
        worldPos.x+=rndX/100; worldPos.y+=(CONFIG.UI.DAMAGE_NUMBER_INITIAL_Y_OFFSET||0.5)+rndY/100;
        const scrPos=worldPos.project(this.world.camera);
        if(scrPos.z<1){
            const x=(scrPos.x*0.5+0.5)*window.innerWidth, y=(scrPos.y*-0.5+0.5)*window.innerHeight;
            el.style.left=`${x}px`; el.style.top=`${y}px`; document.body.appendChild(el);
            this.damageNumbers.push({element:el,worldPosition:worldPos,targetEntity,offset:targetEntity?position.clone().sub(targetEntity.position):new Vector3(),lifetime:CONFIG.UI.DAMAGE_NUMBER_DURATION||1.5,value,isCritical,initialOffsetX:rndX});
        }
    }

    /**
     * Update health percentage and visual display of the HUD health element.
     * @param {Number} [percentage=null] - Optional health percentage (0-100).
     */
    updateHealthStatus(percentage = null) {
        let currentH=percentage,maxH=100;
        if(currentH===null){const p=this.world.player;if(p&&typeof p.health!=='undefined'){currentH=p.health;maxH=p.maxHealth||100;}else currentH=100;}
        currentH=Math.max(0,currentH); const dispPerc=(currentH/maxH)*100;
        if(this.html.health)this.html.health.textContent=Math.round(currentH).toString();
        const fillEl=document.getElementById('healthFill'); if(fillEl)fillEl.style.width=`${dispPerc}%`;
        if(this.html.hudHealth){
            const critThr=CONFIG.PLAYER.CRITICAL_HEALTH_THRESHOLD||20,lowThr=CONFIG.PLAYER.LOW_HEALTH_THRESHOLD||50;
            this.html.hudHealth.classList.remove('critical-health','low-health','normal-health');
            if(currentH<=critThr)this.html.hudHealth.classList.add('critical-health');
            else if(currentH<=lowThr)this.html.hudHealth.classList.add('low-health');
            else this.html.hudHealth.classList.add('normal-health');
        }
    }

    /**
     * Shows the main FPS interface elements.
     * @return {UIManager} A reference to this UI manager.
     */
    showFPSInterface() {
        Object.values(this.html).forEach(el=>{if(el?.classList?.contains('uiContainer'))el.classList.remove('hidden');});
        if(this.html.dynamicCrosshair)this.html.dynamicCrosshair.classList.remove('hidden');
        this.updateHealthStatus(); this.updateAmmoStatus();
        if(this.html.advancedMinimapContainer)this.html.advancedMinimapContainer.classList.remove('hidden');
        if(this.minimapCanvas)this.minimapCanvas.style.display='block';
        return this;
    }

    /**
     * Hides the main FPS interface elements.
     * @return {UIManager} A reference to this UI manager.
     */
    hideFPSInterface() {
        Object.values(this.html).forEach(el=>{if(el?.classList&&el.id!=='loadingScreen'&&el.id!=='victoryOverlay'&&el.id!=='roundEndScreen'&&el.id!=='missionBriefing'&&el.id!=='worldMap'){if(el.classList.contains('uiContainer')||el.id==='dynamicCrosshair'||el.id==='advancedMinimapContainer')el.classList.add('hidden');}});
        if(this.minimapCanvas)this.minimapCanvas.style.display='none';
        return this;
    }

    /**
     * Updates UI elements' sizes or recalculates positions when the window is resized.
     * @param {Number} width - New window width.
     * @param {Number} height - New window height.
     * @return {UIManager} A reference to this UI manager.
     */
    setSize(width, height) {
        if(this.camera){this.camera.left=-width/2;this.camera.right=width/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.updateProjectionMatrix();}
        if(this.minimapCanvas){const newS=Math.min(width,height)*(CONFIG.MINIMAP.VIEWPORT_SCALE||0.15);this.minimapSize=newS;this.minimapCanvas.width=newS;this.minimapCanvas.height=newS;this._updateMinimap();}
        if(this.minimapIntegration?.setSize)this.minimapIntegration.setSize(width,height);
        return this;
    }

    /**
     * Opens the debug UI (DAT.GUI).
     * @return {UIManager} A reference to this UI manager.
     */
    openDebugUI() { if(this.datGui?.open)this.datGui.open(); return this; }

    /**
     * Closes the debug UI (DAT.GUI).
     * @return {UIManager} A reference to this UI manager.
     */
    closeDebugUI() { if(this.datGui?.close)this.datGui.close(); return this; }

    /**
     * Update ammo display in the HUD.
     * @param {Number} [roundsLeft=null] - Rounds currently in the magazine.
     * @param {Number} [totalAmmo=null] - Total ammunition for the current weapon.
     */
    updateAmmoStatus(roundsLeft = null, totalAmmo = null) {
        let currentR=roundsLeft,currentTA=totalAmmo,magCap=30;
        if(currentR===null||currentTA===null){const p=this.world.player,w=p?.weaponSystem?.currentWeapon;if(w){currentR=w.roundsLeftInMag!==undefined?w.roundsLeftInMag:0;currentTA=w.ammoInReserve!==undefined?w.ammoInReserve:0;magCap=w.magazineCapacity||30;}else{currentR=0;currentTA=0;}}
        if(this.html.roundsLeft)this.html.roundsLeft.textContent=currentR.toString();
        if(this.html.ammo)this.html.ammo.textContent=currentTA.toString();
        this._updateAmmoVisualizer(currentR,magCap);
        if(this.html.hudAmmo){
            this.html.hudAmmo.classList.remove('low-ammo','no-ammo','normal-ammo');
            const lowThr=magCap*(CONFIG.WEAPON.LOW_AMMO_THRESHOLD_PERCENT||0.2);
            if(currentR<=0&&currentTA<=0)this.html.hudAmmo.classList.add('no-ammo');
            else if(currentR<=lowThr&&currentR>0)this.html.hudAmmo.classList.add('low-ammo');
            else if(currentR===0&&currentTA>0)this.html.hudAmmo.classList.add('low-ammo');
            else this.html.hudAmmo.classList.add('normal-ammo');
        }
    }

    /**
     * Update visual ammo display (e.g., bullet icons).
     * @private
     */
    _updateAmmoVisualizer(rounds = 0, capacity = 30) {
        const vis=document.getElementById('ammoVisualizer'); if(!vis)return; vis.innerHTML='';
        const maxVis=CONFIG.UI.AMMO_VISUALIZER_MAX_BULLETS||30,toDraw=Math.min(rounds,maxVis),visCap=Math.min(capacity,maxVis);
        for(let i=0;i<toDraw;i++){const b=document.createElement('div');b.className='ammo-bullet filled';vis.appendChild(b);}
        if(CONFIG.UI.AMMO_VISUALIZER_SHOW_EMPTY)for(let i=toDraw;i<visCap;i++){const b=document.createElement('div');b.className='ammo-bullet empty';vis.appendChild(b);}
    }

    /**
     * Dispose the manager and free all resources.
     * @return {UIManager} A reference to this UI manager.
     */
    dispose() {
        if(this._contextMenuHandler)document.removeEventListener('contextmenu',this._contextMenuHandler);
        if(this._mouseMoveHandler)document.removeEventListener('mousemove',this._mouseMoveHandler);
        // ... remove all other listeners ...
        if(this.datGui){this.datGui.destroy();this.datGui=null;}
        if(this.minimapIntegration?.dispose)this.minimapIntegration.dispose();
        // ... clear all timeouts ...
        for(const k in this.html){if(this.html[k]?.parentNode)this.html[k].remove();}
        document.querySelectorAll('.damage-number,.footstep-indicator,.objective-marker,.offscreen-indicator,.blood-splatter,.rain-drop').forEach(el=>el.remove());
        if(this.fpsCounter.fpsElement?.parentNode)this.fpsCounter.fpsElement.remove();
        this.objectiveMarkers=[];this.damageNumbers=[];this.footstepIndicators=[];this.fragMessages=[];this.activePowerups=[];this.notifications=[];this.raindrops=[];this.hitMarkers=[];
        if(this.scene)this.scene.clear(); if(this.hitMarkerGroup)this.hitMarkerGroup.clear();
        console.log("UIManager disposed."); return this;
    }
}

export { UIManager };