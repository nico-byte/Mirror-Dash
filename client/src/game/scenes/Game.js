import { Scene } from "phaser";
import { io } from "socket.io-client";
import { Player } from "../entities/Player";
import { CameraManager } from "../components/CameraManager";
import { SocketManager } from "../components/SocketManager";

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
        this.autoScrollCamera = import.meta.env.VITE_AUTO_SCROLL_CAMERA === "true";
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

        this.socketManager = new SocketManager(this);
        this.socketManager.setupLobby(data);

        this.socketManager.setupSocketListeners();

        // Request the current lobby state as soon as we initialize
        if (this.socket && this.lobbyId) {
            console.log("Requesting lobby state for:", this.lobbyId);
            this.socket.emit("requestLobbyState", { lobbyId: this.lobbyId });
        }
    }

    create() {
        // Reset timer to full duration
        this.timeLeft = 180;

        // Remove any previous timer event if exists (for hot reload or reuse safety)
        if (this.timerEvent) {
            this.timerEvent.remove(false);
            this.timerEvent = null;
        }

        this.cameraManager = new CameraManager(this, this.autoScrollCamera, this.scrollSpeed);
        this.cameraManager.setupCameras();

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

        this.cameraManager.updateCameras();

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
