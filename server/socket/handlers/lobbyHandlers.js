import LobbyService from "../../services/LobbyService.js";
import Logger from "../../utils/logger.js";

/**
 * Handlers for lobby-related socket events
 */
export default function registerLobbyHandlers(io, socket) {
    /**
     * Get available lobbies
     */
    socket.on("getLobbyList", () => {
        const availableLobbies = LobbyService.getAvailableLobbies();
        socket.emit("lobbiesList", availableLobbies);
    });

    /**
     * Create a new lobby
     */
    socket.on("createLobby", ({ lobbyName, playerName }, callback) => {
        try {
            const result = LobbyService.createLobby(socket.id, lobbyName || "Game Lobby", playerName || "Player");

            if (result.success) {
                // Join the socket room
                socket.join(result.lobbyId);

                // Send callback with success
                if (callback && typeof callback === "function") {
                    callback({ success: true, lobbyId: result.lobbyId });
                }

                // Broadcast updated lobbies list
                io.emit("lobbiesList", LobbyService.getAvailableLobbies());
            } else {
                // Send error callback
                if (callback && typeof callback === "function") {
                    callback({ success: false, error: result.error });
                }
            }
        } catch (error) {
            Logger.error("lobbyHandlers", "Failed to create lobby", error);

            if (callback && typeof callback === "function") {
                callback({ success: false, error: "Failed to create lobby" });
            }
        }
    });

    /**
     * Join an existing lobby
     */
    socket.on("joinLobby", ({ lobbyId, playerName }, callback) => {
        try {
            if (!lobbyId) {
                if (callback && typeof callback === "function") {
                    callback({ success: false, error: "No lobby ID provided" });
                }
                return;
            }

            const result = LobbyService.joinLobby(socket.id, lobbyId, playerName || "Player");

            if (result.success) {
                // Join the socket room
                socket.join(lobbyId);

                // Emit updated lobby state to all in lobby
                io.to(lobbyId).emit("lobbyState", result.lobby.toJSON());

                // Broadcast updated lobbies list
                io.emit("lobbiesList", LobbyService.getAvailableLobbies());

                // Send callback with success
                if (callback && typeof callback === "function") {
                    callback({
                        success: true,
                        lobbyId,
                        lobbyHost: result.lobby.host,
                        currentLevel: result.lobby.currentLevel,
                    });
                }
            } else {
                // Send error callback
                if (callback && typeof callback === "function") {
                    callback({ success: false, error: result.error });
                }
            }
        } catch (error) {
            Logger.error("lobbyHandlers", "Failed to join lobby", error);

            if (callback && typeof callback === "function") {
                callback({ success: false, error: "Failed to join lobby" });
            }
        }
    });

    /**
     * Leave the current lobby
     */
    socket.on("leaveLobby", ({ lobbyId }) => {
        if (!lobbyId) return;

        // Get player info before removing
        const lobby = LobbyService.getLobby(lobbyId);
        if (!lobby) return;

        const playerInfo = lobby.players[socket.id];

        // Remove player from lobby
        const result = LobbyService.removePlayerFromLobby(socket.id, lobbyId);

        if (result.success) {
            // Leave the socket room
            socket.leave(lobbyId);

            // If lobby still exists, update state for remaining players
            const updatedLobby = LobbyService.getLobby(lobbyId);
            if (updatedLobby) {
                io.to(lobbyId).emit("lobbyState", updatedLobby.toJSON());

                // Notify other players in the lobby
                socket.to(lobbyId).emit("playerLeftLobby", {
                    playerId: socket.id,
                    playerName: playerInfo ? playerInfo.name : "Unknown player",
                });
            }

            // Broadcast updated lobbies list
            io.emit("lobbiesList", LobbyService.getAvailableLobbies());
        }
    });

    /**
     * Request current lobby state
     */
    socket.on("requestLobbyState", ({ lobbyId }) => {
        const lobby = LobbyService.getLobby(lobbyId);

        if (lobby) {
            socket.emit("lobbyState", lobby.toJSON());
        } else {
            socket.emit("lobbyError", { message: "Lobby not found" });
        }
    });

    /**
     * Request to start the game
     */
    socket.on("requestGameStart", ({ lobbyId }) => {
        const result = LobbyService.startGame(lobbyId, socket.id);

        if (result.success) {
            // Emit game start event to all in lobby
            io.to(lobbyId).emit("gameStart", result.lobby.toJSON());

            // Broadcast updated lobbies list
            io.emit("lobbiesList", LobbyService.getAvailableLobbies());
        } else {
            socket.emit("lobbyError", { message: result.error });
        }
    });
}
