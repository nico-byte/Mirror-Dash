import config from "../config/config.js";

/**
 * Entry in the leaderboard for a specific player
 */
class LeaderboardEntry {
    /**
     * Create a new leaderboard entry
     * @param {string} name - Player name
     */
    constructor(name) {
        this.name = name;
        this.wins = 0;
        this.lastWin = null;
        this.levels = {};
    }

    /**
     * Add a level completion entry
     * @param {string} levelId - Level ID
     * @param {number} timeLeft - Time left when completed
     * @param {number} stars - Stars earned
     */
    addLevelCompletion(levelId, timeLeft, stars) {
        const prev = this.levels[levelId];
        const newStars = stars || 0;
        const newTime = timeLeft || 0;
        // Determine if this is first completion or a better score
        const shouldUpdate = !prev || newStars > prev.stars || (newStars === prev.stars && newTime > prev.timeLeft);
        if (shouldUpdate) {
            if (!prev) {
                this.wins += 1;
            }
            this.lastWin = Date.now();
            // Store or overwrite level info
            this.levels[levelId] = {
                timeLeft: newTime,
                stars: newStars,
                completedAt: Date.now(),
            };
        }
    }

    /**
     * Calculate total stars across all levels
     * @returns {number} - Total stars
     */
    getTotalStars() {
        let total = 0;
        for (const levelId in this.levels) {
            total += this.levels[levelId].stars || 0;
        }
        return total;
    }

    /**
     * Get highest level completed
     * @returns {Object} - Level info
     */
    getHighestLevel() {
        let maxLevel = 0;
        let maxLevelId = null;
        let maxLevelName = "None";
        let maxLevelTime = 0;

        for (const levelId in this.levels) {
            // Extract level number from levelId (e.g., "level2" -> 2)
            const levelNum = parseInt(levelId.replace("level", "")) || 0;

            if (levelNum > maxLevel) {
                maxLevel = levelNum;
                maxLevelId = levelId;
                maxLevelName = `Level ${levelNum}`;
                maxLevelTime = this.levels[levelId].timeLeft || 0;
            }
        }

        return {
            level: maxLevel,
            levelId: maxLevelId,
            levelName: maxLevelName,
            timeLeft: maxLevelTime,
        };
    }
}

/**
 * Leaderboard model
 * Manages leaderboard entries
 */
class Leaderboard {
    constructor() {
        this.entries = {};
    }

    /**
     * Add or update a player entry
     * @param {string} playerName - Player name
     * @param {string} levelId - Level ID
     * @param {number} timeLeft - Time left when completed
     * @param {number} stars - Stars earned
     */
    updatePlayer(playerName, levelId, timeLeft, stars) {
        if (!playerName) return;

        // Create entry if it doesn't exist
        if (!this.entries[playerName]) {
            this.entries[playerName] = new LeaderboardEntry(playerName);
        }

        // Add level completion
        if (levelId) {
            this.entries[playerName].addLevelCompletion(levelId, timeLeft, stars);
        }
    }

    /**
     * Get sorted leaderboard entries
     * @returns {Array} - Sorted entries
     */
    getSortedEntries() {
        return Object.entries(this.entries)
            .map(([name, entry]) => {
                const highestLevel = entry.getHighestLevel();

                // Calculate elapsed time (total time - time left)
                const elapsedTime = config.LEVEL_TOTAL_TIME - highestLevel.timeLeft;

                // Format the elapsed time as MM:SS
                const minutes = Math.floor(elapsedTime / 60);
                const seconds = elapsedTime % 60;
                const timeFormatted = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

                return {
                    name,
                    wins: entry.wins || 0,
                    totalStars: entry.getTotalStars(),
                    maxLevel: highestLevel.level,
                    maxLevelName: highestLevel.levelName,
                    elapsedTime: elapsedTime, // Store raw elapsed time for sorting
                    levelTimeFormatted: timeFormatted, // Elapsed time formatted as MM:SS
                    lastPlayed: entry.lastWin ? new Date(entry.lastWin).toLocaleDateString() : "Never",
                    lastWin: entry.lastWin, // Keep for sorting
                };
            })
            .sort((a, b) => {
                // First sort by max level (descending)
                if (b.maxLevel !== a.maxLevel) {
                    return b.maxLevel - a.maxLevel;
                }

                // Then by elapsed time (ascending - faster is better)
                if (a.elapsedTime !== b.elapsedTime) {
                    return a.elapsedTime - b.elapsedTime;
                }

                // Then by total stars (descending)
                if (b.totalStars !== a.totalStars) {
                    return b.totalStars - a.totalStars;
                }

                // Finally by most recent activity (descending)
                return (b.lastWin || 0) - (a.lastWin || 0);
            })
            .slice(0, 10); // Top 10 players
    }

    /**
     * Load leaderboard from plain object
     * @param {Object} data - Plain object data
     */
    fromJSON(data) {
        this.entries = {};

        for (const playerName in data) {
            const playerData = data[playerName];
            const entry = new LeaderboardEntry(playerName);

            entry.wins = playerData.wins || 0;
            entry.lastWin = playerData.lastWin || null;
            entry.levels = playerData.levels || {};

            this.entries[playerName] = entry;
        }
    }

    /**
     * Convert to plain object for serialization
     * @returns {Object} - Plain object
     */
    toJSON() {
        return this.entries;
    }
}

export default Leaderboard;
