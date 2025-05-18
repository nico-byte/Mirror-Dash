import { Server } from "socket.io";
import { createServer, get } from "http";
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

const leaderboard = {};

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
        currentLevel: "level1", // Default starting level
        timerStarted: false,
        timeLeft: 180, // Initial time in seconds
        lastTimerUpdate: Date.now(),
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

    // Client can request the current leaderboard
    socket.on("getLeaderboard", () => {
        socket.emit("leaderboardUpdate", getSortedLeaderboard());
    });

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
                const lobby = lobbies[lobbyId];
                callback({
                    success,
                    lobbyId,
                    currentLevel: lobby ? lobby.currentLevel : null,
                });
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

    socket.on("playerFinished", ({ lobbyId, playerId }) => {
        if (lobbyId) {
            const lobby = lobbies[lobbyId];
            if (!lobby) {
                console.error(`Player ${socket.id} tried to finish in non-existent lobby: ${lobbyId}`);
                return;
            }

            const player = lobby.players[socket.id];
            if (!player) {
                console.error(`Player ${socket.id} is not in lobby: ${lobbyId}`);
                return;
            }

            console.log(`Player ${player.name} (${socket.id}) finished in lobby ${lobbyId}`);

            // Update player state in the lobby
            player.hasFinished = true;

            // Count how many players have finished
            const totalPlayers = Object.keys(lobby.players).length;
            const finishedPlayers = Object.values(lobby.players).filter(p => p.hasFinished).length;
            console.log(
                `${finishedPlayers} out of ${totalPlayers} players have finished in lobby ${lobby.name} (${lobbyId})`
            );

            // Update leaderboard
            if (!leaderboard[player.name]) {
                leaderboard[player.name] = { wins: 0, lastWin: null };
            }

            // Only count as a win if all players finish (win is for completing the level, not just being first)
            if (finishedPlayers >= totalPlayers) {
                leaderboard[player.name].wins += 1;
                leaderboard[player.name].lastWin = Date.now();
            }

            // Broadcast to all other players in the lobby
            socket.to(lobbyId).emit("playerFinished", {
                playerId: socket.id,
                lobbyId,
                finishedPlayers,
                totalPlayers,
            });

            // If this is the last player to finish, broadcast a final leaderboard update
            if (finishedPlayers >= totalPlayers) {
                io.to(lobbyId).emit("leaderboardUpdate", getSortedLeaderboard());
            }
        }
    });

    // Request timer synchronization
    socket.on("requestTimerSync", ({ lobbyId }) => {
        const lobby = lobbies[lobbyId];
        if (lobby) {
            // Send current timer value to the requesting client
            socket.emit("timerSync", { timeLeft: lobby.timeLeft });
        }
    });

    // Update timer
    socket.on("updateTimer", ({ lobbyId, timeLeft, isPenalty }) => {
        const lobby = lobbies[lobbyId];
        if (lobby) {
            // Update lobby timer
            lobby.timeLeft = timeLeft;
            lobby.lastTimerUpdate = Date.now();

            // Broadcast to all other players in the lobby
            socket.to(lobbyId).emit("timerSync", {
                timeLeft: timeLeft,
                isPenalty: isPenalty || false,
            });
        }
    });

    socket.on("requestLeaderboard", () => {
        socket.emit("leaderboardUpdate", getSortedLeaderboard());
    });

    socket.on("changeLevel", ({ lobbyId, levelId }) => {
        if (lobbyId && levelId) {
            console.log(`Player ${socket.id} changed level to ${levelId} in lobby ${lobbyId}`);

            // Save the current level to the lobby data
            const lobby = lobbies[lobbyId];
            if (lobby) {
                lobby.currentLevel = levelId;

                // Broadcast level change to all other players in the lobby
                socket.to(lobbyId).emit("levelChanged", {
                    playerId: socket.id,
                    levelId,
                    lobbyId,
                });
            } else {
                console.error(`Cannot change level - lobby ${lobbyId} not found`);
            }
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

const getSortedLeaderboard = () => {
    return Object.entries(leaderboard)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.wins - a.wins || b.lastWin - a.lastWin)
        .slice(0, 10); // Top 10 players
};

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
