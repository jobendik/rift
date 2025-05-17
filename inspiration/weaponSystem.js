///<reference path="c:\Users\joben\.vscode\extensions\playcanvas.playcanvas-0.2.2\node_modules\playcanvas\build\playcanvas.d.ts" />;
// weaponSystem.js
var WeaponSystem = pc.createScript('weaponSystem');

// ---------------------------------------------------------------------------
// ATTRIBUTES
// ---------------------------------------------------------------------------
WeaponSystem.attributes.add('maxAmmo', {
    type: 'number',
    default: 30,
    title: 'Max Ammo'
});
WeaponSystem.attributes.add('muzzleFlashTemplate', {
    type: 'entity',
    title: 'Muzzle Flash Template'
});
WeaponSystem.attributes.add('weaponModel', {
    type: 'entity',
    title: 'Weapon Model'
});
WeaponSystem.attributes.add('muzzlePoint', {
    type: 'entity',
    title: 'Muzzle Point'
});
WeaponSystem.attributes.add('infiniteAmmo', {
    type: 'boolean',
    default: false,
    title: 'Infinite Ammo'
});
WeaponSystem.attributes.add('reloadTime', {
    type: 'number',
    default: 2.0,
    title: 'Reload Duration (secs)'
});
WeaponSystem.attributes.add('cameraRecoilRot', {
    type: 'number',
    default: 2,
    title: 'Camera Recoil (deg)'
});
WeaponSystem.attributes.add('cameraRecoilReturn', {
    type: 'number',
    default: 10,
    title: 'Camera Recoil Return Speed'
});

// ---------------------------------------------------------------------------
// INITIALIZE
// ---------------------------------------------------------------------------
WeaponSystem.prototype.initialize = function () {
    console.log('Initializing WeaponSystem...');
    
    // Ammo state
    this.currentAmmo = this.maxAmmo;

    // Cache helper scripts
    this.weaponInput     = this.entity.script.weaponInput;
    this.weaponAnimation = this.entity.script.weaponAnimation;
    this.weaponSound     = this.entity.script.weaponSound;
    this.weaponRaycaster = this.entity.script.weaponRaycaster;

    // Recoil runtime state
    this.camRecoil = 0;

    // Notify UI/HUD
    this.app.fire('weapon:init', this);

    console.log('WeaponSystem initialized. Current ammo:', this.currentAmmo);
    
    // Expose globally for debugging
    this.app.weaponSystem = this;
};

// ---------------------------------------------------------------------------
// FIRE & RELOAD
// ---------------------------------------------------------------------------
WeaponSystem.prototype.fire = function () {
    if (!this.infiniteAmmo && this.currentAmmo <= 0) {
        if (this.weaponSound && this.weaponSound.playEmptyClick) {
            this.weaponSound.playEmptyClick();
        }
        return false;
    }

    if (!this.infiniteAmmo) {
        this.currentAmmo--;
        this.app.fire('weapon:ammo:update', this.currentAmmo, this.maxAmmo);
    }

    // Camera recoil
    this.camRecoil += this.cameraRecoilRot;

    // Spawn flash + event
    this._spawnMuzzleFlash();
    this.app.fire('weapon:fire');
    return true;
};

WeaponSystem.prototype.reload = function () {
    if (this.currentAmmo === this.maxAmmo) return;

    this.app.fire('weapon:reload:start');
    var self = this;
    setTimeout(function() {
        self.finishReload();
    }, this.reloadTime * 1000);
};

WeaponSystem.prototype.finishReload = function () {
    this.currentAmmo = this.maxAmmo;
    this.app.fire('weapon:ammo:update', this.currentAmmo, this.maxAmmo);

    if (this.weaponInput && this.weaponInput.finishReload) {
        this.weaponInput.finishReload();
    } else {
        this.app.fire('weapon:reload:end');
    }
};

// ---------------------------------------------------------------------------
// MUZZLE FLASH
// ---------------------------------------------------------------------------
WeaponSystem.prototype._spawnMuzzleFlash = function () {
    // Sjekk at du har dratt inn en Entity i Inspector
    if (!this.muzzleFlashTemplate) {
        //console.warn('No muzzle flash template assigned');
        return;
    }

    // Klon template-entiteten
    var flash = this.muzzleFlashTemplate.clone();
    var parent = this.muzzlePoint || this.weaponModel || this.entity;
    parent.addChild(flash);

    // Posisjon, rotasjon og slumpet skalering
    var zOffset = this.muzzlePoint ? 0 : 0.5;
    flash.setLocalPosition(0, 0, zOffset);
    flash.setLocalEulerAngles(0, 0, Math.random() * 360);
    var s = 0.7 + Math.random() * 0.6;
    flash.setLocalScale(s, s, s);
    flash.enabled = true;

    // Fjern etter 50 ms
    setTimeout(function() {
        flash.destroy();
    }, 50);
};

// ---------------------------------------------------------------------------
// UPDATE LOOP
// ---------------------------------------------------------------------------
WeaponSystem.prototype.update = function (dt) {
    if (this.camRecoil > 0.0001) {
        var cam = this.app.root.findByName('Camera') || this.app.root.findByName('View');
        if (cam) {
            var eul = cam.getLocalEulerAngles();
            cam.setLocalEulerAngles(eul.x - this.camRecoil, eul.y, eul.z);
        }
        this.camRecoil = pc.math.lerp(this.camRecoil, 0, dt * this.cameraRecoilReturn);
    } else {
        this.camRecoil = 0;
    }
};

// ---------------------------------------------------------------------------
// CLEAN-UP
// ---------------------------------------------------------------------------
WeaponSystem.prototype.destroy = function () {
    this.app.weaponSystem = null;
    console.log('WeaponSystem destroyed');
};
