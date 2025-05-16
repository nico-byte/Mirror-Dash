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
        velocityX: 0,
        velocityY: 0,
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
    if (timestamp % 30 === 0) {
        // Every ~30ms send full sync
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
    if (Object.keys(lobby.players).length === MAX_PLAYERS_PER_LOBBY) {
        lobby.gameStarted = true;
        io.to(lobbyId).emit("gameStart", lobby);

        // Update the lobbies list for all clients in the main menu
        updateLobbiesList();
    }
};

io.on("connection", socket => {
    console.log("Client connected:", socket.id);

    // Send available lobbies on connection
    socket.emit("lobbiesList", getAvailableLobbies());

    // Create a new lobby
    socket.on("createLobby", ({ lobbyName, playerName }, callback) => {
        const lobbyId = createLobby(socket, lobbyName, playerName);
        callback && callback({ success: true, lobbyId });
    });

    // Join an existing lobby
    socket.on("joinLobby", ({ lobbyId, playerName }, callback) => {
        const success = addPlayerToLobby(socket, lobbyId, playerName);
        callback && callback({ success, lobbyId });
    });

    // Leave the current lobby
    socket.on("leaveLobby", ({ lobbyId }) => {
        socket.leave(lobbyId);
        removePlayerFromLobby(socket.id, lobbyId);
    });

    // Request specific lobby state
    socket.on("requestLobbyState", ({ lobbyId }) => {
        const lobby = lobbies[lobbyId];
        if (lobby) {
            socket.emit("lobbyState", lobby);
        }
    });

    // Request to start the game in a lobby
    socket.on("requestGameStart", ({ lobbyId }) => {
        const lobby = lobbies[lobbyId];
        if (lobby && lobby.host === socket.id) {
            startGame(lobbyId);
        }
    });

    // Player updates their position/state during gameplay
    socket.on("playerUpdate", ({ lobbyId, ...playerData }) => {
        updatePlayerInLobby(socket, lobbyId, playerData);
    });

    // When a player disconnects
    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        removePlayerFromAllLobbies(socket.id);
    });
});

const PORT = process.env.PORT || 9000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
