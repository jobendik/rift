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
        markers: 850,
        screens: 850,
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
    
    // Damage numbers settings
    damageNumbers: {
        maxNumbers: 30, // maximum simultaneous numbers
        duration: 1.5, // seconds
        stackThreshold: 300, // ms - time window for stacking damage
        riseDistance: 30, // pixels
        stackLimit: 5, // max hits to show before showing total only
        normalColor: 'white',
        criticalColor: '#ff9800', // matches --rift-warning
        headshotColor: '#e63946', // matches --rift-primary
        killColor: '#4caf50', // matches --rift-success
        zIndex: 45
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
    
    // Footstep indicator settings
    footstepIndicator: {
        baseDuration: 0.8, // seconds
        minOpacity: 0.2, // for distant footsteps
        maxOpacity: 0.7, // for close footsteps
        indicatorWidth: 40, // degrees (visual angle)
        maxIndicators: 8, // maximum simultaneous indicators
        maxDistance: 20, // game units
        minDistance: 2, // game units (footsteps within this range have max intensity)
        friendlyColor: 'rgba(0, 150, 255, 0.25)',
        enemyColor: 'rgba(255, 140, 0, 0.25)',
        continuousStepInterval: 0.2, // seconds between footsteps in a sequence
        defaultSteps: 4, // default number of steps in a sequence
        pulseFrequency: 3, // pulses per second
        continousOpacityBoost: 0.08, // additional opacity for continuous footsteps
        zIndex: 35
    },
    
    // Player feedback
    feedback: {
        hitMarker3DSize: 24, // px
        hitMarker3DDuration: 0.5, // seconds
        damageNumberDuration: 1.5, // seconds
        damageNumberRiseSpeed: 30, // px/s
        damageNumberSpread: 20, // px
        footstepDuration: 1.5 // seconds (retained for backward compatibility)
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
    
    // Notifications System
    notifications: {
        // General notifications
        displayDuration: 4.0, // seconds
        fadeDuration: 0.5, // seconds
        cooldown: 0.5, // seconds
        spacingDelay: 0.5, // seconds
        maxNotifications: 5, // maximum visible notifications
        stackSimilar: true, // whether to combine similar notifications
        
        // Kill feed
        killFeedDuration: 5.0, // seconds
        maxKillMessages: 5, // maximum kill messages in feed
        killStreakTimeout: 10.0, // seconds window for kill streaks
        
        // Achievement notifications
        achievementDuration: 5.0, // seconds
        
        // Event banners
        events: {
            displayDuration: 3.0, // seconds
            fadeDuration: 1.0, // seconds
            outcomeDisplayDuration: 5.0, // seconds for victory/defeat banners
            delayBetweenBanners: 0.5 // seconds between queued banners
        }
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
        // Basic XP settings
        baseXpPerLevel: 1000,
        levelScalingFactor: 1.2,
        maxLevel: 100,
        
        // XP rewards for actions
        xpRewards: {
            kill: 100,
            headshot: 50,
            assist: 50,
            objective: 200,
            victory: 500,
            match: 100,
            trippleKill: 150,
            killingSpree: 250,
            dominating: 500,
            unstoppable: 750
        },
        
        // Skill points
        enableSkillPoints: true,
        skillPointsPerLevel: 1,
        skillPointsAllowSpending: true,
        
        // UI display settings
        displayLevelUp: true,
        displayXpGain: true,
        showXpInHUD: true,
        hudPosition: 'bottom', // 'top', 'bottom'
        hudLayout: 'horizontal', // 'horizontal', 'vertical'
        
        // Rank system
        ranks: [
            { minLevel: 1, name: 'Rookie', tier: 1, icon: 'rookie' },
            { minLevel: 5, name: 'Soldier', tier: 2, icon: 'soldier' },
            { minLevel: 10, name: 'Corporal', tier: 3, icon: 'corporal' },
            { minLevel: 15, name: 'Sergeant', tier: 4, icon: 'sergeant' },
            { minLevel: 20, name: 'Lieutenant', tier: 5, icon: 'lieutenant' },
            { minLevel: 25, name: 'Captain', tier: 6, icon: 'captain' },
            { minLevel: 30, name: 'Major', tier: 7, icon: 'major' },
            { minLevel: 40, name: 'Colonel', tier: 8, icon: 'colonel' },
            { minLevel: 50, name: 'General', tier: 9, icon: 'general' }
        ]
    },
    
    // Weapon Wheel
    weaponWheel: {
        size: 400, // px
        hubSize: 80, // px
        showAmmo: true,
        showStats: true,
        showLabels: true,
        transitionDuration: 0.2, // seconds
        backdropBlur: '5px',
        overlayOpacity: 0.7,
        segmentHighlightColor: 'rgba(230, 57, 70, 0.2)',
        pauseGameWhenActive: true
    },
    
    // World Map
    worldMap: {
        title: 'World Map',
        maxZoom: 3.0,
        minZoom: 0.5,
        zoomStep: 0.25,
        worldToMapScale: 0.1, // conversion from world coordinates to map pixels
        mapOriginOffset: { x: 1000, y: 1000 }, // center point of the map image
        enableFogOfWar: true,
        centerOnPlayer: true,
        highlightCurrentArea: true,
        pauseGameWhenActive: true,
        markerSizes: {
            player: 30,
            objective: {
                primary: 24,
                secondary: 20
            },
            waypoint: {
                active: 24,
                normal: 20
            }
        }
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
        // General settings
        enabled: true,
        transitionDuration: 2.0, // seconds to transition between weather states
        updateInterval: 100, // ms between particle updates
        pauseWhenGamePaused: true,
        affectsLighting: true,
        
        // Z-index layers
        zIndex: {
            base: 300,
            weather: 310,
            overlay: 315,
            lightning: 320
        },
        
        // Rain settings
        rain: {
            enabled: true,
            dropCount: {
                light: 100,
                moderate: 200,
                heavy: 400,
                storm: 600
            },
            dropHeight: { min: 10, max: 25 }, // px
            dropAngle: { min: 10, max: 20 }, // degrees
            dropDrift: { min: 10, max: 30 }, // horizontal drift in vw
            duration: { min: 0.5, max: 1.2 }, // seconds for fall animation
            opacity: { min: 0.5, max: 0.8 },
            splashEnabled: true,
            splashParticles: { min: 2, max: 5 },
            splashOpacity: 0.5,
            screenOverlayOpacity: 0.6,
            appliesScreenOverlay: true
        },
        
        // Snow settings
        snow: {
            enabled: true,
            flakeCount: {
                light: 50,
                moderate: 100,
                heavy: 200,
                storm: 300
            },
            flakeSize: { min: 2, max: 6 }, // px
            duration: { min: 5, max: 10 }, // seconds for fall animation
            horizontalDrift: { min: 20, max: 80 }, // vw
            wobbleAmount: { min: 5, max: 15 }, // px for side to side movement
            opacity: { min: 0.7, max: 1.0 },
            screenOverlayOpacity: 0.2,
            appliesScreenOverlay: true
        },
        
        // Fog settings
        fog: {
            enabled: true,
            density: { 
                light: 0.1,
                moderate: 0.2,
                heavy: 0.35,
                storm: 0.5
            },
            color: 'rgba(200, 200, 255, 0.15)',
            layerCount: 3,
            layerOpacity: { min: 0.2, max: 0.6 },
            driftSpeed: { min: 20, max: 80 }, // seconds for full cycle
            visibilityReduction: {
                light: 0.05,
                moderate: 0.15,
                heavy: 0.3,
                storm: 0.5
            },
            screenOverlayOpacity: 0.15,
            appliesScreenOverlay: true
        },
        
        // Lightning settings
        lightning: {
            enabled: true,
            flashDuration: { min: 0.05, max: 0.2 }, // seconds
            flashIntensity: { min: 0.3, max: 0.8 },
            interval: { min: 3, max: 15 }, // seconds between flashes
            flashCount: { min: 1, max: 4 }, // flashes per strike
            flashDecay: 0.7, // intensity multiplier for subsequent flashes
            thunderDelay: { min: 0.5, max: 4 }, // seconds after lightning
            screenShakeEnabled: true,
            screenShakeIntensity: 0.3
        },
        
    // Audio settings
    audio: {
        enabled: true,
        rainVolume: { 
            light: 0.2, 
            moderate: 0.4, 
            heavy: 0.7, 
            storm: 1.0 
        },
        windVolume: { 
            light: 0.1, 
            moderate: 0.3, 
            heavy: 0.6, 
            storm: 0.9 
        },
        thunderVolume: 0.8,
        fadeTime: 2.0 // seconds to fade audio in/out
    },
    
    // Danger zone settings
    dangerZone: {
        enabled: true,
        defaultSize: 200, // px diameter for circular zones
        maxDisplayDistance: 100, // maximum distance to display zones in world units
        proximityThreshold: 15, // world units - when player gets this close, show proximity warning
        criticalThreshold: 5, // world units - when player gets this close, show critical warning
        pulseSpeed: 2.0, // pulses per second
        flashSpeed: 4.0, // flashes per second for warnings
        showLabel: true, // whether to show text label
        showIcon: true, // whether to show icon
        fadeDistance: 5, // distance in world units over which zone fades in/out
        types: {
            radiation: {
                damageRate: 5, // health points per second
                damageDelay: 0.5, // seconds before damage starts
                color: 'rgba(83, 236, 51, 0.3)',
                icon: 'radiation'
            },
            fire: {
                damageRate: 10,
                damageDelay: 0.1,
                color: 'rgba(255, 100, 20, 0.25)',
                icon: 'fire'
            },
            electrical: {
                damageRate: 15,
                damageDelay: 0,
                color: 'rgba(75, 180, 255, 0.25)',
                icon: 'electrical'
            },
            poison: {
                damageRate: 3,
                damageDelay: 1.0,
                color: 'rgba(150, 75, 200, 0.25)',
                icon: 'poison'
            },
            explosive: {
                damageRate: 50,
                damageDelay: 2.0,
                color: 'rgba(255, 60, 0, 0.25)',
                icon: 'explosive'
            },
            generic: {
                damageRate: 5,
                damageDelay: 0.5,
                color: 'rgba(255, 0, 0, 0.2)',
                icon: 'generic'
            }
        },
        zIndex: {
            base: 320,
            icon: 321,
            label: 322,
            proximity: 980
        }
    }
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
    
    // Menu System
    menus: {
        // Screen Manager
        screens: {
            backdropBlur: '5px',
            overlayBackground: 'rgba(0, 0, 0, 0.7)',
            screenBackground: 'rgba(10, 10, 10, 0.85)',
            maxWidth: 1200, // px
            defaultTransition: 'fade', // 'fade', 'slide-left', 'slide-right', 'scale'
            transitionDuration: 0.3, // seconds
            standardEasing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        },
        
        // Mission Briefing
        missionBriefing: {
            title: 'Mission Briefing',
            pauseGameWhenActive: true,
            showMap: true,
            mapDefaultZoom: 1.0,
            enableObjectiveTracking: true,
            defaultDifficulty: 3, // 1-5 stars
            statusColors: {
                active: 'var(--rift-success)',
                pending: 'var(--rift-warning)',
                completed: 'var(--rift-completed, #6d77f6)',
                failed: 'var(--rift-danger)'
            },
            objectives: {
                showLocationButton: true,
                markOnMap: true,
                prioritizePrimary: true
            },
            rewards: {
                showXpReward: true,
                showItemRewards: true,
                animateRewards: true
            }
        },
        
        // Round Summary
        roundSummary: {
            title: 'Round Summary',
            pauseGameWhenActive: true,
            showMap: true,
            mapDefaultZoom: 0.75,
            enableHeatmap: true,
            defaultTab: 'performance', // 'performance', 'leaderboard', 'rewards'
            showPlayerHighlight: true,
            animateStats: true,
            animationDelay: 0.1, // seconds between stat animations
            outcomeColors: {
                victory: 'var(--rift-success)',
                defeat: 'var(--rift-danger)',
                draw: 'var(--rift-warning)'
            },
            sections: {
                performance: true,
                achievements: true,
                progression: true,
                rewards: true,
                leaderboard: true
            },
            continuationOptions: {
                nextRound: true,
                mainMenu: true,
                customize: false
            }
        },
        
        // Modals
        modal: {
            background: 'rgba(30, 30, 30, 0.95)',
            borderColor: '#e63946', // matches --rift-primary
            shadow: '0 5px 25px rgba(0, 0, 0, 0.5)'
        },
        
        // Focus Management
        focus: {
            outlineColor: '#e63946', // matches --rift-primary
            outlineWidth: 2, // px
            outlineOffset: 2 // px
        }
    },
    
    // Debug
    debug: {
        showFps: true
    }
};

// Export default
export default UIConfig;
