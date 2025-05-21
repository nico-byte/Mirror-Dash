/**
 * Player model
 * Represents a player in the game
 */
class Player {
    /**
     * Create a new player
     * @param {string} id - Socket ID
     * @param {string} name - Player name
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     */
    constructor(id, name, x = 230, y = 250) {
        this.id = id;
        this.name = name || `Player_${id.substring(0, 4)}`;
        this.x = x;
        this.y = y;
        this.animation = "idle";
        this.direction = "right";
        this.hasFinished = false;
        this.lastUpdate = Date.now();
    }

    /**
     * Update player position and state
     * @param {Object} data - New player data
     * @returns {Player} - Updated player
     */
    update(data) {
        if (data.x !== undefined) this.x = data.x;
        if (data.y !== undefined) this.y = data.y;
        if (data.animation !== undefined) this.animation = data.animation;
        if (data.direction !== undefined) this.direction = data.direction;

        this.lastUpdate = Date.now();
        return this;
    }

    /**
     * Check if the player is active (updated recently)
     * @param {number} maxIdleTime - Maximum idle time in ms
     * @returns {boolean} - True if player is active
     */
    isActive(maxIdleTime) {
        return Date.now() - this.lastUpdate < maxIdleTime;
    }

    /**
     * Convert to a plain object for serialization
     * @returns {Object} - Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            x: this.x,
            y: this.y,
            animation: this.animation,
            direction: this.direction,
            hasFinished: this.hasFinished,
            lastUpdate: this.lastUpdate,
        };
    }

    /**
     * Create a Player from a plain object
     * @param {Object} data - Plain object data
     * @returns {Player} - New Player instance
     */
    static fromJSON(data) {
        const player = new Player(data.id, data.name, data.x, data.y);
        player.animation = data.animation || "idle";
        player.direction = data.direction || "right";
        player.hasFinished = data.hasFinished || false;
        player.lastUpdate = data.lastUpdate || Date.now();
        return player;
    }
}

export default Player;
