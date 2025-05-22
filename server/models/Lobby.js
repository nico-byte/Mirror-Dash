import Player from "./Player.js";
import config from "../config/config.js";

/**
 * Lobby model
 * Represents a game lobby with players
 */
class Lobby {
    /**
     * Create a new lobby
     * @param {string} id - Lobby ID
     * @param {string} name - Lobby name
     * @param {string} hostId - Host player ID
     */
    constructor(id, name, hostId) {
        this.id = id;
        this.name = name;
        this.host = hostId;
        this.players = {};
        this.gameStarted = false;
        this.createdAt = Date.now();
        this.currentLevel = "level1";
        this.timerStarted = false;
        this.timeLeft = config.INITIAL_TIMER;
        this.lastTimerUpdate = Date.now();
        this.playersFinished = {};
        this.platformPositions = [];
        this.platformTime = 0;
    }

    /**
     * Add a player to the lobby
     * @param {Player} player - Player to add
     * @returns {boolean} - Success
     */
    addPlayer(player) {
        // Check if lobby is full
        if (Object.keys(this.players).length >= config.MAX_PLAYERS_PER_LOBBY) {
            return false;
        }

        this.players[player.id] = player;
        return true;
    }

    /**
     * Remove a player from the lobby
     * @param {string} playerId - ID of player to remove
     * @returns {Player|null} - Removed player or null
     */
    removePlayer(playerId) {
        const player = this.players[playerId];

        if (player) {
            delete this.players[playerId];

            // If host left, assign a new host
            if (this.host === playerId) {
                const remainingPlayers = Object.keys(this.players);
                if (remainingPlayers.length > 0) {
                    this.host = remainingPlayers[0];
                }
            }
        }

        return player;
    }

    /**
     * Check if lobby is empty
     * @returns {boolean} - True if empty
     */
    isEmpty() {
        return Object.keys(this.players).length === 0;
    }

    /**
     * Check if lobby is full
     * @returns {boolean} - True if full
     */
    isFull() {
        return Object.keys(this.players).length >= config.MAX_PLAYERS_PER_LOBBY;
    }

    /**
     * Start the game
     * @returns {boolean} - Success
     */
    startGame() {
        // Only start if there are enough players
        if (Object.keys(this.players).length < 2) {
            return false;
        }

        this.gameStarted = true;
        this.timerStarted = true;
        this.timeLeft = config.INITIAL_TIMER;
        this.lastTimerUpdate = Date.now();

        // Reset player finished states
        for (const playerId in this.players) {
            this.players[playerId].hasFinished = false;
        }

        return true;
    }

    /**
     * Change the current level
     * @param {string} levelId - New level ID
     */
    changeLevel(levelId) {
        this.currentLevel = levelId;
        this.timeLeft = config.INITIAL_TIMER;
        this.lastTimerUpdate = Date.now();

        // Reset player finished states
        for (const playerId in this.players) {
            this.players[playerId].hasFinished = false;
        }

        // Clear players finished
        this.playersFinished = {};
    }

    /**
     * Update the timer
     * @param {number} currentTime - Current time
     * @returns {boolean} - True if timer reached zero
     */
    updateTimer(currentTime) {
        if (!this.timerStarted || !this.gameStarted) {
            return false;
        }

        const elapsedSeconds = Math.floor((currentTime - this.lastTimerUpdate) / 1000);

        if (elapsedSeconds > 0) {
            this.timeLeft = Math.max(0, this.timeLeft - elapsedSeconds);
            this.lastTimerUpdate = currentTime;

            // Return true if timer reached zero
            return this.timeLeft === 0;
        }

        return false;
    }

    /**
     * Mark a player as finished
     * @param {string} playerId - Player ID
     * @returns {Object} - Game completion status
     */
    playerFinished(playerId) {
        const player = this.players[playerId];
        if (!player) return { success: false };

        // Mark player as finished
        player.hasFinished = true;
        this.playersFinished[playerId] = true;

        // Check if all players have finished
        const totalPlayers = Object.keys(this.players).length;
        const finishedPlayers = Object.values(this.players).filter(p => p.hasFinished).length;

        return {
            success: true,
            finishedPlayers,
            totalPlayers,
            allFinished: finishedPlayers >= totalPlayers,
        };
    }

    /**
     * Convert to a plain object for serialization
     * @returns {Object} - Plain object representation
     */
    toJSON() {
        // Convert players to plain objects
        const playersObj = {};
        for (const id in this.players) {
            playersObj[id] = this.players[id].toJSON();
        }

        return {
            id: this.id,
            name: this.name,
            host: this.host,
            players: playersObj,
            gameStarted: this.gameStarted,
            createdAt: this.createdAt,
            currentLevel: this.currentLevel,
            timerStarted: this.timerStarted,
            timeLeft: this.timeLeft,
            lastTimerUpdate: this.lastTimerUpdate,
            playersFinished: this.playersFinished,
        };
    }

    /**
     * Create a Lobby from a plain object
     * @param {Object} data - Plain object data
     * @returns {Lobby} - New Lobby instance
     */
    static fromJSON(data) {
        const lobby = new Lobby(data.id, data.name, data.host);

        lobby.gameStarted = data.gameStarted || false;
        lobby.createdAt = data.createdAt || Date.now();
        lobby.currentLevel = data.currentLevel || "level1";
        lobby.timerStarted = data.timerStarted || false;
        lobby.timeLeft = data.timeLeft || config.INITIAL_TIMER;
        lobby.lastTimerUpdate = data.lastTimerUpdate || Date.now();
        lobby.playersFinished = data.playersFinished || {};

        // Convert player plain objects to Player instances
        if (data.players) {
            for (const id in data.players) {
                lobby.players[id] = Player.fromJSON(data.players[id]);
            }
        }

        return lobby;
    }
}

export default Lobby;
