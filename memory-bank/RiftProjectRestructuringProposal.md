# RIFT Project Restructuring 

## Overview

This document outlines the plan and progress for restructuring the RIFT project to meet professional development standards. The restructuring involves reorganizing the folder structure, implementing consistent naming conventions, and updating code references to maintain functionality.

## New Project Structure

```
rift/
├── public/                  # Public-facing files (compiled output)
│   ├── index.html
│   ├── assets/
│   └── ...
├── src/                     # Source code
│   ├── components/          # UI and game components
│   │   ├── ui/              # User interface components
│   │   │   ├── minimap/     # All minimap related files
│   │   │   ├── hud/         # HUD elements
│   │   │   └── screens/     # Game screens (pause, start, etc.)
│   │   └── world/           # World-related components
│   ├── core/                # Core game systems
│   ├── controls/            # Control systems
│   ├── entities/            # Game entities
│   ├── effects/             # Visual effects
│   ├── evaluators/          # AI evaluation systems
│   ├── goals/               # AI goal systems
│   ├── triggers/            # Trigger systems
│   ├── utils/               # Utilities
│   │   └── asset-helpers/   # Asset management utilities
│   ├── weapons/             # Weapon systems
│   └── main.js             # Entry point
├── assets/                 # Source assets (non-compiled)
│   ├── models/             # 3D models
│   ├── textures/           # Textures
│   ├── animations/         # Animation files
│   ├── audio/              # Audio files
│   └── config/             # Configuration files
├── styles/                 # CSS styles
│   ├── components/         # Component-specific styles
│   └── main.css            # Main stylesheet
├── scripts/                # Build and utility scripts 
└── docs/                   # Project documentation
```

## Naming Conventions

- **Directories**: kebab-case (e.g., `asset-helpers`)
- **Files**: 
  - Component files: PascalCase (e.g., `AdvancedMinimap.js`)
  - Utility files: kebab-case (e.g., `path-helper.js`)
- **Classes**: PascalCase (e.g., `AdvancedMinimap`)
- **Functions/Methods**: camelCase (e.g., `getPlayerDirection()`)
- **Variables**: camelCase (e.g., `enemyDetectionRadius`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_ITEMS`)

## Progress

### Completed
1. ✅ Created base folder structure
2. ✅ Migrated minimap system to new structure:
   - Moved `minimapClass.js` → `src/components/ui/minimap/AdvancedMinimap.js`
   - Moved `minimapIntegration.js` → `src/components/ui/minimap/MinimapIntegration.js`
   - Moved `minimapKeyboardControls.js` → `src/components/ui/minimap/MinimapKeyboardControls.js`
   - Created proper exports through `src/components/ui/minimap/index.js`
   - Moved minimap documentation to `src/components/ui/minimap/docs/implementation-guide.md`
   - Updated internal references in all minimap components

### In Progress
1. Moving UI components
   - HUD elements
   - Screen components (start screen, pause screen)
   - Message components

2. Moving core game systems
   - World management
   - Asset management
   - Configuration
   - Entity management

3. Moving utility files and helpers

### Planned
1. Updating build system and configuration files
2. Updating import paths in main.js
3. Complete validation and testing
4. Creating project navigation documentation

## Challenges and Solutions

### Challenge 1: Deeply Nested References
**Solution**: Systematically update references and use index.js files to simplify imports

### Challenge 2: Inconsistent File Organization
**Solution**: Group by feature/functionality and establish clear separation of concerns

### Challenge 3: Mixing of Assets and Code
**Solution**: Separate assets into their own directory structure, with references updated accordingly

## Reference Migration Map

This table maps original file locations to their new locations in the restructured project.

| Original Path | New Path |
|---------------|----------|
| app/minimapClass.js | src/components/ui/minimap/AdvancedMinimap.js |
| app/minimapIntegration.js | src/components/ui/minimap/MinimapIntegration.js |
| app/minimapKeyboardControls.js | src/components/ui/minimap/MinimapKeyboardControls.js |
| app/minimapImplementation.md | src/components/ui/minimap/docs/implementation-guide.md |
| app/pauseScreen.js | src/components/ui/screens/PauseScreen.js |
| app/startScreen.js | src/components/ui/screens/StartScreen.js |
| app/js/utils/ModelLoader.js | src/utils/asset-helpers/ModelLoader.js |
| app/utils/pathHelper.js | src/utils/asset-helpers/path-helper.js |
| src/controls/FirstPersonControls.js | src/controls/FirstPersonControls.js (unchanged) |
| src/core/* | src/core/* (structure maintained) |
| src/entities/* | src/entities/* (structure maintained) |
| src/effects/* | src/effects/* (structure maintained) |
| src/evaluators/* | src/evaluators/* (structure maintained) |
| src/goals/* | src/goals/* (structure maintained) |
| src/utils/* | src/utils/* (various subdirectories added) |
| src/weapons/* | src/weapons/* (structure maintained) |
| app/style/* | styles/* (restructured with component-specific subdirectories) |

## Next Steps

1. Continue with UI component migration (HUD, screens)
2. Update asset paths in asset management utilities
3. Update main.js references to use new folder structure
4. Implement CSS reorganization
5. Complete HTML restructuring
6. Test complete build process

## Conclusion

The RIFT project restructuring aims to improve maintainability, readability, and scalability by implementing professional development standards. The new structure follows modern best practices for code organization and will make future development more efficient.
