import { Server } from "socket.io";
import { createServer } from "http";
import { GameState, Player } from "../client/types/ServerTypes";

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

let gameState: GameState = {
    gameStarted: false,
    players: {},
};

io.on("connection", socket => {
    console.log("Client connected:", socket.id);
    console.log("gameState", gameState);

    socket.on("joinGame", ({ playerName }) => {
        const player: Player = {
            id: socket.id,
            name: playerName,
            x: 230,
            y: 250,
            animation: "idle",
        };

        // Add player to gameState
        gameState.players[socket.id] = player;

        io.emit("gameState", gameState);
    });

    socket.on("playerUpdate", ({ x, y, direction, animation }) => {
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].x = x;
            gameState.players[socket.id].y = y;
            gameState.players[socket.id].direction = direction;
            socket.broadcast.emit("playerMoved", {
                id: socket.id,
                x,
                y,
                direction,
                animation,
            });
        }
    });

    socket.on("gameOver", () => {
        gameState.gameStarted = false;

        gameState = {
            gameStarted: false,
            players: {},
        };
    });

    socket.on("checkGameState", (data, callback) => {
        callback(gameState.gameStarted);
    });

    socket.on("disconnect", () => {
        delete gameState.players[socket.id];
        io.emit("gameState", gameState);

        if (Object.keys(gameState.players).length == 0) {
            gameState = {
                gameStarted: false,
                players: {},
            };
        }
    });

    socket.on("startGame", ({ mapData }) => {
        if (!gameState.gameStarted) {
            gameState.gameStarted = true;

            io.emit("gameState", gameState);
            io.emit("disableStartButton");
        }
    });
});

const PORT = process.env.PORT || 9000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
