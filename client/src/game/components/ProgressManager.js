/**
 * ProgressManager class for tracking and persisting player progress
 * Handles level completion, star ratings, and synchronization with the server
 */
export class ProgressManager {
    constructor() {
        this.progress = {
            playerName: "",
            levels: {},
            lastUpdate: Date.now(),
        };
    }

    /**
     * Load player progress from local storage
     * @param {string} playerName - The player's name
     */
    loadProgress(playerName) {
        if (!playerName) return;

        this.progress.playerName = playerName;

        try {
            // Attempt to load from localStorage
            const savedProgress = localStorage.getItem(`multiplayer_progress_${playerName}`);
            if (savedProgress) {
                const parsed = JSON.parse(savedProgress);
                this.progress = parsed;
                console.log(`Loaded progress for player: ${playerName}`, this.progress);
            } else {
                console.log(`No saved progress found for player: ${playerName}, creating new profile`);
                // Initialize with level 1 unlocked
                this.progress = {
                    playerName: playerName,
                    levels: {
                        level1: { unlocked: true, completed: false, bestTime: null, stars: 0 },
                    },
                    lastUpdate: Date.now(),
                };
                this.saveProgress();
            }
        } catch (error) {
            // console.error("Error loading player progress:", error);
            // Initialize with default progress
            this.progress = {
                playerName: playerName,
                levels: {
                    level1: { unlocked: true, completed: false, bestTime: null, stars: 0 },
                },
                lastUpdate: Date.now(),
            };
            this.saveProgress();
        }
    }

    /**
     * Save current progress to localStorage
     */
    saveProgress() {
        if (!this.progress.playerName) return;

        try {
            this.progress.lastUpdate = Date.now();
            localStorage.setItem(`multiplayer_progress_${this.progress.playerName}`, JSON.stringify(this.progress));
            console.log(`Progress saved for player: ${this.progress.playerName}`);
        } catch (error) {
            // console.error("Error saving player progress:", error);
        }
    }

    /**
     * Synchronize progress with the server
     * @param {object} socket - Socket.io connection
     */
    syncWithServer(socket) {
        if (!socket || !socket.connected || !this.progress.playerName) return;

        // Send progress to server
        socket.emit("syncProgress", {
            playerName: this.progress.playerName,
            progress: this.progress,
        });

        // Listen for server responses
        socket.on("progressSynced", data => {
            console.log("Progress synced with server:", data);
        });

        // Merge server progress with local progress
        socket.on("serverProgress", serverProgress => {
            if (serverProgress && serverProgress.lastUpdate > this.progress.lastUpdate) {
                console.log("Received newer progress from server");
                this.progress = serverProgress;
                this.saveProgress();
            }
        });
    }

    /**
     * Check if a level is unlocked
     * @param {string} levelId - The ID of the level to check
     * @returns {boolean} - Whether the level is unlocked
     */
    isLevelUnlocked(levelId) {
        // Level 1 is always unlocked
        if (levelId === "level1") return true;

        // Check if level exists in progress
        if (!this.progress.levels[levelId]) {
            // If it doesn't exist, check if previous level is completed
            const prevLevelId = this.getPreviousLevelId(levelId);
            return prevLevelId ? this.isLevelCompleted(prevLevelId) : false;
        }

        return !!this.progress.levels[levelId].unlocked;
    }

    /**
     * Check if a level is completed
     * @param {string} levelId - The ID of the level to check
     * @returns {boolean} - Whether the level is completed
     */
    isLevelCompleted(levelId) {
        return !!(this.progress.levels[levelId] && this.progress.levels[levelId].completed);
    }

    /**
     * Get progress information for a specific level
     * @param {string} levelId - The ID of the level
     * @returns {object|null} - The level progress data or null if not found
     */
    getLevelProgress(levelId) {
        return this.progress.levels[levelId] || null;
    }

    /**
     * Get the previous level ID based on the current level
     * @param {string} levelId - The current level ID
     * @returns {string|null} - The previous level ID or null if there is none
     */
    getPreviousLevelId(levelId) {
        // Simple numeric level ID handling
        if (levelId.startsWith("level")) {
            const currentNum = parseInt(levelId.replace("level", ""));
            if (currentNum > 1) {
                return `level${currentNum - 1}`;
            }
        }
        return null;
    }

    /**
     * Record level completion and calculate stars
     * @param {string} levelId - The ID of the completed level
     * @param {number} timeLeft - Time left in seconds when level was completed
     */
    completeLevel(levelId, timeLeft) {
        if (!this.progress.levels[levelId]) {
            this.progress.levels[levelId] = {
                unlocked: true,
                completed: false,
                bestTime: null,
                stars: 0,
            };
        }

        // Mark level as completed
        this.progress.levels[levelId].completed = true;

        // Update best time if this is better than previous
        if (!this.progress.levels[levelId].bestTime || timeLeft > this.progress.levels[levelId].bestTime) {
            this.progress.levels[levelId].bestTime = timeLeft;

            // Calculate stars based on time left
            let stars = 1; // At least 1 star for completion

            if (timeLeft > 150) {
                // More than 2:30 left
                stars = 3;
            } else if (timeLeft > 120) {
                // More than 2:00 left
                stars = 2;
            }

            this.progress.levels[levelId].stars = stars;
        }

        // Unlock the next level
        const nextLevelNum = parseInt(levelId.replace("level", "")) + 1;
        const nextLevelId = `level${nextLevelNum}`;

        if (!this.progress.levels[nextLevelId]) {
            this.progress.levels[nextLevelId] = {
                unlocked: true,
                completed: false,
                bestTime: null,
                stars: 0,
            };
        } else {
            this.progress.levels[nextLevelId].unlocked = true;
        }

        // Save progress
        this.saveProgress();

        return {
            stars: this.progress.levels[levelId].stars,
            bestTime: this.progress.levels[levelId].bestTime,
            nextLevelId: nextLevelId,
        };
    }
}
