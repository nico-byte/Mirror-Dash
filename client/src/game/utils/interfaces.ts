import { Socket } from 'socket.io-client';

export interface GameInitData {
    levelId?: string;
    playerName?: string;
    isTransitioning?: boolean;
    lobbyId?: string;
    socket?: Socket;
}

export interface WASDKeys {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    Space: Phaser.Input.Keyboard.Key;
}

export interface GameSizeInfo {
    width: number;
    height: number;
}