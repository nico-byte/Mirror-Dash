import LeaderboardService from "../../services/LeaderboardService.js";
import Logger from "../../utils/logger.js";

/**
 * Handlers for leaderboard-related socket events
 */
export default function registerLeaderboardHandlers(io, socket) {
    /**
     * Get current leaderboard
     */
    socket.on("requestLeaderboard", () => {
        const leaderboard = LeaderboardService.getSortedLeaderboard();
        socket.emit("leaderboardUpdate", leaderboard);

        Logger.log("leaderboardHandlers", "Leaderboard requested by client");
    });

    /**
     * Update leaderboard with new entry
     */
    socket.on("updateLeaderboard", async ({ playerName, levelId, timeLeft, stars }) => {
        if (!playerName) return;

        // Update leaderboard
        const updatedLeaderboard = LeaderboardService.updatePlayer(playerName, levelId, timeLeft, stars);

        // Broadcast updated leaderboard to all connected clients
        io.emit("leaderboardUpdate", updatedLeaderboard);

        Logger.log(
            "leaderboardHandlers",
            `Leaderboard updated for player ${playerName}, level ${levelId}, stars: ${stars}`
        );
    });
}
