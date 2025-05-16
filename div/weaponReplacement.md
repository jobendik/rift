# Weapon Replacement Guide for RIFT

This guide explains how to replace weapons in the RIFT game with custom models that include animations such as reloading.

## Overview of the Weapon System

The RIFT game has a sophisticated weapon system with the following components:

1. **Weapon Classes**
   - Base class: `Weapon` (`src/weapons/Weapon.js`)
   - Derived classes:
     - `Blaster` (`src/weapons/Blaster.js`)
     - `Shotgun` (`src/weapons/Shotgun.js`)
     - `AssaultRifle` (`src/weapons/AssaultRifle.js`)

2. **Weapon Management**
   - `WeaponSystem` (`src/core/WeaponSystem.js`) - Handles weapon switching, rendering, and AI behavior

3. **Asset Management**
   - `AssetManager` (`src/core/AssetManager.js`) - Loads weapon models, animations, and sounds

## Core Files Involved in Weapon Rendering

### 1. Models (GLB files)
Located in `app/models/`:
- High-resolution models (used for player view):
  - `blaster_high.glb`
  - `shotgun_high.glb`
  - `assaultRifle_high.glb`
- Low-resolution models (used for enemies):
  - `blaster_low.glb`
  - `shotgun_low.glb`
  - `assaultRifle_low.glb`

### 2. Animation Files
Located in `app/animations/`:
- `blaster.json` - Contains animations for the blaster
- `shotgun.json` - Contains animations for the shotgun
- `assaultRifle.json` - Contains animations for the assault rifle

Each weapon's animation file contains these animation clips:
- `{weapon}_shot` - Firing animation
- `{weapon}_reload` - Reloading animation
- `{weapon}_hide` - Weapon hiding animation
- `{weapon}_equip` - Weapon equipping animation

### 3. Audio Files
Located in `app/audios/`:
- `blaster_shot.ogg` - Sound effect for firing the blaster
- `shotgun_shot.ogg` - Sound effect for firing the shotgun
- `assault_rifle_shot.ogg` - Sound effect for firing the assault rifle
- `reload.ogg` - General reloading sound
- `shotgun_shot_reload.ogg` - Special reload sound for shotgun

## Step-by-Step Replacement Guide

### Step 1: Prepare Your 3D Models

1. Create high and low-resolution versions of your weapon model:
   - High-resolution model for first-person view (player perspective)
   - Low-resolution model for enemies

2. Export both models as `.glb` files with these considerations:
   - Ensure proper scaling (see existing weapons for reference)
   - Position the model at the origin (0,0,0)
   - For weapon attachment point, make sure the model is oriented correctly for attachment to the character's hand

### Step 2: Create Animation Clips

1. For each weapon, create these animation clips:
   - **Shot animation** - For when the weapon fires
   - **Reload animation** - For when the weapon is reloaded
   - **Hide animation** - For when the weapon is switched out
   - **Equip animation** - For when the weapon is switched to

2. Export animations to a format compatible with Three.js (typically JSON format)

### Step 3: Prepare Audio Files

1. Create audio files for:
   - Weapon firing sound
   - Weapon reloading sound

2. Convert audio files to `.ogg` format for good compatibility and compression

### Step 4: Add Files to Project Structure

1. Place your model files in:
   ```
   app/models/your_weapon_high.glb
   app/models/your_weapon_low.glb
   ```

2. Place your animation files in:
   ```
   app/animations/your_weapon.json
   ```

3. Place your audio files in:
   ```
   app/audios/your_weapon_shot.ogg
   app/audios/your_weapon_reload.ogg
   ```

### Step 5: Update AssetManager.js

1. Modify `src/core/AssetManager.js` to load your new weapon assets:

   ```javascript
   // In _loadModels() method, add:
   loadWeaponModel('your_weapon_high.glb', 'your_weapon_high');
   loadWeaponModel('your_weapon_low.glb', 'your_weapon_low');
   
   // In _loadAnimations() method, add:
   animationLoader.load('animations/your_weapon.json', (clips) => {
     console.info('AssetManager: Your weapon animations loaded:', clips.length);
     for (const clip of clips) {
       this.animations.set(clip.name, clip);
     }
   });
   
   // In _loadAudios() method, add:
   loadAudio('your_weapon_shot.ogg', yourWeaponShot, 'your_weapon_shot');
   // Also add references to the audio objects and map them
   ```

### Step 6: Create Your Weapon Class

1. Create a new weapon class that extends the base `Weapon` class:
   ```javascript
   // src/weapons/YourWeapon.js
   import { Ray, Vector3 } from 'yuka';
   import { AnimationMixer, LoopOnce } from 'three';
   import { Weapon } from './Weapon.js';
   import { WEAPON_STATUS_READY, WEAPON_STATUS_SHOT, WEAPON_STATUS_RELOAD, WEAPON_STATUS_EMPTY,
           WEAPON_STATUS_OUT_OF_AMMO, WEAPON_TYPES_YOUR_WEAPON } from '../core/Constants.js';
   import { CONFIG } from '../core/Config.js';

   class YourWeapon extends Weapon {
     constructor(owner) {
       super(owner);
       this.type = WEAPON_TYPES_YOUR_WEAPON;
       
       // Configure weapon properties
       this.roundsLeft = CONFIG.YOUR_WEAPON.ROUNDS_LEFT;
       this.roundsPerClip = CONFIG.YOUR_WEAPON.ROUNDS_PER_CLIP;
       this.ammo = CONFIG.YOUR_WEAPON.AMMO;
       this.maxAmmo = CONFIG.YOUR_WEAPON.MAX_AMMO;
       
       this.shotTime = CONFIG.YOUR_WEAPON.SHOT_TIME;
       this.reloadTime = CONFIG.YOUR_WEAPON.RELOAD_TIME;
       this.equipTime = CONFIG.YOUR_WEAPON.EQUIP_TIME;
       this.hideTime = CONFIG.YOUR_WEAPON.HIDE_TIME;
       this.muzzleFireTime = CONFIG.YOUR_WEAPON.MUZZLE_TIME;
     }
     
     // Implement weapon-specific methods (reload, shoot, update, etc.)
     reload() {
       // Similar to existing weapons
     }
     
     shoot(targetPosition) {
       // Similar to existing weapons
     }
     
     update(delta) {
       // Similar to existing weapons
     }
     
     initAnimations() {
       // Similar to existing weapons, but for your weapon's animations
     }
   }
   
   export { YourWeapon };
   ```

### Step 7: Update Constants.js

1. Add your weapon type constant in `src/core/Constants.js`:
   ```javascript
   export const WEAPON_TYPES_YOUR_WEAPON = 'YOUR_WEAPON';
   ```

### Step 8: Update Config.js

1. Add your weapon configuration in `src/core/Config.js`:
   ```javascript
   // In the CONFIG object
   YOUR_WEAPON: {
     ROUNDS_LEFT: 30,
     ROUNDS_PER_CLIP: 30,
     AMMO: 90,
     MAX_AMMO: 180,
     SHOT_TIME: 0.1,
     RELOAD_TIME: 2.0,
     EQUIP_TIME: 0.5,
     HIDE_TIME: 0.5,
     MUZZLE_TIME: 0.05
   }
   ```

### Step 9: Update WeaponSystem.js

1. Add your weapon to the weapon system in `src/core/WeaponSystem.js`:

   ```javascript
   // Import your weapon
   import { YourWeapon } from '../weapons/YourWeapon.js';
   
   // In constructor, add mapping
   this.weaponsMap.set(WEAPON_TYPES_YOUR_WEAPON, null);
   
   // In constructor, add render component
   this.renderComponents = {
     // ... existing weapons
     yourWeapon: {
       mesh: null,
       audios: new Map(),
       muzzle: null
     }
   };
   
   // Add initialization method for your weapon
   _initYourWeaponRenderComponent() {
     // Based on existing weapons' initialization methods
   }
   
   // Update _initRenderComponents to include your weapon
   _initRenderComponents() {
     this._initBlasterRenderComponent();
     this._initShotgunRenderComponent();
     this._initAssaultRifleRenderComponent();
     this._initYourWeaponRenderComponent();
     return this;
   }
   
   // Update addWeapon method to handle your weapon type
   addWeapon(type) {
     // ... existing code
     case WEAPON_TYPES_YOUR_WEAPON:
       weapon = new YourWeapon(owner);
       weapon.fuzzyModule = this.fuzzyModules.yourWeapon;
       weapon.muzzle = this.renderComponents.yourWeapon.muzzle;
       weapon.audios = this.renderComponents.yourWeapon.audios;
       break;
     // ... rest of method
   }
   
   // Update changeWeapon method to handle your weapon type
   changeWeapon(type) {
     // ... existing code
     case WEAPON_TYPES_YOUR_WEAPON:
       // Set visibility for your weapon
       // ... similar to other weapon types
       break;
     // ... rest of method
   }
   ```

## Testing Your New Weapon

1. Add your weapon to a level by updating the entity spawning logic, or by giving it to the player initially.

2. For giving the weapon to the player initially, modify the Player class:
   ```javascript
   // In Player.js
   // Under addInitialWeapons() method
   addInitialWeapons() {
     this.weaponSystem.addWeapon(WEAPON_TYPES_BLASTER);
     this.weaponSystem.addWeapon(WEAPON_TYPES_YOUR_WEAPON); // Add your weapon
   }
   ```

3. Test for correct:
   - Model rendering
   - Animation playback
   - Sound effects
   - Firing mechanics
   - Reload mechanics
   - Weapon switching

## Troubleshooting

- **Model not appearing**: Check model paths and verify if the assets were loaded successfully via console logs
- **Animations not playing**: Verify animation names and ensure they match in your code
- **Sound not playing**: Check audio file paths and audio initialization
- **Weapon behaving incorrectly**: Check weapon parameters in Config.js

## Advanced: Weapon Balancing

The weapon's effectiveness in the AI system is determined by fuzzy logic rules in `WeaponSystem.js`. To integrate your weapon properly:

1. Add a fuzzy module for your weapon
2. Configure the desirability curves
3. Set rules for when your weapon should be preferred based on:
   - Distance to target
   - Ammo status
   - Target characteristics

This will make the AI properly choose your weapon in appropriate combat situations.
