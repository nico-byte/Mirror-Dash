/**
 * Application configuration settings
 */
export default {
    // Server configuration
    PORT: process.env.PORT || 9000,

    // Game settings
    MAX_PLAYERS_PER_LOBBY: 2,
    INITIAL_TIMER: 180, // 3 minutes in seconds
    LEVEL_TOTAL_TIME: 180, // Used for leaderboard calculations

    // Cleanup timers
    MAX_IDLE_TIME: 3600000, // 1 hour in milliseconds
    CLEANUP_INTERVAL: 300000, // Run cleanup every 5 minutes
    LEADERBOARD_SAVE_INTERVAL: 300000, // Save leaderboard every 5 minutes

    // File paths
    LEADERBOARD_FILE: "leaderboard.json",
};
