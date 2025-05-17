import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Avansert Minimap klasse for Three.js FPS spill
class AdvancedMinimap {
  constructor(scene, mainCamera, player, options = {}) {
    // Standard innstillinger med utvidede alternativer
    this.options = {
      size: 200,                 // Størrelse på minimapet i piksler
      height: 100,               // Høyde over scenen
      border: '3px solid #fff',  // Border stil
      borderRadius: '50%',       // Rund form
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Bakgrunnsfarge
      position: 'top-right',     // Posisjon på skjermen
      scale: 20,                 // Skala for minimapet (hvor mye av scenen som vises)
      playerColor: 0x00ff00,     // Farge for spillermarkøren
      enemyColor: 0xff0000,      // Farge for fiendemarker
      itemColor: 0xffff00,       // Farge for gjenstander
      
      // Avanserte alternativer
      rotateWithPlayer: false,   // Om kartet skal rotere med spilleren
      zoomable: true,            // Om spilleren kan zoome kartet
      zoomMin: 10,               // Minimum zoom nivå
      zoomMax: 50,               // Maksimum zoom nivå
      enemyDetectionRadius: 30,  // Radius for å oppdage fiender (i spill-enheter)
      heightIndicator: true,     // Om høydeforskjeller skal indikeres
      updateFrequency: 1,        // Oppdater hvert n-te frame (1 = hver frame)
      lowResolutionFactor: 0.75, // Reduserer oppløsning for bedre ytelse
      simplifyGeometry: true,    // Bruk forenklede geometrier for kartvisning
      showObjectives: true,      // Vis mål på kartet
      fogOfWar: false,           // Aktiver "fog of war" effekt
      radarSweep: false,         // Aktiver radar-sveip effekt
      getPlayerDirection: null,  // Tilpasset funksjon for å hente spillerens retning
      
      ...options                 // Overstyrer med innkommende alternativer
    };

    // Referanser til scenen og spillerobjektet
    this.scene = scene;
    this.mainCamera = mainCamera;
    this.player = player;
    
    // Statusvariabler
    this.frameCount = 0;
    this.currentZoom = this.options.scale;
    this.objectiveMarkers = new Map();
    this.discoveredAreas = new Set();
    
    // Oppretter container for minimapet
    this.createMinimapContainer();
    
    // Oppretter UI-kontroller hvis zoomable er aktivert
    if (this.options.zoomable) {
      this.createZoomControls();
    }
    
    // Oppretter minimapets renderer med lavere oppløsning for bedre ytelse
    this.createMinimapRenderer();
    
    // Oppretter minimapets kamera
    this.createMinimapCamera();
    
    // Oppretter en separat scene for minimapet
    this.minimapScene = new THREE.Scene();
    
    // Oppretter markører for spilleren
    this.createPlayerMarker();
    
    // Oppretter spesialiserte containere for forskjellige typer objekter
    this.markers = {
      enemies: new THREE.Group(),
      items: new THREE.Group(),
      objectives: new THREE.Group(),
    };
    
    // Legger til grupper til scenen
    Object.values(this.markers).forEach(group => {
      this.minimapScene.add(group);
    });
    
    // Levelhåndtering
    this.levelMap = new THREE.Group();
    this.minimapScene.add(this.levelMap);
    
    // Legger til fog of war hvis aktivert
    if (this.options.fogOfWar) {
      this.setupFogOfWar();
    }
    
    // Legger til radar-sveip hvis aktivert
    if (this.options.radarSweep) {
      this.setupRadarSweep();
    }
    
    // Initialiserer event listeners
    this.initEventListeners();
  }
  
  // Oppretter HTML-container for minimapet
  createMinimapContainer() {
    this.container = document.createElement('div');
    
    // Styling av container
    Object.assign(this.container.style, {
      position: 'absolute',
      width: `${this.options.size}px`,
      height: `${this.options.size}px`,
      border: this.options.border,
      borderRadius: this.options.borderRadius,
      backgroundColor: this.options.backgroundColor,
      overflow: 'hidden',
      zIndex: 1000,
      transition: 'all 0.3s ease'
    });
    
    // Posisjonering basert på innstillingene
    switch (this.options.position) {
      case 'top-left':
        Object.assign(this.container.style, {
          top: '20px',
          left: '20px'
        });
        break;
      case 'top-right':
        Object.assign(this.container.style, {
          top: '20px',
          right: '20px'
        });
        break;
      case 'bottom-left':
        Object.assign(this.container.style, {
          bottom: '20px',
          left: '20px'
        });
        break;
      case 'bottom-right':
        Object.assign(this.container.style, {
          bottom: '20px',
          right: '20px'
        });
        break;
      default:
        Object.assign(this.container.style, {
          top: '20px',
          right: '20px'
        });
    }
    
    document.body.appendChild(this.container);
  }
  
  // Oppretter zoom-kontroller for minimapet
  createZoomControls() {
    // Container for zoom-kontroller
    this.zoomControls = document.createElement('div');
    Object.assign(this.zoomControls.style, {
      position: 'absolute',
      bottom: '10px',
      right: '10px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1001
    });
    
    // Zoom inn-knapp
    this.zoomInButton = document.createElement('button');
    this.zoomInButton.textContent = '+';
    Object.assign(this.zoomInButton.style, {
      width: '24px',
      height: '24px',
      margin: '2px',
      border: '1px solid #ffffff',
      borderRadius: '4px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      color: 'white',
      cursor: 'pointer',
      fontSize: '16px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      lineHeight: '1'
    });
    
    // Zoom ut-knapp
    this.zoomOutButton = document.createElement('button');
    this.zoomOutButton.textContent = '-';
    Object.assign(this.zoomOutButton.style, {
      width: '24px',
      height: '24px',
      margin: '2px',
      border: '1px solid #ffffff',
      borderRadius: '4px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      color: 'white',
      cursor: 'pointer',
      fontSize: '16px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      lineHeight: '1'
    });
    
    // Toggle rotation-knapp
    this.rotateToggleButton = document.createElement('button');
    this.rotateToggleButton.textContent = '↻';
    Object.assign(this.rotateToggleButton.style, {
      width: '24px',
      height: '24px',
      margin: '2px',
      border: '1px solid #ffffff',
      borderRadius: '4px',
      backgroundColor: this.options.rotateWithPlayer ? 'rgba(0, 128, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
      color: 'white',
      cursor: 'pointer',
      fontSize: '16px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      lineHeight: '1'
    });
    
    // Legger til knapper i container
    this.zoomControls.appendChild(this.zoomInButton);
    this.zoomControls.appendChild(this.zoomOutButton);
    this.zoomControls.appendChild(this.rotateToggleButton);
    
    // Legger til container i minimap
    this.container.appendChild(this.zoomControls);
    
    // Event listeners for knapper
    this.zoomInButton.addEventListener('click', () => this.zoomIn());
    this.zoomOutButton.addEventListener('click', () => this.zoomOut());
    this.rotateToggleButton.addEventListener('click', () => this.toggleRotation());
  }
  
  // Zoom inn-funksjon
  zoomIn() {
    if (this.currentZoom > this.options.zoomMin) {
      this.currentZoom -= 5;
      this.updateCameraZoom();
    }
  }
  
  // Zoom ut-funksjon
  zoomOut() {
    if (this.currentZoom < this.options.zoomMax) {
      this.currentZoom += 5;
      this.updateCameraZoom();
    }
  }
  
  // Oppdaterer kamerazoom
  updateCameraZoom() {
    const scale = this.currentZoom;
    this.camera.left = -scale;
    this.camera.right = scale;
    this.camera.top = scale;
    this.camera.bottom = -scale;
    this.camera.updateProjectionMatrix();
  }
  
  // Veksler mellom fast og roterende kart
  toggleRotation() {
    this.options.rotateWithPlayer = !this.options.rotateWithPlayer;
    this.rotateToggleButton.style.backgroundColor = this.options.rotateWithPlayer ? 
      'rgba(0, 128, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
  }
  
  // Oppretter webGL-renderer for minimapet med redusert oppløsning
  createMinimapRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power' // Bedre batterilevetid på mobile enheter
    });
    
    // Beregn størrelse med oppløsningsfaktor
    const rendererSize = Math.floor(this.options.size * this.options.lowResolutionFactor);
    
    this.renderer.setSize(rendererSize, rendererSize);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1)); // Begrenser til 1x
    
    // Setter canvas til å fylle hele containeren
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    
    this.container.appendChild(this.renderer.domElement);
  }
  
  // Oppretter orthografisk kamera for minimapet
  createMinimapCamera() {
    const scale = this.options.scale;
    this.currentZoom = scale;
    
    this.camera = new THREE.OrthographicCamera(
      -scale, scale, 
      scale, -scale, 
      1, 1000
    );
    
    // Posisjonerer kameraet høyt over scenen, ser nedover
    this.camera.position.set(0, this.options.height, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.up.set(0, 0, -1); // Setter opp-vektoren for å orientere kartet korrekt
    this.camera.updateProjectionMatrix();
  }
  
  // Oppretter markør for spilleren med forbedret utseende
  createPlayerMarker() {
    // Lager en kegle for å indikere retning
    const geometry = new THREE.ConeGeometry(1.5, 3, 3);
    const material = new THREE.MeshBasicMaterial({ 
      color: this.options.playerColor,
      transparent: true,
      opacity: 0.9
    });
    
    this.playerMarker = new THREE.Mesh(geometry, material);
    this.playerMarker.rotation.x = Math.PI / 2;
    this.minimapScene.add(this.playerMarker);
    
    // Lager en sirkel for spillerens posisjon
    const circleGeometry = new THREE.CircleGeometry(1.0, 16);
    const circleMaterial = new THREE.MeshBasicMaterial({ 
      color: this.options.playerColor 
    });
    
    this.playerDot = new THREE.Mesh(circleGeometry, circleMaterial);
    this.playerDot.rotation.x = -Math.PI / 2;
    this.minimapScene.add(this.playerDot);
    
    // Create a clearer direction cone
    const coneWidth = Math.PI / 2.5; // Slightly narrower cone
    const visionGeometry = new THREE.CircleGeometry(12, 32, -coneWidth/2, coneWidth);
    const visionMaterial = new THREE.MeshBasicMaterial({ 
      color: this.options.playerColor,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    
    this.visionCone = new THREE.Mesh(visionGeometry, visionMaterial);
    this.visionCone.rotation.x = -Math.PI / 2;
    this.minimapScene.add(this.visionCone);
  }
  
  // Setter opp "fog of war"-effekt
  setupFogOfWar() {
    // Oppretter et grid av bokser som dekker hele spillområdet
    this.fogGrid = [];
    const gridSize = 5; // Størrelsen på hver fog-celle
    const worldSize = 200; // Antatt størrelse på verden
    const halfWorldSize = worldSize / 2;
    
    // Oppretter fog group
    this.fogOfWarGroup = new THREE.Group();
    this.minimapScene.add(this.fogOfWarGroup);
    
    // Oppretter materialoppsett for fog
    const fogMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    // Oppretter grid av fog-celler
    for (let x = -halfWorldSize; x < halfWorldSize; x += gridSize) {
      for (let z = -halfWorldSize; z < halfWorldSize; z += gridSize) {
        const fogGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
        const fogCell = new THREE.Mesh(fogGeometry, fogMaterial.clone());
        
        fogCell.position.set(x + gridSize/2, 0.1, z + gridSize/2);
        fogCell.rotation.x = -Math.PI / 2;
        
        // Legg til i group og array
        this.fogOfWarGroup.add(fogCell);
        this.fogGrid.push({
          mesh: fogCell,
          x: x + gridSize/2,
          z: z + gridSize/2,
          discovered: false
        });
      }
    }
  }
  
  // Setter opp radar-sveip effekt
  setupRadarSweep() {
    // Oppretter radar-sveip geometri
    const radarGeometry = new THREE.RingGeometry(1, 30, 32, 1, 0, Math.PI / 4);
    const radarMaterial = new THREE.MeshBasicMaterial({
      color: this.options.playerColor,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    
    this.radarSweep = new THREE.Mesh(radarGeometry, radarMaterial);
    this.radarSweep.rotation.x = -Math.PI / 2;
    this.radarSweepAngle = 0;
    this.minimapScene.add(this.radarSweep);
  }
  
  // Initialiserer event listeners
  initEventListeners() {
    // Håndterer mushjul for zoom
    if (this.options.zoomable) {
      this.container.addEventListener('wheel', (event) => {
        event.preventDefault();
        
        if (event.deltaY < 0) {
          this.zoomIn();
        } else {
          this.zoomOut();
        }
      });
    }
    
    // Håndterer vindu-resize
    window.addEventListener('resize', () => {
      // Hvis minimapet bruker en prosentandel av skjermen, oppdater størrelsen
      if (typeof this.options.size === 'string' && this.options.size.includes('%')) {
        this.resize();
      }
    });
  }
  
  // Genererer en forenklet geometri for level-mesher
  simplifyGeometry(geometry) {
    if (!this.options.simplifyGeometry) return geometry.clone();
    
    // Enkel geometriforenkling - vi kan bruke en decimator for mer avansert
    // Her bruker vi en enkel begrensning på antall vertekser
    
    // For bokser og andre enkle former, returnerer vi en enkel boks
    if (geometry.type.includes('BoxGeometry') || 
        geometry.type.includes('PlaneGeometry') ||
        geometry.attributes.position.count < 100) {
      return geometry.clone();
    }
    
    // For mer komplekse geometrier, lager vi en forenklet versjon
    // I en fullstendig implementasjon ville vi brukt en mer avansert decimeringsalgoritme
    // som THREE.BufferGeometryUtils.mergeVertices eller en ekstern decimator
    
    // Her gjør vi en enkel sampling av vertekser
    const positions = geometry.attributes.position.array;
    const simplifiedPositions = [];
    
    // Sample hver 10. vertex
    for (let i = 0; i < positions.length; i += 30) {
      simplifiedPositions.push(positions[i], positions[i+1], positions[i+2]);
    }
    
    // Opprett ny geometri
    const simplifiedGeometry = new THREE.BufferGeometry();
    simplifiedGeometry.setAttribute('position', 
      new THREE.Float32BufferAttribute(simplifiedPositions, 3));
    
    return simplifiedGeometry;
  }
  
  // Legger til levelet til minimapet med forenklede geometrier
  addLevelToMinimap(levelObject) {
    // Tømmer eksisterende levelMap
    while (this.levelMap.children.length > 0) {
      const child = this.levelMap.children[0];
      this.levelMap.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
    
    // Traverserer level-objektet
    levelObject.traverse(child => {
      if (child.isMesh && child.geometry) {
        // Ignorer objekter som ikke bør synes på kartet
        if (child.name.includes('sky') || 
            child.name.includes('particle') || 
            child.name.includes('light') ||
            child.name.includes('collider')) {
          return;
        }
        
        // Bestem farge basert på objekttype
        let color = 0xaaaaaa; // Standard grå
        
        // Tilpass farge basert på objektnavn eller material
        if (child.name.includes('wall') || child.material?.name?.includes('wall')) {
          color = 0xffffff; // Hvit for vegger
        } else if (child.name.includes('floor') || child.material?.name?.includes('floor')) {
          color = 0x555555; // Mørkere grå for gulv
        } else if (child.name.includes('water') || child.material?.name?.includes('water')) {
          color = 0x0055ff; // Blå for vann
        }
        
        // Opprett en forenklet geometri
        const simplifiedGeom = this.simplifyGeometry(child.geometry);
        
        // Opprett mesh med enkel material
        const minimapMesh = new THREE.Mesh(
          simplifiedGeom,
          new THREE.MeshBasicMaterial({ 
            color: color,
            wireframe: false,
            opacity: 0.7,
            transparent: true
          })
        );
        
        // Kopier transformasjoner fra originalobjektet
        minimapMesh.position.copy(child.position);
        minimapMesh.rotation.copy(child.rotation);
        minimapMesh.scale.copy(child.scale);
        
        // Original høydeinformasjon for høydeindikering
        minimapMesh.userData.originalHeight = child.position.y;
        
        this.levelMap.add(minimapMesh);
      }
    });
  }
  
  // Legger til fiender på minimapet med høydeindikering
  addEnemyMarker(enemy) {
    const geometry = new THREE.CircleGeometry(0.8, 16);
    
    // Oppretter material med grunnfarge
    const material = new THREE.MeshBasicMaterial({ 
      color: this.options.enemyColor,
      transparent: true,
      opacity: 0.8
    });
    
    const marker = new THREE.Mesh(geometry, material);
    marker.rotation.x = -Math.PI / 2;
    marker.userData.enemy = enemy; // Lagrer referanse til fienden
    marker.userData.isEnemy = true;
    marker.userData.isDiscovered = false;
    marker.visible = false; // Starter usynlig til oppdaget
    
    // Legger til pulseringseffekt
    this.addPulseEffect(marker);
    
    // Legger til i enemy-gruppen
    this.markers.enemies.add(marker);
    
    return marker;
  }
  
  // Legger til pulseringseffekt på et objekt
  addPulseEffect(object) {
    const pulseGeometry = new THREE.CircleGeometry(1.5, 16);
    const pulseMaterial = new THREE.MeshBasicMaterial({
      color: object.material.color,
      transparent: true,
      opacity: 0.3
    });
    
    const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
    pulse.rotation.x = -Math.PI / 2;
    pulse.scale.set(0.5, 0.5, 0.5);
    
    // Lagrer puls-informasjon i userData
    object.userData.pulse = {
      mesh: pulse,
      phase: Math.random() * Math.PI * 2, // Tilfeldig startfase
      speed: 0.05 + Math.random() * 0.05  // Tilfeldig hastighet
    };
    
    object.add(pulse);
  }
  
  // Legger til gjenstander på minimapet
  addItemMarker(item, type) {
    // Velg farge og form basert på type
    let color = this.options.itemColor;
    let geometry;
    
    if (type === 'health') {
      color = 0x00ffff; // Cyan for helsepakker
      geometry = new THREE.CircleGeometry(0.6, 4); // Firkant for helse
    } else if (type === 'weapon') {
      color = 0xffff00; // Gul for våpen
      geometry = new THREE.CircleGeometry(0.6, 3); // Trekant for våpen
    } else if (type === 'ammo') {
      color = 0xff00ff; // Magenta for ammunisjon
      geometry = new THREE.RingGeometry(0.3, 0.6, 16); // Ring for ammo
    } else {
      geometry = new THREE.PlaneGeometry(0.6, 0.6); // Standard firkant
    }
    
    // Opprett material
    const material = new THREE.MeshBasicMaterial({ 
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    
    const marker = new THREE.Mesh(geometry, material);
    marker.rotation.x = -Math.PI / 2;
    marker.userData.item = item; // Lagrer referanse til gjenstanden
    marker.userData.type = type;
    
    // Legger til pulsering for viktige gjenstander
    if (type === 'health' || type === 'weapon') {
      this.addPulseEffect(marker);
    }
    
    // Legger til i items-gruppen
    this.markers.items.add(marker);
    
    return marker;
  }
  
  // Legger til et mål/objective på minimapet
  addObjectiveMarker(position, type = 'primary', label = '') {
    // Bestem farge basert på type
    let color;
    let size = 1.2;
    
    switch (type) {
      case 'primary':
        color = 0x00ffff; // Cyan for hovedmål
        size = 1.2;
        break;
      case 'secondary':
        color = 0xffaa00; // Oransje for sekundærmål
        size = 1.0;
        break;
      case 'bonus':
        color = 0xaaaaff; // Lyseblå for bonusmål
        size = 0.8;
        break;
      default:
        color = 0xffffff; // Hvit for standardmål
    }
    
    // Opprett geometri og material
    const geometry = new THREE.RingGeometry(size * 0.7, size, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    
    // Opprett mesh
    const marker = new THREE.Mesh(geometry, material);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(position.x, 0, position.z);
    marker.userData.type = type;
    marker.userData.label = label;
    
    // Legg til ekstra effekt for hovedmål
    if (type === 'primary') {
      const innerGeometry = new THREE.CircleGeometry(size * 0.3, 16);
      const innerMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.6
      });
      
      const innerCircle = new THREE.Mesh(innerGeometry, innerMaterial);
      innerCircle.rotation.x = -Math.PI / 2;
      marker.add(innerCircle);
      
      // Legg til pulsering
      this.addPulseEffect(marker);
    }
    
    // Legger til i objectives-gruppen
    this.markers.objectives.add(marker);
    
    // Lagrer i objektiv-map for lett tilgang
    const id = THREE.MathUtils.generateUUID();
    this.objectiveMarkers.set(id, marker);
    
    return id; // Returnerer ID for senere referanse
  }
  
  // Fjerner et mål/objective fra kartet
  removeObjectiveMarker(id) {
    if (this.objectiveMarkers.has(id)) {
      const marker = this.objectiveMarkers.get(id);
      this.markers.objectives.remove(marker);
      this.objectiveMarkers.delete(id);
      
      // Frigjør ressurser
      if (marker.geometry) marker.geometry.dispose();
      if (marker.material) marker.material.dispose();
    }
  }
  
  // Legger til retningspil til et objektiv
  addDirectionalArrow(targetId) {
    if (!this.objectiveMarkers.has(targetId)) return;
    
    const target = this.objectiveMarkers.get(targetId);
    
    // Opprett pil-geometri
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 2);
    arrowShape.lineTo(1, 0);
    arrowShape.lineTo(0.5, 0);
    arrowShape.lineTo(0.5, -1);
    arrowShape.lineTo(-0.5, -1);
    arrowShape.lineTo(-0.5, 0);
    arrowShape.lineTo(-1, 0);
    arrowShape.lineTo(0, 2);
    
    const geometry = new THREE.ShapeGeometry(arrowShape);
    const material = new THREE.MeshBasicMaterial({
      color: target.material.color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    // Opprett pil-mesh
    this.directionalArrow = new THREE.Mesh(geometry, material);
    this.directionalArrow.scale.set(0.7, 0.7, 0.7);
    this.directionalArrow.rotation.x = -Math.PI / 2;
    this.directionalArrow.userData.targetId = targetId;
    
    // Legg til i scenen
    this.minimapScene.add(this.directionalArrow);
    
    return this.directionalArrow;
  }
  
  // Oppdaterer retningspil
  updateDirectionalArrow() {
    if (!this.directionalArrow) return;
    
    const targetId = this.directionalArrow.userData.targetId;
    if (!this.objectiveMarkers.has(targetId)) {
      // Target er fjernet, fjern pilen
      this.minimapScene.remove(this.directionalArrow);
      if (this.directionalArrow.geometry) this.directionalArrow.geometry.dispose();
      if (this.directionalArrow.material) this.directionalArrow.material.dispose();
      this.directionalArrow = null;
      return;
    }
    
    // Hent target-posisjon og spiller-posisjon
    const target = this.objectiveMarkers.get(targetId);
    const playerPos = this.player.position.clone();
    const targetPos = target.position.clone();
    
    // Beregn retning til målet
    const direction = new THREE.Vector2(
      targetPos.x - playerPos.x,
      targetPos.z - playerPos.z
    );
    
    const distance = direction.length();
    
    // Hvis målet er innenfor minimap-visning, ikke vis pilen
    if (distance < this.currentZoom * 0.8) {
      this.directionalArrow.visible = false;
      return;
    }
    
    // Vis pilen
    this.directionalArrow.visible = true;
    
    // Normaliser retningen
    direction.normalize();
    
    // Beregn vinkel
    const angle = Math.atan2(direction.y, direction.x);
    
    // Posisjonerer pilen på kanten av minimapet
    const radius = this.currentZoom * 0.8;
    const arrowX = Math.cos(angle) * radius;
    const arrowZ = Math.sin(angle) * radius;
    
    // Setter posisjon og rotasjon
    this.directionalArrow.position.set(
      playerPos.x + arrowX,
      0,
      playerPos.z + arrowZ
    );
    
    this.directionalArrow.rotation.z = -angle + Math.PI / 2;
  }
  
  // Sjekker om en fiende er oppdaget (innenfor deteksjonsradius)
  isEnemyDetected(enemy) {
    // Hvis vi ikke har en spiller eller fiende, returner false
    if (!this.player || !enemy) return false;
    
    const playerPos = this.player.position;
    const enemyPos = enemy.position;
    
    // Beregn avstand mellom spiller og fiende
    const distance = new THREE.Vector2(
      enemyPos.x - playerPos.x,
      enemyPos.z - playerPos.z
    ).length();
    
    // Sjekk om fienden er innenfor deteksjonsradius
    return distance <= this.options.enemyDetectionRadius;
  }
  
  // Oppdaterer fog of war
  updateFogOfWar() {
    if (!this.options.fogOfWar || !this.fogGrid) return;
    
    const playerPos = this.player.position;
    const detectionRadius = this.options.enemyDetectionRadius;
    
    // Gå gjennom alle fog-celler
    for (const fogCell of this.fogGrid) {
      // Beregn avstand mellom spiller og celle
      const distance = new THREE.Vector2(
        fogCell.x - playerPos.x,
        fogCell.z - playerPos.z
      ).length();
      
      // Hvis spilleren er nær nok, avdekk fog
      if (distance <= detectionRadius) {
        if (!fogCell.discovered) {
          fogCell.discovered = true;
          
          // Fade ut fog
          const fogMesh = fogCell.mesh;
          const originalOpacity = fogMesh.material.opacity;
          
          // Animasjon for fade-out
          const fadeOut = () => {
            if (fogMesh.material.opacity > 0.05) {
              fogMesh.material.opacity -= 0.05;
              requestAnimationFrame(fadeOut);
            } else {
              fogMesh.material.opacity = 0;
              fogMesh.visible = false;
            }
          };
          
          fadeOut();
          
          // Legg til i oppdaget områder
          this.discoveredAreas.add(`${fogCell.x.toFixed(1)},${fogCell.z.toFixed(1)}`);
        }
      }
    }
  }
  
  // Oppdaterer radar-sveip
  updateRadarSweep() {
    if (!this.options.radarSweep || !this.radarSweep) return;
    
    const playerPos = this.player.position;
    
    // Oppdaterer sweep-posisjon til spilleren
    this.radarSweep.position.set(playerPos.x, 0, playerPos.z);
    
    // Roterer sweep
    this.radarSweepAngle += 0.02;
    if (this.radarSweepAngle > Math.PI * 2) {
      this.radarSweepAngle = 0;
    }
    
    // Oppdaterer sweep-rotasjon
    this.radarSweep.rotation.y = this.radarSweepAngle;
    
    // Sjekk for fiender i søkelyset
    const sweepDirection = new THREE.Vector3(
      Math.cos(this.radarSweepAngle),
      0,
      Math.sin(this.radarSweepAngle)
    );
    
    // Gå gjennom alle fiende-markører
    this.markers.enemies.children.forEach(enemyMarker => {
      if (!enemyMarker.userData.enemy) return;
      
      const enemyPos = enemyMarker.userData.enemy.position;
      const toEnemy = new THREE.Vector3(
        enemyPos.x - playerPos.x,
        0,
        enemyPos.z - playerPos.z
      );
      
      const distance = toEnemy.length();
      
      // Normaliser vektoren
      toEnemy.normalize();
      
      // Beregn dot-produkt for å finne vinkel
      const dotProduct = toEnemy.dot(sweepDirection);
      
      // Hvis fienden er i søkelyset (innenfor en vinkel) og innenfor rekkevidde
      if (dotProduct > 0.97 && distance <= this.options.enemyDetectionRadius) {
        // Setter fienden som oppdaget
        if (!enemyMarker.userData.isDiscovered) {
          enemyMarker.userData.isDiscovered = true;
          enemyMarker.visible = true;
          
          // Flash-effekt
          const originalOpacity = enemyMarker.material.opacity;
          enemyMarker.material.opacity = 1;
          
          setTimeout(() => {
            enemyMarker.material.opacity = originalOpacity;
          }, 300);
        }
      }
    });
  }
  
  // Oppdaterer pulseringseffekter
  updatePulseEffects() {
    const time = performance.now() * 0.001; // Tid i sekunder
    
    // Funksjon for å oppdatere puls på et objekt
    const updatePulse = (object) => {
      if (!object.userData.pulse) return;
      
      const pulse = object.userData.pulse;
      const scale = 0.8 + 0.4 * Math.sin(time * pulse.speed * 2 + pulse.phase);
      
      pulse.mesh.scale.set(scale, scale, scale);
      
      // Oppdaterer også opasiteten
      pulse.mesh.material.opacity = 0.3 * (1 - (scale - 0.8) / 0.4);
    };
    
    // Oppdaterer alle objekter med pulseringseffekter
    // Fiender
    this.markers.enemies.children.forEach(updatePulse);
    
    // Gjenstander
    this.markers.items.children.forEach(updatePulse);
    
    // Mål
    this.markers.objectives.children.forEach(updatePulse);
    
    // Spiller
    updatePulse(this.playerMarker);
  }
  
  // Hovedoppdateringsfunksjon
  update() {
    // Ytelsesoptimalisering: kun oppdater hvert n-te frame
    this.frameCount++;
    if (this.frameCount % this.options.updateFrequency !== 0) return;
    
    if (!this.player) return;
    
    // Henter spillerposisjon
    const playerPosition = this.player.position.clone();
    
    // Get player direction - use custom function if provided
    let playerDirection;
    
    if (this.options.getPlayerDirection && typeof this.options.getPlayerDirection === 'function') {
      // Use the custom direction function
      playerDirection = this.options.getPlayerDirection();
    } else if (this.player.velocity && (Math.abs(this.player.velocity.x) > 0.01 || Math.abs(this.player.velocity.z) > 0.01)) {
      // Use velocity if available and not too small
      playerDirection = Math.atan2(this.player.velocity.x, this.player.velocity.z);
    } else if (this.player.forward) {
      // Fallback to forward direction
      playerDirection = Math.atan2(this.player.forward.x, this.player.forward.z);
    } else {
      // Last resort - use rotation
      playerDirection = this.player.rotation.y;
    }
    
    // Oppdaterer spillerens markører
    this.playerMarker.position.set(playerPosition.x, 0, playerPosition.z);
    this.playerDot.position.set(playerPosition.x, 0, playerPosition.z);
    this.playerMarker.rotation.y = playerDirection;
    
    // Update vision cone
    if (this.visionCone) {
      this.visionCone.position.set(playerPosition.x, 0, playerPosition.z);
      this.visionCone.rotation.y = playerDirection;
    }
    
    // Hvis kartet skal rotere med spilleren
    if (this.options.rotateWithPlayer) {
      this.minimapScene.rotation.y = -playerDirection;
    } else {
      this.minimapScene.rotation.y = 0;
    }
    
    // Oppdaterer kameraposisjon for å følge spilleren
    this.camera.position.set(playerPosition.x, this.options.height, playerPosition.z);
    
    // Oppdaterer fiendemarkers
    this.markers.enemies.children.forEach(enemyMarker => {
      if (!enemyMarker.userData.enemy) return;
      
      const enemy = enemyMarker.userData.enemy;
      const enemyPosition = enemy.position;
      
      // Oppdaterer posisjon
      enemyMarker.position.set(enemyPosition.x, 0, enemyPosition.z);
      
      // Høydeindikering
      if (this.options.heightIndicator) {
        // Sammenligner fiendens høyde med spillerens
        const heightDiff = enemyPosition.y - playerPosition.y;
        
        let enemyColor;
        if (heightDiff > 3) {
          // Fienden er vesentlig høyere enn spilleren
          enemyColor = 0xff8800; // Oransje
        } else if (heightDiff < -3) {
          // Fienden er vesentlig lavere enn spilleren
          enemyColor = 0x0088ff; // Blå
        } else {
          // Fienden er omtrent på samme høyde
          enemyColor = this.options.enemyColor;
        }
        
        // Oppdaterer farge på markøren
        enemyMarker.material.color.set(enemyColor);
        
        // Oppdaterer også pulsfargen hvis fienden har puls
        if (enemyMarker.userData.pulse) {
          enemyMarker.userData.pulse.mesh.material.color.set(enemyColor);
        }
      }
      
      // Sjekk om fienden er oppdaget
      if (this.isEnemyDetected(enemy)) {
        enemyMarker.userData.isDiscovered = true;
        enemyMarker.visible = true;
      } else {
        // Hvis fienden har vært oppdaget tidligere, behold den på kartet med lavere opasitet
        if (enemyMarker.userData.isDiscovered) {
          enemyMarker.material.opacity = 0.5;
        } else {
          enemyMarker.visible = false;
        }
      }
    });
    
    // Oppdaterer gjenstandsmarkører
    this.markers.items.children.forEach(itemMarker => {
      if (!itemMarker.userData.item) return;
      
      const item = itemMarker.userData.item;
      const itemPosition = item.position;
      
      // Oppdaterer posisjon
      itemMarker.position.set(itemPosition.x, 0, itemPosition.z);
    });
    
    // Oppdaterer Fog of War
    this.updateFogOfWar();
    
    // Oppdaterer radar-sveip
    this.updateRadarSweep();
    
    // Oppdaterer retningspil til objektiv
    this.updateDirectionalArrow();
    
    // Oppdaterer pulseringseffekter
    this.updatePulseEffects();
    
    // Renderer minimapet
    this.renderer.render(this.minimapScene, this.camera);
  }
  
  // Endrer størrelse på minimapet
  resize(size) {
    if (size) {
      this.options.size = size;
    }
    
    // Oppdater container
    this.container.style.width = `${this.options.size}px`;
    this.container.style.height = `${this.options.size}px`;
    
    // Beregn renderer-størrelse med oppløsningsfaktor
    const rendererSize = Math.floor(this.options.size * this.options.lowResolutionFactor);
    
    // Oppdater renderer
    this.renderer.setSize(rendererSize, rendererSize);
  }
  
  // Fjerner minimapet fra dokumentet
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // Fjern event listeners
    if (this.zoomInButton) {
      this.zoomInButton.removeEventListener('click', this.zoomIn);
    }
    
    if (this.zoomOutButton) {
      this.zoomOutButton.removeEventListener('click', this.zoomOut);
    }
    
    if (this.rotateToggleButton) {
      this.rotateToggleButton.removeEventListener('click', this.toggleRotation);
    }
    
    // Frigjør ressurser
    this.renderer.dispose();
    
    // Frigjør geometrier og materialer
    const disposeObject = (obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(material => material.dispose());
        } else {
          obj.material.dispose();
        }
      }
      
      // Rekursivt for barn
      if (obj.children) {
        obj.children.forEach(disposeObject);
      }
    };
    
    // Frigjør alle objekter i scenen
    this.minimapScene.children.forEach(disposeObject);
  }
}

export { AdvancedMinimap };