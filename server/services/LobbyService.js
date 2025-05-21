import { uuid } from "uuidv4";
import Lobby from "../models/Lobby.js";
import Player from "../models/Player.js";
import config from "../config/config.js";
import Logger from "../utils/logger.js";

/**
 * Service for managing game lobbies
 */
class LobbyService {
    constructor() {
        this.lobbies = {};
        this.cleanupInterval = null;
    }

    /**
     * Initialize the lobby service
     */
    initialize() {
        // Set up periodic cleanup
        this.cleanupInterval = setInterval(() => {
            this.cleanupInactiveLobbies();
        }, config.CLEANUP_INTERVAL);

        Logger.log("LobbyService", "Lobby service initialized");
    }

    /**
     * Create a new lobby
     * @param {string} socketId - Socket ID of the host
     * @param {string} lobbyName - Name of the lobby
     * @param {string} playerName - Name of the host player
     * @returns {Object} - Created lobby info
     */
    createLobby(socketId, lobbyName, playerName) {
        const lobbyId = uuid();

        // Create new lobby
        const lobby = new Lobby(lobbyId, lobbyName, socketId);
        this.lobbies[lobbyId] = lobby;

        // Add the host player
        const player = new Player(socketId, playerName);
        lobby.addPlayer(player);

        Logger.log("LobbyService", `Created new lobby: ${lobbyName} (${lobbyId}) by ${playerName}`);

        return {
            success: true,
            lobbyId,
            lobby,
        };
    }

    /**
     * Add a player to a lobby
     * @param {string} socketId - Socket ID of the player
     * @param {string} lobbyId - ID of the lobby to join
     * @param {string} playerName - Name of the player
     * @returns {Object} - Result with success status
     */
    joinLobby(socketId, lobbyId, playerName) {
        const lobby = this.lobbies[lobbyId];

        if (!lobby) {
            return {
                success: false,
                error: "Lobby not found",
            };
        }

        if (lobby.isFull()) {
            return {
                success: false,
                error: "Lobby is full",
            };
        }

        // Create new player
        const player = new Player(socketId, playerName);

        // Remove player from any other lobbies they might be in
        this.removePlayerFromAllLobbies(socketId);

        // Add player to lobby
        const added = lobby.addPlayer(player);

        if (!added) {
            return {
                success: false,
                error: "Failed to add player to lobby",
            };
        }

        Logger.log("LobbyService", `Player ${playerName} (${socketId}) joined lobby ${lobbyId}`);

        return {
            success: true,
            lobbyId,
            lobby,
            lobbyHost: lobby.host,
        };
    }

    /**
     * Remove a player from a specific lobby
     * @param {string} playerId - ID of the player to remove
     * @param {string} lobbyId - ID of the lobby
     * @returns {Object} - Result with removed player
     */
    removePlayerFromLobby(playerId, lobbyId) {
        const lobby = this.lobbies[lobbyId];
        if (!lobby) {
            return { success: false, error: "Lobby not found" };
        }

        const player = lobby.removePlayer(playerId);

        // If lobby is empty, remove it
        if (lobby.isEmpty()) {
            delete this.lobbies[lobbyId];
            Logger.log("LobbyService", `Removed empty lobby ${lobbyId}`);
        }

        if (player) {
            Logger.log("LobbyService", `Removed player ${player.name} (${playerId}) from lobby ${lobbyId}`);
            return { success: true, player };
        } else {
            return { success: false, error: "Player not found in lobby" };
        }
    }

    /**
     * Remove a player from all lobbies
     * @param {string} playerId - ID of the player to remove
     * @returns {Array} - Lobbies the player was removed from
     */
    removePlayerFromAllLobbies(playerId) {
        const removedFrom = [];

        for (const lobbyId in this.lobbies) {
            const lobby = this.lobbies[lobbyId];

            if (lobby.players[playerId]) {
                const result = this.removePlayerFromLobby(playerId, lobbyId);
                if (result.success) {
                    removedFrom.push(lobbyId);
                }
            }
        }

        return removedFrom;
    }

    /**
     * Get a specific lobby
     * @param {string} lobbyId - ID of the lobby
     * @returns {Lobby|null} - Lobby or null if not found
     */
    getLobby(lobbyId) {
        return this.lobbies[lobbyId] || null;
    }

    /**
     * Get all available lobbies (not started and not full)
     * @returns {Object} - Map of available lobbies
     */
    getAvailableLobbies() {
        const availableLobbies = {};

        for (const lobbyId in this.lobbies) {
            const lobby = this.lobbies[lobbyId];

            if (!lobby.gameStarted && !lobby.isFull()) {
                availableLobbies[lobbyId] = {
                    id: lobby.id,
                    name: lobby.name,
                    playerCount: Object.keys(lobby.players).length,
                    maxPlayers: config.MAX_PLAYERS_PER_LOBBY,
                    host: lobby.host,
                };
            }
        }

        return availableLobbies;
    }

    /**
     * Start a game in a lobby
     * @param {string} lobbyId - ID of the lobby
     * @param {string} requesterId - ID of the player requesting to start
     * @returns {Object} - Result with success status
     */
    startGame(lobbyId, requesterId) {
        const lobby = this.lobbies[lobbyId];

        if (!lobby) {
            return { success: false, error: "Lobby not found" };
        }

        if (lobby.host !== requesterId) {
            return { success: false, error: "Only the host can start the game" };
        }

        const started = lobby.startGame();

        if (!started) {
            return { success: false, error: "Failed to start game" };
        }

        Logger.log("LobbyService", `Game started in lobby ${lobbyId}`);

        return { success: true, lobby };
    }

    /**
     * Change level in a lobby
     * @param {string} lobbyId - ID of the lobby
     * @param {string} levelId - ID of the new level
     * @returns {Object} - Result with success status
     */
    changeLevel(lobbyId, levelId) {
        const lobby = this.lobbies[lobbyId];

        if (!lobby) {
            return { success: false, error: "Lobby not found" };
        }

        lobby.changeLevel(levelId);

        Logger.log("LobbyService", `Level changed to ${levelId} in lobby ${lobbyId}`);

        return { success: true, lobby };
    }

    /**
     * Update player in lobby
     * @param {string} lobbyId - ID of the lobby
     * @param {string} playerId - ID of the player
     * @param {Object} data - New player data
     * @returns {Object} - Result with updated player
     */
    updatePlayer(lobbyId, playerId, data) {
        const lobby = this.lobbies[lobbyId];

        if (!lobby || !lobby.players[playerId]) {
            return { success: false, error: "Player or lobby not found" };
        }

        const player = lobby.players[playerId];
        player.update(data);

        return { success: true, player };
    }

    /**
     * Mark player as finished
     * @param {string} lobbyId - ID of the lobby
     * @param {string} playerId - ID of the player
     * @returns {Object} - Result with finish status
     */
    playerFinished(lobbyId, playerId) {
        const lobby = this.lobbies[lobbyId];

        if (!lobby) {
            return { success: false, error: "Lobby not found" };
        }

        return lobby.playerFinished(playerId);
    }

    /**
     * Update timer in a lobby
     * @param {string} lobbyId - ID of the lobby
     * @param {number} timeLeft - New time left
     * @returns {Object} - Result with success status
     */
    updateTimer(lobbyId, timeLeft) {
        const lobby = this.lobbies[lobbyId];

        if (!lobby) {
            return { success: false, error: "Lobby not found" };
        }

        lobby.timeLeft = timeLeft;
        lobby.lastTimerUpdate = Date.now();

        return { success: true, lobby };
    }

    /**
     * Update platform positions in a lobby
     * @param {string} lobbyId - ID of the lobby
     * @param {Array} platforms - Platform positions
     * @param {number} time - Timestamp
     * @returns {Object} - Result with success status
     */
    updatePlatforms(lobbyId, platforms, time) {
        const lobby = this.lobbies[lobbyId];

        if (!lobby) {
            return { success: false, error: "Lobby not found" };
        }

        lobby.platformPositions = platforms;
        lobby.platformTime = time;

        return { success: true };
    }

    /**
     * Process timers for all active lobbies
     */
    processTimers() {
        const now = Date.now();

        for (const lobbyId in this.lobbies) {
            const lobby = this.lobbies[lobbyId];

            // Only update timer for active games
            if (lobby.gameStarted && lobby.timerStarted) {
                const timerEnded = lobby.updateTimer(now);

                if (timerEnded) {
                    Logger.log("LobbyService", `Timer ended in lobby ${lobbyId}`);
                    // Timer will be broadcast by the caller
                }
            }
        }
    }

    /**
     * Clean up inactive lobbies
     */
    cleanupInactiveLobbies() {
        const now = Date.now();
        let removed = 0;

        for (const lobbyId in this.lobbies) {
            const lobby = this.lobbies[lobbyId];

            if (now - lobby.createdAt > config.MAX_IDLE_TIME) {
                // Check if any player has updated recently
                let hasActivePlayer = false;

                for (const playerId in lobby.players) {
                    if (lobby.players[playerId].isActive(config.MAX_IDLE_TIME)) {
                        hasActivePlayer = true;
                        break;
                    }
                }

                if (!hasActivePlayer) {
                    delete this.lobbies[lobbyId];
                    removed++;
                }
            }
        }

        if (removed > 0) {
            Logger.log("LobbyService", `Cleaned up ${removed} inactive lobbies`);
        }
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}

// Export as singleton
export default new LobbyService();
