// Global type definitions for the Mirror Dash game

// Game configuration types
export interface GameConfig {
  container?: string;
  width?: number;
  height?: number;
}

// Window extensions for global access
declare global {
  interface Window {
    game?: Phaser.Game;
    StartGame?: (container: string) => void;
  }
}

// Asset types for Phaser
export interface AssetPack {
  files: AssetFile[];
}

export interface AssetFile {
  type: string;
  key: string;
  url?: string;
  path?: string;
  [key: string]: any;
}

// Custom event types
export type GameEventType = 
  | 'player-join'
  | 'player-leave'
  | 'game-start'
  | 'game-end'
  | 'level-complete';

export interface GameEvent {
  type: GameEventType;
  data?: any;
  timestamp?: number;
}
