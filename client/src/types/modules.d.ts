// Type definitions for Phaser 3 extensions and customizations

declare module 'phaser' {
  namespace Phaser {
    namespace GameObjects {
      interface GameObject {
        // Add any custom properties you might add to game objects
        customId?: string;
        isCustom?: boolean;
      }
    }
    
    namespace Scene {
      interface Scene {
        // Add any custom scene properties
        socketManager?: any;
        audioManager?: any;
        progressManager?: any;
      }
    }
  }
}

// Socket.IO client extensions
declare module 'socket.io-client' {
  interface Socket {
    connected: boolean;
    id: any;
    
    // Lobby management events
    emit(event: 'createLobby', data: { lobbyName: string; playerName: string }, callback?: (response: any) => void): this;
    emit(event: 'joinLobby', data: { lobbyId: string; playerName: string }, callback?: (response: any) => void): this;
    emit(event: 'leaveLobby', data: { lobbyId: string }): this;
    emit(event: 'getLobbyList'): this;
    emit(event: 'requestLobbyState', data: { lobbyId: string }): this;
    emit(event: 'requestGameStart', data: { lobbyId: string }): this;
    
    // Player management events
    emit(event: 'playerUpdate', data: { lobbyId: string; x: number; y: number; animation?: string; direction?: string; levelId?: string; timestamp?: number }): this;
    emit(event: 'playerLeaveLobby', data: { lobbyId: string; playerId: string }): this;
    emit(event: 'playerFinished', data: { lobbyId: string }): this;
    emit(event: 'playerGameOver', data: { lobbyId: string; reason?: string }): this;
    
    // Game state events
    emit(event: 'levelCompleted', data: { playerName: string; levelId: string; timeLeft: number; stars: number }): this;
    emit(event: 'changeLevel', data: { lobbyId: string; levelId: string }): this;
    emit(event: 'forceLevelChange', data: { lobbyId: string; levelId: string; initiatorId?: string; initiatorName?: string }): this;
    
    // Platform and timer sync events
    emit(event: 'platformSync', data: { lobbyId: string; platforms: any[]; time: number }): this;
    emit(event: 'requestPlatformSync', data: { lobbyId: string }): this;
    emit(event: 'requestTimerSync', data: { lobbyId: string }): this;
    emit(event: 'updateTimer', data: { lobbyId: string; timeLeft: number; isPenalty?: boolean }): this;
    
    // Leaderboard events
    emit(event: 'requestLeaderboard'): this;
    emit(event: 'updateLeaderboard', data: { playerName: string; levelId: string; timeLeft: number; stars: number }): this;
    
    // Progress sync events
    emit(event: 'syncProgress', data: { playerName: string; progress: any }): this;
    
    // Listening events
    on(event: 'connect', listener: () => void): this;
    on(event: 'disconnect', listener: () => void): this;
    
    // Lobby events
    on(event: 'lobbiesList', listener: (lobbies: any[]) => void): this;
    on(event: 'lobbyState', listener: (lobby: any) => void): this;
    on(event: 'lobbyError', listener: (data: { message: string }) => void): this;
    on(event: 'gameStart', listener: (lobby: any) => void): this;
    
    // Player events
    on(event: 'playerMoved', listener: (playerInfo: any) => void): this;
    on(event: 'playerLeftLobby', listener: (data: { playerId: string; playerName: string }) => void): this;
    on(event: 'playerFinished', listener: (data: { playerId: string; lobbyId: string; finishedPlayers: number; totalPlayers: number }) => void): this;
    
    // Game state events
    on(event: 'levelChanged', listener: (data: { playerId: string; levelId: string; lobbyId: string }) => void): this;
    on(event: 'forceLevelChanged', listener: (data: { levelId: string; initiatorId: string; initiatorName: string; lobbyId: string; timestamp: number }) => void): this;
    on(event: 'gameOverBroadcast', listener: (data: { playerId?: string; playerName?: string; reason: string; lobbyId: string }) => void): this;
    
    // Platform and timer sync events
    on(event: 'platformSync', listener: (data: { lobbyId: string; platforms: any[]; time: number; sourcePlayer: string }) => void): this;
    on(event: 'timerSync', listener: (data: { timeLeft: number; isPenalty?: boolean }) => void): this;
    
    // Leaderboard events
    on(event: 'leaderboardUpdate', listener: (leaderboard: any) => void): this;
    
    // Progress sync events
    on(event: 'progressSynced', listener: (data: any) => void): this;
    on(event: 'serverProgress', listener: (serverProgress: any) => void): this;
  }
}
