// Game-specific type definitions

export interface PlayerData {
  id: string;
  name: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  isGrounded: boolean;
  health: number;
  score: number;
}

export interface LevelData {
  id: number;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  platforms: PlatformData[];
  spawns: SpawnPointData[];
  collectibles: CollectibleData[];
  hazards: HazardData[];
}

export interface PlatformData {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'static' | 'moving' | 'breakable' | 'jump_pad';
  properties?: Record<string, any>;
}

export interface SpawnPointData {
  x: number;
  y: number;
  isDefault: boolean;
}

export interface CollectibleData {
  id: string;
  x: number;
  y: number;
  type: 'coin' | 'gem' | 'powerup';
  value: number;
  collected: boolean;
}

export interface HazardData {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spikes' | 'lava' | 'saw';
  damage: number;
}

export interface GameState {
  currentLevel: number;
  players: Record<string, PlayerData>;
  isMultiplayer: boolean;
  gameStarted: boolean;
  gameEnded: boolean;
  winner?: string;
}

export interface LobbyData {
  id: string;
  name: string;
  players: PlayerData[];
  maxPlayers: number;
  isPrivate: boolean;
  gameMode: 'race' | 'survival' | 'collect';
}
