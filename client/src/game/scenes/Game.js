import { Scene } from "phaser";
import { Player } from "../entities/Player";
import { CameraManager } from "../components/CameraManager";
import { SocketManager } from "../components/SocketManager";
import { createLevelManager } from "../levels";
import { ProgressManager } from "../components/ProgressManager";

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
        this.levelId = "level1"; // Default level

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

        // Progress tracking
        this.progressManager = new ProgressManager();

        // For synchronization
        this.lastUpdateTime = 0;
        this.updateInterval = 50; // Send position updates every 50ms
        this.syncAttempts = 0;
    }

    init(data) {
        console.log("Game Scene initialized with data:", data);

        // Enable debug mode from environment variable
        this.debugMode = import.meta.env.VITE_DEBUG_MODE === "true";

        // Set the level ID if provided
        if (data && data.levelId) {
            this.levelId = data.levelId;
            console.log("Loading level:", this.levelId);
        }

        // Set player name if provided
        if (data && data.playerName) {
            this.playerName = data.playerName;
            console.log("Player name:", this.playerName);
        }

        // Initialize progress manager
        this.progressManager.loadProgress(this.playerName);

        // Initialize socket manager
        this.socketManager = new SocketManager(this);
        this.socketManager.setupLobby(data);

        // Clear other players to start fresh
        this.otherPlayers = {};

        // Set up socket listeners after a slight delay to ensure proper initialization
        setTimeout(() => {
            this.socketManager.setupSocketListeners();

            // Request the current lobby state to initialize player data
            if (this.socket && this.socket.connected && this.lobbyId) {
                console.log("Requesting initial lobby state for:", this.lobbyId);
                this.socket.emit("requestLobbyState", { lobbyId: this.lobbyId });
            }
        }, 500);
    }

    create() {
        console.log("Game scene created. Lobby ID:", this.lobbyId);

        // Reset timer to full duration
        this.timeLeft = 180;

        // Remove any previous timer event if exists (for hot reload or reuse safety)
        if (this.timerEvent) {
            this.timerEvent.remove(false);
            this.timerEvent = null;
        }

        // Initialize physics groups immediately
        this.platforms = this.physics.add.staticGroup();
        this.jumpPads = this.physics.add.staticGroup();

        // Set up camera manager
        this.cameraManager = new CameraManager(this, this.autoScrollCamera, this.scrollSpeed);
        this.cameraManager.setupCameras();

        // Set up level manager
        this.levelManager = createLevelManager(this);
        this.levelManager.initialize();

        // Load the specified level and get the spawn position
        const levelInfo = this.levelManager.loadLevel(this.levelId);
        this.levelLoaded = true;

        // Create main player at level spawn position
        this.player = new Player(this, levelInfo.spawnPoint.x, levelInfo.spawnPoint.y, this.playerName, true);

        // Add collision between player and platforms
        this.physics.add.collider(this.player.sprite, this.platforms);

        // Add collision with jump pads and special effect
        this.physics.add.overlap(this.player.sprite, this.jumpPads, this.handleJumpPad, null, this);

        // Set up physics overlap with finish line if it exists
        if (this.finishObject) {
            this.physics.add.overlap(this.player.sprite, this.finishObject, this.handleFinish, null, this);
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

        // Add back button to return to main menu - only in top section
        const backButton = this.add
            .rectangle(100, 50, 150, 40, 0x222222, 0.7)
            .setInteractive()
            .setScrollFactor(0) // Fixed to camera
            .on("pointerdown", () => {
                if (this.socket && this.socket.connected && this.lobbyId) {
                    this.socket.emit("leaveLobby", { lobbyId: this.lobbyId });
                }

                // Go back to lobby
                this.scene.start("Lobby", {
                    socket: this.socket,
                    playerName: this.playerName,
                });
            });

        const backText = this.add
            .text(100, 50, "Back to Lobby", {
                fontFamily: "Arial",
                fontSize: 14,
                color: "#ffffff",
            })
            .setOrigin(0.5)
            .setScrollFactor(0); // Fixed to camera

        // Add level name display
        let levelName = "Unknown Level";
        if (this.levelId === "level1") levelName = "Level 1";
        else if (this.levelId === "level2") levelName = "Level 2";
        else levelName = this.levelId;

        const levelNameText = this.add
            .text(this.scale.width / 2, 50, levelName, {
                fontFamily: "Arial Black",
                fontSize: 18,
                color: "#ffffff",
                shadow: { offsetX: 2, offsetY: 2, color: "#000000", blur: 2, stroke: true, fill: true },
            })
            .setOrigin(0.5)
            .setScrollFactor(0);

        // Make back button only visible in top camera
        if (this.bottomCamera) {
            this.bottomCamera.ignore([backButton, backText, levelNameText]);
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

        // Add timer display
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

        // Set up moving platforms if any
        this.setupMovingPlatforms();

        // If we're in a lobby, make sure to update our initial position
        if (this.socket && this.socket.connected && this.lobbyId) {
            console.log("Sending initial position to server");
            this.socket.emit("playerUpdate", {
                lobbyId: this.lobbyId,
                x: this.player.x,
                y: this.player.y,
                animation: this.player.animation,
                direction: this.player.direction,
                levelId: this.levelId,
            });

            // Also request lobby state to make sure we see other players
            this.socket.emit("requestLobbyState", { lobbyId: this.lobbyId });
        }

        // Add a multiplayer status indicator
        this.multiplayerStatusText = this.add
            .text(this.scale.width - 150, 60, "Looking for players...", {
                fontSize: "16px",
                fill: "#ffffff",
                backgroundColor: "#000000",
                padding: { x: 5, y: 2 },
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(100);

        // Make it only visible in top camera
        if (this.bottomCamera) {
            this.bottomCamera.ignore(this.multiplayerStatusText);
        }

        // Set up a repeated sync timer to make sure we get other players
        this.syncTimer = this.time.addEvent({
            delay: 2000, // Try every 2 seconds for the first 10 seconds
            callback: this.attemptSync,
            callbackScope: this,
            loop: true,
            repeat: 5, // Try 5 times
        });
    }

    attemptSync() {
        this.syncAttempts++;

        // If we already have other players, stop trying
        if (Object.keys(this.otherPlayers).length > 0) {
            if (this.syncTimer) {
                this.syncTimer.remove();
                this.syncTimer = null;
            }
            return;
        }

        // Try to get lobby state
        if (this.socket && this.socket.connected && this.lobbyId) {
            console.log(`Sync attempt ${this.syncAttempts}: Requesting lobby state`);
            this.socket.emit("requestLobbyState", { lobbyId: this.lobbyId });

            // Also send our position to make sure others can see us
            this.socket.emit("playerUpdate", {
                lobbyId: this.lobbyId,
                x: this.player.x,
                y: this.player.y,
                animation: this.player.animation,
                direction: this.player.direction,
                levelId: this.levelId,
            });
        }

        // If we've tried 5 times and still don't have other players, give up
        if (this.syncAttempts >= 5 && this.syncTimer) {
            console.log("Giving up on sync attempts after 5 tries");
            this.syncTimer.remove();
            this.syncTimer = null;
        }
    }

    setupMovingPlatforms() {
        // Find platforms that need animations
        const platforms = this.platforms ? this.platforms.getChildren() : [];
        const movingPlatforms = this.levelManager.getMovingPlatforms();

        // Apply animations to moving platforms
        if (movingPlatforms && movingPlatforms.length > 0) {
            movingPlatforms.forEach(config => {
                const { platform, mirrorPlatform, movement } = config;

                if (platform && movement) {
                    // Add animation to platform
                    this.tweens.add({
                        targets: platform,
                        y: platform.y - movement.y, // Move up by specified amount
                        duration: movement.duration || 2000,
                        yoyo: true,
                        repeat: -1,
                        ease: "Sine.easeInOut",
                    });

                    // Add inverse animation to mirror platform
                    if (mirrorPlatform) {
                        this.tweens.add({
                            targets: mirrorPlatform,
                            y: mirrorPlatform.y + movement.y, // Move down for mirror effect
                            duration: movement.duration || 2000,
                            yoyo: true,
                            repeat: -1,
                            ease: "Sine.easeInOut",
                        });
                    }
                }
            });
        }
    }

    handleFinish(playerSprite, finishObject) {
        console.log("Player reached finish!");

        // Stop timer
        if (this.timerEvent) {
            this.timerEvent.remove(false);
        }

        // Record level completion in progress manager
        const result = this.progressManager.completeLevel(this.levelId, this.timeLeft);

        // Sync progress with server if connected
        if (this.socket && this.socket.connected) {
            this.socket.emit("levelCompleted", {
                playerName: this.playerName,
                levelId: this.levelId,
                timeLeft: this.timeLeft,
                stars: result.stars,
            });
        }

        // Switch to FinishLevel scene
        this.scene.start("FinishLevel", {
            timeLeft: this.timeLeft,
            stars: result.stars,
            levelId: this.levelId,
            playerName: this.playerName,
            socket: this.socket,
            nextLevelId: result.nextLevelId,
        });
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

                // Send update to other players immediately
                if (this.socket && this.socket.connected && this.lobbyId) {
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

        this.scene.start("GameOver", {
            levelId: this.levelId,
            playerName: this.playerName,
            socket: this.socket,
        });
    }

    update(time, delta) {
        if (!this.player) return;

        // Update main player
        this.player.update();

        // Apply player movement based on input
        const moved = this.player.applyMovement(this.cursors, this.wasd);

        // Check if player needs to respawn
        this.checkPlayerRespawn();

        // Update cameras
        if (this.cameraManager) {
            this.cameraManager.updateCameras();
        }

        // Send player updates to server at controlled intervals to prevent flooding
        const now = time;
        if (this.socket && this.socket.connected && this.lobbyId) {
            if (moved || now - this.lastUpdateTime >= this.updateInterval) {
                // Send update to server
                this.socketManager.sendPlayerUpdate();
                this.lastUpdateTime = now;
            }
        }

        // Update other players
        Object.values(this.otherPlayers).forEach(player => {
            if (player && typeof player.update === "function") {
                player.update();
            }
        });

        // Update multiplayer status text
        const otherPlayerCount = Object.keys(this.otherPlayers).length;
        if (this.multiplayerStatusText) {
            if (otherPlayerCount > 0) {
                this.multiplayerStatusText.setText(`Connected: ${otherPlayerCount} player(s)`);
                this.multiplayerStatusText.setStyle({ fill: "#00ff00" });
            } else {
                this.multiplayerStatusText.setText("Looking for players...");
                this.multiplayerStatusText.setStyle({ fill: "#ffff00" });
            }
        }

        // Update debug text if enabled
        if (this.debugMode && this.debugText) {
            const otherPlayerInfo = Object.entries(this.otherPlayers)
                .map(([id, player]) => `${id.substring(0, 4)}: (${Math.round(player.x)}, ${Math.round(player.y)})`)
                .join("\n");

            this.debugText.setText(
                `Player: ${this.socket?.id?.substring(0, 6) || "No ID"} (${Math.round(this.player.x)}, ${Math.round(
                    this.player.y
                )})` +
                    `\nCamera: ${Math.round(this.topCamera?.scrollX || 0)}, ${Math.round(
                        this.topCamera?.scrollY || 0
                    )}` +
                    `\nAuto-scroll: ${this.autoScrollCamera ? "ON" : "OFF"}, Speed: ${this.scrollSpeed}` +
                    `\nOther Players: ${Object.keys(this.otherPlayers).length}` +
                    (otherPlayerInfo ? `\n${otherPlayerInfo}` : "") +
                    `\nLobby: ${this.lobbyId || "None"}` +
                    `\nLevel: ${this.levelId}` +
                    `\nSync Attempts: ${this.syncAttempts}`
            );
        }
    }

    shutdown() {
        // Clear timers
        if (this.timerEvent) {
            this.timerEvent.remove(false);
            this.timerEvent = null;
        }

        if (this.syncTimer) {
            this.syncTimer.remove();
            this.syncTimer = null;
        }

        // Clean up socket manager
        if (this.socketManager) {
            this.socketManager.shutdown();
        }

        // Clean up player objects
        Object.values(this.otherPlayers).forEach(player => {
            if (player && typeof player.destroy === "function") {
                player.destroy();
            }
        });
        this.otherPlayers = {};
    }
}
