/**
 * UI Bootstrap - Creates all essential DOM elements immediately
 * This file solves the core HUD/UI integration problem by ensuring
 * all DOM elements exist before any systems try to use them.
 * 
 * Based on the working example pattern but adapted for the current architecture.
 */

export class UIBootstrap {
    constructor() {
        this.elements = {};
        
        // Track initialization
        this.isInitialized = false;
    }
    
    /**
     * Creates all essential UI elements immediately
     * This MUST be called before any UI systems are initialized
     */
    createEssentialElements() {
        if (this.isInitialized) {
            console.warn('UIBootstrap already initialized');
            return this.elements;
        }
        
        console.log('Creating essential UI elements...');
        
        // Core HUD elements - these IDs match the CSS exactly
        this.elements.hudHealth = this._createHealthDisplay();
        this.elements.hudAmmo = this._createAmmoDisplay();
        this.elements.hudMinimap = this._ensureMinimapContainer();
        this.elements.hudCompass = this._ensureCompassContainer();
        this.elements.hudWeapons = this._ensureWeaponsContainer();
        
        // Fragment/Kill Feed
        this.elements.hudFragList = this._createFragList();
        
        // Crosshair system
        this.elements.dynamicCrosshair = this._createDynamicCrosshair();
        
        // Screen effects
        this.elements.damageFlash = this._createScreenEffect('damageFlash', 'damage-flash');
        this.elements.healEffect = this._createScreenEffect('healEffect', 'heal-effect');
        this.elements.damageDirectionRing = this._createScreenEffect('damageDirectionRing', 'damage-direction-ring');
        
        // Notification system
        this.elements.notificationArea = this._createNotificationArea();
        this.elements.matchEventsBanner = this._createMatchEventsBanner();
        
        // Progress displays
        this.elements.playerLevel = this._createPlayerLevel();
        this.elements.experienceBar = this._createExperienceBar();
        this.elements.staminaContainer = this._createStaminaBar();
        
        // Additional HUD elements
        this.elements.hudMatchTimer = this._createMatchTimer();
        this.elements.hudScore = this._createScore();
        this.elements.hudKillStreak = this._createKillStreak();
        this.elements.powerupIndicator = this._createPowerupIndicator();
        this.elements.reloadAnimation = this._createReloadAnimation();
        this.elements.enemyHealthContainer = this._createEnemyHealthBar();
        
        // Full-screen overlays
        this.elements.victoryOverlay = this._createScreenEffect('victoryOverlay', 'victory-overlay');
        this.elements.warningOverlay = this._createScreenEffect('warningOverlay', 'warning-overlay');
        this.elements.weatherEffectsOverlay = this._createScreenEffect('weatherEffectsOverlay', 'weather-effects');
        
        // Modal systems
        this.elements.weaponWheel = this._createWeaponWheel();
        this.elements.worldMap = this._createWorldMap();
        this.elements.missionBriefing = this._createMissionBriefing();
        this.elements.roundEndScreen = this._createRoundEndScreen();
        this.elements.achievementPopup = this._createAchievementPopup();
        
        // Apply the working CSS styles immediately
        this._ensureCSS();
        
        this.isInitialized = true;
        console.log('Essential UI elements created:', Object.keys(this.elements).length, 'elements');
        
        return this.elements;
    }
    
    /**
     * Create health display element
     */
    _createHealthDisplay() {
        const container = this._createBasicElement('hudHealth', 'uiContainer');
        container.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background-color: rgba(0, 0, 0, 0.6);
            border-radius: 5px;
            padding: 8px 12px;
            font-family: 'Rajdhani', 'Orbitron', sans-serif;
            font-weight: 600;
            font-size: 1.5em;
            color: white;
            text-shadow: 0 0 5px rgba(0, 0, 0, 0.7);
            border-left: 3px solid #e63946;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
            z-index: 890;
        `;
        
        const healthText = document.createElement('div');
        healthText.id = 'health';
        healthText.textContent = '100';
        container.appendChild(healthText);
        
        return container;
    }
    
    /**
     * Create ammo display element
     */
    _createAmmoDisplay() {
        const container = this._createBasicElement('hudAmmo', 'uiContainer');
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: rgba(0, 0, 0, 0.6);
            border-radius: 5px;
            padding: 8px 12px;
            font-family: 'Rajdhani', 'Orbitron', sans-serif;
            font-weight: 600;
            font-size: 1.5em;
            color: white;
            text-shadow: 0 0 5px rgba(0, 0, 0, 0.7);
            border-left: 3px solid #e63946;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
            z-index: 890;
            display: flex;
            flex-direction: column;
            align-items: center;
        `;
        
        const ammoText = document.createElement('div');
        ammoText.style.display = 'flex';
        ammoText.style.gap = '5px';
        
        const roundsLeft = document.createElement('span');
        roundsLeft.id = 'roundsLeft';
        roundsLeft.textContent = '30';
        
        const separator = document.createElement('span');
        separator.textContent = '/';
        
        const ammo = document.createElement('span');
        ammo.id = 'ammo';
        ammo.textContent = '90';
        
        ammoText.appendChild(roundsLeft);
        ammoText.appendChild(separator);
        ammoText.appendChild(ammo);
        container.appendChild(ammoText);
        
        // Add ammo visualizer
        const visualizer = document.createElement('div');
        visualizer.id = 'ammoVisualizer';
        visualizer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 2px;
            margin-top: 5px;
            max-width: 120px;
        `;
        container.appendChild(visualizer);
        
        return container;
    }
    
    /**
     * Create dynamic crosshair
     */
    _createDynamicCrosshair() {
        const container = this._createBasicElement('dynamicCrosshair');
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 24px;
            height: 24px;
            z-index: 1000;
            pointer-events: none;
            transition: all 0.1s ease;
        `;
        
        // Create crosshair parts
        const parts = [
            { name: 'center', style: 'width: 4px; height: 4px; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%);' },
            { name: 'top', style: 'width: 2px; height: 10px; top: 0; left: 50%; transform: translate(-50%, -2px);' },
            { name: 'right', style: 'width: 10px; height: 2px; top: 50%; right: 0; transform: translate(2px, -50%);' },
            { name: 'bottom', style: 'width: 2px; height: 10px; bottom: 0; left: 50%; transform: translate(-50%, 2px);' },
            { name: 'left', style: 'width: 10px; height: 2px; top: 50%; left: 0; transform: translate(-2px, -50%);' }
        ];
        
        parts.forEach(part => {
            const element = document.createElement('div');
            element.className = `crosshair-part crosshair-${part.name}`;
            element.style.cssText = `
                position: absolute;
                background-color: rgba(255, 255, 255, 0.8);
                transition: all 0.15s ease;
                ${part.style}
            `;
            container.appendChild(element);
        });
        
        // Create hitmarker
        const hitmarker = document.createElement('div');
        hitmarker.className = 'hitmarker';
        hitmarker.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 20px;
            height: 20px;
            opacity: 0;
            pointer-events: none;
        `;
        
        // Create hitmarker parts
        for (let i = 0; i < 4; i++) {
            const part = document.createElement('div');
            part.className = 'hitmarker-part';
            part.style.cssText = `
                position: absolute;
                width: 10px;
                height: 2px;
                background-color: rgba(255, 255, 255, 0.9);
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(${45 + i * 90}deg);
            `;
            hitmarker.appendChild(part);
        }
        
        container.appendChild(hitmarker);
        
        return container;
    }
    
    /**
     * Create fragment list
     */
    _createFragList() {
        const container = this._createBasicElement('hudFragList', 'uiContainer');
        container.style.cssText = `
            position: fixed;
            top: 120px;
            left: 20px;
            z-index: 890;
            background-color: rgba(0, 0, 0, 0.4);
            border-radius: 5px;
            padding: 8px;
            border-left: 3px solid #e63946;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            max-height: 40vh;
            overflow: hidden;
            width: 280px;
        `;
        
        const fragList = document.createElement('div');
        fragList.id = 'fragList';
        fragList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 6px;
        `;
        container.appendChild(fragList);
        
        return container;
    }
    
    /**
     * Create notification area
     */
    _createNotificationArea() {
        const container = this._createBasicElement('notificationArea');
        container.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            z-index: 950;
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-width: 300px;
            pointer-events: none;
        `;
        
        return container;
    }
    
    /**
     * Create match events banner
     */
    _createMatchEventsBanner() {
        const container = this._createBasicElement('matchEventsBanner');
        container.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 900;
            text-align: center;
            pointer-events: none;
        `;
        
        return container;
    }
    
    /**
     * Create screen effect element
     */
    _createScreenEffect(id, className) {
        const element = this._createBasicElement(id, className);
        element.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 899;
            opacity: 0;
            transition: opacity 0.1s ease-in;
        `;
        
        return element;
    }
    
    /**
     * Create basic UI element
     */
    _createBasicElement(id, className = '') {
        const element = document.createElement('div');
        element.id = id;
        if (className) element.className = className;
        document.body.appendChild(element);
        return element;
    }
    
    /**
     * Ensure minimap container exists
     */
    _ensureMinimapContainer() {
        let container = document.getElementById('hudMinimap');
        if (!container) {
            container = this._createBasicElement('hudMinimap', 'uiContainer');
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                z-index: 900;
                pointer-events: none;
            `;
        }
        return container;
    }
    
    /**
     * Ensure compass container exists
     */
    _ensureCompassContainer() {
        let container = document.getElementById('hudCompass');
        if (!container) {
            container = this._createBasicElement('hudCompass', 'uiContainer');
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 890;
            `;
            
            const compassImage = document.createElement('img');
            compassImage.id = 'compassImage';
            compassImage.src = '/assets/hud/compass.png';
            compassImage.style.maxWidth = '300px';
            compassImage.style.height = 'auto';
            container.appendChild(compassImage);
        }
        return container;
    }
    
    /**
     * Ensure weapons container exists  
     */
    _ensureWeaponsContainer() {
        let container = document.getElementById('hudWeapons');
        if (!container) {
            container = this._createBasicElement('hudWeapons', 'uiContainer');
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 150px;
                z-index: 890;
            `;
            
            const weaponsImage = document.createElement('img');
            weaponsImage.id = 'weaponsImage';
            weaponsImage.src = '/assets/hud/weapons.png';
            weaponsImage.style.maxWidth = '200px';
            weaponsImage.style.height = 'auto';
            container.appendChild(weaponsImage);
        }
        return container;
    }
    
    /**
     * Create player level display
     */
    _createPlayerLevel() {
        const container = this._createBasicElement('playerLevel', 'uiContainer');
        container.style.cssText = `
            position: fixed;
            top: 70px;
            left: 20px;
            z-index: 870;
            background-color: rgba(0, 0, 0, 0.6);
            border-radius: 5px;
            padding: 5px 10px;
            border-left: 3px solid #4caf50;
        `;
        
        const levelText = document.createElement('div');
        levelText.style.cssText = `
            font-family: 'Orbitron', 'Rajdhani', sans-serif;
            font-weight: 600;
            font-size: 1em;
            color: #4caf50;
        `;
        levelText.textContent = 'Level 1';
        container.appendChild(levelText);
        
        return container;
    }
    
    /**
     * Create experience bar
     */
    _createExperienceBar() {
        const container = this._createBasicElement('experienceBar');
        container.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 860;
            width: 300px;
            height: 6px;
            background-color: rgba(0, 0, 0, 0.5);
            border-radius: 3px;
            overflow: hidden;
        `;
        
        const fillBar = document.createElement('div');
        fillBar.id = 'experienceFill';
        fillBar.style.cssText = `
            height: 100%;
            background-color: #4caf50;
            border-radius: 3px;
            width: 0%;
            transition: width 0.5s ease;
            box-shadow: 0 0 5px rgba(76, 175, 80, 0.7);
        `;
        container.appendChild(fillBar);
        
        return container;
    }
    
    /**
     * Create stamina bar
     */
    _createStaminaBar() {
        const container = this._createBasicElement('staminaContainer', 'hidden');
        container.style.cssText = `
            position: fixed;
            bottom: 50px;
            left: 50%;
            transform: translateX(-50%);
            width: 200px;
            height: 5px;
            background-color: rgba(0, 0, 0, 0.5);
            border-radius: 2px;
            z-index: 870;
            overflow: hidden;
            transition: opacity 0.5s ease;
        `;
        
        const fillBar = document.createElement('div');
        fillBar.id = 'staminaFill';
        fillBar.style.cssText = `
            height: 100%;
            background-color: #33a8ff;
            width: 100%;
            transition: width 0.2s linear;
            box-shadow: 0 0 5px rgba(51, 168, 255, 0.5);
        `;
        container.appendChild(fillBar);
        
        return container;
    }
    
    /**
     * Create additional HUD elements using a simpler pattern
     */
    _createMatchTimer() {
        const container = this._createBasicElement('hudMatchTimer', 'uiContainer');
        container.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 880;
            background-color: rgba(0, 0, 0, 0.6);
            border-radius: 5px;
            padding: 5px 15px;
            border-bottom: 2px solid #33a8ff;
        `;
        
        const timerDiv = document.createElement('div');
        timerDiv.style.cssText = `
            font-family: 'Rajdhani', 'Orbitron', sans-serif;
            font-weight: 600;
            font-size: 1.1em;
            letter-spacing: 1px;
            color: white;
        `;
        timerDiv.textContent = 'Match Time: 00:00';
        container.appendChild(timerDiv);
        
        return container;
    }
    
    _createScore() {
        const container = this._createBasicElement('hudScore', 'uiContainer');
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 880;
            background-color: rgba(0, 0, 0, 0.6);
            border-radius: 5px;
            padding: 5px 15px;
            border-bottom: 2px solid #33a8ff;
        `;
        
        const scoreDiv = document.createElement('div');
        scoreDiv.style.cssText = `
            font-family: 'Rajdhani', 'Orbitron', sans-serif;
            font-weight: 600;
            font-size: 1.1em;
            color: white;
        `;
        scoreDiv.textContent = 'Score: 0';
        container.appendChild(scoreDiv);
        
        return container;
    }
    
    _createKillStreak() {
        const container = this._createBasicElement('hudKillStreak', 'uiContainer hidden');
        container.style.cssText = `
            position: fixed;
            top: 120px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 890;
            text-align: center;
            background-color: rgba(0, 0, 0, 0.6);
            border-radius: 5px;
            padding: 5px 15px;
            border-bottom: 2px solid #ff9800;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        `;
        
        const streakDiv = document.createElement('div');
        streakDiv.style.cssText = `
            font-family: 'Orbitron', 'Rajdhani', sans-serif;
            font-weight: 600;
            font-size: 1.2em;
            color: #ff9800;
            text-shadow: 0 0 5px rgba(255, 153, 0, 0.5);
        `;
        container.appendChild(streakDiv);
        
        return container;
    }
    
    _createPowerupIndicator() {
        const container = this._createBasicElement('powerupIndicator', 'hidden');
        container.style.cssText = `
            position: fixed;
            bottom: 120px;
            left: 20px;
            z-index: 880;
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;
        
        return container;
    }
    
    _createReloadAnimation() {
        const container = this._createBasicElement('reloadAnimation', 'hidden');
        container.style.cssText = `
            position: fixed;
            bottom: 120px;
            right: 50%;
            transform: translateX(50%);
            z-index: 880;
            background-color: rgba(0, 0, 0, 0.6);
            padding: 8px 15px;
            border-radius: 5px;
            font-family: 'Orbitron', 'Rajdhani', sans-serif;
            font-weight: 600;
            font-size: 1.1em;
            letter-spacing: 1px;
            color: white;
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
        `;
        container.textContent = 'RELOADING...';
        
        return container;
    }
    
    _createEnemyHealthBar() {
        const container = this._createBasicElement('enemyHealthContainer', 'enemy-health-container');
        container.style.cssText = `
            position: fixed;
            top: 75px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 880;
            width: 250px;
            background-color: rgba(0, 0, 0, 0.7);
            border-radius: 5px;
            padding: 5px 10px;
            display: none;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
        `;
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'enemy-name';
        nameDiv.style.cssText = `
            font-family: 'Rajdhani', 'Orbitron', sans-serif;
            font-weight: 600;
            font-size: 0.9em;
            color: #f44336;
            margin-bottom: 5px;
            text-align: center;
        `;
        nameDiv.textContent = 'Enemy';
        
        const barDiv = document.createElement('div');
        barDiv.className = 'enemy-health-bar';
        barDiv.style.cssText = `
            height: 8px;
            background-color: rgba(30, 30, 30, 0.7);
            border-radius: 2px;
            overflow: hidden;
            position: relative;
        `;
        
        const fillDiv = document.createElement('div');
        fillDiv.className = 'enemy-health-fill';
        fillDiv.style.cssText = `
            position: absolute;
            height: 100%;
            width: 100%;
            background-color: #f44336;
            border-radius: 2px;
            transition: width 0.2s ease;
        `;
        
        const armorDiv = document.createElement('div');
        armorDiv.className = 'enemy-armor';
        armorDiv.style.cssText = `
            position: absolute;
            height: 100%;
            width: 0%;
            background-color: #64b5f6;
            border-radius: 2px;
            opacity: 0.7;
            top: 0;
            left: 0;
            transition: width 0.2s ease;
        `;
        
        barDiv.appendChild(fillDiv);
        barDiv.appendChild(armorDiv);
        container.appendChild(nameDiv);
        container.appendChild(barDiv);
        
        return container;
    }
    
    // Modal/overlay elements with minimal implementation
    _createWeaponWheel() { return this._createBasicElement('weaponWheel', 'hidden'); }
    _createWorldMap() { return this._createBasicElement('worldMap', 'hidden'); }
    _createMissionBriefing() { return this._createBasicElement('missionBriefing', 'hidden'); }
    _createRoundEndScreen() { return this._createBasicElement('roundEndScreen', 'hidden'); }
    _createAchievementPopup() { return this._createBasicElement('achievementPopup', 'hidden'); }
    
    /**
     * Ensure the working CSS is loaded
     */
    _ensureCSS() {
        // Link to the working CSS styles
        const existingCSS = document.getElementById('rift-ui-styles');
        if (!existingCSS) {
            const link = document.createElement('link');
            link.id = 'rift-ui-styles';
            link.rel = 'stylesheet';
            link.href = '/public/styles/main.css';
            document.head.appendChild(link);
        }
        
        // Add critical inline styles for immediate functionality
        const inlineStyles = document.createElement('style');
        inlineStyles.textContent = `
            .hidden { display: none !important; }
            .uiContainer { pointer-events: none; transition: all 0.3s ease; }
            .damage-flash-active { background: rgba(255, 0, 0, 0.3); animation: damageFlash 0.5s ease-out forwards; }
            @keyframes damageFlash { 0% { opacity: 0.7; } 100% { opacity: 0; } }
            .heal-effect-active { background: radial-gradient(circle, rgba(76, 175, 80, 0) 60%, rgba(76, 175, 80, 0.3) 100%); animation: healFlash 2s ease-out forwards; }
            @keyframes healFlash { 0% { opacity: 0; } 30% { opacity: 0.7; } 100% { opacity: 0; } }
            .hitmarker.show { opacity: 1; animation: hitmarkerPulse 0.3s ease-out forwards; }
            @keyframes hitmarkerPulse { 0% { opacity: 1; transform: translate(-50%, -50%) scale(0.8); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1); } }
        `;
        document.head.appendChild(inlineStyles);
    }
    
    /**
     * Get all created elements for use by other systems
     */
    getElements() {
        return this.elements;
    }
    
    /**
     * Check if bootstrap is initialized
     */
    isReady() {
        return this.isInitialized;
    }
}
