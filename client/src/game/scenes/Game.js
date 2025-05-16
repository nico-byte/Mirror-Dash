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
        this.scrollSpeed = 0; // 1.0 for scrollling on, 0 for no scrolling
        this.lobbyId = null;
    }

    init(data) {
        // Get socket if passed from Lobby scene
        if (data && data.socket) {
            this.socket = data.socket;
            this.connected = true;
        } else {
            // Connect to server if not already connected
            this.socket = io("http://localhost:9000");
        }

        // Get player name if provided
        if (data && data.playerName) {
            this.playerName = data.playerName;
        }

        // Get lobby ID if provided
        if (data && data.lobbyId) {
            this.lobbyId = data.lobbyId;
            this.connected = true;
        }

        this.setupSocketListeners();

        // Request the current lobby state as soon as we initialize
        if (this.socket && this.lobbyId) {
            this.socket.emit("requestLobbyState", { lobbyId: this.lobbyId });
        }
    }

    setupSocketListeners() {
        // If we don't have a lobby ID and we're coming from the old quick play,
        // we need to create a lobby on the fly
        if (!this.lobbyId) {
            this.socket.on("connect", () => {
                console.log("Connected to server");
                this.connected = true;

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
                        } else {
                            alert("Failed to create a quick play session.");
                            this.scene.start("MainMenu");
                        }
                    }
                );
            });
        }

        // Receive lobby state updates (contains player information)
        this.socket.on("lobbyState", lobby => {
            if (lobby.id === this.lobbyId) {
                this.updateGameState(lobby);
            }
        });

        // Other player moved
        this.socket.on("playerMoved", playerInfo => {
            this.updateOtherPlayer(playerInfo);
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
                this.scene.start("Lobby", { socket: this.socket, playerName: this.playerName });
            });

        this.add
            .text(100, 50, "Back to Lobby", {
                fontFamily: "Arial",
                fontSize: 14,
                color: "#ffffff",
            })
            .setOrigin(0.5);
    }

    updateGameState(lobby) {
        if (!lobby || !lobby.players) return;

        console.log("Updating game state with lobby:", lobby);
        console.log("Current player ID:", this.socket.id);
        console.log("Players in lobby:", Object.keys(lobby.players));

        // Remove players no longer in game
        Object.keys(this.otherPlayers).forEach(id => {
            if (!lobby.players[id] || id === this.socket.id) {
                if (this.otherPlayers[id]) {
                    this.otherPlayers[id].destroy();
                    delete this.otherPlayers[id];
                }
            }
        });

        // Add new players and update existing ones
        Object.keys(lobby.players).forEach(playerId => {
            const playerInfo = lobby.players[playerId];

            // Skip our own player
            if (playerId === this.socket.id) {
                return;
            }

            console.log("Processing player:", playerId, playerInfo.name);

            if (!this.otherPlayers[playerId]) {
                // New player joined
                console.log("Creating new player:", playerInfo.name);
                this.otherPlayers[playerId] = new Player(
                    this,
                    playerInfo.x || 230,
                    playerInfo.y || 250,
                    playerInfo.name,
                    false
                );
            } else {
                // Update existing player
                this.updateOtherPlayer(playerInfo);
            }
        });
    }

    updateOtherPlayer(playerInfo) {
        if (this.otherPlayers[playerInfo.id]) {
            const otherPlayer = this.otherPlayers[playerInfo.id];
            otherPlayer.moveTo(playerInfo.x, playerInfo.y, playerInfo.animation, playerInfo.direction);
        }
    }

    update() {
        if (!this.player || !this.connected || !this.lobbyId) return;

        this.cameras.main.scrollX += this.scrollSpeed;

        // Update main player
        this.player.update();

        // Apply player movement based on input
        const moved = this.player.applyMovement(this.cursors, this.wasd);

        // Always send updates to server, even if player is not moving
        this.socket.emit("playerUpdate", {
            lobbyId: this.lobbyId,
            x: this.player.x,
            y: this.player.y,
            animation: this.player.animation,
            direction: this.player.direction,
        });

        // Update other players
        Object.values(this.otherPlayers).forEach(player => {
            player.update();
        });
    }
}
