/**
 * PauseScreen Component
 * 
 * Displays a 3D soldier model when the game is paused,
 * with animation and lighting effects.
 */

import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { getBasePath, getAssetPath } from '../../../utils/asset-helpers/path-helper.js';

let scene, camera, renderer, soldier;
let mixer, clock;
let composer; // For post-processing effects
let isInitialized = false;
let animationId = null;

// Initialize the 3D scene for the pause screen
function init() {
    if (isInitialized) return;
    isInitialized = true;
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = null; // Transparent background - IMPORTANT FOR TRANSPARENCY
    
    // Create camera with consistent aspect ratio
    const fixedAspectRatio = 350/450;
    camera = new THREE.PerspectiveCamera(38, fixedAspectRatio, 0.1, 1000); // Reduced field of view for better fit
    camera.position.set(0, 0.2, 6); // Positioned farther back to see the full model
    camera.lookAt(0, 0, 0); // Center the view
    
    // Improved lighting setup for better model visibility
    // Main ambient light - brighter to ensure model is well lit
    const ambientLight = new THREE.AmbientLight(0x404040, 3); 
    scene.add(ambientLight);

    // Key light (main light) - from front-top
    const keyLight = new THREE.DirectionalLight(0xffffff, 5); 
    keyLight.position.set(0, 5, 5);
    scene.add(keyLight);

    // Rim light for edge highlighting - from behind
    const rimLight = new THREE.DirectionalLight(0x4466ff, 4); 
    rimLight.position.set(0, 2, -5);
    scene.add(rimLight);
    
    // Fill light from the side
    const fillLight = new THREE.DirectionalLight(0xffaa88, 2); 
    fillLight.position.set(-5, 0, 2);
    scene.add(fillLight);
    
    // Create renderer with proper settings for transparency
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true, // CRITICAL FOR TRANSPARENCY
        premultipliedAlpha: false, // Better transparency handling
        preserveDrawingBuffer: true, // Important for visibility
        precision: "highp" // Higher precision rendering for better quality
    });
    
    // Set fixed size regardless of screen size to prevent stretching
    const fixedWidth = 350;
    const fixedHeight = 450;
    renderer.setSize(fixedWidth, fixedHeight); // Fixed dimensions to prevent stretching
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0); // Set clear color with completely transparent alpha
    
    // Setup post-processing with special care for transparency
    try {
        // Create a custom render target with alpha channel support
        const renderTarget = new THREE.WebGLRenderTarget(350, 450, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat, // Important for alpha channel
            encoding: THREE.sRGBEncoding,
            samples: 4 // Anti-aliasing
        });
        
        const renderPass = new RenderPass(scene, camera);
        renderPass.clear = true;
        renderPass.clearColor = new THREE.Color(0, 0, 0);
        renderPass.clearAlpha = 0; // Completely transparent
        
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(350, 450),
            0.4,  // reduced strength for better transparency
            0.35, // reduced radius for cleaner bloom
            0.85  // threshold
        );
        
        // Create composer with our custom render target
        composer = new EffectComposer(renderer, renderTarget);
        composer.addPass(renderPass);
        composer.addPass(bloomPass);
    } catch (error) {
        console.error("Post-processing setup failed:", error);
        // Continue without post-processing
    }
    
    // Get the pause model container and append renderer
    const pauseModelContainer = document.getElementById("pauseModelContainer");
    if (pauseModelContainer) {
        pauseModelContainer.innerHTML = "";
        pauseModelContainer.appendChild(renderer.domElement);
        
        // Style the renderer canvas for proper visibility and centered positioning
        renderer.domElement.style.position = "absolute";
        renderer.domElement.style.bottom = "0px"; // Position at bottom of container
        renderer.domElement.style.left = "50%"; // Center horizontally
        renderer.domElement.style.transform = "translateX(-50%)"; // Complete the centering
        
        // Set fixed dimensions to prevent stretching in fullscreen
        renderer.domElement.style.width = "350px";
        renderer.domElement.style.height = "450px";
        renderer.domElement.style.maxWidth = "350px"; // Prevent stretching
        renderer.domElement.style.maxHeight = "450px"; // Prevent stretching
        renderer.domElement.style.objectFit = "contain"; // Maintain aspect ratio
        
        renderer.domElement.style.zIndex = "5";
        renderer.domElement.style.pointerEvents = "none"; 
        renderer.domElement.style.background = "transparent"; // Ensure transparent background
        renderer.domElement.style.backgroundColor = "transparent"; // Double ensure transparency
        renderer.domElement.classList.add("transparent-canvas"); // Add class for additional styling
    }
    
    // Initialize clock for animations
    clock = new THREE.Clock();

    // Load the soldier model
    loadSoldierModel();

    // Handle window resize
    window.addEventListener("resize", onWindowResize, false);
}

function loadSoldierModel() {
    const loader = new FBXLoader();
    const modelPath = getAssetPath('models', 'soldierFrontPage.fbx');
    console.log(`Loading soldier model for pause screen from ${modelPath}`);
    
    loader.load(modelPath,
        // Success callback
        (fbx) => {
            console.log("Soldier model loaded successfully for pause screen");
            soldier = fbx;
            
            // Calculate the bounding box to properly position the model
            let boundingBox = new THREE.Box3().setFromObject(soldier);
            let modelHeight = boundingBox.max.y - boundingBox.min.y;
            let modelWidth = boundingBox.max.x - boundingBox.min.x;
            
            // Scale the model to fit the view (smaller scale for full visibility)
            const scale = 0.011; // Further reduced scale to ensure entire model is clearly visible
            soldier.scale.set(scale, scale, scale);
            
            // Position the model so it is fully visible
            let yOffset = -boundingBox.min.y * scale;
            soldier.position.set(0, yOffset - 0.4, 0); // Adjust vertical position for better visibility
            
            // Make sure model is facing camera with slight angle for better view
            soldier.rotation.y = Math.PI * 0.9; // Slight angle for better presentation
            
            // Set up animation if the model has animations
            if (fbx.animations && fbx.animations.length) {
                console.log(`Found ${fbx.animations.length} animations for pause screen model`);
                mixer = new THREE.AnimationMixer(fbx);
                const action = mixer.clipAction(fbx.animations[0]);
                action.play();
            } else {
                console.log("No animations found in the model for pause screen");
            }

            // Add model to the scene
            scene.add(soldier);
            
            // Start animation loop
            animate();
        },
        // Progress callback
        (xhr) => {
            console.log(`Pause screen model loading: ${Math.floor(xhr.loaded / xhr.total * 100)}% loaded`);
        },
        // Error callback
        (error) => {
            console.error("Error loading pause screen soldier model:", error);
            
            // Try alternate path
            console.log("Attempting to load from alternate path: /rift/models/soldierFrontPage.fbx");
            loader.load("/rift/models/soldierFrontPage.fbx",
                (fbx) => {
                    console.log("Soldier model loaded successfully from alternate path for pause screen");
                    soldier = fbx;
                    
                    // Calculate the bounding box to properly position the model
                    let boundingBox = new THREE.Box3().setFromObject(soldier);
                    let modelHeight = boundingBox.max.y - boundingBox.min.y;
                    let modelWidth = boundingBox.max.x - boundingBox.min.x;
                    
                    // Scale the model to fit the view (smaller scale for full visibility)
                    const scale = 0.011; // Further reduced scale to ensure entire model is clearly visible
                    soldier.scale.set(scale, scale, scale);
                    
                    // Position the model so it is fully visible
                    let yOffset = -boundingBox.min.y * scale;
                    soldier.position.set(0, yOffset - 0.4, 0); // Adjust vertical position for better visibility
                    
                    // Make sure model is facing camera with slight angle for better view
                    soldier.rotation.y = Math.PI * 0.9; // Slight angle for better presentation
                    
                    if (fbx.animations && fbx.animations.length) {
                        mixer = new THREE.AnimationMixer(fbx);
                        mixer.clipAction(fbx.animations[0]).play();
                    }
                    
                    scene.add(soldier);
                    animate();
                },
                null,
                () => {
                    console.error("All attempts to load the pause screen model failed");
                    animate(); // Still animate even without model to avoid blank screen
                }
            );
        }
    );
}

function animate() {
    if (!isInitialized) return;
    
    animationId = requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    
    // Smooth rotation for the soldier
    if (soldier) {
        // Smooth, constant rotation speed - slightly slower for better viewing
        soldier.rotation.y = (time * 0.15) % (Math.PI * 2) + Math.PI * 0.7; // One full rotation every ~42 seconds, with a better viewing angle
    }
    
    // Update animations
    if (mixer) {
        mixer.update(delta);
    }
    
    // Ensure transparency on every frame - CRITICAL FOR FIXING THE BLACK BACKGROUND
    renderer.setClearColor(0x000000, 0);
    scene.background = null;
    
    // Ensure viewport is still correct
    renderer.setViewport(0, 0, 350, 450);
    
    // Render with transparency
    if (composer) {
        // Clear to transparent before rendering
        renderer.clear();
        composer.render();
    } else {
        // Standard renderer with transparency
        renderer.clear();
        renderer.render(scene, camera);
    }
}

function onWindowResize() {
    if (!camera || !renderer) return;
    
    // Keep a fixed aspect ratio for the camera regardless of window size
    // This prevents the model from appearing stretched
    const fixedAspectRatio = 350/450;
    camera.aspect = fixedAspectRatio;
    camera.updateProjectionMatrix();
    
    // For the pause screen, we keep a fixed size for the model view
    // This helps prevent stretching when in fullscreen
    renderer.setSize(350, 450);
    
    // Update composer if available
    if (composer) {
        composer.setSize(350, 450);
    }
    
    // Ensure the container maintains proper dimensions in fullscreen mode
    const pauseModelContainer = document.getElementById("pauseModelContainer");
    if (pauseModelContainer) {
        pauseModelContainer.style.width = "350px";
        pauseModelContainer.style.height = "450px";
    }
}

function cleanup() {
    if (!isInitialized) return;
    
    // Cancel animation frame
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    window.removeEventListener("resize", onWindowResize);
    
    // Dispose of resources
    if (mixer) mixer.stopAllAction();
    if (renderer) renderer.dispose();
    if (scene) {
        scene.traverse((object) => {
            if (object.isMesh) {
                object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((material) => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });
    }
    
    isInitialized = false;
}

export { init, cleanup };
