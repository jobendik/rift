/**
 * Central configuration file for the RIFT UI system.
 * Contains constants, theme settings, animation timings, and other UI parameters.
 * 
 * @author Cline
 */

export const UIConfig = {
    // CSS Variables (should match :root in CSS)
    colors: {
        primary: '#e63946',
        primaryGlow: 'rgba(230, 57, 70, 0.7)',
        secondary: '#33a8ff',
        secondaryGlow: 'rgba(51, 168, 255, 0.7)',
        success: '#4caf50',
        successGlow: 'rgba(76, 175, 80, 0.7)',
        warning: '#ff9800',
        warningGlow: 'rgba(255, 152, 0, 0.7)',
        danger: '#f44336',
        dangerGlow: 'rgba(244, 67, 54, 0.7)',
        textColor: '#ffffff',
        textShadow: '0 0 5px rgba(0, 0, 0, 0.7)',
        uiBackground: 'rgba(0, 0, 0, 0.6)',
        uiBackgroundLight: 'rgba(0, 0, 0, 0.4)',
        uiBorder: 'rgba(255, 255, 255, 0.2)'
    },
    
    // Font settings
    fonts: {
        hud: "'Rajdhani', 'Orbitron', sans-serif",
        display: "'Orbitron', 'Rajdhani', sans-serif",
        body: "'Exo 2', 'Rajdhani', sans-serif"
    },
    
    // Size and spacing
    sizing: {
        hudPadding: '12px',
        borderRadius: '5px',
        hudMargin: '20px' // Common margin for HUD elements from screen edges
    },
    
    // Animation durations
    animation: {
        fast: 0.2, // seconds
        normal: 0.3,
        slow: 0.5,
        verySlow: 1.0
    },
    
    // Z-Index layers
    zIndex: {
        base: 100,
        hud: 800,
        notifications: 900,
        modal: 950,
        overlay: 980,
        tooltip: 990,
        cursor: 1000
    },
    
    // Crosshair settings
    crosshair: {
        baseSpread: 2,
        moveSpreadMod: 4,
        fireSpreadMod: 8,
        hitTime: 0.2, // seconds
        size: 24, // px
        thickness: 2 // px
    },
    
    // Damage indicator settings
    damageIndicator: {
        baseDuration: 1.2, // seconds
        minOpacity: 0.3, // for low damage
        maxOpacity: 0.9, // for high damage
        indicatorWidth: 120, // degrees (visual angle)
        maxIndicators: 8, // maximum simultaneous indicators
        lowDamageThreshold: 10, // below this value is considered low damage
        mediumDamageThreshold: 25, // below this value is considered medium damage
        highDamageColor: 'rgba(255, 0, 0, 0.7)',
        mediumDamageColor: 'rgba(255, 60, 0, 0.5)',
        lowDamageColor: 'rgba(255, 165, 0, 0.4)',
        pulseFrequency: 8, // pulses per second for high damage
        pulseAmount: 0.15, // opacity variation amount
        zIndex: 40
    },
    
    // Hit indicator settings
    hitIndicator: {
        hitDuration: 0.5, // seconds
        criticalHitDuration: 0.6, // seconds
        headshotHitDuration: 0.7, // seconds
        directionDuration: 0.8, // seconds
        killDuration: 1.0, // seconds
        size: 24, // px
        criticalSize: 30, // px
        headshotSize: 36, // px
        killSize: 80, // px
        directionIndicatorWidth: 20, // px
        directionIndicatorHeight: 60, // px
        hitColor: 'rgba(255, 255, 255, 0.9)',
        criticalColor: 'rgba(255, 200, 0, 0.9)',
        headshotColor: 'rgba(255, 0, 0, 0.9)',
        killColor: 'rgba(255, 50, 50, 0.9)',
        zIndex: 50
    },
    
    // Screen effects
    screenEffects: {
        damageFlashDuration: 0.5, // seconds
        healFlashDuration: 2.0, // seconds
        screenShakeDecay: 4.0, // multiplier
        screenShakeMultiplier: 5.0,
        screenShakeDamageThreshold: 20,
        screenShakeMaxIntensity: 2.5,
        screenShakeDamageScalar: 40
    },
    
    // Player feedback
    feedback: {
        hitMarker3DSize: 24, // px
        hitMarker3DDuration: 0.5, // seconds
        damageNumberDuration: 1.5, // seconds
        damageNumberRiseSpeed: 30, // px/s
        damageNumberSpread: 20, // px
        footstepDuration: 1.5 // seconds
    },
    
    // Health display
    health: {
        lowHealthThreshold: 50, // percentage
        criticalHealthThreshold: 20, // percentage
        lowHealthPulseSpeedMin: 1.0,
        lowHealthPulseSpeedMax: 3.0,
        lowHealthOpacityBase: 0.3,
        lowHealthOpacityPulse: 0.4,
        healEffectDuration: 2.0 // seconds
    },
    
    // Stamina display
    stamina: {
        lowStaminaThreshold: 30, // percentage
        depletedThreshold: 5, // percentage
        regenerationRate: 10, // units per second
        cooldownDuration: 1.0, // seconds after depletion
        drainEffectDuration: 0.3, // seconds
        showNumericValue: true, // whether to show the number
        sprintDrainRate: 20 // units per second
    },
    
    // Ammo display
    ammo: {
        lowAmmoThresholdPercent: 0.2, // percentage of magazine
        ammoVisualizerMaxBullets: 30,
        ammoVisualizerShowEmpty: true
    },
    
    // Notifications
    notifications: {
        displayDuration: 4.0, // seconds
        fadeDuration: 0.5, // seconds
        cooldown: 0.5, // seconds
        spacingDelay: 0.5 // seconds
    },
    
    // Event banners
    events: {
        displayDuration: 3.0, // seconds
        fadeDuration: 1.0 // seconds
    },
    
    // Objective markers
    objectives: {
        screenPadding: 20, // px
        fadeDistance: 100, // world units
        pulseSpeed: 2.0 // pulse animations per second
    },
    
    // Kill streaks
    killStreak: {
        timeout: 10.0 // seconds
    },
    
    // Experience and progression
    xp: {
        baseXpPerLevel: 1000,
        levelScalingFactor: 1.2,
        trippleKill: 150,
        killingSpree: 250,
        dominating: 500,
        unstoppable: 750
    },
    
    // Minimap
    minimap: {
        size: 200, // px
        viewportScale: 0.15, // percentage of smaller screen dimension
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        border: '2px',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        playerColor: '#4a7bf7',
        enemyColor: '#f44336', // matches --rift-danger
        itemColor: '#4caf50', // matches --rift-success
        objectiveColor: '#ff9800', // matches --rift-warning
        playerIconSize: 12, // px
        enemyIconSize: 10, // px
        itemIconSize: 8, // px
        objectiveIconSize: 12, // px
        zoomSpeed: 0.3, // seconds
        expandedBorderRadius: 10, // px
        effectiveRangeScale: 1.0,
        useFovForEnemies: true,
        enemyFovDotThreshold: -0.2, // dot product threshold
        showGrid: false,
        showBorder: true,
        showPlayerFov: false,
        pulseAnimationDuration: 2.0 // seconds
    },
    
    // Compass
    compass: {
        height: 48, // px
        viewportWidth: 350, // px
        stripWidth: 2500, // px wide to accommodate full 360°
        showDegrees: true,
        showCardinalMarkers: true,
        cardinalColor: {
            n: '#e63946', // matches --rift-primary
            e: '#33a8ff', // matches --rift-secondary
            s: '#ffffff', // matches --rift-text-color
            w: '#33a8ff'  // matches --rift-secondary
        },
        waypointColor: '#ff9800', // matches --rift-warning
        enemyColor: '#f44336', // matches --rift-danger
        waypointSize: 8, // px
        enemySize: 6, // px
        pulseDuration: 0.5, // seconds
        rotationSmoothness: 0.2 // seconds (for transition timing)
    },
    
    // Powerups
    powerup: {
        expiringThreshold: 3.0, // seconds
        icons: {
            damage: '⚔️',
            speed: '🏃',
            armor: '🛡️',
            health: '❤️',
            ammo: '🔹',
            invisible: '👻'
        }
    },
    
    // Weather effects
    weather: {
        rainDropCount: 50,
        rainDropLength: { min: 10, max: 25 }, // px
        rainDropSpeed: { min: 3, max: 5 } // px/frame
    },
    
    // Blood effects
    blood: {
        enableBloodSplatter: true,
        splatterMinCount: 1,
        splatterMaxCount: 3,
        splatterMinSize: 30, // px
        splatterSizeVariance: 50, // px
        splatterMaxOpacity: 0.7,
        splatterScreenMarginPercent: 0.3,
        splatterLingerDuration: 2000, // ms
        splatterFadeoutDuration: 500 // ms
    },
    
    // Debug
    debug: {
        showFps: true
    }
};

// Export default
export default UIConfig;
