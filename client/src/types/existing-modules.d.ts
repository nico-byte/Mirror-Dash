// Type declarations for existing JavaScript modules
// This file helps TypeScript understand the structure of your existing JS modules

declare module '@/game/main' {
  export default function StartGame(container: string): void;
}

declare module '@/game/components/AudioManager' {
  export default class AudioManager {
    constructor(scene: Phaser.Scene);
    playMusic(key: string, config?: any): void;
    playSound(key: string, config?: any): void;
    stopMusic(): void;
    setVolume(volume: number): void;
  }
}

declare module '@/game/components/SocketManager' {
  export default class SocketManager {
    constructor(scene: Phaser.Scene);
    connect(url: string): void;
    disconnect(): void;
    emit(event: string, data?: any): void;
    on(event: string, callback: Function): void;
  }
}

declare module '@/game/components/ProgressManager' {
  export default class ProgressManager {
    constructor(scene: Phaser.Scene);
    saveProgress(level: number, data: any): void;
    loadProgress(): any;
    resetProgress(): void;
  }
}

declare module '@/game/entities/Player' {
  export default class Player extends Phaser.GameObjects.Sprite {
    constructor(scene: Phaser.Scene, x: number, y: number);
    move(direction: 'left' | 'right'): void;
    jump(): void;
    takeDamage(amount: number): void;
  }
}

declare module '@/levels/*' {
  const level: any;
  export default level;
}

declare module '@/game/scenes/*' {
  export default class Scene extends Phaser.Scene {
    constructor();
  }
}
