import { createServer } from "http";
import SocketManager from "./socket/socketManager.js";
import config from "./config/config.js";
import Logger from "./utils/logger.js";

/**
 * Main application entry point
 */
async function main() {
    try {
        Logger.log("Main", `Starting Mirror Dash server on port ${config.PORT}`);

        // Create HTTP server
        const httpServer = createServer();

        // Initialize socket manager
        const socketManager = new SocketManager(httpServer);
        await socketManager.initialize();

        // Start listening
        httpServer.listen(config.PORT, () => {
            Logger.log("Main", `Server running on port ${config.PORT}`);
        });

        // Handle graceful shutdown
        process.on("SIGINT", () => shutdown(httpServer, socketManager));
        process.on("SIGTERM", () => shutdown(httpServer, socketManager));
    } catch (error) {
        Logger.error("Main", "Failed to start server", error);
        process.exit(1);
    }
}

/**
 * Handle graceful shutdown
 * @param {HttpServer} httpServer - HTTP server instance
 * @param {SocketManager} socketManager - Socket manager instance
 */
function shutdown(httpServer, socketManager) {
    Logger.log("Main", "Shutting down server...");

    // Clean up socket manager
    socketManager.cleanup();

    // Close HTTP server
    httpServer.close(() => {
        Logger.log("Main", "Server shutdown complete");
        process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
        Logger.error("Main", "Forced shutdown after timeout");
        process.exit(1);
    }, 10000);
}

// Start the application
main().catch(error => {
    Logger.error("Main", "Unhandled exception in main", error);
    process.exit(1);
});
