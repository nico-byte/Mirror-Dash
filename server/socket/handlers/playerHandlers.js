import LobbyService from "../../services/LobbyService.js";
import Logger from "../../utils/logger.js";

/**
 * Handlers for player-related socket events
 */
export default function registerPlayerHandlers(io, socket) {
    /**
     * Handle player leave lobby
     */
    socket.on("playerLeaveLobby", ({ lobbyId, playerId }) => {
        if (!lobbyId) return;

        const lobby = LobbyService.getLobby(lobbyId);
        if (!lobby) return;

        // Ensure the player can only leave themselves
        if (playerId !== socket.id) return;

        // Store player info before removing
        const playerInfo = lobby.players[playerId];
        if (!playerInfo) return;

        // Leave socket room
        socket.leave(lobbyId);

        // Remove from lobby
        const result = LobbyService.removePlayerFromLobby(playerId, lobbyId);

        if (result.success) {
            // Notify other players that this player has left
            socket.to(lobbyId).emit("playerLeftLobby", {
                playerId: playerId,
                playerName: playerInfo.name,
            });

            // If lobby still exists, update state for remaining players
            const updatedLobby = LobbyService.getLobby(lobbyId);
            if (updatedLobby) {
                io.to(lobbyId).emit("lobbyState", updatedLobby.toJSON());
            }

            // Broadcast updated lobbies list
            io.emit("lobbiesList", LobbyService.getAvailableLobbies());

            Logger.log("playerHandlers", `Player ${playerInfo.name} (${playerId}) left lobby ${lobbyId}`);
        }
    });

    /**
     * Cleanup player data on disconnect
     */
    socket.on("disconnect", () => {
        // Find all lobbies this player is in
        const playerLobbies = [];

        for (const lobbyId in LobbyService.lobbies) {
            const lobby = LobbyService.lobbies[lobbyId];

            if (lobby.players[socket.id]) {
                playerLobbies.push({
                    lobbyId,
                    playerName: lobby.players[socket.id].name,
                });
            }
        }

        // For each lobby, notify other players and remove this player
        playerLobbies.forEach(({ lobbyId, playerName }) => {
            // Notify other players in the lobby
            socket.to(lobbyId).emit("playerLeftLobby", {
                playerId: socket.id,
                playerName: playerName,
            });

            // Remove from the lobby
            const result = LobbyService.removePlayerFromLobby(socket.id, lobbyId);

            if (result.success) {
                // If lobby still exists, update state for remaining players
                const updatedLobby = LobbyService.getLobby(lobbyId);
                if (updatedLobby) {
                    io.to(lobbyId).emit("lobbyState", updatedLobby.toJSON());
                }
            }
        });

        // Broadcast updated lobbies list if any lobbies were affected
        if (playerLobbies.length > 0) {
            io.emit("lobbiesList", LobbyService.getAvailableLobbies());

            Logger.log(
                "playerHandlers",
                `Player ${socket.id} disconnected and removed from ${playerLobbies.length} lobbies`
            );
        }
    });
}
