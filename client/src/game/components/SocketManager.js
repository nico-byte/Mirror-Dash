import { io } from "socket.io-client";
import { Player } from "../entities/Player";

export class SocketManager {
    constructor(scene) {
        this.scene = scene;
    }

    setupLobby(data) {
        // Get server URL from environment variable or use default
        const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:9000";

        // Get socket if passed from Lobby scene
        if (data && data.socket) {
            this.scene.socket = data.socket;
            this.scene.connected = true;
        } else {
            // Connect to server if not already connected
            this.scene.socket = io(serverUrl);
            console.log("Connected to game server:", serverUrl);
        }

        // Get player name if provided
        if (data && data.playerName) {
            this.scene.playerName = data.playerName;
        }

        // Get lobby ID if provided
        if (data && data.lobbyId) {
            this.scene.lobbyId = data.lobbyId;
            this.scene.connected = true;
        } else if (import.meta.env.VITE_DIRECT_CONNECT) {
            // If direct connect is enabled, use the lobby ID from environment
            this.scene.lobbyId = import.meta.env.VITE_DIRECT_CONNECT;
            this.scene.connected = true;
        }
    }

    setupSocketListeners() {
        // Socket connection event
        this.scene.socket.on("connect", () => {
            console.log("Connected to server with ID:", this.scene.socket.id);
            this.scene.connected = true;

            // If we don't have a lobby ID and we're coming from the old quick play,
            // we need to create a lobby on the fly
            if (!this.scene.lobbyId) {
                // Create a quick play lobby
                this.scene.socket.emit(
                    "createLobby",
                    {
                        lobbyName: "Quick Play",
                        playerName: this.scene.playerName,
                    },
                    response => {
                        if (response.success) {
                            this.scene.lobbyId = response.lobbyId;
                            console.log("Created quick play lobby:", this.scene.lobbyId);
                            // Important: Request the lobby state again after creating it
                            this.scene.socket.emit("requestLobbyState", { lobbyId: this.scene.lobbyId });
                        } else {
                            alert("Failed to create a quick play session.");
                            this.scene.scene.start("MainMenu");
                        }
                    }
                );
            } else {
                // If we already have a lobby ID, request its state
                this.scene.socket.emit("requestLobbyState", { lobbyId: this.scene.lobbyId });
            }
        });

        // Receive lobby state updates (contains player information)
        this.scene.socket.on("lobbyState", lobby => {
            console.log("Received lobby state in game:", lobby);
            if (lobby && lobby.id === this.scene.lobbyId) {
                this.updateGameState(lobby);
            }
        });

        // Other player moved
        this.scene.socket.on("playerMoved", playerInfo => {
            if (playerInfo && playerInfo.id) {
                // Skip our own player updates
                if (playerInfo.id !== this.scene.socket.id) {
                    this.updateOtherPlayer(playerInfo);
                }
            }
        });

        // Handle lobby error event
        this.scene.socket.on("lobbyError", ({ message }) => {
            alert(message);
            this.scene.scene.start("MainMenu");
        });
    }

    updateGameState(lobby) {
        if (!lobby || !lobby.players) {
            console.error("Invalid lobby state:", lobby);
            return;
        }

        console.log("Updating game state with lobby:", lobby);
        console.log("Current player ID:", this.scene.socket.id);
        console.log("Players in lobby:", Object.keys(lobby.players));

        // Remove players no longer in game
        Object.keys(this.scene.otherPlayers).forEach(id => {
            if (!lobby.players[id] || id === this.scene.socket.id) {
                if (this.scene.otherPlayers[id]) {
                    console.log("Removing player", id);
                    this.scene.otherPlayers[id].destroy();
                    delete this.scene.otherPlayers[id];
                }
            }
        });

        // Add new players and update existing ones
        Object.keys(lobby.players).forEach(playerId => {
            // Skip our own player
            if (playerId === this.scene.socket.id) {
                return;
            }

            const playerInfo = lobby.players[playerId];
            console.log("Processing player:", playerId, playerInfo);

            if (!this.scene.otherPlayers[playerId]) {
                // New player joined
                console.log("Creating new player:", playerInfo.name);
                this.scene.otherPlayers[playerId] = new Player(
                    this.scene,
                    playerInfo.x || 230,
                    playerInfo.y || 550,
                    playerInfo.name || `Player_${playerId.substring(0, 4)}`,
                    false // Not the main player
                );

                // Add collision between other player and platforms
                if (this.scene.otherPlayers[playerId].sprite) {
                    this.scene.physics.add.collider(this.scene.otherPlayers[playerId].sprite, this.scene.platforms);
                    this.scene.physics.add.overlap(
                        this.scene.otherPlayers[playerId].sprite,
                        this.scene.jumpPads,
                        this.scene.handleJumpPad,
                        null,
                        this.scene
                    );
                }
            } else {
                // Update existing player
                console.log("Updating existing player:", playerId);
                this.updateOtherPlayer({
                    id: playerId,
                    ...playerInfo,
                });
            }
        });
    }

    updateOtherPlayer(playerInfo) {
        if (!playerInfo || !playerInfo.id) {
            console.error("Invalid player info:", playerInfo);
            return;
        }

        if (playerInfo.id === this.scene.socket.id) {
            // Don't update ourselves
            return;
        }

        // If we have this player in our list
        if (this.scene.otherPlayers[playerInfo.id]) {
            const otherPlayer = this.scene.otherPlayers[playerInfo.id];
            otherPlayer.moveTo(
                playerInfo.x,
                playerInfo.y,
                playerInfo.animation || "idle",
                playerInfo.direction || "right"
            );
        } else if (playerInfo.x && playerInfo.y) {
            // We don't have this player yet but we have position data, so create them
            console.log("Creating missing player from update:", playerInfo.id);
            this.scene.otherPlayers[playerInfo.id] = new Player(
                this.scene,
                playerInfo.x,
                playerInfo.y,
                playerInfo.name || `Player_${playerInfo.id.substring(0, 4)}`,
                false
            );

            // Add collision between the new player and platforms
            if (this.scene.otherPlayers[playerInfo.id].sprite) {
                this.scene.physics.add.collider(this.scene.otherPlayers[playerInfo.id].sprite, this.scene.platforms);
                this.scene.physics.add.overlap(
                    this.scene.otherPlayers[playerInfo.id].sprite,
                    this.scene.jumpPads,
                    this.scene.handleJumpPad,
                    null,
                    this.scene
                );
            }
        } else {
            console.warn("Cannot update non-existent player:", playerInfo.id);
            // Request lobby state to try to get complete player info
            this.socket.emit("requestLobbyState", { lobbyId: this.scene.lobbyId });
        }
    }
}