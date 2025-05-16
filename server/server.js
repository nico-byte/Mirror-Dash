import { Server } from "socket.io";
import { createServer } from "http";

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const MAX_LOBBY_SIZE = 2;

let gameState = {
    gameStarted: false,
    players: {},
};

const addPlayer = (socket, playerName) => {
    if (Object.keys(gameState.players).length >= MAX_LOBBY_SIZE) {
        socket.emit("lobbyFull", { message: "Lobby is full. Please try again later." });
        return;
    }

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
    gameState.players[socket.id] = player;
    io.emit("gameState", gameState);
};

const updatePlayer = (socket, { x, y, direction, animation, velocityX, velocityY }) => {
    if (gameState.players[socket.id]) {
        const player = gameState.players[socket.id];
        const timestamp = Date.now();

        // Store the current state
        Object.assign(player, {
            x,
            y,
            direction,
            animation,
            velocityX: velocityX || 0,
            velocityY: velocityY || 0,
            lastUpdate: timestamp,
        });

        // Broadcast update to other players
        socket.broadcast.emit("playerMoved", {
            id: socket.id,
            x,
            y,
            direction,
            animation,
            velocityX: velocityX || 0,
            velocityY: velocityY || 0,
            timestamp,
        });
    }
};

const removePlayer = socket => {
    delete gameState.players[socket.id];
    io.emit("gameState", gameState);

    if (Object.keys(gameState.players).length === 0) {
        resetGameState();
    }
};

const resetGameState = () => {
    gameState = {
        gameStarted: false,
        players: {},
    };
};

const startGame = () => {
    if (!gameState.gameStarted) {
        gameState.gameStarted = true;
        io.emit("gameState", gameState);
        io.emit("disableStartButton");
    }
};

io.on("connection", socket => {
    console.log("Client connected:", socket.id);

    socket.on("joinGame", ({ playerName }) => addPlayer(socket, playerName));

    socket.on("playerUpdate", data => updatePlayer(socket, data));

    socket.on("gameOver", resetGameState);

    socket.on("checkGameState", (data, callback) => callback(gameState.gameStarted));

    socket.on("disconnect", () => removePlayer(socket));

    socket.on("startGame", startGame);
});

const PORT = process.env.PORT || 9000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
