/**
 * Model Loader Utility
 * 
 * Provides robust utilities for safely loading 3D models,
 * handling animations, and managing common model operations
 * with proper error handling.
 */

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getModelPath } from './path-helper.js';

/**
 * Utility class for safer model loading and animation handling
 */
class ModelLoader {
  /**
   * Safely access animations on a model
   * @param {Object} model - The 3D model
   * @param {String} animationName - Name of the animation to find
   * @returns {Object|null} - The animation or null if not found
   */
  static getAnimation(model, animationName) {
    if (!model) {
      console.warn(`ModelLoader: Cannot get animation "${animationName}" - model is undefined`);
      return null;
    }
    
    if (!model.animations) {
      console.warn(`ModelLoader: Model has no animations array`, model);
      return null;
    }
    
    const animation = model.animations.find(anim => anim.name === animationName);
    if (!animation) {
      console.warn(`ModelLoader: Animation "${animationName}" not found in model`, model);
    }
    return animation;
  }
  
  /**
   * Check if a model is fully loaded and ready for animation
   * @param {Object} model - The 3D model to check
   * @returns {Boolean} - Whether the model is ready
   */
  static isModelReady(model) {
    return model && model.scene && model.uuid && model.animations;
  }
  
  /**
   * Safely set up an animation on a model with error handling
   * @param {Object} mixer - The animation mixer
   * @param {Object} model - The 3D model
   * @param {String} animName - The animation name
   * @returns {Object|null} - The animation action or null if it couldn't be created
   */
  static setupAnimation(mixer, model, animName) {
    try {
      if (!mixer || !model) {
        console.warn('ModelLoader: Cannot setup animation - mixer or model is undefined');
        return null;
      }
      
      const animation = this.getAnimation(model, animName);
      if (!animation) return null;
      
      return mixer.clipAction(animation);
    } catch (error) {
      console.error(`ModelLoader: Error setting up animation "${animName}"`, error);
      return null;
    }
  }

  /**
   * Asynchronously load a model with proper error handling
   * @param {String} filename - The model filename to load
   * @returns {Promise<Object>} - A promise that resolves to the loaded model
   */
  static async loadModel(filename) {
    const loader = new GLTFLoader();
    const modelPath = getModelPath(filename);

    try {
      return await new Promise((resolve, reject) => {
        loader.load(
          modelPath,
          model => resolve(model),
          progress => {
            // Optional progress callback
            const percentComplete = Math.round((progress.loaded / progress.total) * 100);
            if (percentComplete % 25 === 0) { // Log at 0%, 25%, 50%, 75%, 100%
              console.log(`Loading model ${filename}: ${percentComplete}%`);
            }
          },
          error => {
            console.error(`ModelLoader: Error loading ${filename} from ${modelPath}`, error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error(`ModelLoader: Failed to load model ${filename}`, error);
      throw error;
    }
  }

  /**
   * Find a specific mesh within a model by name
   * @param {Object} model - The loaded GLTF model
   * @param {String} meshName - The name of the mesh to find 
   * @returns {Object|null} - The found mesh or null if not found
   */
  static findMesh(model, meshName) {
    if (!model || !model.scene) {
      console.warn(`ModelLoader: Cannot find mesh "${meshName}" - model or scene is undefined`);
      return null;
    }

    let foundMesh = null;
    model.scene.traverse((child) => {
      if (child.isMesh && child.name === meshName) {
        foundMesh = child;
      }
    });

    if (!foundMesh) {
      console.warn(`ModelLoader: Mesh "${meshName}" not found in model`, model);
    }
    return foundMesh;
  }

  /**
   * Clone a model with its animations
   * @param {Object} originalModel - The original GLTF model to clone
   * @returns {Object} - A new clone of the model with animations
   */
  static cloneModel(originalModel) {
    if (!this.isModelReady(originalModel)) {
      console.warn('ModelLoader: Cannot clone - model not ready');
      return null;
    }

    // Create a new model object
    const clone = {
      scene: originalModel.scene.clone(true),
      animations: originalModel.animations,
      cameras: originalModel.cameras ? [...originalModel.cameras] : [],
      asset: originalModel.asset,
      parser: originalModel.parser,
      userData: { ...originalModel.userData }
    };

    return clone;
  }
}

export { ModelLoader };
