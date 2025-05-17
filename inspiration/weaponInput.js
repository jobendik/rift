///<reference path="c:\Users\joben\.vscode\extensions\playcanvas.playcanvas-0.2.2\node_modules\playcanvas\build\playcanvas.d.ts" />;
var WeaponInput = pc.createScript('weaponInput');

// ATTRIBUTES
WeaponInput.attributes.add('fireRate', { type: 'number', default: 0.1, title: 'Fire Rate', description: 'Time between shots in seconds' });
WeaponInput.attributes.add('enableAutoFire', { type: 'boolean', default: true, title: 'Enable Auto Fire' });
WeaponInput.attributes.add('enableADS', { type: 'boolean', default: true, title: 'Enable ADS' });
WeaponInput.attributes.add('adsTransitionSpeed', { type: 'number', default: 8, title: 'ADS Transition Speed' });
WeaponInput.attributes.add('normalFOV', { type: 'number', default: 60, title: 'Normal FOV' });
WeaponInput.attributes.add('adsFOV', { type: 'number', default: 45, title: 'ADS FOV' });

// INITIALIZE
WeaponInput.prototype.initialize = function() {
    // Initialize state
    this.isFiring = false;
    this.isReloading = false;
    this.isADS = false;
    this.timeSinceLastShot = 0;
    this.mouseLeftDown = false;
    this.mouseRightDown = false;
    
    // Cache original camera FOV
    this.cameraEntity = this.app.root.findByName('Camera') || this.entity.parent;
    if (this.cameraEntity && this.cameraEntity.camera) {
        this.originalFOV = this.cameraEntity.camera.fov;
    } else {
        this.originalFOV = this.normalFOV;
        console.warn("No camera found for ADS FOV change");
    }
    
    // Cache original weapon position for ADS
    this.originalPosition = this.entity.getLocalPosition().clone();
    
    // Set up pointerlock for better FPS controls
    this.app.mouse.disableContextMenu();
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
    this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
    this.app.keyboard.on(pc.EVENT_KEYDOWN, this.onKeyDown, this);
    
    // Register local event handlers
    this.on('destroy', function() {
        this.app.mouse.off(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
        this.app.mouse.off(pc.EVENT_MOUSEUP, this.onMouseUp, this);
        this.app.keyboard.off(pc.EVENT_KEYDOWN, this.onKeyDown, this);
    }, this);
    
    // Make this globally accessible
    this.app.weaponInput = this;
};

// Mouse event handlers
WeaponInput.prototype.onMouseDown = function(event) {
    if (!document.pointerLockElement) {
        this.app.mouse.enablePointerLock();
    }
    
    if (event.button === pc.MOUSEBUTTON_LEFT) {
        this.mouseLeftDown = true;
        if (!this.isReloading && this.enableAutoFire) {
            this.isFiring = true;
            this.tryToFire(); // Fire immediately
        }
    } else if (event.button === pc.MOUSEBUTTON_RIGHT) {
        this.mouseRightDown = true;
        if (this.enableADS) {
            this.startADS();
        }
    }
};

WeaponInput.prototype.onMouseUp = function(event) {
    if (event.button === pc.MOUSEBUTTON_LEFT) {
        this.mouseLeftDown = false;
        this.isFiring = false;
    } else if (event.button === pc.MOUSEBUTTON_RIGHT) {
        this.mouseRightDown = false;
        if (this.enableADS) {
            this.endADS();
        }
    }
};

// Keyboard event handlers
WeaponInput.prototype.onKeyDown = function(event) {
    if (event.key === pc.KEY_R && !this.isReloading) {
        this.reload();
    }
};

// Action methods
WeaponInput.prototype.tryToFire = function() {
    // Forward to weapon system
    if (this.entity.script.weaponSystem) {
        this.entity.script.weaponSystem.fire();
    }
};

WeaponInput.prototype.reload = function() {
    this.isReloading = true;
    
    // Forward to weapon system
    if (this.entity.script.weaponSystem) {
        this.entity.script.weaponSystem.reload();
    }
    
    // Event for other systems to respond to
    this.app.fire('weapon:reload:start');
};

WeaponInput.prototype.finishReload = function() {
    this.isReloading = false;
    this.app.fire('weapon:reload:end');
};

WeaponInput.prototype.startADS = function() {
    this.isADS = true;
    this.app.fire('weapon:ads:start');
};

WeaponInput.prototype.endADS = function() {
    this.isADS = false;
    this.app.fire('weapon:ads:end');
};

// Update loop
WeaponInput.prototype.update = function(dt) {
    // Update timers
    this.timeSinceLastShot += dt;
    
    // Handle auto-fire
    if (this.mouseLeftDown && this.enableAutoFire && !this.isReloading) {
        if (this.timeSinceLastShot >= this.fireRate) {
            this.timeSinceLastShot = 0;
            this.tryToFire();
        }
    }
    
    // Handle ADS camera transitions
    if (this.cameraEntity && this.cameraEntity.camera) {
        var targetFOV = this.isADS ? this.adsFOV : this.normalFOV;
        this.cameraEntity.camera.fov = pc.math.lerp(
            this.cameraEntity.camera.fov,
            targetFOV,
            dt * this.adsTransitionSpeed
        );
    }
    
    // Handle ADS weapon position transitions
    if (this.entity) {
        // Move weapon toward center when ADS
        var targetPosition = this.originalPosition.clone();
        if (this.isADS) {
            // Move weapon toward center of screen for ADS
            targetPosition.x = pc.math.lerp(targetPosition.x, 0, 0.8);
            targetPosition.y = pc.math.lerp(targetPosition.y, 0, 0.4);
            targetPosition.z = pc.math.lerp(targetPosition.z, this.originalPosition.z + 0.2, 0.6);
        }
        
        // Smooth transition
        var currentPosition = this.entity.getLocalPosition();
        currentPosition.lerp(currentPosition, targetPosition, dt * this.adsTransitionSpeed);
        this.entity.setLocalPosition(currentPosition);
    }
};

// Returnerer true hvis spilleren beveger seg (for spread-justering)
WeaponInput.prototype.isMoving = function () {
    var kb = this.app.keyboard;
    return (
        kb.isPressed(pc.KEY_W) ||
        kb.isPressed(pc.KEY_A) ||
        kb.isPressed(pc.KEY_S) ||
        kb.isPressed(pc.KEY_D) ||
        kb.isPressed(pc.KEY_UP) ||
        kb.isPressed(pc.KEY_LEFT) ||
        kb.isPressed(pc.KEY_DOWN) ||
        kb.isPressed(pc.KEY_RIGHT)
    );
};
