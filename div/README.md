# RIFT5

A 3D first-person shooter built with Three.js and Yuka.js.

## Project Structure

- `/src` - Source code
  - `/core` - Core game systems
  - `/controls` - Player controls and input
  - `/effects` - Visual effects
  - `/entities` - Game entities
  - `/etc` - Utility functions
  - `/evaluators` - AI behavior evaluators
  - `/goals` - AI goal-oriented behaviors
  - `/triggers` - Game event triggers
  - `/weapons` - Weapon systems
- `/app` - Game assets
  - `/animations` - Animation JSON files
  - `/audios` - Sound effects
  - `/config` - Game configuration
  - `/models` - 3D models
  - `/navmeshes` - Navigation mesh data
  - `/style` - CSS styling
  - `/textures` - Game textures

## Development

This project uses Vite for development and bundling.

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Technology Stack

- Vite - Development server and bundler
- Three.js - 3D rendering engine
- Yuka.js - Game entity management and AI
- ES modules - Modern JavaScript modules

Deployed with GitHub Actions 🚀
