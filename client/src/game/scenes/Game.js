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
        this.lobbyId = null;
        this.debugMode = false;

        // Split screen properties
        this.splitLine = null;
        this.topCamera = null;
        this.bottomCamera = null;

        // Camera scrolling properties
        this.autoScrollCamera = false;
        this.scrollSpeed = 50;

        // Level properties
        this.platforms = null;
        this.jumpPads = null;

        // Timer
        this.timerText = null;
        this.timeLeft = 180; // in seconds
        this.timerEvent = null;
    }

    init(data) {
        // Enable debug mode from environment variable
        this.debugMode = import.meta.env.VITE_DEBUG_MODE === "true";

        // Get camera settings from environment variables
        this.autoScrollCamera = import.meta.env.VITE_AUTO_SCROLL_CAMERA === "true";
        this.scrollSpeed = parseFloat(import.meta.env.VITE_CAMERA_SCROLL_SPEED || "50");

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
        // Reset timer to full duration
        this.timeLeft = 180;

        // Remove any previous timer event if exists (for hot reload or reuse safety)
        if (this.timerEvent) {
            this.timerEvent.remove(false);
            this.timerEvent = null;
        }

        // Setup cameras for split screen
        this.setupCameras();

        // Create level
        this.createLevel();

        // Create main player at platform position
        this.player = new Player(this, 230, 500, this.playerName, true);

        // Add collision between player and platforms
        this.physics.add.collider(this.player.sprite, this.platforms);

        // Add collision with jump pads and special effect
        this.physics.add.overlap(this.player.sprite, this.jumpPads, this.handleJumpPad, null, this);

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

        // Add back button to return to lobby - only in top section
        const backButton = this.add
            .rectangle(100, 50, 150, 40, 0x222222, 0.7)
            .setInteractive()
            .setScrollFactor(0) // Fixed to camera
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

        const backText = this.add
            .text(100, 50, "Back to Lobby", {
                fontFamily: "Arial",
                fontSize: 14,
                color: "#ffffff",
            })
            .setOrigin(0.5)
            .setScrollFactor(0); // Fixed to camera

        // Make back button only visible in top camera
        if (this.bottomCamera) {
            this.bottomCamera.ignore([backButton, backText]);
        }

        // Add debug text only if debug mode is enabled
        if (this.debugMode) {
            this.debugText = this.add
                .text(10, 10, "Debug Mode: On", {
                    fontSize: "12px",
                    fill: "#ffffff",
                    backgroundColor: "#000000",
                })
                .setScrollFactor(0) // Fixed to camera
                .setDepth(100);
        }

        this.timerText = this.add
            .text(this.scale.width - 100, 20, "03:00", {
                fontSize: "24px",
                fill: "#ffffff",
                backgroundColor: "#000000",
                padding: { x: 10, y: 5 },
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(100);

        // Make the timer only visible in the top camera
        if (this.bottomCamera) {
            this.bottomCamera.ignore(this.timerText);
        }

        // Create the countdown timer event
        this.timerEvent = this.time.addEvent({
            delay: 1000, // 1 second
            callback: this.updateTimer,
            callbackScope: this,
            loop: true,
        });

        // Create finish object (red rectangle)
        this.finishObject = this.physics.add.staticGroup();
        this.finishObjectRect = this.finishObject
            .create(900, 500, null)
            .setSize(100, 100)
            .setDisplaySize(100, 100)
            .setOrigin(0.5)
            .refreshBody();
        this.finishObjectRect.fillColor = 0xff0000;

        // Just visual fill (draw rectangle)
        this.finishVisual = this.add.rectangle(900, 500, 100, 100, 0xff0000);
        this.finishVisual.setDepth(-1);

        this.physics.add.overlap(this.player.sprite, this.finishObject, this.handleFinish, null, this);

        // Make sure we're receiving lobby updates
        if (this.socket && this.lobbyId) {
            console.log("Requesting lobby state in create method");
            this.socket.emit("requestLobbyState", { lobbyId: this.lobbyId });
        }
    }

    handleFinish(playerSprite, finishObject) {
        console.log("Player reached finish!");

        // Stop timer
        if (this.timerEvent) {
            this.timerEvent.remove(false);
        }

        // Switch to FinishLevel scene
        this.scene.start("FinishLevel", {
            timeLeft: this.timeLeft,
        });
    }

    setupCameras() {
        // Modify the main camera for the top half
        this.cameras.main.setViewport(0, 0, this.scale.width, this.scale.height / 2);
        this.cameras.main.setBackgroundColor(0x87ceeb); // Light blue sky
        this.cameras.main.setName("topCamera");
        this.cameras.main.setBounds(0, 0, 3000, 1000); // Extended bounds for scrolling
        this.topCamera = this.cameras.main;

        // Calculate the midpoint of the screen height
        const screenHeight = this.scale.height;
        const midPoint = screenHeight / 2;

        // Create bottom camera for the mirrored view
        this.bottomCamera = this.cameras.add(0, midPoint, this.scale.width, midPoint);
        this.bottomCamera.setBackgroundColor(0x87ceeb); // Light blue sky
        this.bottomCamera.setName("bottomCamera");
        this.bottomCamera.setBounds(0, 0, 3000, 1000);

        // Add a line to separate the screens
        this.splitLine = this.add.rectangle(this.scale.width / 2, midPoint, this.scale.width, 4, 0x000000);
        this.splitLine.setDepth(100); // Ensure it's on top
        this.splitLine.setScrollFactor(0); // Fixed to camera
    }

    createLevel() {
        // Get screen dimensions for mirroring
        const screenHeight = this.scale.height;
        const midPoint = screenHeight / 2;

        // Create physics groups
        this.platforms = this.physics.add.staticGroup();
        this.jumpPads = this.physics.add.staticGroup();

        // Regular platforms (top view)

        // Main ground platform
        const ground = this.platforms
            .create(512, 700, null)
            .setScale(30, 1)
            .setSize(30, 30)
            .setDisplaySize(30 * 30, 30)
            .setTint(0x009900)
            .refreshBody();

        // Platform 1 - Starting platform
        const plat1 = this.platforms
            .create(230, 550, null)
            .setScale(5, 1)
            .setSize(30, 30)
            .setDisplaySize(5 * 30, 30)
            .setTint(0x888888)
            .refreshBody();

        // Platform 2 - Middle jump
        const plat2 = this.platforms
            .create(400, 450, null)
            .setScale(4, 1)
            .setSize(30, 30)
            .setDisplaySize(4 * 30, 30)
            .setTint(0x888888)
            .refreshBody();

        // Platform 3 - High jump
        const plat3 = this.platforms
            .create(600, 350, null)
            .setScale(3, 1)
            .setSize(30, 30)
            .setDisplaySize(3 * 30, 30)
            .setTint(0x888888)
            .refreshBody();

        // Platform 4 - Final platform
        const plat4 = this.platforms
            .create(800, 500, null)
            .setScale(6, 1)
            .setSize(30, 30)
            .setDisplaySize(6 * 30, 30)
            .setTint(0x888888)
            .refreshBody();

        // Add jump pads
        const jumpPad1 = this.createJumpPad(320, 670, 0xffff00);
        const jumpPad2 = this.createJumpPad(500, 430, 0xffff00);
        const jumpPad3 = this.createJumpPad(700, 330, 0xffff00);

        // Create mirrored versions of all platforms for the bottom view
        // These are just visual, without physics

        // Create mirrored ground
        const mirrorGround = this.add
            .rectangle(
                ground.x,
                screenHeight - ground.y + midPoint,
                ground.displayWidth,
                ground.displayHeight,
                0x009900
            )
            .setDepth(-1);

        // Create mirrored platforms
        const mirrorPlat1 = this.add
            .rectangle(plat1.x, screenHeight - plat1.y + midPoint, plat1.displayWidth, plat1.displayHeight, 0x888888)
            .setDepth(-1);

        const mirrorPlat2 = this.add
            .rectangle(plat2.x, screenHeight - plat2.y + midPoint, plat2.displayWidth, plat2.displayHeight, 0x888888)
            .setDepth(-1);

        const mirrorPlat3 = this.add
            .rectangle(plat3.x, screenHeight - plat3.y + midPoint, plat3.displayWidth, plat3.displayHeight, 0x888888)
            .setDepth(-1);

        const mirrorPlat4 = this.add
            .rectangle(plat4.x, screenHeight - plat4.y + midPoint, plat4.displayWidth, plat4.displayHeight, 0x888888)
            .setDepth(-1);

        // Create mirrored jump pads
        this.jumpPads.getChildren().forEach(jumpPad => {
            const mirrorJumpPad = this.add
                .rectangle(
                    jumpPad.x,
                    screenHeight - jumpPad.y + midPoint,
                    jumpPad.displayWidth,
                    jumpPad.displayHeight,
                    jumpPad.fillColor || 0xffff00
                )
                .setDepth(-1);

            // Create mirrored arrow indicators
            const mirrorArrow = this.add
                .triangle(jumpPad.x, screenHeight - (jumpPad.y - 20) + midPoint, 0, -15, 15, 15, 30, -15, 0xffffff)
                .setDepth(-1);
        });

        // Set visibility for cameras
        [mirrorGround, mirrorPlat1, mirrorPlat2, mirrorPlat3, mirrorPlat4].forEach(obj => {
            if (this.topCamera) this.topCamera.ignore(obj);
        });

        // Make regular platforms invisible in bottom camera
        this.platforms.getChildren().forEach(obj => {
            if (this.bottomCamera) this.bottomCamera.ignore(obj);
        });

        // Make jump pads invisible in bottom camera
        this.jumpPads.getChildren().forEach(obj => {
            if (this.bottomCamera) this.bottomCamera.ignore(obj);
        });
    }

    createJumpPad(x, y, color) {
        const jumpPad = this.jumpPads.create(x, y, null);
        jumpPad.setScale(2, 0.5).setSize(30, 15).setDisplaySize(60, 15).setTint(color).refreshBody();

        // Add an indicator arrow
        const arrow = this.add.triangle(x, y - 20, 0, 15, 15, -15, 30, 15, 0xffffff);
        arrow.setDepth(1);

        return jumpPad;
    }

    handleJumpPad(playerSprite, jumpPad) {
        // Apply strong upward velocity when player touches a jump pad
        playerSprite.body.setVelocityY(-600);

        // Visual feedback
        this.tweens.add({
            targets: jumpPad,
            scaleY: 0.3,
            duration: 100,
            yoyo: true,
            ease: "Power1",
        });
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
                    playerInfo.y || 550,
                    playerInfo.name || `Player_${playerId.substring(0, 4)}`,
                    false // Not the main player
                );

                // Add collision between other player and platforms
                if (this.otherPlayers[playerId].sprite) {
                    this.physics.add.collider(this.otherPlayers[playerId].sprite, this.platforms);
                    this.physics.add.overlap(
                        this.otherPlayers[playerId].sprite,
                        this.jumpPads,
                        this.handleJumpPad,
                        null,
                        this
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

            // Add collision between the new player and platforms
            if (this.otherPlayers[playerInfo.id].sprite) {
                this.physics.add.collider(this.otherPlayers[playerInfo.id].sprite, this.platforms);
                this.physics.add.overlap(
                    this.otherPlayers[playerInfo.id].sprite,
                    this.jumpPads,
                    this.handleJumpPad,
                    null,
                    this
                );
            }
        } else {
            console.warn("Cannot update non-existent player:", playerInfo.id);
            // Request lobby state to try to get complete player info
            this.socket.emit("requestLobbyState", { lobbyId: this.lobbyId });
        }
    }

    checkPlayerRespawn() {
        // Define the world bounds
        const worldBottom = 650; // Adjust based on your level height

        // Check if the main player has fallen out of bounds or is caught by the camera
        if (this.player && this.player.sprite && this.player.sprite.body) {
            const caughtByCamera =
                this.autoScrollCamera && this.topCamera && this.player.x < this.topCamera.scrollX + 10; // Player is behind camera's left edge
            const fallenOffMap = this.player.y > worldBottom;

            if (fallenOffMap || caughtByCamera) {
                let newX = this.player.x;
                let newY = 0; // Respawn from top

                // If caught by camera, teleport ahead of camera position
                if (caughtByCamera) {
                    newX = this.topCamera.scrollX + 250; // Teleport 250 pixels ahead of camera
                    console.log("Player caught by camera - respawning ahead");
                } else if (fallenOffMap) {
                    console.log("Player fell off map - respawning from top");
                }

                // Apply 5-second penalty
                if (typeof this.timeLeft === "number") {
                    const penalty = import.meta.env.VITE_INSTANT_DEATH_MODE === "true" ? this.timeLeft : 5; // Instant death mode
                    this.timeLeft = Math.max(0, this.timeLeft - penalty); // Prevent going below 0
                    this.updateTimerDisplay(); // Immediately update the UI
                    console.log("Penalty applied: -5 seconds");
                }
                // Respawn player
                this.player.sprite.setPosition(newX, newY);
                this.player.sprite.body.setVelocity(0, 0);

                // Send update to other players
                if (this.socket && this.lobbyId) {
                    this.socket.emit("playerUpdate", {
                        lobbyId: this.lobbyId,
                        x: newX,
                        y: newY,
                        animation: "idle",
                        direction: this.player.direction,
                    });
                }
            }
        }
    }

    updateTimer() {
        if (typeof this.timeLeft === "number") {
            this.timeLeft = Math.max(0, this.timeLeft - 1);
            this.updateTimerDisplay();

            if (this.timeLeft <= 0) {
                this.onTimerEnd(); // Optional: handle time-up
                this.timerEvent.remove(); // Stop the timer
            }
        }
    }

    updateTimerDisplay() {
        if (typeof this.timeLeft !== "number") return;

        const clampedTime = Math.max(0, this.timeLeft);
        const minutes = Math.floor(clampedTime / 60);
        const seconds = clampedTime % 60;
        const formatted = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

        if (this.timerText) {
            this.timerText.setText(formatted);
        }
    }

    onTimerEnd() {
        console.log("Timer finished!");

        /*

        // Example action: show a message or transition
        const gameOverText = this.add
            .text(this.scale.width / 2, this.scale.height / 4, "Time's up!", {
                fontSize: "32px",
                fill: "#ff0000",
                backgroundColor: "#000000",
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(100);

        // Optional: ignore it in the bottom camera
        if (this.bottomCamera) {
            this.bottomCamera.ignore(gameOverText);
        }

        */
        this.scene.start("GameOver");
    }

    update() {
        if (!this.player || !this.connected || !this.lobbyId) return;

        // Update main player
        this.player.update();

        // Apply player movement based on input
        const moved = this.player.applyMovement(this.cursors, this.wasd);

        // Check if player needs to respawn
        this.checkPlayerRespawn();

        // Update the top camera to follow the main player (Y-axis only)
        if (this.topCamera && this.player.sprite) {
            if (!this.topCamera._follow) {
                this.topCamera.startFollow(this.player.sprite, false, 0, 1); // Only follow Y (0 for X, 1 for Y)
            }

            // If auto-scrolling is enabled, move camera horizontally (not the player)
            if (this.autoScrollCamera) {
                this.topCamera.scrollX += this.scrollSpeed * (this.game.loop.delta / 1000);

                // Camera scrolls independently, player can move at their own pace
                // No automatic player movement - let player control their character
            }
        }

        // Update the bottom camera to follow the other player's mirrored sprite (Y-axis only)
        if (this.bottomCamera) {
            const otherPlayerIds = Object.keys(this.otherPlayers);
            if (otherPlayerIds.length > 0 && this.otherPlayers[otherPlayerIds[0]].mirrorSprite) {
                // Follow the other player's mirrored sprite in bottom camera
                if (
                    !this.bottomCamera._follow ||
                    this.bottomCamera._follow !== this.otherPlayers[otherPlayerIds[0]].mirrorSprite
                ) {
                    this.bottomCamera.startFollow(this.otherPlayers[otherPlayerIds[0]].mirrorSprite, false, 0, 1); // Y-axis only
                }

                // Match X scrolling with top camera if auto-scrolling
                if (this.autoScrollCamera && this.topCamera) {
                    this.bottomCamera.scrollX = this.topCamera.scrollX;
                }
            } else {
                // If no other player, match top camera scroll position
                if (this.topCamera) {
                    this.bottomCamera.scrollX = this.topCamera.scrollX;
                }
            }
        }

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
                    `\nCamera: ${Math.round(this.topCamera.scrollX)}, ${Math.round(this.topCamera.scrollY)}` +
                    `\nAuto-scroll: ${this.autoScrollCamera ? "ON" : "OFF"}, Speed: ${this.scrollSpeed}` +
                    `\nOther Players: ${Object.keys(this.otherPlayers).length}` +
                    (otherPlayerInfo ? `\n${otherPlayerInfo}` : "") +
                    `\nLobby: ${this.lobbyId}`
            );
        }
    }

    shutdown() {
        if (this.timerEvent) {
            this.timerEvent.remove(false);
            this.timerEvent = null;
        }
    }
}