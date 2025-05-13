// Start screen with 3D soldier model
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { getBasePath, getAssetPath } from './utils/pathHelper.js';

let scene, camera, renderer, soldier;
let mixer, clock;
let composer; // For post-processing effects
let isInitialized = false;

// Initialize the 3D scene for the start screen
function init() {
    if (isInitialized) return;
    isInitialized = true;

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Black background
      // Add fog for atmosphere and depth
    scene.fog = new THREE.FogExp2(0x000000, 0.15);      // Create camera with specified settings
    camera = new THREE.PerspectiveCamera(25, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0.05, 2.15, 1.45); // Updated camera position per requirements
    camera.lookAt(0.00, 1.10, -0.85); // Updated camera look target per requirements// Add lighting with 3x intensity
    const ambientLight = new THREE.AmbientLight(0x101010, 3); // Darker ambient light for atmosphere (3x intensity)
    scene.add(ambientLight);

    // Add key light (main light)
    const keyLight = new THREE.DirectionalLight(0xfffaf0, 7.5); // Warm key light (3x intensity)
    keyLight.position.set(1.5, 2, 1);
    scene.add(keyLight);

    // Add rim light for dramatic edge highlighting
    const rimLight = new THREE.DirectionalLight(0x0055ff, 9); // 3x intensity
    rimLight.position.set(-2, 0.5, -1);
    scene.add(rimLight);
    
    // Add fill light to soften shadows
    const fillLight = new THREE.DirectionalLight(0x8866ff, 2.1); // 3x intensity
    fillLight.position.set(-1, 1, 2);
    scene.add(fillLight);// Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Setup post-processing
    try {
        // Create render pass
        const renderPass = new RenderPass(scene, camera);
        
        // Create bloom pass for glow effect
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.5,  // strength
            0.4,  // radius
            0.85   // threshold
        );
        
        // Create effect composer
        composer = new EffectComposer(renderer);
        composer.addPass(renderPass);
        composer.addPass(bloomPass);
    } catch (error) {
        console.error("Post-processing setup failed:", error);
        // Continue without post-processing
    }
      // Get the start screen element and append renderer as the first child
    const startScreen = document.getElementById('startScreen');
    const startScreenContent = document.getElementById('startScreenContent');
    startScreen.insertBefore(renderer.domElement, startScreenContent);
    
    // Style the renderer canvas
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '-1';
    
// Legg til i init()-funksjonen etter at renderer er lagt til DOM

// Posisjoner logo øverst til venstre
const logoContainer = document.getElementById('logo-container');
if (logoContainer) {
    logoContainer.style.position = 'absolute';
    logoContainer.style.top = '5px';
    logoContainer.style.left = '20px';
    logoContainer.style.zIndex = '1'; // Sørg for at den vises over 3D-scenen
    
    // Juster størrelsen hvis nødvendig
    const logo = document.getElementById('rift-logo');
    if (logo) {
        logo.style.maxWidth = '400px'; // Eventuelt juster størrelsen
    }
    
    // Flytt start-knappen til et annet sted hvis nødvendig
    const startButton = document.getElementById('start');
    if (startButton) {
        startButton.style.position = 'absolute';
        startButton.style.bottom = '100px';
        startButton.style.left = '50%';
        startButton.style.transform = 'translateX(-50%)';
    }
}


    // Initialize clock for animations
    clock = new THREE.Clock();

  // Load the soldier model
    loadSoldierModel();

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Setup camera controls for debugging
    setupCameraControls();
}

// No particle system as requested

function loadSoldierModel() {
    const loader = new FBXLoader();
    const modelPath = getAssetPath('models', 'soldierFrontPage.fbx');
      // Create a loading message for debugging
    console.log(`Loading soldier model from ${modelPath}`);
      loader.load(modelPath,
    // Success callback
    (fbx) => {
        console.log("Soldier model loaded successfully");
        soldier = fbx;
          // Scale and position the model appropriately for a close-up
        soldier.scale.set(0.010, 0.010, 0.010); // Reduced scale as per requirements
        soldier.position.set(0, 0.00, -0.20); // Position as per requirements
        
        // Set up animation if the model has animations
        if (fbx.animations && fbx.animations.length) {
            console.log(`Found ${fbx.animations.length} animations`);
            mixer = new THREE.AnimationMixer(fbx);
            const action = mixer.clipAction(fbx.animations[0]);
            action.play();
        } else {
            console.log("No animations found in the model");
        }

        // Add model to the scene
        scene.add(soldier);
        
        // Position camera after model is loaded for better framing
        positionCameraForCloseup();
          // Start animation loop
        animate();
    },
    // Progress callback
    (xhr) => {
        console.log(`Model loading: ${Math.floor(xhr.loaded / xhr.total * 100)}% loaded`);
    },    // Error callback
    (error) => {
        console.error('Error loading soldier model:', error);
        
        // Try alternate path        console.log("Attempting to load from alternate path with base URL");
        // Try with explicit GitHub Pages path as fallback
        const alternatePath = (window.location.hostname.includes('github.io')) 
            ? '/rift/models/soldierFrontPage.fbx' 
            : '../models/soldierFrontPage.fbx';
        console.log(`Loading from: ${alternatePath}`);
        loader.load(alternatePath,
            // Success callback
            (fbx) => {
                console.log("Soldier model loaded successfully from alternate path");
                soldier = fbx;
                soldier.scale.set(0.01, 0.01, 0.01);
                soldier.position.set(0, 0, -0.2);
                
                if (fbx.animations && fbx.animations.length) {
                    mixer = new THREE.AnimationMixer(fbx);
                    mixer.clipAction(fbx.animations[0]).play();
                }
                
                scene.add(soldier);
                positionCameraForCloseup();
                animate();
            },
            null,
            () => {
                // Still failed, continue without the model
                console.error("All attempts to load the model failed");
                animate();
            }
        );
    });
}

function positionCameraForCloseup() {
    // Find the head/face position
    let headPosition = new THREE.Vector3(0, 1.7, 0); // Default position lowered by 1/3 (was 1.7)

    // Try to find the head bone or mesh
    if (soldier) {
        soldier.traverse((child) => {
            if (child.name && (child.name.toLowerCase().includes('head') || child.name.toLowerCase().includes('face'))) {
                child.getWorldPosition(headPosition);
                // Lower the found position by 1/3
                headPosition.y -= 0.6;
            }
        });

        // Position camera for a dramatic close-up
        //camera.position.set(
        //    headPosition.x, 
        //    headPosition.y, 
        //    headPosition.z + 0.9 // Distance from the face
        //) ;
        // camera.lookAt(headPosition);
    }
}

function animate() {
    if (!isInitialized) return;
    
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    
    // Dramatic slow rotation for the soldier
    if (soldier) {
        // Create a slight oscillation effect for added interest
        //soldier.rotation.y = Math.sin(time * 0.1) * 0.1 + time * 0.1; // Combine rotation with subtle oscillation
        
        // Add subtle up-down movement
        //soldier.position.y = Math.sin(time * 0.5) * 0.03 + 0; // Subtle breathing-like motion
    }
      // No particle animation since we removed the particle system
    
    // Update animations
    if (mixer) {
        mixer.update(delta);
    }
    
    // Use composer for rendering if available, otherwise use standard renderer
    if (composer) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}

function onWindowResize() {
    if (!camera || !renderer) return;
    
    // Update camera
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    // Update renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update composer if available
    if (composer) {
        composer.setSize(window.innerWidth, window.innerHeight);
    }
}

function cleanup() {
    if (!isInitialized) return;
    
    window.removeEventListener('resize', onWindowResize);
    
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

// Apply specified camera settings - no debugging UI
function setupCameraControls() {
    // No debug controls or UI, just set the fixed values once
    if (camera) {
        camera.position.set(0, 2, 1.7);
        camera.lookAt(0.00, 1.10, -0.85);
        camera.fov = 25.0;
        camera.updateProjectionMatrix();
    }
    
    if (soldier) {
        soldier.position.y = 0.00;
        soldier.position.z = -0.20;
        soldier.scale.set(0.010, 0.010, 0.010);
    }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Clean up when the start button is clicked
document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start');
    if (startButton) {
        startButton.addEventListener('click', cleanup);
    }
});

export { init, cleanup };
