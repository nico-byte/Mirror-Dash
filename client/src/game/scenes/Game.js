import { Scene } from "phaser";
import { io } from "socket.io-client";
import { Player } from "../entities/Player";

export class Game extends Scene {
    constructor() {
        super("Game");
        this.socket = null;
        this.player = null;
        this.otherPlayers = {};
        this.cursors = null;
        this.wasd = null;
        this.playerName = "Player_" + Math.floor(Math.random() * 1000);
        this.connected = false;
        this.scrollSpeed = 0; // 1.0 for scrolling on, 0 for no scrolling
        this.lobbyId = null;
        this.debugMode = false; // Set to true to enable coordinate display
    }

    init(data) {
        // Enable debug mode from environment variable
        this.debugMode = import.meta.env.VITE_DEBUG_MODE === "true";

        // Get server URL from environment variable or use default
        const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:9000";

        // Get socket if passed from Lobby scene
        if (data && data.socket) {
            this.socket = data.socket;
            this.connected = true;
        } else {
            // Connect to server if not already connected
            this.socket = io(serverUrl);
            console.log("Connected to game server:", serverUrl);
        }

        // Get player name if provided
        if (data && data.playerName) {
            this.playerName = data.playerName;
        }

        // Get lobby ID if provided
        if (data && data.lobbyId) {
            this.lobbyId = data.lobbyId;
            this.connected = true;
        } else if (import.meta.env.VITE_DIRECT_CONNECT) {
            // If direct connect is enabled, use the lobby ID from environment
            this.lobbyId = import.meta.env.VITE_DIRECT_CONNECT;
            this.connected = true;
        }

        this.setupSocketListeners();

        // Request the current lobby state as soon as we initialize
        if (this.socket && this.lobbyId) {
            console.log("Requesting lobby state for:", this.lobbyId);
            this.socket.emit("requestLobbyState", { lobbyId: this.lobbyId });
        }
    }

    setupSocketListeners() {
        // Socket connection event
        this.socket.on("connect", () => {
            console.log("Connected to server with ID:", this.socket.id);
            this.connected = true;

            // If we don't have a lobby ID and we're coming from the old quick play,
            // we need to create a lobby on the fly
            if (!this.lobbyId) {
                // Create a quick play lobby
                this.socket.emit(
                    "createLobby",
                    {
                        lobbyName: "Quick Play",
                        playerName: this.playerName,
                    },
                    response => {
                        if (response.success) {
                            this.lobbyId = response.lobbyId;
                            console.log("Created quick play lobby:", this.lobbyId);
                            // Important: Request the lobby state again after creating it
                            this.socket.emit("requestLobbyState", { lobbyId: this.lobbyId });
                        } else {
                            alert("Failed to create a quick play session.");
                            this.scene.start("MainMenu");
                        }
                    }
                );
            } else {
                // If we already have a lobby ID, request its state
                this.socket.emit("requestLobbyState", { lobbyId: this.lobbyId });
            }
        });

        // Receive lobby state updates (contains player information)
        this.socket.on("lobbyState", lobby => {
            console.log("Received lobby state in game:", lobby);
            if (lobby && lobby.id === this.lobbyId) {
                this.updateGameState(lobby);
            }
        });

        // Other player moved
        this.socket.on("playerMoved", playerInfo => {
            if (playerInfo && playerInfo.id) {
                // Skip our own player updates
                if (playerInfo.id !== this.socket.id) {
                    this.updateOtherPlayer(playerInfo);
                }
            }
        });

        // Handle lobby error event
        this.socket.on("lobbyError", ({ message }) => {
            alert(message);
            this.scene.start("MainMenu");
        });
    }

    create() {
        // Basic setup
        this.cameras.main.setBackgroundColor(0x00ff00);
        this.cameras.main.setBounds(0, 0, 2000, 2000);

        this.add.image(512, 384, "background").setAlpha(0.5);

        // Create ground
        this.platforms = this.physics.add.staticGroup();

        // Add a ground platform
        const ground = this.add.rectangle(512, 730, 1024, 60, 0x333333);
        this.physics.add.existing(ground, true); // true means static

        // Create main player
        this.player = new Player(this, 230, 250, this.playerName, true);

        // Add collision between player and ground
        if (this.player && this.player.sprite) {
            this.physics.add.collider(this.player.sprite, ground);
        }

        // Setup input
        this.cursors = this.input.keyboard.createCursorKeys();

        // Setup WASD keys
        this.wasd = {
            W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            Space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        };

        // Add back button to return to lobby
        const backButton = this.add
            .rectangle(100, 50, 150, 40, 0x222222, 0.7)
            .setInteractive()
            .on("pointerdown", () => {
                if (this.lobbyId) {
                    this.socket.emit("leaveLobby", { lobbyId: this.lobbyId });
                }

                // Check if we should return to lobby or main menu
                const skipLobby = import.meta.env.VITE_SKIP_LOBBY === "true";
                if (skipLobby) {
                    this.scene.start("MainMenu");
                } else {
                    this.scene.start("Lobby", { socket: this.socket, playerName: this.playerName });
                }
            });

        this.add
            .text(100, 50, "Back to Lobby", {
                fontFamily: "Arial",
                fontSize: 14,
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Add debug text only if debug mode is enabled
        if (this.debugMode) {
            this.debugText = this.add.text(10, 10, "Debug Mode: On", {
                fontSize: "12px",
                fill: "#ffffff",
                backgroundColor: "#000000",
            });
        }

        // Make sure we're receiving lobby updates
        if (this.socket && this.lobbyId) {
            console.log("Requesting lobby state in create method");
            this.socket.emit("requestLobbyState", { lobbyId: this.lobbyId });
        }
    }

    updateGameState(lobby) {
        if (!lobby || !lobby.players) {
            console.error("Invalid lobby state:", lobby);
            return;
        }

        console.log("Updating game state with lobby:", lobby);
        console.log("Current player ID:", this.socket.id);
        console.log("Players in lobby:", Object.keys(lobby.players));

        // Remove players no longer in game
        Object.keys(this.otherPlayers).forEach(id => {
            if (!lobby.players[id] || id === this.socket.id) {
                if (this.otherPlayers[id]) {
                    console.log("Removing player", id);
                    this.otherPlayers[id].destroy();
                    delete this.otherPlayers[id];
                }
            }
        });

        // Add new players and update existing ones
        Object.keys(lobby.players).forEach(playerId => {
            // Skip our own player
            if (playerId === this.socket.id) {
                return;
            }

            const playerInfo = lobby.players[playerId];
            console.log("Processing player:", playerId, playerInfo);

            if (!this.otherPlayers[playerId]) {
                // New player joined
                console.log("Creating new player:", playerInfo.name);
                this.otherPlayers[playerId] = new Player(
                    this,
                    playerInfo.x || 230,
                    playerInfo.y || 250,
                    playerInfo.name || `Player_${playerId.substring(0, 4)}`,
                    false
                );
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

        if (playerInfo.id === this.socket.id) {
            // Don't update ourselves
            return;
        }

        // If we have this player in our list
        if (this.otherPlayers[playerInfo.id]) {
            const otherPlayer = this.otherPlayers[playerInfo.id];
            otherPlayer.moveTo(
                playerInfo.x,
                playerInfo.y,
                playerInfo.animation || "idle",
                playerInfo.direction || "right"
            );
        } else if (playerInfo.x && playerInfo.y) {
            // We don't have this player yet but we have position data, so create them
            console.log("Creating missing player from update:", playerInfo.id);
            this.otherPlayers[playerInfo.id] = new Player(
                this,
                playerInfo.x,
                playerInfo.y,
                playerInfo.name || `Player_${playerInfo.id.substring(0, 4)}`,
                false
            );
        } else {
            console.warn("Cannot update non-existent player:", playerInfo.id);
            // Request lobby state to try to get complete player info
            this.socket.emit("requestLobbyState", { lobbyId: this.lobbyId });
        }
    }

    update() {
        if (!this.player || !this.connected || !this.lobbyId) return;

        this.cameras.main.scrollX += this.scrollSpeed;

        // Update main player
        this.player.update();

        // Apply player movement based on input
        const moved = this.player.applyMovement(this.cursors, this.wasd);

        // Send updates to server regardless of movement
        this.socket.emit("playerUpdate", {
            lobbyId: this.lobbyId,
            x: this.player.x,
            y: this.player.y,
            animation: this.player.animation,
            direction: this.player.direction,
        });

        // Update other players
        Object.entries(this.otherPlayers).forEach(([id, player]) => {
            if (player && typeof player.update === "function") {
                player.update();
            }
        });

        // Update debug text if enabled
        if (this.debugMode && this.debugText) {
            const otherPlayerInfo = Object.entries(this.otherPlayers)
                .map(([id, player]) => `${id.substring(0, 4)}: (${Math.round(player.x)}, ${Math.round(player.y)})`)
                .join("\n");

            this.debugText.setText(
                `Player: ${this.socket.id.substring(0, 6)} (${Math.round(this.player.x)}, ${Math.round(
                    this.player.y
                )})` +
                    `\nOther Players: ${Object.keys(this.otherPlayers).length}` +
                    (otherPlayerInfo ? `\n${otherPlayerInfo}` : "") +
                    `\nLobby: ${this.lobbyId}`
            );
        }
    }
}
