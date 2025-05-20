# RIFT: Technical Context

## Technology Stack

### Core Libraries

| Library/Framework | Version | Purpose |
|-------------------|---------|---------|
| Three.js | Latest | 3D rendering engine |
| Yuka.js | Latest | Game logic and AI framework |
| WebGL | 2.0 | Graphics API |
| Web Audio API | Standard | Audio processing |
| JavaScript | ES6+ | Programming language |

### Build Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Vite | Latest | Development server and bundler |
| npm/Node.js | Latest | Package management |
| ESLint | Latest | Code quality and style enforcement |

### Asset Pipeline

| Tool/Format | Purpose |
|-------------|---------|
| GLTF/GLB | 3D model format |
| PNG/JPG | Texture formats |
| OGG/MP3 | Audio formats |
| JSON | Configuration and data storage |

## Development Environment

### Requirements

- Modern web browser with WebGL 2.0 support
- Node.js and npm installed
- Code editor (VSCode recommended with Three.js/JavaScript extensions)
- Git for version control
- 3D modeling tools for asset creation/modification
- Audio editing tools for sound assets

### Setup Instructions

1. **Clone Repository**
   ```bash
   git clone [repository-url]
   cd RIFT
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

5. **Asset Management**
   - Place 3D models in `/app/models/`
   - Place textures in `/app/textures/`
   - Place audio files in `/app/audios/`
   - Place navigation meshes in `/app/navmeshes/`

## Key Dependencies

### Three.js Integration

Three.js serves as the rendering engine with custom extensions:
- Scene setup and management
- Camera controls (first-person and orbit)
- Lighting and shadow systems
- Material and texture handling
- Animation system integration
- Custom shader implementations (EnhancedSky)

### Yuka.js Integration

Yuka.js provides the game logic framework:
- Entity management system
- AI and behavior implementation
- Navigation and pathfinding
- Steering behaviors
- Spatial partitioning

### Custom Components

- **AssetManager**: Handles loading and caching of all game assets
- **WeaponSystem**: Manages weapon behaviors, projectiles, and effects
- **UIManager**: Controls UI elements and HUD components
- **SpawningManager**: Handles entity spawning and respawning
- **EnvironmentSystem**: Controls sky, weather, and environmental effects

## Performance Considerations

### Rendering Optimization

- Optimized materials with appropriate texture sizes
- LOD (Level of Detail) for distant objects
- Frustum culling for off-screen elements
- Efficient shadow mapping
- Frame-independent animation and physics

### Memory Management

- Asset preloading with progress indication
- Texture compression and optimization
- Object pooling for frequently instantiated objects
- Cleanup of unused resources
- Optimized audio loading and unloading

### Mobile Considerations

- Responsive design for different screen sizes
- Touch input alternatives for mobile devices
- Simplified rendering for lower-powered devices
- Dynamic quality settings based on detected performance

## Browser Compatibility

### Supported Browsers

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Edge (latest 2 versions)
- Safari (latest 2 versions)

### Required Features

- WebGL 2.0 support
- Pointer Lock API
- Web Audio API
- ES6+ JavaScript support
- Local Storage (for saving settings)

### Fallbacks

- WebGL 1.0 fallback with reduced features
- Simplified rendering for older hardware
- Keyboard alternatives for pointer lock functionality

## Project File Structure

```
RIFT/
├── app/                   # Public-facing application files
│   ├── animations/        # Animation JSON files
│   ├── audios/            # Audio assets
│   ├── config/            # Configuration files
│   ├── HUD/               # HUD assets
│   ├── js/                # Additional JavaScript utilities
│   ├── models/            # 3D model files (GLB/GLTF)
│   ├── navmeshes/         # Navigation mesh data
│   ├── style/             # CSS files
│   ├── textures/          # Texture assets
│   ├── utils/             # Utility functions
│   ├── index.html         # Main HTML entry point
│   └── main.js            # Main application entry point
│
├── src/                   # Source code
│   ├── controls/          # Player and camera controls
│   ├── core/              # Core engine components
│   ├── effects/           # Visual effects
│   ├── entities/          # Game entity definitions
│   ├── etc/               # Miscellaneous utilities
│   ├── evaluators/        # AI evaluation components
│   ├── goals/             # AI goal components
│   ├── triggers/          # Event trigger systems
│   ├── ui/                # User interface components
│   ├── utils/             # Utility functions
│   └── weapons/           # Weapon system components
│
├── assets/                # Source assets (pre-processing)
├── div/                   # Documentation and design files
├── inspiration/           # Reference code and examples
├── public/                # Static files for build
├── .gitignore             # Git ignore configuration
├── package.json           # NPM package configuration
└── vite.config.js         # Vite configuration
```

## Technical Constraints

### Browser Limitations

- WebGL performance varies across devices
- Audio latency issues on some platforms
- Mobile device thermal throttling concerns
- Limited access to system resources
- Inconsistent pointer lock behavior across browsers

### Asset Considerations

- Optimized models required (poly count, texture size)
- Audio compression balance between quality and size
- Total download size considerations
- Progressive loading strategy for larger assets

### Code Organization

- Modular structure with clear responsibilities
- Consistent naming conventions
- Comprehensive documentation
- Performance-critical sections identified
- Error handling for platform differences

## Deployment Strategy

### Hosting Requirements

- Static file hosting (no server-side processing required)
- Sufficient bandwidth for asset delivery
- CORS configuration for asset loading
- Appropriate cache controls for efficient updates

### Build Process

1. Asset optimization and processing
2. JavaScript bundling and minification
3. CSS processing and optimization
4. HTML template rendering
5. Cache manifest generation
6. Service worker generation (optional)

### Distribution Channels

- Direct web hosting
- GitHub Pages
- Web game portals
- Progressive Web App (future consideration)
