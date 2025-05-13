import { AABB, Vector3, Ray } from 'yuka';
import { Matrix4 } from 'three';

const rayBindSpace = new Ray();

/**
 * Helper function to find bones with different possible naming conventions
 * 
 * @param {Object3D} model - The model to search in
 * @param {String} baseName - The base bone name to look for
 * @return {Object3D|null} The found bone or null
 */
function findBone(model, baseName) {
    // Try different naming patterns to find the bone
    const variations = [
        baseName,                   // Original name (mixamorigHead)
        'Armature_' + baseName,     // With Armature_ prefix
        baseName.replace('mixamorig', ''), // Without mixamorig (Head)
        'mixamorig' + baseName.charAt(0).toUpperCase() + baseName.slice(1), // CamelCase variation
        'mixamorig_' + baseName.replace('mixamorig', ''), // With underscore instead
        'Armature.' + baseName,     // With dot notation
        baseName.split('mixamorig')[1]  // Just the bone name part after mixamorig
    ];
    
    for (const name of variations) {
        if (!name) continue; // Skip empty names
        const bone = model.getObjectByName(name);
        if (bone) return bone;
    }
    
    // If no exact match, try to find a bone that contains the base name
    if (baseName.includes('mixamorig')) {
        const simpleName = baseName.split('mixamorig')[1];
        if (simpleName) {
            // Try to find any bone that contains the simplified name
            let foundBone = null;
            model.traverse(object => {
                if (object.isBone && object.name.includes(simpleName) && !foundBone) {
                    foundBone = object;
                }
            });
            if (foundBone) return foundBone;
        }
    }
    
    console.warn(`Could not find bone: ${baseName}`);
    return null;
}

/**
* Class for representing the bounds of an enemy. Its primary purpose is to avoid
* expensive operations on the actual geometry of an enemy. Hence, intersection test
* are perfomed with a simple hierarchy of AABBs.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class CharacterBounds {

    /**
    * Constructs a new level entity with the given values.
    *
    * @param {Enemy} owner - The owner of this instance.
    */
    constructor(owner) {
        this.owner = owner;

        // the outer and topmost bounding volume. used in the first
        // phase of an intersection test
        this._outerHitbox = new AABB();
        this._outerHitboxDefinition = new AABB();

        // the inner bounding volumes are assigned to certain bones
        this._innerHitboxes = [];

        // cache that holds the current bone's inverse matrices
        this._cache = new Map();
        
        // Debug mode - set to true to log bone names
        this._debugMode = false;
    }

    /**
    * Inits the bounding volumes of this instance.
    *
    * @return {CharacterBounds} A reference to this instance.
    */
    init() {
        try {
            // Set the outer hitbox bounds that encompasses the entire character
            this._outerHitboxDefinition.set(new Vector3(-0.5, 0, -0.5), new Vector3(0.5, 1.8, 0.5));

            const owner = this.owner;
            const renderComponent = owner._renderComponent;
            
            if (!renderComponent) {
                console.error('Character has no render component');
                return this;
            }
            
            const hitboxes = this._innerHitboxes;

            // ensure world matrices are up to date
            renderComponent.updateMatrixWorld(true);

            // Debug: print all available bones
            if (this._debugMode) {
                console.log("Available bones in model:");
                renderComponent.traverse(object => {
                    if (object.isBone) {
                        console.log(object.name);
                    }
                });
            }

            // Create all the hitboxes for different body parts
            this._createHeadHitbox(renderComponent, hitboxes);
            this._createTorsoHitbox(renderComponent, hitboxes);
            this._createArmsHitboxes(renderComponent, hitboxes);
            this._createLegsHitboxes(renderComponent, hitboxes);

            return this;
        } catch (error) {
            console.error('Error initializing character bounds:', error);
            return this;
        }
    }

    /**
    * Creates hitbox for the head
    *
    * @param {Object3D} renderComponent - The character model
    * @param {Array} hitboxes - Array to store hitbox definitions
    * @private
    */
    _createHeadHitbox(renderComponent, hitboxes) {
        const headBone = findBone(renderComponent, 'mixamorigHead');
        if (headBone) {
            const head = new AABB(new Vector3(-0.1, 1.6, -0.1), new Vector3(0.1, 1.8, 0.1));
            const bindMatrix = new Matrix4().copy(headBone.matrixWorld);
            const bindMatrixInverse = new Matrix4().copy(bindMatrix).invert();
            hitboxes.push({
                aabb: head, 
                bone: headBone, 
                bindMatrix: bindMatrix, 
                bindMatrixInverse: bindMatrixInverse
            });
        }
    }

    /**
    * Creates hitbox for the torso
    *
    * @param {Object3D} renderComponent - The character model
    * @param {Array} hitboxes - Array to store hitbox definitions
    * @private
    */
    _createTorsoHitbox(renderComponent, hitboxes) {
        // Try spine or chest bone
        const spineBone = findBone(renderComponent, 'mixamorigSpine1') || 
                          findBone(renderComponent, 'mixamorigSpine') ||
                          findBone(renderComponent, 'mixamorigChest');
                          
        if (spineBone) {
            const spine = new AABB(new Vector3(-0.2, 1, -0.2), new Vector3(0.2, 1.6, 0.2));
            const bindMatrix = new Matrix4().copy(spineBone.matrixWorld);
            const bindMatrixInverse = new Matrix4().copy(bindMatrix).invert();
            hitboxes.push({
                aabb: spine, 
                bone: spineBone, 
                bindMatrix: bindMatrix, 
                bindMatrixInverse: bindMatrixInverse
            });
        }
    }

    /**
    * Creates hitboxes for arms
    *
    * @param {Object3D} renderComponent - The character model
    * @param {Array} hitboxes - Array to store hitbox definitions
    * @private
    */
    _createArmsHitboxes(renderComponent, hitboxes) {
        // Right arm
        const rightArmBone = findBone(renderComponent, 'mixamorigRightArm');
        if (rightArmBone) {
            const rightArm = new AABB(new Vector3(-0.4, 1.42, -0.15), new Vector3(-0.2, 1.58, 0.1));
            const bindMatrix = new Matrix4().copy(rightArmBone.matrixWorld);
            const bindMatrixInverse = new Matrix4().copy(bindMatrix).invert();
            hitboxes.push({
                aabb: rightArm, 
                bone: rightArmBone, 
                bindMatrix: bindMatrix, 
                bindMatrixInverse: bindMatrixInverse
            });
        }

        // Right forearm
        const rightForeArmBone = findBone(renderComponent, 'mixamorigRightForeArm');
        if (rightForeArmBone) {
            const rightForeArm = new AABB(new Vector3(-0.8, 1.42, -0.15), new Vector3(-0.4, 1.55, 0.05));
            const bindMatrix = new Matrix4().copy(rightForeArmBone.matrixWorld);
            const bindMatrixInverse = new Matrix4().copy(bindMatrix).invert();
            hitboxes.push({
                aabb: rightForeArm, 
                bone: rightForeArmBone, 
                bindMatrix: bindMatrix, 
                bindMatrixInverse: bindMatrixInverse
            });
        }

        // Left arm
        const leftArmBone = findBone(renderComponent, 'mixamorigLeftArm');
        if (leftArmBone) {
            const leftArm = new AABB(new Vector3(0.2, 1.42, -0.15), new Vector3(0.4, 1.58, 0.1));
            const bindMatrix = new Matrix4().copy(leftArmBone.matrixWorld);
            const bindMatrixInverse = new Matrix4().copy(bindMatrix).invert();
            hitboxes.push({
                aabb: leftArm, 
                bone: leftArmBone, 
                bindMatrix: bindMatrix, 
                bindMatrixInverse: bindMatrixInverse
            });
        }

        // Left forearm
        const leftForeArmBone = findBone(renderComponent, 'mixamorigLeftForeArm');
        if (leftForeArmBone) {
            const leftForeArm = new AABB(new Vector3(0.4, 1.42, -0.15), new Vector3(0.8, 1.55, 0.05));
            const bindMatrix = new Matrix4().copy(leftForeArmBone.matrixWorld);
            const bindMatrixInverse = new Matrix4().copy(bindMatrix).invert();
            hitboxes.push({
                aabb: leftForeArm, 
                bone: leftForeArmBone, 
                bindMatrix: bindMatrix, 
                bindMatrixInverse: bindMatrixInverse
            });
        }
    }

    /**
    * Creates hitboxes for legs
    *
    * @param {Object3D} renderComponent - The character model
    * @param {Array} hitboxes - Array to store hitbox definitions
    * @private
    */
    _createLegsHitboxes(renderComponent, hitboxes) {
        // Right upper leg
        const rightUpLegBone = findBone(renderComponent, 'mixamorigRightUpLeg');
        if (rightUpLegBone) {
            const rightUpLeg = new AABB(new Vector3(-0.2, 0.6, -0.15), new Vector3(0, 1, 0.15));
            const bindMatrix = new Matrix4().copy(rightUpLegBone.matrixWorld);
            const bindMatrixInverse = new Matrix4().copy(bindMatrix).invert();
            hitboxes.push({
                aabb: rightUpLeg, 
                bone: rightUpLegBone, 
                bindMatrix: bindMatrix, 
                bindMatrixInverse: bindMatrixInverse
            });
        }

        // Right leg
        const rightLegBone = findBone(renderComponent, 'mixamorigRightLeg');
        if (rightLegBone) {
            const rightLeg = new AABB(new Vector3(-0.2, 0, -0.15), new Vector3(0, 0.6, 0.15));
            const bindMatrix = new Matrix4().copy(rightLegBone.matrixWorld);
            const bindMatrixInverse = new Matrix4().copy(bindMatrix).invert();
            hitboxes.push({
                aabb: rightLeg, 
                bone: rightLegBone, 
                bindMatrix: bindMatrix, 
                bindMatrixInverse: bindMatrixInverse
            });
        }

        // Left upper leg
        const leftUpLegBone = findBone(renderComponent, 'mixamorigLeftUpLeg');
        if (leftUpLegBone) {
            const leftUpLeg = new AABB(new Vector3(0, 0.6, -0.15), new Vector3(0.2, 1, 0.15));
            const bindMatrix = new Matrix4().copy(leftUpLegBone.matrixWorld);
            const bindMatrixInverse = new Matrix4().copy(bindMatrix).invert();
            hitboxes.push({
                aabb: leftUpLeg, 
                bone: leftUpLegBone, 
                bindMatrix: bindMatrix, 
                bindMatrixInverse: bindMatrixInverse
            });
        }

        // Left leg
        const leftLegBone = findBone(renderComponent, 'mixamorigLeftLeg');
        if (leftLegBone) {
            const leftLeg = new AABB(new Vector3(0, 0, -0.15), new Vector3(0.2, 0.6, 0.15));
            const bindMatrix = new Matrix4().copy(leftLegBone.matrixWorld);
            const bindMatrixInverse = new Matrix4().copy(bindMatrix).invert();
            hitboxes.push({
                aabb: leftLeg, 
                bone: leftLegBone, 
                bindMatrix: bindMatrix, 
                bindMatrixInverse: bindMatrixInverse
            });
        }
    }

    /**
    * Updates the outer bounding volume of this instance. Deeper bounding volumes
    * are only update if necessary.
    *
    * @return {CharacterBounds} A reference to this instance.
    */
    update() {
        this._outerHitbox.copy(this._outerHitboxDefinition).applyMatrix4(this.owner.worldMatrix);
        return this;
    }

    /**
    * Computes the center point of this instance and stores it into the given vector.
    *
    * @param {Vector3} result - The result vector.
    * @return {Vector3} The result vector.
    */
    getCenter(center) {
        return this._outerHitbox.getCenter(center);
    }

    /**
    * Returns the intesection point if the given ray hits one of the bounding volumes.
    * If no intersection is detected, null is returned.
    *
    * @param {Ray} ray - The ray.
    * @param {Vector3} intersectionPoint - The intersection point.
    * @return {Vector3} The intersection point.
    */
    intersectRay(ray, intersectionPoint) {
        try {
            // first test outer hitbox
            if (ray.intersectAABB(this._outerHitbox, intersectionPoint)) {
                // now test with inner hitboxes
                const hitboxes = this._innerHitboxes;

                for (let i = 0, l = hitboxes.length; i < l; i++) {
                    const hitbox = hitboxes[i];
                    const bone = hitbox.bone;

                    if (!bone) continue; // Skip if bone is missing

                    try {
                        const inverseBoneMatrix = this._getInverseBoneMatrix(bone);

                        // transform the ray from world space to local space of the bone
                        rayBindSpace.copy(ray).applyMatrix4(inverseBoneMatrix);

                        // transform the ray from local space of the bone to its bind space (T-Pose)
                        rayBindSpace.applyMatrix4(hitbox.bindMatrix);

                        // now perform the intersection test
                        if (rayBindSpace.intersectAABB(hitbox.aabb, intersectionPoint)) {
                            // since the intersection point is in bind space, it's necessary to convert back to world space
                            intersectionPoint.applyMatrix4(hitbox.bindMatrixInverse).applyMatrix4(bone.matrixWorld);
                            return intersectionPoint;
                        }
                    } catch (error) {
                        console.warn(`Error testing hitbox intersection: ${error.message}`);
                        continue; // Skip this hitbox and try the next one
                    }
                }
            }

            return null;
        } catch (error) {
            console.error(`Error in intersectRay: ${error.message}`);
            return null;
        }
    }

    /**
    * Returns the current inverse matrix for the given bone. A cache system ensures, the inverse matrix
    * is computed only once per simulation step.
    *
    * @param {Bone} bone - The bone.
    * @return {Matrix4} The inverse matrix.
    */
    _getInverseBoneMatrix(bone) {
        try {
            if (!bone) {
                console.warn('Trying to get inverse matrix of undefined bone');
                return new Matrix4(); // Return identity matrix as fallback
            }

            const world = this.owner.world;
            const tick = world.tick;

            // since computing inverse matrices is expensive, do it only once per simulation step
            let entry = this._cache.get(bone);

            if (entry === undefined) {
                entry = { 
                    tick: tick, 
                    inverseBoneMatrix: new Matrix4().copy(bone.matrixWorld).invert() 
                };
                this._cache.set(bone, entry);
            } else {
                if (entry.tick < tick) {
                    entry.tick = tick;
                    entry.inverseBoneMatrix.copy(bone.matrixWorld).invert();
                } else {
                    if (world.debug) {
                        console.log('RIFT.CharacterBounds: Inverse matrix found in cache for bone.');
                    }
                }
            }

            return entry.inverseBoneMatrix;
        } catch (error) {
            console.error(`Error getting inverse bone matrix: ${error.message}`);
            return new Matrix4(); // Return identity matrix as fallback
        }
    }

    /**
     * Enable or disable debug mode
     * 
     * @param {Boolean} enabled - Whether to enable debug mode
     * @return {CharacterBounds} A reference to this instance
     */
    setDebugMode(enabled) {
        this._debugMode = enabled;
        return this;
    }

    /**
     * Create a simplified hitbox setup with just basic collision volumes
     * Useful for simplified characters or as a fallback
     * 
     * @return {CharacterBounds} A reference to this instance
     */
    createSimplifiedHitboxes() {
        // Clear existing hitboxes
        this._innerHitboxes = [];
        
        const owner = this.owner;
        const renderComponent = owner._renderComponent;
        
        if (!renderComponent) {
            console.error('Character has no render component');
            return this;
        }
        
        const hitboxes = this._innerHitboxes;
        
        // ensure world matrices are up to date
        renderComponent.updateMatrixWorld(true);
        
        // Find the root bone (usually hips)
        const rootBone = findBone(renderComponent, 'mixamorigHips') || 
                         findBone(renderComponent, 'Hips') ||
                         renderComponent;
        
        if (!rootBone) {
            console.warn('Could not find root bone for simplified hitboxes');
            return this;
        }
        
        // Create a single torso hitbox centered on the root
        const torso = new AABB(new Vector3(-0.25, 0.8, -0.25), new Vector3(0.25, 1.7, 0.25));
        const bindMatrix = new Matrix4().copy(rootBone.matrixWorld);
        const bindMatrixInverse = new Matrix4().copy(bindMatrix).invert();
        
        hitboxes.push({
            aabb: torso,
            bone: rootBone,
            bindMatrix: bindMatrix,
            bindMatrixInverse: bindMatrixInverse
        });
        
        return this;
    }
}

export { CharacterBounds };