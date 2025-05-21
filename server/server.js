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

// Constants
const MAX_PLAYERS_PER_LOBBY = 2;
const INITIAL_TIMER = 180; // 3 minutes timer

// Leaderboard storage
const leaderboard = {};

// Store all lobbies
const lobbies = {};

// Create a new lobby
const createLobby = (socket, lobbyName, playerName) => {
    const lobbyId = uuid();

    lobbies[lobbyId] = {
        id: lobbyId,
        name: lobbyName,
        host: socket.id,
        gameStarted: false,
        players: {},
        createdAt: Date.now(),
        currentLevel: "level1", // Default starting level
        timerStarted: false,
        timeLeft: INITIAL_TIMER, // Initial time in seconds
        lastTimerUpdate: Date.now(),
        playersFinished: {},
    };

    // Add the creating player to the lobby
    addPlayerToLobby(socket, lobbyId, playerName);
    return lobbyId;
};

// Add a player to a lobby
const addPlayerToLobby = (socket, lobbyId, playerName) => {
    const lobby = lobbies[lobbyId];

    if (!lobby) {
        socket.emit("lobbyError", { message: "Lobby not found." });
        return false;
    }

    if (Object.keys(lobby.players).length >= MAX_PLAYERS_PER_LOBBY) {
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
        hasFinished: false,
        lastUpdate: Date.now(),
    };

    lobby.players[socket.id] = player;

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

    delete lobby.players[playerId];

    // If lobby is empty, remove it
    if (Object.keys(lobby.players).length === 0) {
        delete lobbies[lobbyId];
    }
    // If host left, assign a new host
    else if (lobby.host === playerId) {
        const remainingPlayers = Object.keys(lobby.players);
        if (remainingPlayers.length > 0) {
            lobby.host = remainingPlayers[0];
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
    if (timestamp % 3000 < 50) {
        // Every ~3 seconds
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

    // Only start if there are enough players
    if (Object.keys(lobby.players).length >= 2) {
        lobby.gameStarted = true;
        lobby.timerStarted = true;
        lobby.timeLeft = INITIAL_TIMER;
        lobby.lastTimerUpdate = Date.now();

        // Reset player finished states
        Object.keys(lobby.players).forEach(playerId => {
            if (lobby.players[playerId]) {
                lobby.players[playerId].hasFinished = false;
            }
        });

        io.to(lobbyId).emit("gameStart", lobby);

        // Update the lobbies list for all clients in the main menu
        updateLobbiesList();
    }
};

// Get leaderboard sorted by wins with enhanced stats
const getSortedLeaderboard = () => {
    // Default level timer in seconds
    const LEVEL_TOTAL_TIME = 180;

    return Object.entries(leaderboard)
        .map(([name, stats]) => {
            // Calculate total stars across all levels
            let totalStars = 0;
            let maxLevel = 0;
            let maxLevelName = "None";
            let maxLevelTime = 0; // Time left
            let maxLevelElapsedTime = 0; // Actual time to complete (LEVEL_TOTAL_TIME - timeLeft)
            let maxLevelTimeFormatted = "--:--";

            // Process level-specific stats if available
            if (stats.levels) {
                Object.entries(stats.levels).forEach(([levelId, levelData]) => {
                    totalStars = levelData.stars || 0;

                    // Extract level number from levelId (e.g., "level2" -> 2)
                    const levelNum = parseInt(levelId.replace("level", "")) || 0;

                    // Track highest level completed
                    if (levelNum > maxLevel) {
                        maxLevel = levelNum;
                        maxLevelName = `Level ${levelNum}`;

                        // Store time for the highest level
                        maxLevelTime = levelData.timeLeft || 0;

                        // Calculate elapsed time (total time - time left)
                        maxLevelElapsedTime = LEVEL_TOTAL_TIME - maxLevelTime;

                        // Format the elapsed time as MM:SS
                        const minutes = Math.floor(maxLevelElapsedTime / 60);
                        const seconds = maxLevelElapsedTime % 60;
                        maxLevelTimeFormatted = `${minutes.toString().padStart(2, "0")}:${seconds
                            .toString()
                            .padStart(2, "0")}`;
                    }
                });
            }

            // Last play date formatted nicely
            const lastPlayed = stats.lastWin ? new Date(stats.lastWin).toLocaleDateString() : "Never";

            return {
                name,
                wins: stats.wins || 0,
                totalStars,
                maxLevel,
                maxLevelName,
                elapsedTime: maxLevelElapsedTime, // Store raw elapsed time for sorting
                levelTimeFormatted: maxLevelTimeFormatted, // Elapsed time formatted as MM:SS
                lastPlayed,
                lastWin: stats.lastWin, // Keep for sorting
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
            return b.lastWin - a.lastWin;
        })
        .slice(0, 10); // Top 10 players
};

io.on("connection", socket => {
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
            console.error("Failed to create lobby:", error);
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
            console.error("Failed to join lobby:", error);
            if (callback && typeof callback === "function") {
                callback({ success: false, error: "Failed to join lobby" });
            }
        }
    });

    // Handle game over for a player
    socket.on("playerGameOver", ({ lobbyId, reason }) => {
        if (lobbyId) {
            const lobby = lobbies[lobbyId];
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
        }
    });

    // Request to change level
    socket.on("requestLevelChange", ({ lobbyId, levelId, requesterId }) => {
        if (lobbyId && levelId) {
            const lobby = lobbies[lobbyId];
            if (!lobby) {
                socket.emit("lobbyError", { message: "Lobby not found." });
                return;
            }

            // Get the requesting player
            const requester = lobby.players[requesterId];
            if (!requester) return;

            // Update the lobby's current level
            lobby.currentLevel = levelId;

            // Reset timer and player states for the new level
            lobby.timeLeft = INITIAL_TIMER;
            lobby.lastTimerUpdate = Date.now();

            // Reset player finished states
            Object.keys(lobby.players).forEach(playerId => {
                if (lobby.players[playerId]) {
                    lobby.players[playerId].hasFinished = false;
                }
            });

            // Send confirmation to all players in the lobby
            io.to(lobbyId).emit("levelChangeConfirmed", {
                levelId: levelId,
                requesterId: requesterId,
                requesterName: requester.name,
            });

            // Also notify with the levelChanged event for backward compatibility
            io.to(lobbyId).emit("levelChanged", {
                playerId: requesterId,
                levelId: levelId,
                lobbyId: lobbyId,
            });
        }
    });
    // Handle player leaving lobby
    socket.on("playerLeaveLobby", ({ lobbyId, playerId }) => {
        if (lobbyId) {
            const lobby = lobbies[lobbyId];
            if (!lobby) return;

            // Ensure the player can only leave themselves
            if (playerId !== socket.id) return;

            socket.leave(lobbyId);

            // Store player info before removing
            const playerInfo = lobby.players[playerId] || { name: "Unknown player" };

            removePlayerFromLobby(playerId, lobbyId);

            // Notify other players that this player has left
            socket.to(lobbyId).emit("playerLeftLobby", {
                playerId: playerId,
                playerName: playerInfo.name,
            });
        }
    });

    // Leave the current lobby
    socket.on("leaveLobby", ({ lobbyId }) => {
        if (lobbyId) {
            // Store player info before removing
            const lobby = lobbies[lobbyId];
            const playerInfo = lobby?.players[socket.id] || { name: "Unknown player" };

            socket.leave(lobbyId);
            removePlayerFromLobby(socket.id, lobbyId);

            // Notify other players that this player has left
            socket.to(lobbyId).emit("playerLeftLobby", {
                playerId: socket.id,
                playerName: playerInfo.name,
            });
        }
    });

    // Request current lobbies list
    socket.on("getLobbyList", () => {
        socket.emit("lobbiesList", getAvailableLobbies());
    });

    // Request specific lobby state
    socket.on("requestLobbyState", ({ lobbyId }) => {
        const lobby = lobbies[lobbyId];
        if (lobby) {
            socket.emit("lobbyState", lobby);
        } else {
            socket.emit("lobbyError", { message: "Lobby not found." });
        }
    });

    // Request to start the game in a lobby
    socket.on("requestGameStart", ({ lobbyId }) => {
        const lobby = lobbies[lobbyId];
        if (lobby && lobby.host === socket.id) {
            startGame(lobbyId);
        } else if (!lobby) {
            socket.emit("lobbyError", { message: "Lobby not found." });
        } else {
            socket.emit("lobbyError", { message: "Only the host can start the game." });
        }
    });

    // Player finished the level
    socket.on("playerFinished", ({ lobbyId }) => {
        if (!lobbyId) return;

        const lobby = lobbies[lobbyId];
        if (!lobby) return;

        const player = lobby.players[socket.id];
        if (!player) return;

        // Mark this player as finished
        player.hasFinished = true;
        lobby.playersFinished[socket.id] = true;

        // Count how many players have finished
        const totalPlayers = Object.keys(lobby.players).length;
        const finishedPlayers = Object.values(lobby.players).filter(p => p.hasFinished).length;

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
    });

    // Level completed by the player
    socket.on("levelCompleted", ({ playerName, levelId, timeLeft, stars }) => {
        // Update leaderboard if needed
        if (playerName && !leaderboard[playerName]) {
            leaderboard[playerName] = { wins: 0, lastWin: null };
        }
    });

    // Force level change (for synchronized level transitions)
    socket.on("forceLevelChange", ({ lobbyId, levelId, initiatorId, initiatorName }) => {
        if (!lobbyId || !levelId) return;

        // Validate the lobby exists
        const lobby = lobbies[lobbyId];
        if (!lobby) {
            socket.emit("lobbyError", { message: "Lobby not found for level change." });
            return;
        }

        // Update the current level in the lobby data
        lobby.currentLevel = levelId;

        // Reset timer and player states for the new level
        lobby.timeLeft = INITIAL_TIMER;
        lobby.lastTimerUpdate = Date.now();

        // Reset player finished states
        Object.keys(lobby.players).forEach(playerId => {
            if (lobby.players[playerId]) {
                lobby.players[playerId].hasFinished = false;
            }
        });

        // Broadcast level change command to ALL players in the lobby
        io.to(lobbyId).emit("forceLevelChanged", {
            levelId: levelId,
            initiatorId: initiatorId || socket.id,
            initiatorName: initiatorName || lobby.players[socket.id]?.name || "Unknown player",
            lobbyId: lobbyId,
            timestamp: Date.now(),
        });
    });

    socket.on("platformSync", ({ lobbyId, platforms, time }) => {
        if (lobbyId) {
            const lobby = lobbies[lobbyId];
            if (lobby) {
                // Store platform data in lobby
                lobby.platformPositions = platforms;
                lobby.platformTime = time;

                // Broadcast to other players in this lobby
                socket.to(lobbyId).emit("platformSync", {
                    lobbyId,
                    platforms,
                    time,
                    sourcePlayer: socket.id,
                });
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

    // Handle explicit leaderboard updates from players who completed levels
    socket.on("updateLeaderboard", ({ playerName, levelId, timeLeft, stars }) => {
        if (!playerName) return;

        const LEVEL_TOTAL_TIME = 180; // 3 minutes in seconds
        const elapsedTime = LEVEL_TOTAL_TIME - timeLeft;
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;
        const timeFormatted = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

        console.log(
            `Leaderboard update: ${playerName} completed ${levelId} in ${timeFormatted} with ${stars} stars (${timeLeft}s remaining)`
        );

        // Initialize player in leaderboard if not exists
        if (!leaderboard[playerName]) {
            leaderboard[playerName] = { wins: 0, lastWin: null };
        }

        // Increment win count and update timestamp
        leaderboard[playerName].wins += 1;
        leaderboard[playerName].lastWin = Date.now();

        // Initialize levels object if not exists
        if (!leaderboard[playerName].levels) {
            leaderboard[playerName].levels = {};
        }

        // Store level info and star count
        if (levelId) {
            leaderboard[playerName].levels[levelId] = {
                timeLeft: timeLeft || 0,
                stars: stars || 0,
                completedAt: Date.now(),
            };

            console.log(
                `Stored level data for ${playerName}: ${levelId} with ${stars} stars and ${timeLeft}s remaining`
            );
        }

        // Broadcast updated leaderboard to all connected clients
        const sortedLeaderboard = getSortedLeaderboard();
        io.emit("leaderboardUpdate", sortedLeaderboard);

        // Log the new top player
        if (sortedLeaderboard.length > 0) {
            const top = sortedLeaderboard[0];
            console.log(
                `Current leaderboard leader: ${top.name}, Level ${top.maxLevel}, completed in ${top.levelTimeFormatted}`
            );
        }
    });

    // Legacy level change (replaced by forceLevelChange for better synchronization)
    socket.on("changeLevel", ({ lobbyId, levelId }) => {
        if (!lobbyId || !levelId) return;

        // Validate the lobby exists
        const lobby = lobbies[lobbyId];
        if (!lobby) return;

        // Update the level
        lobby.currentLevel = levelId;

        // Reset finished states
        Object.keys(lobby.players).forEach(playerId => {
            if (lobby.players[playerId]) {
                lobby.players[playerId].hasFinished = false;
            }
        });

        // Broadcast level change to all players
        socket.to(lobbyId).emit("levelChanged", {
            playerId: socket.id,
            levelId,
            lobbyId,
        });
    });

    // Player updates their position/state during gameplay
    socket.on("playerUpdate", ({ lobbyId, ...playerData }) => {
        if (lobbyId) {
            updatePlayerInLobby(socket, lobbyId, playerData);
        }
    });

    // When a player disconnects
    socket.on("disconnect", () => {
        // Find all lobbies this player is in
        const playerLobbies = [];

        for (const lobbyId in lobbies) {
            if (lobbies[lobbyId].players[socket.id]) {
                playerLobbies.push({
                    lobbyId,
                    playerName: lobbies[lobbyId].players[socket.id].name,
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
            removePlayerFromLobby(socket.id, lobbyId);
        });
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
                delete lobbies[lobbyId];
                updateLobbiesList();
            }
        }
    }
}, 300000); // Run every 5 minutes

// Update timers in active games
setInterval(() => {
    const now = Date.now();

    for (const lobbyId in lobbies) {
        const lobby = lobbies[lobbyId];

        // Only update timer for active games
        if (lobby.gameStarted && lobby.timerStarted) {
            const elapsedSeconds = Math.floor((now - lobby.lastTimerUpdate) / 1000);

            // Only update if at least 1 second has passed
            if (elapsedSeconds > 0) {
                lobby.timeLeft = Math.max(0, lobby.timeLeft - elapsedSeconds);
                lobby.lastTimerUpdate = now;

                // Send timer update to all players in lobby
                io.to(lobbyId).emit("timerSync", { timeLeft: lobby.timeLeft });

                // If timer reaches 0, handle game over
                if (lobby.timeLeft === 0) {
                    io.to(lobbyId).emit("gameOverBroadcast", {
                        reason: "timeout",
                        lobbyId: lobbyId,
                    });
                }
            }
        }
    }
}, 1000); // Check every second

const PORT = process.env.PORT || 9000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
