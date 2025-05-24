# TypeScript Migration Guide

This document provides guidance for migrating the Mirror Dash game from JavaScript to TypeScript.

## Setup Complete ✅

The project is now ready for TypeScript migration with the following setup:

### Installed Dependencies
- `typescript`: ^5.8.3
- `@types/node`: ^20.17.50

### Configuration Files
- `tsconfig.json`: Configured for gradual migration with `allowJs: true`
- `.vscode/settings.json`: Optimized VS Code settings for TypeScript development
- `.vscode/tasks.json`: Build tasks for type checking and development
- `.vscode/launch.json`: Debug configurations

### Type Definitions
- `src/types/global.d.ts`: Global type definitions
- `src/types/modules.d.ts`: Module augmentations for Phaser and Socket.IO
- `src/types/game.d.ts`: Game-specific interfaces and types
- `src/types/existing-modules.d.ts`: Type declarations for existing JS modules

### Available Scripts
- `npm run type-check`: Check types without building
- `npm run type-check:watch`: Watch mode for type checking
- `npm run dev`: Development server (existing)
- `npm run build`: Production build (existing)

## Migration Strategy

### Phase 1: Type Checking Existing JS Files
1. Enable stricter TypeScript settings gradually in `tsconfig.json`
2. Fix any type errors that appear
3. Add JSDoc comments to existing JavaScript files for better type inference

### Phase 2: Convert Utilities and Components
Start with smaller, self-contained modules:
1. `src/game/components/AudioManager.js` → `.ts`
2. `src/game/components/SocketManager.js` → `.ts`
3. `src/game/components/ProgressManager.js` → `.ts`

### Phase 3: Convert Entities
1. `src/game/entities/Player.js` → `.ts`
2. `src/game/entities/PlayerPhysics.js` → `.ts`
3. Other entity files

### Phase 4: Convert Scenes
1. `src/game/scenes/Boot.js` → `.ts`
2. `src/game/scenes/Preloader.js` → `.ts`
3. Other scene files

### Phase 5: Convert Main Game Files
1. `src/game/main.js` → `.ts`
2. `src/main.js` → `.ts`

## Best Practices

### 1. Use Strict Mode Gradually
Start with `"strict": false` and enable strict options one by one:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### 2. Type Your Phaser Objects
```typescript
class Player extends Phaser.GameObjects.Sprite {
  private health: number = 100;
  private speed: number = 200;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
  }
}
```

### 3. Use Interfaces for Configuration
```typescript
interface LevelConfig {
  width: number;
  height: number;
  gravity: number;
  platforms: PlatformData[];
}
```

### 4. Type Your Socket Events
```typescript
// Use the predefined socket types from modules.d.ts
socket.emit('player-move', { x: 100, y: 200 });
```

## Common Patterns

### Converting a Scene
```typescript
export default class GameScene extends Phaser.Scene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.player = new Player(this, 100, 100);
    this.platforms = this.physics.add.staticGroup();
  }
}
```

### Converting a Component
```typescript
export default class AudioManager {
  private scene: Phaser.Scene;
  private currentMusic?: Phaser.Sound.BaseSound;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  playMusic(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    this.currentMusic = this.scene.sound.play(key, config);
  }
}
```

## Testing the Migration

1. Run `npm run type-check` to verify no type errors
2. Run `npm run dev` to ensure the game still works
3. Test all game functionality after each file conversion

## Troubleshooting

### Common Issues
1. **Module resolution errors**: Check path mappings in `tsconfig.json`
2. **Phaser type issues**: Use the type definitions in `src/types/modules.d.ts`
3. **Import/export errors**: Ensure proper ES module syntax

### Getting Help
- Check the TypeScript compiler errors for specific guidance
- Use the type definitions provided in the `src/types/` directory
- Gradually enable stricter type checking as you convert files
