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
}

export default ModelLoader;
