///<reference path="c:\Users\joben\.vscode\extensions\playcanvas.playcanvas-0.2.2\node_modules\playcanvas\build\playcanvas.d.ts" />;
// ### weaponAnimation.js – versjon med én reload-animasjon ###
// Komplett våpenanimasjonsscript med pust, rekyl, gåbevegelse og anim graph-integrasjon.

var WeaponAnimation = pc.createScript('weaponAnimation');

// ---------------------------------------------------------------------------
// ATTRIBUTTER
// ---------------------------------------------------------------------------
// Pust
WeaponAnimation.attributes.add('breathingEnabled',          { type: 'boolean', default: true,  title: 'Enable Breathing' });
WeaponAnimation.attributes.add('breathingAmount',           { type: 'number',  default: 0.008, title: 'Breathing Amount' });
WeaponAnimation.attributes.add('breathingSpeed',            { type: 'number',  default: 1.0,   title: 'Breathing Speed' });
WeaponAnimation.attributes.add('breathingRotationAmount',   { type: 'number',  default: 0.8,   title: 'Breathing Rotation' });

// Gå-svingning
WeaponAnimation.attributes.add('walkSwayEnabled',           { type: 'boolean', default: true,  title: 'Enable Walk Sway' });
WeaponAnimation.attributes.add('walkSwayAmount',            { type: 'number',  default: 0.02,  title: 'Walk Sway Amount' });
WeaponAnimation.attributes.add('walkSwayRotation',          { type: 'number',  default: 4,     title: 'Walk Sway Rotation' });
WeaponAnimation.attributes.add('walkBobAmount',             { type: 'number',  default: 0.02,  title: 'Walk Bob Amount' });
WeaponAnimation.attributes.add('walkBobFrequency',          { type: 'number',  default: 14,    title: 'Walk Bob Frequency' });
WeaponAnimation.attributes.add('walkSwaySmoothing',         { type: 'number',  default: 8,     title: 'Walk Sway Smoothing' });

// Rekyl
WeaponAnimation.attributes.add('recoilPos',                 { type: 'number',  default: 0.07,  title: 'Recoil Pos Kick' });
WeaponAnimation.attributes.add('recoilRot',                 { type: 'number',  default: 4,     title: 'Recoil Rot Kick' });
WeaponAnimation.attributes.add('recoilReturnSpeed',         { type: 'number',  default: 12,    title: 'Recoil Return Speed' });

// Anim trigger-navn
WeaponAnimation.attributes.add('triggerFire',               { type: 'string',  default: 'fire',   title: 'Anim Trigger: Fire' });
WeaponAnimation.attributes.add('triggerReload',             { type: 'string',  default: 'reload', title: 'Anim Trigger: Reload' });

// ---------------------------------------------------------------------------
// INITIALISERING
// ---------------------------------------------------------------------------
WeaponAnimation.prototype.initialize = function() {
    this.isFiring       = false;
    this.isReloading    = false;
    this.breathingTimer = 0;
    this.walkBobTimer   = 0;
    this.moveDirection  = new pc.Vec2(0, 0);
    this.isMoving       = false;

    this.originalPosition = this.entity.getLocalPosition().clone();
    this.originalRotation = this.entity.getLocalEulerAngles().clone();

    this.breathingPos = new pc.Vec3();
    this.breathingRot = new pc.Vec3();
    this.walkPos     = new pc.Vec3();
    this.walkRot     = new pc.Vec3();
    this.recoilTimer = 0;
    this.curRecoilPos = 0;
    this.curRecoilRot = 0;

    this.weaponInput = this.app.weaponInput;

    this.app.on('weapon:fire',         this.onFire,        this);
    this.app.on('weapon:reload:start', this.onReloadStart, this);

    this.on('destroy', function() {
        this.app.off('weapon:fire',         this.onFire,        this);
        this.app.off('weapon:reload:start', this.onReloadStart, this);
    }, this);
};

// ---------------------------------------------------------------------------
// HENDELSER
// ---------------------------------------------------------------------------
WeaponAnimation.prototype.onFire = function() {
    this.isFiring    = true;
    this.recoilTimer = 1;

    var anim = this.entity.anim;
    if (anim && anim.parameters && anim.parameters[this.triggerFire]) {
        anim.setTrigger(this.triggerFire);
    }

    var self = this;
    setTimeout(function() {
        self.isFiring = false;
    }, 60);
};

WeaponAnimation.prototype.onReloadStart = function() {
    this.isReloading = true;

    var anim = this.entity.anim;
    if (anim && anim.parameters && anim.parameters[this.triggerReload]) {
        anim.setTrigger(this.triggerReload);
    } else {
        console.warn('Anim trigger not found:', this.triggerReload);
    }

    // Automatisk gå tilbake til Idle når animasjonen er ferdig – trenger ikke end-trigger
    // Reset isReloading flag etter 1 sekund (eller bruk animslutt-hendelse hvis tilgjengelig)
    var self = this;
    setTimeout(function() {
        self.isReloading = false;
    }, 1000); // juster varighet om nødvendig
};

// ---------------------------------------------------------------------------
// OPPDATERING
// ---------------------------------------------------------------------------
WeaponAnimation.prototype.update = function(dt) {
    var kb = this.app.keyboard;
    var mx = (kb.isPressed(pc.KEY_A) || kb.isPressed(pc.KEY_LEFT))  ? -1 : (kb.isPressed(pc.KEY_D) || kb.isPressed(pc.KEY_RIGHT)) ? 1 : 0;
    var mz = (kb.isPressed(pc.KEY_W) || kb.isPressed(pc.KEY_UP))    ? 1  : (kb.isPressed(pc.KEY_S) || kb.isPressed(pc.KEY_DOWN))  ? -1 : 0;
    this.isMoving = (mx !== 0 || mz !== 0);
    this.moveDirection.set(mx, mz);

    // Pusting
    if (this.breathingEnabled) {
        this.breathingTimer += dt * this.breathingSpeed;
        var bX = Math.sin(this.breathingTimer * 0.7) * this.breathingAmount * 0.3;
        var bY = Math.sin(this.breathingTimer)      * this.breathingAmount;
        var rotX = Math.sin(this.breathingTimer)   * this.breathingRotationAmount;
        this.breathingPos.set(bX, bY, 0);
        this.breathingRot.set(rotX, 0, 0);
    }

    // Gå-svingning
    if (this.walkSwayEnabled && this.isMoving) {
        this.walkBobTimer += dt * this.walkBobFrequency;
        var swayX = -this.moveDirection.x * this.walkSwayAmount;
        var swayY =  Math.sin(this.walkBobTimer)  * this.walkBobAmount;
        var rotZ  = -this.moveDirection.x * this.walkSwayRotation;
        var damp = (this.isReloading || this.isFiring) ? 0.2 : 1;
        this.walkPos.lerp(this.walkPos, new pc.Vec3(swayX * damp, swayY * damp, 0), dt * this.walkSwaySmoothing);
        this.walkRot.lerp(this.walkRot, new pc.Vec3(0, 0, rotZ * damp), dt * this.walkSwaySmoothing);
    } else {
        this.walkPos.lerp(this.walkPos, pc.Vec3.ZERO, dt * this.walkSwaySmoothing);
        this.walkRot.lerp(this.walkRot, pc.Vec3.ZERO, dt * this.walkSwaySmoothing);
    }

    // Rekyl
    if (this.recoilTimer > 0) {
        this.recoilTimer = Math.max(0, this.recoilTimer - dt * this.recoilReturnSpeed);
    }
    this.curRecoilPos = pc.math.lerp(this.curRecoilPos, this.recoilTimer * this.recoilPos, dt * this.recoilReturnSpeed);
    this.curRecoilRot = pc.math.lerp(this.curRecoilRot, this.recoilTimer * this.recoilRot, dt * this.recoilReturnSpeed);

    // Transformasjon
    if (!this.isReloading) {
        var finalPos = this.originalPosition.clone().add(this.breathingPos).add(this.walkPos);
        finalPos.z -= this.curRecoilPos;
        this.entity.setLocalPosition(finalPos);

        var finalRot = this.originalRotation.clone().add(this.breathingRot).add(this.walkRot);
        finalRot.x  -= this.curRecoilRot;
        this.entity.setLocalEulerAngles(finalRot);
    }
};
