import { Server } from "socket.io";
import registerLobbyHandlers from "./handlers/lobbyHandlers.js";
import registerGameHandlers from "./handlers/gameHandlers.js";
import registerPlayerHandlers from "./handlers/playerHandlers.js";
import registerLeaderboardHandlers from "./handlers/leaderboardHandlers.js";
import LobbyService from "../services/LobbyService.js";
import LeaderboardService from "../services/LeaderboardService.js";
import TimerService from "../services/TimerService.js";
import Logger from "../utils/logger.js";

/**
 * Socket.IO manager for handling all real-time communication
 */
class SocketManager {
    /**
     * Initialize the socket manager
     * @param {HttpServer} httpServer - HTTP server instance
     */
    constructor(httpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
        });

        this.initialized = false;
    }

    /**
     * Initialize and start the socket server
     */
    async initialize() {
        if (this.initialized) return;

        // Initialize services
        await LeaderboardService.initialize();
        LobbyService.initialize();

        // Set up timer service with callback for time-end events
        TimerService.initialize(lobbyId => {
            // Callback for when a timer ends
            if (lobbyId) {
                this.io.to(lobbyId).emit("gameOverBroadcast", {
                    reason: "timeout",
                    lobbyId: lobbyId,
                });
            }
        });

        // Set up connection handling
        this.io.on("connection", socket => {
            Logger.log("SocketManager", `New client connected: ${socket.id}`);

            // Send available lobbies on connection
            socket.emit("lobbiesList", LobbyService.getAvailableLobbies());

            // Register all event handlers
            this.registerHandlers(socket);
        });

        this.initialized = true;
        Logger.log("SocketManager", "Socket manager initialized");
    }

    /**
     * Register all socket event handlers for a connection
     * @param {Socket} socket - Socket.IO socket
     */
    registerHandlers(socket) {
        // Register handlers from each module
        registerLobbyHandlers(this.io, socket);
        registerGameHandlers(this.io, socket);
        registerPlayerHandlers(this.io, socket);
        registerLeaderboardHandlers(this.io, socket);
    }

    /**
     * Broadcast a message to all connected clients
     * @param {string} event - Event name
     * @param {*} data - Data to broadcast
     */
    broadcast(event, data) {
        this.io.emit(event, data);
    }

    /**
     * Clean up resources
     */
    cleanup() {
        // Clean up services
        TimerService.cleanup();
        LobbyService.cleanup();
        LeaderboardService.cleanup();

        // Close Socket.IO server
        if (this.io) {
            this.io.close();
        }
    }
}

export default SocketManager;
