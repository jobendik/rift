import { ShaderMaterial, UniformsUtils, BackSide, Mesh, SphereGeometry, Vector3, Color } from 'three';

/**
* Enhanced Sky shader with more dramatic visuals and better controls
* Compatible with modern Three.js (r161+)
*/
class EnhancedSky extends Mesh {
    constructor() {
        const shader = EnhancedSkyShader;
        
        const material = new ShaderMaterial({
            name: 'EnhancedSkyShader',
            fragmentShader: shader.fragmentShader,
            vertexShader: shader.vertexShader,
            uniforms: UniformsUtils.clone(shader.uniforms),
            side: BackSide,
            depthWrite: false
        });
        
        // Use a sphere instead of a box for better sky appearance
        super(new SphereGeometry(1, 32, 32), material);
        
        this.frustumCulled = false;
    }
    
    /**
     * Set the sky to a particular time of day
     * @param {string} timeOfDay - 'dawn', 'day', 'sunset', 'dusk', 'night'
     */
    setTimeOfDay(timeOfDay) {
        const u = this.material.uniforms;
        
        switch(timeOfDay.toLowerCase()) {
            case 'dawn':
                u.sunPosition.value.set(0, 0.1, 1);
                u.rayleigh.value = 2.0;
                u.turbidity.value = 6.0;
                u.mieCoefficient.value = 0.005;
                u.mieDirectionalG.value = 0.8;
                u.sunIntensity.value = 1.0;
                u.skyColorFactor.value.set(1.0, 0.8, 0.9);
                break;
                
            case 'day':
                u.sunPosition.value.set(0, 1, 0.5);
                u.rayleigh.value = 1.0;
                u.turbidity.value = 4.0;
                u.mieCoefficient.value = 0.005;
                u.mieDirectionalG.value = 0.8;
                u.sunIntensity.value = 1.0;
                u.skyColorFactor.value.set(1.0, 1.0, 1.0);
                break;
                
            case 'sunset':
                u.sunPosition.value.set(1, 0.1, 0);
                u.rayleigh.value = 4.0;
                u.turbidity.value = 10.0;
                u.mieCoefficient.value = 0.005;
                u.mieDirectionalG.value = 0.9;
                u.sunIntensity.value = 1.0;
                u.skyColorFactor.value.set(1.2, 0.8, 0.6);
                break;
                
            case 'dusk':
                u.sunPosition.value.set(0, -0.1, 0);
                u.rayleigh.value = 5.0;
                u.turbidity.value = 12.0;
                u.mieCoefficient.value = 0.005;
                u.mieDirectionalG.value = 0.9;
                u.sunIntensity.value = 0.5;
                u.skyColorFactor.value.set(0.8, 0.6, 1.0);
                break;
                
            case 'night':
                u.sunPosition.value.set(0, -1, 0);
                u.rayleigh.value = 6.0;
                u.turbidity.value = 2.0;
                u.mieCoefficient.value = 0.002;
                u.mieDirectionalG.value = 0.8;
                u.sunIntensity.value = 0.1;
                u.skyColorFactor.value.set(0.2, 0.2, 0.6);
                break;
                
            default:
                u.sunPosition.value.set(0, 1, 0);
                u.rayleigh.value = 1.0;
                u.turbidity.value = 4.0;
                u.mieCoefficient.value = 0.005;
                u.mieDirectionalG.value = 0.8;
                u.sunIntensity.value = 1.0;
                u.skyColorFactor.value.set(1.0, 1.0, 1.0);
        }
        
        // Normalize sun position
        u.sunPosition.value.normalize();
        
        // Update material
        this.material.needsUpdate = true;
    }
}

const EnhancedSkyShader = {
    uniforms: {
        'turbidity': { value: 4.0 },
        'rayleigh': { value: 1.0 },
        'mieCoefficient': { value: 0.005 },
        'mieDirectionalG': { value: 0.8 },
        'sunPosition': { value: new Vector3(0, 1, 0) },
        'sunIntensity': { value: 1.0 },
        'skyColorFactor': { value: new Vector3(1.0, 1.0, 1.0) },
        'up': { value: new Vector3(0, 1, 0) }
    },
    
    vertexShader: /* glsl */`
        uniform vec3 sunPosition;
        uniform float rayleigh;
        uniform float turbidity;
        uniform float mieCoefficient;
        
        varying vec3 vWorldPosition;
        varying vec3 vSunDirection;
        varying float vSunfade;
        varying vec3 vBetaR;
        varying vec3 vBetaM;
        varying float vSunE;
        
        // Constants
        const float e = 2.71828182845904523536028747135266249775724709369995957;
        const float pi = 3.141592653589793238462643383279502884197169;
        
        // Wavelength constants
        const vec3 lambda = vec3(680E-9, 550E-9, 450E-9);
        const vec3 totalRayleigh = vec3(5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5);
        
        // Mie constants
        const float v = 4.0;
        const vec3 K = vec3(0.686, 0.678, 0.666);
        const vec3 MieConst = vec3(1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14);
        
        // Sun constants
        const float cutoffAngle = 1.6110731556870734;
        const float steepness = 1.5;
        const float EE = 1000.0;
        
        // Calculate sun intensity
        float sunIntensity(float zenithAngleCos) {
            zenithAngleCos = clamp(zenithAngleCos, -1.0, 1.0);
            return EE * max(0.0, 1.0 - pow(e, -((cutoffAngle - acos(zenithAngleCos)) / steepness)));
        }
        
        // Calculate total Mie scattering
        vec3 totalMie(float T) {
            float c = (0.2 * T) * 10E-18;
            return 0.434 * c * MieConst;
        }
        
        void main() {
            // Calculate world position
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            
            // Set position at far plane for sky dome
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position.z = gl_Position.w;
            
            // Calculate sun variables
            vSunDirection = normalize(sunPosition);
            vSunE = sunIntensity(dot(vSunDirection, vec3(0, 1, 0)));
            vSunfade = 1.0 - clamp(1.0 - exp((sunPosition.y / 450000.0)), 0.0, 1.0);
            
            // Rayleigh coefficient with sun fade adjustment
            float rayleighCoefficient = rayleigh - (1.0 * (1.0 - vSunfade));
            
            // Calculate scattering coefficients
            vBetaR = totalRayleigh * rayleighCoefficient;
            vBetaM = totalMie(turbidity) * mieCoefficient;
        }
    `,
    
    fragmentShader: /* glsl */`
        varying vec3 vWorldPosition;
        varying vec3 vSunDirection;
        varying float vSunfade;
        varying vec3 vBetaR;
        varying vec3 vBetaM;
        varying float vSunE;
        
        uniform float mieDirectionalG;
        uniform float sunIntensity;
        uniform vec3 skyColorFactor;
        
        // Constants
        const float pi = 3.141592653589793238462643383279502884197169;
        
        // Sky constants
        const float rayleighZenithLength = 8.4E3;
        const float mieZenithLength = 1.25E3;
        const vec3 up = vec3(0.0, 1.0, 0.0);
        
        // Sun constants
        const float sunAngularDiameterCos = 0.9999566769;
        
        // Phase function constants
        const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
        const float ONE_OVER_FOURPI = 0.07957747154594767;
        
        // Rayleigh phase function
        float rayleighPhase(float cosTheta) {
            return THREE_OVER_SIXTEENPI * (1.0 + pow(cosTheta, 2.0));
        }
        
        // Mie phase function
        float hgPhase(float cosTheta, float g) {
            float g2 = pow(g, 2.0);
            float inverse = 1.0 / pow(1.0 - 2.0 * g * cosTheta + g2, 1.5);
            return ONE_OVER_FOURPI * ((1.0 - g2) * inverse);
        }
        
        // Noise function for subtle variation
        float noise(vec3 p) {
            return fract(sin(dot(p, vec3(12.9898, 78.233, 45.5432))) * 43758.5453);
        }
        
        void main() {
            // Calculate viewing direction
            vec3 cameraPos = vec3(0.0, 0.0, 0.0); // Camera at origin in world space
            vec3 direction = normalize(vWorldPosition - cameraPos);
            
            // Calculate optical length for atmospheric scattering
            float zenithAngle = acos(max(0.0, dot(up, direction)));
            float inverse = 1.0 / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));
            float sR = rayleighZenithLength * inverse;
            float sM = mieZenithLength * inverse;
            
            // Calculate extinction factor
            vec3 Fex = exp(-(vBetaR * sR + vBetaM * sM));
            
            // Calculate scattering
            float cosTheta = dot(direction, vSunDirection);
            
            // Rayleigh scattering
            float rPhase = rayleighPhase(cosTheta * 0.5 + 0.5);
            vec3 betaRTheta = vBetaR * rPhase;
            
            // Mie scattering
            float mPhase = hgPhase(cosTheta, mieDirectionalG);
            vec3 betaMTheta = vBetaM * mPhase;
            
            // Combined scattering
            vec3 Lin = pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * (1.0 - Fex), vec3(1.5));
            Lin *= mix(vec3(1.0), pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * Fex, vec3(1.0 / 2.0)), clamp(pow(1.0 - dot(up, vSunDirection), 5.0), 0.0, 1.0));
            
            // Nightsky
            vec3 L0 = vec3(0.1) * Fex;
            
            // Stars (subtle)
            if (cosTheta < 0.0) {
                float starIntensity = pow(noise(normalize(vWorldPosition) * 200.0), 20.0) * 0.01;
                L0 += vec3(starIntensity);
            }
            
            // Sun disc
            float sundisk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta);
            L0 += (vSunE * 19000.0 * Fex * sunIntensity) * sundisk;
            
            // Apply color and intensity adjustments
            vec3 texColor = (Lin + L0) * 0.04;
            texColor += vec3(0.0, 0.001, 0.0025);
            
            // Apply custom sky coloration
            texColor *= skyColorFactor;
            
            // Apply subtle noise variation for more interesting sky
            float variation = noise(direction * 4.0) * 0.02 + 0.98;
            texColor *= variation;
            
            // Adjust brightness and contrast
            texColor = pow(texColor, vec3(1.0 / (1.2 + (1.2 * vSunfade))));
            
            // Output final color
            gl_FragColor = vec4(texColor, 1.0);
            
            // Required for proper integration with Three.js color pipeline
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
        }
    `
};

export { EnhancedSky };