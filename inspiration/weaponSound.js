///<reference path="c:\Users\joben\.vscode\extensions\playcanvas.playcanvas-0.2.2\node_modules\playcanvas\build\playcanvas.d.ts" />;
var WeaponSound = pc.createScript('weaponSound');

// ATTRIBUTES - SOUND ASSETS
WeaponSound.attributes.add('fireSounds', { type: 'asset', assetType: 'audio', array: true, title: 'Fire Sounds' });
WeaponSound.attributes.add('reloadSounds', { type: 'asset', assetType: 'audio', array: true, title: 'Reload Sounds' });
WeaponSound.attributes.add('emptyClickSound', { type: 'asset', assetType: 'audio', title: 'Empty Click Sound' });
WeaponSound.attributes.add('adsInSound', { type: 'asset', assetType: 'audio', title: 'ADS In Sound' });
WeaponSound.attributes.add('adsOutSound', { type: 'asset', assetType: 'audio', title: 'ADS Out Sound' });

// ATTRIBUTES - SOUND SETTINGS
WeaponSound.attributes.add('firePitchMin', { type: 'number', default: 0.95, title: 'Fire Pitch Min' });
WeaponSound.attributes.add('firePitchMax', { type: 'number', default: 1.05, title: 'Fire Pitch Max' });
WeaponSound.attributes.add('fireVolumeMin', { type: 'number', default: 0.9, title: 'Fire Volume Min' });
WeaponSound.attributes.add('fireVolumeMax', { type: 'number', default: 1.0, title: 'Fire Volume Max' });
WeaponSound.attributes.add('reloadVolume', { type: 'number', default: 1.0, title: 'Reload Volume' });
WeaponSound.attributes.add('adsVolume', { type: 'number', default: 0.7, title: 'ADS Volume' });

// ATTRIBUTES - 3D SOUND
WeaponSound.attributes.add('useDistanceModel', { type: 'boolean', default: true, title: 'Use Distance Model' });
WeaponSound.attributes.add('maxDistance', { type: 'number', default: 100, title: 'Max Distance' });
WeaponSound.attributes.add('refDistance', { type: 'number', default: 5, title: 'Reference Distance' });
WeaponSound.attributes.add('rollOffFactor', { type: 'number', default: 1, title: 'Roll-off Factor' });

// INITIALIZE
WeaponSound.prototype.initialize = function() {
    // Ensure we have a sound component
    if (!this.entity.sound) {
        this.entity.addComponent('sound');
    }
    
    // Set up distance properties for 3D sound
    if (this.useDistanceModel) {
        this.entity.sound.distanceModel = pc.DISTANCE_LINEAR;
        this.entity.sound.maxDistance = this.maxDistance;
        this.entity.sound.refDistance = this.refDistance;
        this.entity.sound.rollOffFactor = this.rollOffFactor;
    }
    
    // Initialize sound slots
    this.initSoundSlots();
    
    // Listen for weapon events
    this.app.on('weapon:fire', this.onWeaponFired, this);
    this.app.on('weapon:reload:start', this.onReloadStart, this);
    this.app.on('weapon:ads:start', this.onADSStart, this);
    this.app.on('weapon:ads:end', this.onADSEnd, this);
    
    // Clean up event listeners on destroy
    this.on('destroy', function() {
        this.app.off('weapon:fire', this.onWeaponFired, this);
        this.app.off('weapon:reload:start', this.onReloadStart, this);
        this.app.off('weapon:ads:start', this.onADSStart, this);
        this.app.off('weapon:ads:end', this.onADSEnd, this);
    }, this);
    
    // Make this accessible to other scripts
    this.app.weaponSound = this;
};

// Initialize all sound slots
WeaponSound.prototype.initSoundSlots = function() {
    // Initialize fire sound slot
    if (this.fireSounds && this.fireSounds.length > 0) {
        this.entity.sound.addSlot('fire', {
            asset: this.fireSounds[0],
            volume: 1.0,
            pitch: 1.0,
            loop: false,
            autoPlay: false
        });
    }
    
    // Initialize reload sound slot
    if (this.reloadSounds && this.reloadSounds.length > 0) {
        this.entity.sound.addSlot('reload', {
            asset: this.reloadSounds[0],
            volume: this.reloadVolume,
            pitch: 1.0,
            loop: false,
            autoPlay: false
        });
    }
    
    // Initialize empty click sound slot
    if (this.emptyClickSound) {
        this.entity.sound.addSlot('empty', {
            asset: this.emptyClickSound,
            volume: 1.0,
            pitch: 1.0,
            loop: false,
            autoPlay: false
        });
    }
    
    // Initialize ADS sounds
    if (this.adsInSound) {
        this.entity.sound.addSlot('adsIn', {
            asset: this.adsInSound,
            volume: this.adsVolume,
            pitch: 1.0,
            loop: false,
            autoPlay: false
        });
    }
    
    if (this.adsOutSound) {
        this.entity.sound.addSlot('adsOut', {
            asset: this.adsOutSound,
            volume: this.adsVolume,
            pitch: 1.0,
            loop: false,
            autoPlay: false
        });
    }
};

// Event handlers
WeaponSound.prototype.onWeaponFired = function() {
    this.playFireSound();
};

WeaponSound.prototype.onReloadStart = function() {
    this.playReloadSound();
};

WeaponSound.prototype.onADSStart = function() {
    this.playADSInSound();
};

WeaponSound.prototype.onADSEnd = function() {
    this.playADSOutSound();
};

// Sound playback methods
WeaponSound.prototype.playFireSound = function() {
    if (!this.fireSounds || this.fireSounds.length === 0) return;
    
    // Select a random fire sound for variety
    var randomIndex = Math.floor(Math.random() * this.fireSounds.length);
    var fireAsset = this.fireSounds[randomIndex];
    
    // Update the fire slot with the selected asset
    if (this.entity.sound.slots['fire']) {
        this.entity.sound.slots['fire'].asset = fireAsset;
        
        // Randomize pitch and volume for variation
        this.entity.sound.slots['fire'].pitch = this.randomRange(this.firePitchMin, this.firePitchMax);
        this.entity.sound.slots['fire'].volume = this.randomRange(this.fireVolumeMin, this.fireVolumeMax);
        
        this.entity.sound.play('fire');
    }
};

WeaponSound.prototype.playReloadSound = function() {
    if (!this.reloadSounds || this.reloadSounds.length === 0) return;
    
    // Select a random reload sound
    var randomIndex = Math.floor(Math.random() * this.reloadSounds.length);
    var reloadAsset = this.reloadSounds[randomIndex];
    
    if (this.entity.sound.slots['reload']) {
        this.entity.sound.slots['reload'].asset = reloadAsset;
        
        // Slight pitch variation for realism
        this.entity.sound.slots['reload'].pitch = this.randomRange(0.98, 1.02);
        
        this.entity.sound.play('reload');
    }
};

WeaponSound.prototype.playEmptyClick = function() {
    if (!this.emptyClickSound) return;
    
    if (this.entity.sound.slots['empty']) {
        this.entity.sound.play('empty');
    }
};

WeaponSound.prototype.playADSInSound = function() {
    if (!this.adsInSound) return;
    
    if (this.entity.sound.slots['adsIn']) {
        this.entity.sound.play('adsIn');
    }
};

WeaponSound.prototype.playADSOutSound = function() {
    if (!this.adsOutSound) return;
    
    if (this.entity.sound.slots['adsOut']) {
        this.entity.sound.play('adsOut');
    }
};

// Utilities
WeaponSound.prototype.randomRange = function(min, max) {
    return Math.random() * (max - min) + min;
};