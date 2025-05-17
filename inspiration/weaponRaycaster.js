///<reference path="c:\Users\joben\.vscode\extensions\playcanvas.playcanvas-0.2.2\node_modules\playcanvas\build\playcanvas.d.ts" />;
var WeaponRaycaster = pc.createScript('weaponRaycaster');

// ATTRIBUTES
WeaponRaycaster.attributes.add('bulletHoleTemplate', { type: 'entity', title: 'Bullet Hole Template' });
WeaponRaycaster.attributes.add('maxBulletHoles', { type: 'number', default: 30, title: 'Max Bullet Holes' });
WeaponRaycaster.attributes.add('bulletHoleLifetime', { type: 'number', default: 10, title: 'Bullet Hole Lifetime (seconds)' });
WeaponRaycaster.attributes.add('raycastFrom', { type: 'entity', title: 'Raycast From Entity' });
WeaponRaycaster.attributes.add('rayLength', { type: 'number', default: 100, title: 'Ray Length' });
WeaponRaycaster.attributes.add('bulletSpread', { type: 'number', default: 0.02, title: 'Bullet Spread' });
WeaponRaycaster.attributes.add('adsSpreadMultiplier', { type: 'number', default: 0.3, title: 'ADS Spread Multiplier' });
WeaponRaycaster.attributes.add('damage', { type: 'number', default: 10, title: 'Damage per Hit' });

// INITIALIZE
WeaponRaycaster.prototype.initialize = function() {
    this.bulletHoles = [];
    this.bulletHoleIndex = 0;

    this.createBulletHolePool();

    this.app.on('weapon:fire', this.onWeaponFired, this);

    this.weaponInput = this.entity.script.weaponInput;

    this.on('destroy', function() {
        this.app.off('weapon:fire', this.onWeaponFired, this);
    }, this);
    
    console.log('WeaponRaycaster initialized');
};

// Create bullet hole pool
WeaponRaycaster.prototype.createBulletHolePool = function() {
    if (!this.bulletHoleTemplate) {
        console.warn("No bullet hole template assigned");
        return;
    }

    this.bulletHoleParent = new pc.Entity("BulletHoleContainer");
    this.app.root.addChild(this.bulletHoleParent);

    for (var i = 0; i < this.maxBulletHoles; i++) {
        var bulletHole = this.bulletHoleTemplate.clone();
        bulletHole.enabled = false;
        this.bulletHoleParent.addChild(bulletHole);
        this.bulletHoles.push({
            entity: bulletHole,
            lifetime: 0,
            maxLifetime: 0
        });
    }
};

// Weapon fired event
WeaponRaycaster.prototype.onWeaponFired = function() {
    console.log('=== WEAPON FIRED ===');
    this.performRaycast();
};

// Perform raycast
WeaponRaycaster.prototype.performRaycast = function() {
    if (!this.raycastFrom) {
        this.raycastFrom = this.app.root.findByName('Camera');
        if (!this.raycastFrom) {
            console.warn("No raycast source found");
            return;
        }
    }

    var rayOrigin = this.raycastFrom.getPosition();
    var rayDirection = this.raycastFrom.forward.clone();

    var spread = this.bulletSpread;
    if (this.weaponInput && this.weaponInput.isADS) {
        spread *= this.adsSpreadMultiplier;
    }

    rayDirection.x += (Math.random() - 0.5) * spread;
    rayDirection.y += (Math.random() - 0.5) * spread;
    rayDirection.z += (Math.random() - 0.5) * spread;
    rayDirection.normalize();

    var endPoint = rayOrigin.clone().add(rayDirection.scale(this.rayLength));
    
    console.log('Performing raycast...');
    console.log('From:', rayOrigin);
    console.log('Direction:', rayDirection);
    
    var result = this.app.systems.rigidbody.raycastFirst(rayOrigin, endPoint);

    if (result) {
        console.log('Raycast HIT!');
        console.log('Hit entity:', result.entity.name);
        console.log('Hit position:', result.point);
        
        this.createBulletHole(result.point, result.normal);
        this.checkForDamage(result);

        this.app.fire('weapon:hit', {
            entity: result.entity,
            point: result.point,
            normal: result.normal,
            distance: result.point.distance(rayOrigin)
        });
    } else {
        console.log('Raycast MISS - no hit');
    }
};

// Check for damage - oppdatert versjon
WeaponRaycaster.prototype.checkForDamage = function(result) {
    var hitEntity = result.entity;
    var hitPoint = result.point;
    
    console.log('Checking for damage on:', hitEntity.name);
    
    // FØRSTE SJEKK: Direkte treff på entitet med robotHealth
    if (hitEntity.script && hitEntity.script.robotHealth) {
        console.log('DIRECT HIT - DEALING DAMAGE!');
        hitEntity.script.robotHealth.takeDamage(this.damage);
        
        this.app.fire('weapon:robot:hit', {
            entity: hitEntity,
            damage: this.damage,
            position: hitPoint
        });
        return;
    }
    
    // ANDRE SJEKK: Sjekk om vi traff Level, men i virkeligheten skulle truffet Rico
    // Raycast igjen, men spesifikt mot roboter
    var rayOrigin = this.raycastFrom.getPosition();
    var rayDir = new pc.Vec3();
    rayDir.sub2(hitPoint, rayOrigin).normalize();
    
    // VIKTIG: Finn alle fiendeeniteter i scenen
    var enemies = this.app.root.findByTag("enemy");
    
    // Logg fiender vi fant
    console.log("Found " + enemies.length + " enemies to check for hits");
    
    // For hver fiende, sjekk om raycasten passerer gjennom deres kollider
    for (var i = 0; i < enemies.length; i++) {
        var enemy = enemies[i];
        
        // Finn kollisjonsentiteten (vanligvis RobotCollider)
        var collider = enemy;
        if (enemy.findByName("RobotCollider")) {
            collider = enemy.findByName("RobotCollider");
        }
        
        console.log("Checking enemy: " + enemy.name + ", collider: " + collider.name);
        
        // Beregn avstand fra rayOrigin til hitPoint
        var hitDistance = hitPoint.distance(rayOrigin);
        
        // Skill ut fiender som er lenger unna enn treffpunktet
        var enemyPos = collider.getPosition();
        var enemyDistance = enemyPos.distance(rayOrigin);
        
        if (enemyDistance > hitDistance) {
            console.log("Enemy " + enemy.name + " is behind hit point - skipping");
            continue;
        }
        
        // Sjekk avstanden fra strålen til fiendens senter
        // Hvis den er innenfor en rimelig radius, regner vi det som et treff
        var closestPoint = this.closestPointOnRay(rayOrigin, rayDir, enemyPos);
        var distToRay = closestPoint.distance(enemyPos);
        
        // Bruk en rimelig kollisjonsstørrelse (juster etter behov)
        var hitRadius = 1.0;
        if (collider.collision && collider.collision.radius) {
            hitRadius = collider.collision.radius;
        }
        
        console.log("Enemy distance to ray: " + distToRay + ", hit radius: " + hitRadius);
        
        if (distToRay <= hitRadius) {
            console.log("RAY PASSES THROUGH ENEMY: " + enemy.name);
            
            // Sjekk om fienden har robotHealth-script
            var healthScript = null;
            if (collider.script && collider.script.robotHealth) {
                healthScript = collider.script.robotHealth;
            } else if (enemy.script && enemy.script.robotHealth) {
                healthScript = enemy.script.robotHealth;
            }
            
            if (healthScript) {
                console.log("ENEMY HIT - DEALING DAMAGE!");
                healthScript.takeDamage(this.damage);
                
                this.app.fire('weapon:robot:hit', {
                    entity: enemy,
                    damage: this.damage,
                    position: closestPoint
                });
                
                // Legg til en effekt på det faktiske treffpunktet på fienden
                this.createBulletHole(closestPoint, new pc.Vec3(0, 1, 0));
                
                return;
            }
        }
    }
    
    console.log('No robotHealth found on hit entity or nearby enemies');
};

// Hjelpefunksjon for å finne nærmeste punkt på en linje til et punkt i rommet
WeaponRaycaster.prototype.closestPointOnRay = function(rayOrigin, rayDir, point) {
    var v = new pc.Vec3();
    v.sub2(point, rayOrigin);
    
    var t = rayDir.dot(v);
    
    var closest = new pc.Vec3();
    closest.copy(rayOrigin).add(rayDir.clone().scale(t));
    
    return closest;
};

// Create or reuse bullet hole
WeaponRaycaster.prototype.createBulletHole = function(position, normal) {
    var bulletHoleData = this.bulletHoles[this.bulletHoleIndex];
    this.bulletHoleIndex = (this.bulletHoleIndex + 1) % this.maxBulletHoles;

    var bulletHole = bulletHoleData.entity;
    bulletHole.enabled = true;
    bulletHole.setPosition(position);

    if (normal) {
        var lookAtPos = position.clone().add(normal);
        bulletHole.lookAt(lookAtPos);

        var randomAngle = Math.random() * 360;
        bulletHole.rotateLocal(0, 0, randomAngle);

        bulletHole.translate(normal.clone().scale(0.01));
    }

    // Random scale
    var baseScale = 0.03 + Math.random() * 0.02;
    bulletHole.setLocalScale(baseScale, baseScale, baseScale);

    bulletHoleData.lifetime = this.bulletHoleLifetime;
    bulletHoleData.maxLifetime = this.bulletHoleLifetime;

    // Reset opacity
    if (bulletHole.model && bulletHole.model.meshInstances.length > 0) {
        var material = bulletHole.model.meshInstances[0].material;
        if (material) {
            material.opacity = 1.0;
            material.update();
        }
    }
};

// Update
WeaponRaycaster.prototype.update = function(dt) {
    for (var i = 0; i < this.bulletHoles.length; i++) {
        var bulletHoleData = this.bulletHoles[i];
        var bulletHole = bulletHoleData.entity;

        if (bulletHole.enabled) {
            bulletHoleData.lifetime -= dt;

            if (bulletHoleData.lifetime < 1.0 && bulletHole.model && bulletHole.model.meshInstances.length > 0) {
                var material = bulletHole.model.meshInstances[0].material;
                if (material) {
                    var fadeAmount = Math.max(0, bulletHoleData.lifetime / bulletHoleData.maxLifetime);
                    material.opacity = fadeAmount;
                    material.update();
                }
            }

            if (bulletHoleData.lifetime <= 0) {
                bulletHole.enabled = false;
            }
        }
    }
};