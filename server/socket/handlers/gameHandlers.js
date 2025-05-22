import LobbyService from "../../services/LobbyService.js";
import LeaderboardService from "../../services/LeaderboardService.js";
import Logger from "../../utils/logger.js";

/**
 * Handlers for game-related socket events
 */
export default function registerGameHandlers(io, socket) {
    /**
     * Handle game over for a player
     */
    socket.on("playerGameOver", ({ lobbyId, reason }) => {
        if (!lobbyId) return;

        const lobby = LobbyService.getLobby(lobbyId);
        if (!lobby) return;

        const player = lobby.players[socket.id];
        if (!player) return;

        // Broadcast game over to all other players in the lobby
        io.to(lobbyId).emit("gameOverBroadcast", {
            playerId: socket.id,
            playerName: player.name,
            reason: reason,
            lobbyId: lobbyId,
        });

        Logger.log("gameHandlers", `Game over for player ${player.name} in lobby ${lobbyId}, reason: ${reason}`);
    });

    /**
     * Handle player finished level
     */
    socket.on("playerFinished", ({ lobbyId }) => {
        if (!lobbyId) return;

        const result = LobbyService.playerFinished(lobbyId, socket.id);

        if (result.success) {
            // Broadcast to all other players in the lobby
            socket.to(lobbyId).emit("playerFinished", {
                playerId: socket.id,
                lobbyId,
                finishedPlayers: result.finishedPlayers,
                totalPlayers: result.totalPlayers,
            });

            Logger.log(
                "gameHandlers",
                `Player ${socket.id} finished in lobby ${lobbyId}. ` +
                    `${result.finishedPlayers}/${result.totalPlayers} players finished.`
            );

            // If all players finished, update leaderboard
            if (result.allFinished) {
                io.to(lobbyId).emit("leaderboardUpdate", LeaderboardService.getSortedLeaderboard());
            }
        }
    });

    /**
     * Handle level completed
     */
    socket.on("levelCompleted", async ({ playerName, levelId, timeLeft, stars }) => {
        if (!playerName || !levelId) return;

        // Update leaderboard - jetzt asynchron mit await, da die Speicherung sofort passiert
        const updatedLeaderboard = await LeaderboardService.updatePlayer(playerName, levelId, timeLeft, stars);

        // Broadcast updated leaderboard
        if (updatedLeaderboard) {
            io.emit("leaderboardUpdate", updatedLeaderboard);

            // Log erfolgreiches Update
            Logger.log(
                "gameHandlers",
                `Spieler ${playerName} hat Level ${levelId} abgeschlossen: ${stars} Sterne, ${timeLeft}s verbleibend`
            );
        }
    });

    /**
     * Update leaderboard with new entry
     */
    socket.on("updateLeaderboard", async ({ playerName, levelId, timeLeft, stars }) => {
        if (!playerName) return;

        // Jetzt asynchron mit sofortiger Speicherung
        const updatedLeaderboard = await LeaderboardService.updatePlayer(playerName, levelId, timeLeft, stars);

        // Broadcast updated leaderboard to all connected clients
        if (updatedLeaderboard) {
            io.emit("leaderboardUpdate", updatedLeaderboard);

            Logger.log(
                "leaderboardHandlers",
                `Bestenliste aktualisiert für Spieler ${playerName}, Level ${levelId}, Sterne: ${stars}`
            );
        }
    });

    /**
     * Handle change level request
     */
    socket.on("changeLevel", ({ lobbyId, levelId }) => {
        if (!lobbyId || !levelId) return;

        const result = LobbyService.changeLevel(lobbyId, levelId);

        if (result.success) {
            // Broadcast level change to all other players
            socket.to(lobbyId).emit("levelChanged", {
                playerId: socket.id,
                levelId,
                lobbyId,
            });

            Logger.log("gameHandlers", `Level changed to ${levelId} in lobby ${lobbyId}`);
        }
    });

    /**
     * Handle force level change
     */
    socket.on("forceLevelChange", ({ lobbyId, levelId, initiatorId, initiatorName }) => {
        if (!lobbyId || !levelId) return;

        const result = LobbyService.changeLevel(lobbyId, levelId);

        if (result.success) {
            // Get the player name if not provided
            if (!initiatorName && socket.id) {
                const lobby = LobbyService.getLobby(lobbyId);
                if (lobby && lobby.players[socket.id]) {
                    initiatorName = lobby.players[socket.id].name;
                } else {
                    initiatorName = "Unknown player";
                }
            }

            // Broadcast level change command to ALL players in the lobby
            io.to(lobbyId).emit("forceLevelChanged", {
                levelId: levelId,
                initiatorId: initiatorId || socket.id,
                initiatorName: initiatorName,
                lobbyId: lobbyId,
                timestamp: Date.now(),
            });

            Logger.log("gameHandlers", `Force level change to ${levelId} in lobby ${lobbyId} by ${initiatorName}`);
        }
    });

    /**
     * Handle platform sync
     */
    socket.on("platformSync", ({ lobbyId, platforms, time }) => {
        if (!lobbyId || !platforms) return;

        const result = LobbyService.updatePlatforms(lobbyId, platforms, time);

        if (result.success) {
            // Broadcast to other players in this lobby
            socket.to(lobbyId).emit("platformSync", {
                lobbyId,
                platforms,
                time,
                sourcePlayer: socket.id,
            });
        }
    });

    /**
     * Handle platform sync request
     */
    socket.on("requestPlatformSync", ({ lobbyId }) => {
        const lobby = LobbyService.getLobby(lobbyId);

        if (lobby && lobby.platformPositions.length > 0) {
            socket.emit("platformSync", {
                lobbyId,
                platforms: lobby.platformPositions,
                time: lobby.platformTime,
                sourcePlayer: "server",
            });
        }
    });

    /**
     * Handle timer sync request
     */
    socket.on("requestTimerSync", ({ lobbyId }) => {
        const lobby = LobbyService.getLobby(lobbyId);

        if (lobby) {
            socket.emit("timerSync", { timeLeft: lobby.timeLeft });
        }
    });

    /**
     * Handle timer update
     */
    socket.on("updateTimer", ({ lobbyId, timeLeft, isPenalty }) => {
        const result = LobbyService.updateTimer(lobbyId, timeLeft);

        if (result.success) {
            // Broadcast to all other players in the lobby
            socket.to(lobbyId).emit("timerSync", {
                timeLeft: timeLeft,
                isPenalty: isPenalty || false,
            });
        }
    });

    /**
     * Handle player update
     */
    socket.on("playerUpdate", ({ lobbyId, ...playerData }) => {
        if (!lobbyId) return;

        const result = LobbyService.updatePlayer(lobbyId, socket.id, playerData);

        if (result.success) {
            // Send player movement to all other players in the same lobby
            socket.to(lobbyId).emit("playerMoved", {
                id: socket.id,
                name: result.player.name,
                ...playerData,
                timestamp: Date.now(),
            });

            // Periodically send full lobby state to ensure sync
            const timestamp = Date.now();
            if (timestamp % 3000 < 50) {
                // Every ~3 seconds
                const lobby = LobbyService.getLobby(lobbyId);
                if (lobby) {
                    io.to(lobbyId).emit("lobbyState", lobby.toJSON());
                }
            }
        }
    });
}
