import { Server } from "socket.io";
import { createServer } from "http";
import { uuid } from "uuidv4";

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const MAX_PLAYERS_PER_LOBBY = 2;
const DEBUG_MODE = process.env.DEBUG === "true"; // Set to true to enable debug logs

// Helper function for logging in debug mode
function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log(...args);
    }
}

// Store all lobbies
const lobbies = {};

// Create a new lobby
const createLobby = (socket, lobbyName, playerName) => {
    const lobbyId = uuid();
    console.log(`Creating lobby: ${lobbyName} (${lobbyId})`);

    lobbies[lobbyId] = {
        id: lobbyId,
        name: lobbyName,
        host: socket.id,
        gameStarted: false,
        players: {},
        createdAt: Date.now(),
    };

    // Add the creating player to the lobby
    addPlayerToLobby(socket, lobbyId, playerName);
    return lobbyId;
};

// Add a player to a lobby
const addPlayerToLobby = (socket, lobbyId, playerName) => {
    const lobby = lobbies[lobbyId];

    if (!lobby) {
        console.error(`Lobby not found: ${lobbyId}`);
        socket.emit("lobbyError", { message: "Lobby not found." });
        return false;
    }

    if (Object.keys(lobby.players).length >= MAX_PLAYERS_PER_LOBBY) {
        console.error(`Lobby is full: ${lobbyId}`);
        socket.emit("lobbyError", { message: "Lobby is full." });
        return false;
    }

    // Remove player from any other lobbies they might be in
    removePlayerFromAllLobbies(socket.id);

    // Join the socket to the lobby room
    socket.join(lobbyId);

    const player = {
        id: socket.id,
        name: playerName,
        x: 230,
        y: 250,
        animation: "idle",
        direction: "right",
        velocityX: 0,
        velocityY: 0,
        lastUpdate: Date.now(),
    };

    lobby.players[socket.id] = player;
    console.log(`Player ${playerName} (${socket.id}) joined lobby ${lobby.name} (${lobbyId})`);

    // Send updated lobby state to all players in this lobby
    io.to(lobbyId).emit("lobbyState", lobby);

    // Update the lobbies list for all clients in the main menu
    updateLobbiesList();

    return true;
};

// Remove a player from a specific lobby
const removePlayerFromLobby = (playerId, lobbyId) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    const playerName = lobby.players[playerId]?.name || "Unknown";
    console.log(`Player ${playerName} (${playerId}) left lobby ${lobby.name} (${lobbyId})`);

    delete lobby.players[playerId];

    // If lobby is empty, remove it
    if (Object.keys(lobby.players).length === 0) {
        console.log(`Removing empty lobby: ${lobby.name} (${lobbyId})`);
        delete lobbies[lobbyId];
    }
    // If host left, assign a new host
    else if (lobby.host === playerId) {
        const remainingPlayers = Object.keys(lobby.players);
        if (remainingPlayers.length > 0) {
            lobby.host = remainingPlayers[0];
            console.log(`New host assigned in lobby ${lobby.name}: ${lobby.players[lobby.host].name} (${lobby.host})`);
        }
    }

    // Send updated lobby state to all players in this lobby
    io.to(lobbyId).emit("lobbyState", lobby);

    // Update the lobbies list for all clients in the main menu
    updateLobbiesList();
};

// Remove a player from all lobbies
const removePlayerFromAllLobbies = playerId => {
    for (const lobbyId in lobbies) {
        if (lobbies[lobbyId].players[playerId]) {
            removePlayerFromLobby(playerId, lobbyId);
        }
    }
};

// Update player position and state in a lobby
const updatePlayerInLobby = (socket, lobbyId, playerData) => {
    const lobby = lobbies[lobbyId];
    if (!lobby || !lobby.players[socket.id]) return;

    const player = lobby.players[socket.id];
    const timestamp = Date.now();

    // Update player state
    Object.assign(player, {
        ...playerData,
        lastUpdate: timestamp,
    });

    // Send player movement to all other players in the same lobby
    socket.to(lobbyId).emit("playerMoved", {
        id: socket.id,
        name: player.name, // Include name to ensure it's available for new players
        ...playerData,
        timestamp,
    });

    // Periodically send full lobby state to ensure sync
    if (timestamp % 1000 < 20) {
        // Every ~1 second send full sync
        debugLog(`Sending full sync for lobby: ${lobby.name} (${lobbyId})`);
        io.to(lobbyId).emit("lobbyState", lobby);
    }
};

// Get a list of all available (not started) lobbies
const getAvailableLobbies = () => {
    const availableLobbies = {};

    for (const lobbyId in lobbies) {
        const lobby = lobbies[lobbyId];
        if (!lobby.gameStarted && Object.keys(lobby.players).length < MAX_PLAYERS_PER_LOBBY) {
            availableLobbies[lobbyId] = {
                id: lobby.id,
                name: lobby.name,
                playerCount: Object.keys(lobby.players).length,
                maxPlayers: MAX_PLAYERS_PER_LOBBY,
                host: lobby.host,
            };
        }
    }

    return availableLobbies;
};

// Send updated lobbies list to all clients in the main menu
const updateLobbiesList = () => {
    const availableLobbies = getAvailableLobbies();
    io.emit("lobbiesList", availableLobbies);
};

// Start a game in a specific lobby
const startGame = lobbyId => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    console.log(`Starting game in lobby: ${lobby.name} (${lobbyId})`);

    // Only start if there are enough players
    if (Object.keys(lobby.players).length >= 2) {
        lobby.gameStarted = true;
        io.to(lobbyId).emit("gameStart", lobby);
        console.log(`Game started in lobby: ${lobby.name} (${lobbyId})`);

        // Update the lobbies list for all clients in the main menu
        updateLobbiesList();
    } else {
        console.log(`Cannot start game, not enough players in lobby: ${lobby.name} (${lobbyId})`);
    }
};

io.on("connection", socket => {
    console.log("Client connected:", socket.id);

    // Send available lobbies on connection
    socket.emit("lobbiesList", getAvailableLobbies());

    // Create a new lobby
    socket.on("createLobby", ({ lobbyName, playerName }, callback) => {
        try {
            const lobbyId = createLobby(socket, lobbyName || "Game Lobby", playerName || "Player");
            if (callback && typeof callback === "function") {
                callback({ success: true, lobbyId });
            }
        } catch (error) {
            console.error("Error creating lobby:", error);
            if (callback && typeof callback === "function") {
                callback({ success: false, error: "Failed to create lobby" });
            }
        }
    });

    // Join an existing lobby
    socket.on("joinLobby", ({ lobbyId, playerName }, callback) => {
        try {
            if (!lobbyId) {
                if (callback && typeof callback === "function") {
                    callback({ success: false, error: "No lobby ID provided" });
                }
                return;
            }

            const success = addPlayerToLobby(socket, lobbyId, playerName || "Player");
            if (callback && typeof callback === "function") {
                callback({ success, lobbyId });
            }
        } catch (error) {
            console.error("Error joining lobby:", error);
            if (callback && typeof callback === "function") {
                callback({ success: false, error: "Failed to join lobby" });
            }
        }
    });

    // Leave the current lobby
    socket.on("leaveLobby", ({ lobbyId }) => {
        if (lobbyId) {
            socket.leave(lobbyId);
            removePlayerFromLobby(socket.id, lobbyId);
        }
    });

    // Request current lobbies list
    socket.on("getLobbyList", () => {
        const availableLobbies = getAvailableLobbies();
        socket.emit("lobbiesList", availableLobbies);
    });

    // Request specific lobby state
    socket.on("requestLobbyState", ({ lobbyId }) => {
        const lobby = lobbies[lobbyId];
        if (lobby) {
            debugLog(`Sending lobby state for ${lobby.name} (${lobbyId}) to ${socket.id}`);
            socket.emit("lobbyState", lobby);
        } else {
            console.error(`Requested lobby not found: ${lobbyId}`);
            socket.emit("lobbyError", { message: "Lobby not found." });
        }
    });

    // Request to start the game in a lobby
    socket.on("requestGameStart", ({ lobbyId }) => {
        const lobby = lobbies[lobbyId];
        if (lobby && lobby.host === socket.id) {
            startGame(lobbyId);
        } else if (!lobby) {
            console.error(`Game start requested for non-existent lobby: ${lobbyId}`);
            socket.emit("lobbyError", { message: "Lobby not found." });
        } else {
            console.error(`Non-host player ${socket.id} tried to start game in lobby: ${lobbyId}`);
            socket.emit("lobbyError", { message: "Only the host can start the game." });
        }
    });

    // Player updates their position/state during gameplay
    socket.on("playerUpdate", ({ lobbyId, ...playerData }) => {
        if (lobbyId) {
            updatePlayerInLobby(socket, lobbyId, playerData);
        }
    });

    // When a player disconnects
    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        removePlayerFromAllLobbies(socket.id);
    });
});

// Clean up inactive lobbies periodically
setInterval(() => {
    const now = Date.now();
    const MAX_IDLE_TIME = 3600000; // 1 hour in milliseconds

    for (const lobbyId in lobbies) {
        const lobby = lobbies[lobbyId];
        if (now - lobby.createdAt > MAX_IDLE_TIME) {
            // Check if any player has updated recently
            let hasActivePlayer = false;
            for (const playerId in lobby.players) {
                if (now - lobby.players[playerId].lastUpdate < MAX_IDLE_TIME) {
                    hasActivePlayer = true;
                    break;
                }
            }

            if (!hasActivePlayer) {
                console.log(`Removing inactive lobby: ${lobby.name} (${lobbyId})`);
                delete lobbies[lobbyId];
                updateLobbiesList();
            }
        }
    }
}, 300000); // Run every 5 minutes

const PORT = process.env.PORT || 9000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
