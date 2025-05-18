import { Scene } from "phaser";
import { Player } from "../entities/Player";
import { CameraManager } from "../components/CameraManager";
import { SocketManager } from "../components/SocketManager";
import { createLevelManager } from "../levels";
import { ProgressManager } from "../components/ProgressManager";
import { GameUI } from "../components/Game/GameUI";
import { GameInput } from "../components/Game/GameInput";
import { GameCollisions } from "../components/Game/GameCollisions";
import { GameTimer } from "../components/Game/GameTimer";
import { PlayerRespawn } from "../entities/PlayerRespawn";
import { PlayerConnection } from "../entities/PlayerConnection";

export class Game extends Scene {
    constructor() {
        super("Game");
        this.socket = null;
        this.player = null;
        this.otherPlayers = {};
        this.playersFinished = {};
        this.playerName = "Player_" + Math.floor(Math.random() * 1000);
        this.connected = false;
        this.lobbyId = null;
        this.debugMode = false;
        this.levelId = "level1"; // Default level
        this.playerConnection = null;

        // Split screen properties
        this.splitLine = null;
        this.topCamera = null;
        this.bottomCamera = null;

        // Camera scrolling properties
        this.autoScrollCamera = import.meta.env.VITE_AUTO_SCROLL_CAMERA === "true";
        this.scrollSpeed = 50;
        this.instantDeathMode = import.meta.env.VITE_INSTANT_DEATH_MODE === "true";

        // Level properties
        this.platforms = null;
        this.jumpPads = null;

        // Component managers
        this.progressManager = new ProgressManager();
        this.socketManager = null;
        this.gameUI = null;
        this.gameInput = null;
        this.collisionManager = null;
        this.gameTimer = null;
        this.playerRespawn = null;

        // For synchronization
        this.lastUpdateTime = 0;
        this.updateInterval = 50; // Send position updates every 50ms
        this.syncAttempts = 0;
    }

    preload() {
        this.load.audio("levelMusic", "../assets/music/dnb_og.wav");

        // Load player animation sprite sheet
        this.load.spritesheet("player_animations", "../assets/Player_Platforms/player_animations.png", {
            frameWidth: 32,
            frameHeight: 32,
        });
    }

    createAnimations() {
        // Create player animations from the sprite sheet

        // Idle animation (second frame in the sprite sheet)
        this.anims.create({
            key: "idle",
            frames: [{ key: "player_animations", frame: 1 }],
            frameRate: 10,
            repeat: -1,
        });

        // Run animation (using first and fourth frames)
        this.anims.create({
            key: "run",
            frames: [
                { key: "player_animations", frame: 0 },
                { key: "player_animations", frame: 3 },
            ],
            frameRate: 10, // Slightly faster for smoother running animation
            repeat: -1,
        });

        // Jump animation (can use another frame if needed)
        this.anims.create({
            key: "jump",
            frames: [{ key: "player_animations", frame: 2 }],
            frameRate: 10,
            repeat: 0,
        });
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

        // Track if this is a level transition to handle cleanup differently
        this.isLevelTransition = data && data.isLevelTransition === true;

        // Ensure clean start for all properties
        this.otherPlayers = {};
        this.playersFinished = {};
        this.levelLoaded = false;

        // Initialize progress manager
        this.progressManager = new ProgressManager();
        this.progressManager.loadProgress(this.playerName);

        // Initialize socket manager
        this.socketManager = new SocketManager(this);
        this.socketManager.setupLobby(data);

        // Initialize components
        this.gameUI = new GameUI(this);
        this.gameInput = new GameInput(this);
        this.collisionManager = new GameCollisions(this);
        this.gameTimer = new GameTimer(this);
        this.playerRespawn = new PlayerRespawn(this);
        this.playerRespawn.setGameTimer(this.gameTimer);

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

        this.levelMusic = this.sound.add("levelMusic", { loop: true, volume: 0.5 });
        this.levelMusic.play();
        this.gameTimer.setLevelMusic(this.levelMusic);

        // Create player animations
        this.createAnimations();

        if (!this.textures.exists("particle")) {
            const graphics = this.add.graphics();
            graphics.fillStyle(0xffffff);
            graphics.fillCircle(8, 8, 8);
            graphics.generateTexture("particle", 16, 16);
            graphics.destroy();
        }

        // Initialize ALL physics groups immediately
        this.platforms = this.physics.add.staticGroup();
        this.jumpPads = this.physics.add.staticGroup();
        this.spikeGroup = this.physics.add.staticGroup(); // Add this line
        this.finishObject = this.physics.add.staticGroup(); // Add this line
        this.movingPlatforms = this.physics.add.group();

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
        this.levelManager.setupJumpPadCollisions(this.player);

        this.playerConnection = new PlayerConnection(this);
        this.playerConnection.initialize();

        // Initialisiere die Spike-Gruppe aus dem LevelManager
        this.spikes = this.levelManager.scene.spikeGroup;

        // Setup collisions
        this.collisionManager.setupCollisions(
            this.player,
            this.platforms,
            this.jumpPads,
            this.finishObject,
            this.movingPlatforms,
            this.spikes
        );

        // Setup input
        const inputs = this.gameInput.setupInputs();
        this.cursors = inputs.cursors;
        this.wasd = inputs.wasd;

        // Setup UI elements
        const ui = this.gameUI.createUI(this.playerName, this.levelId, this.debugMode);
        this.timerText = ui.timerText;
        this.debugText = ui.debugText;
        this.multiplayerStatusText = ui.multiplayerStatusText;

        // Setup and start the timer
        this.gameTimer.setGameUI(this.gameUI);
        this.timerEvent = this.gameTimer.startTimer();

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

        // Don't process if player is already marked as finished
        if (this.playersFinished[this.socket.id]) {
            return;
        }

        // Mark this player as finished
        this.playersFinished[this.socket.id] = true;

        // Emit to server that this player has finished
        if (this.socket && this.socket.connected && this.lobbyId) {
            console.log("Sending playerFinished event to server");
            this.socket.emit("playerFinished", {
                lobbyId: this.lobbyId,
                playerId: this.socket.id,
            });
        }

        // Create a finish effect (particle burst)
        if (this.player && this.player.sprite) {
            this.createFinishEffect(this.player.sprite.x, this.player.sprite.y);
        }

        // "Destroy" the player visually (make them invisible)
        // We don't fully destroy to maintain the camera, but hide them
        if (this.player && this.player.sprite) {
            // First save the position for camera tracking
            const lastX = this.player.sprite.x;
            const lastY = this.player.sprite.y;

            // Disable physics and input
            this.player.sprite.body.enable = false;

            // Fade out the player sprite
            this.tweens.add({
                targets: this.player.sprite,
                alpha: 0,
                scale: 1.5,
                duration: 500,
                ease: "Power2",
                onComplete: () => {
                    // Make invisible but don't destroy to keep camera reference
                    this.player.sprite.setVisible(false);

                    // Create a ghost marker at the finish point for camera to follow
                    this.finishMarker = this.physics.add.sprite(lastX, lastY, "sprite");
                    this.finishMarker.setAlpha(0);
                    this.finishMarker.body.allowGravity = false;

                    if (this.topCamera) {
                        this.topCamera.startFollow(this.finishMarker);
                    }
                },
            });

            // Also hide the player name text
            if (this.player.text) {
                this.tweens.add({
                    targets: this.player.text,
                    alpha: 0,
                    duration: 500,
                });
            }
        }

        // Display "Waiting for other player" message
        this.displayWaitingMessage();

        // Check if all players have finished
        this.checkAllPlayersFinished();
    }

    handleGameOver(reason = "default") {
        console.log("Game over triggered:", reason);

        // Notify server that this player has game over
        if (this.socket && this.socket.connected && this.lobbyId) {
            this.socket.emit("playerGameOver", {
                lobbyId: this.lobbyId,
                reason: reason,
            });
        }

        // Stop music with fade out if it exists
        if (this.levelMusic) {
            this.tweens.add({
                targets: this.levelMusic,
                volume: 0,
                duration: 1000,
                onComplete: () => {
                    this.levelMusic.stop();

                    // Navigate to Game Over scene
                    this.scene.start("GameOver", {
                        levelId: this.levelId,
                        playerName: this.playerName,
                        socket: this.socket,
                        lobbyId: this.lobbyId,
                        reason: reason,
                    });
                },
            });
        } else {
            // No music to fade, switch immediately
            this.scene.start("GameOver", {
                levelId: this.levelId,
                playerName: this.playerName,
                socket: this.socket,
                lobbyId: this.lobbyId,
                reason: reason,
            });
        }
    }

    createFinishEffect(x, y) {
        // Create particle emitter for the finish effect
        const particles = this.add.particles(x, y, "particle", {
            speed: { min: 100, max: 200 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            blendMode: "ADD",
            emitting: false,
        });

        // Create a burst of particles
        particles.explode(50);

        // Add a celebration sound
        // if (this.sound.add) {
        //     const celebrationSound = this.sound.add("finish", { volume: 0.5 });
        //     celebrationSound.play();
        // }

        // Create a flash effect
        const flash = this.add.rectangle(0, 0, this.scale.width, this.scale.height / 2, 0xffffff);
        flash.setAlpha(0.8);
        flash.setDepth(100);
        flash.setOrigin(0);
        flash.setScrollFactor(0);

        // Make bottom camera ignore the flash
        if (this.bottomCamera) {
            this.bottomCamera.ignore(flash);
        }

        // Flash and fade out
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 500,
            ease: "Power2",
            onComplete: () => flash.destroy(),
        });

        // Add a celebration text animation
        const celebrationText = this.add
            .text(this.scale.width / 2, this.scale.height / 4, "FINISH!", {
                fontFamily: "Arial Black",
                fontSize: "48px",
                color: "#ffff00",
                stroke: "#000000",
                strokeThickness: 6,
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(101);

        // Make bottom camera ignore the celebration text
        if (this.bottomCamera) {
            this.bottomCamera.ignore(celebrationText);
        }

        // Animate the celebration text
        this.tweens.add({
            targets: celebrationText,
            scale: 1.5,
            duration: 500,
            yoyo: true,
            onComplete: () => {
                this.tweens.add({
                    targets: celebrationText,
                    alpha: 0,
                    duration: 500,
                    delay: 1000,
                    onComplete: () => celebrationText.destroy(),
                });
            },
        });
    }

    displayWaitingMessage() {
        // Remove any existing waiting message
        if (this.waitingText) {
            this.waitingText.destroy();
        }

        if (this.waitingContainer) {
            this.waitingContainer.destroy();
        }

        // Create waiting container for all elements
        this.waitingContainer = this.add.container(this.scale.width / 2, 100);
        this.waitingContainer.setDepth(100);
        this.waitingContainer.setScrollFactor(0);

        // Background panel for message
        const panel = this.add.rectangle(0, 0, 500, 120, 0x000000, 0.7).setStrokeStyle(4, 0x00ff00);

        // Calculate how many players have finished
        const totalPlayers = Object.keys(this.otherPlayers || {}).length + 1; // +1 for main player
        const finishedPlayers = Object.keys(this.playersFinished || {}).length;
        const remainingPlayers = totalPlayers - finishedPlayers;

        // Create waiting message
        const waitingText = this.add
            .text(0, -20, "You reached the finish line!", {
                fontFamily: "Arial Black",
                fontSize: "24px",
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);

        let subTextMessage = "Waiting for the other player...";

        // If everyone has finished, change the message
        if (finishedPlayers >= totalPlayers) {
            subTextMessage = "All players finished! Preparing next screen...";
        } else if (remainingPlayers > 0) {
            subTextMessage = `Waiting for ${remainingPlayers} more player${remainingPlayers > 1 ? "s" : ""}...`;
        }

        const subText = this.add
            .text(0, 20, subTextMessage, {
                fontFamily: "Arial",
                fontSize: "20px",
                color: "#ffff00",
                align: "center",
            })
            .setOrigin(0.5);

        this.waitingText = subText;

        // Add dots animation for waiting
        let dots = "";
        const updateDots = () => {
            // Only update dots if we're still waiting for players
            if (Object.keys(this.playersFinished || {}).length < totalPlayers) {
                dots = dots.length >= 3 ? "" : dots + ".";
                subText.setText(subTextMessage.replace("...", "") + dots);
            }
        };

        // Update dots every 500ms
        this.waitingInterval = setInterval(updateDots, 500);

        // Add all elements to container
        this.waitingContainer.add([panel, waitingText, subText]);

        // Make it visible only in top camera
        if (this.bottomCamera) {
            this.bottomCamera.ignore(this.waitingContainer);
        }
    }

    checkAllPlayersFinished() {
        // Calculate total players more explicitly
        const totalPlayers = Object.keys(this.otherPlayers || {}).length + 1; // +1 for the main player
        const finishedPlayers = Object.keys(this.playersFinished || {}).length;

        console.log(`Players finished: ${finishedPlayers}/${totalPlayers}`);
        console.log(`Finished players IDs: ${Object.keys(this.playersFinished || {}).join(", ")}`);

        // Only complete the level if all players have finished
        if (finishedPlayers >= totalPlayers) {
            console.log("All players have finished! Transitioning to finish screen...");

            // Clear waiting animation interval if it exists
            if (this.waitingInterval) {
                clearInterval(this.waitingInterval);
                this.waitingInterval = null;
            }

            // Create a "Level Complete" overlay
            const overlay = this.add
                .rectangle(0, 0, this.scale.width, this.scale.height / 2, 0x000000)
                .setAlpha(0)
                .setDepth(200)
                .setOrigin(0)
                .setScrollFactor(0);

            if (this.bottomCamera) {
                this.bottomCamera.ignore(overlay);
            }

            const completeText = this.add
                .text(this.scale.width / 2, this.scale.height / 4, "ALL PLAYERS FINISHED!", {
                    fontFamily: "Arial Black",
                    fontSize: "32px",
                    color: "#ffffff",
                    stroke: "#000000",
                    strokeThickness: 6,
                    align: "center",
                })
                .setOrigin(0.5)
                .setDepth(201)
                .setScrollFactor(0)
                .setAlpha(0);

            if (this.bottomCamera) {
                this.bottomCamera.ignore(completeText);
            }

            // Fade in the overlay
            this.tweens.add({
                targets: [overlay, completeText],
                alpha: overlay.alpha < 0.1 ? 0.7 : 0, // Toggle alpha
                duration: 1000,
                onComplete: () => {
                    // Stop timer
                    if (this.timerEvent) {
                        this.timerEvent.remove(false);
                    }

                    // Record level completion in progress manager
                    const result = this.progressManager.completeLevel(this.levelId, this.gameTimer.getTimeLeft());

                    // Sync progress with server if connected
                    if (this.socket && this.socket.connected) {
                        this.socket.emit("levelCompleted", {
                            playerName: this.playerName,
                            levelId: this.levelId,
                            timeLeft: this.gameTimer.getTimeLeft(),
                            stars: result.stars,
                        });
                    }

                    // Stop Music
                    if (this.levelMusic) {
                        this.tweens.add({
                            targets: this.levelMusic,
                            volume: 0,
                            duration: 1000,
                            onComplete: () => this.levelMusic.stop(),
                        });
                    }

                    // Switch to FinishLevel scene after a delay
                    this.time.delayedCall(2000, () => {
                        this.scene.start("FinishLevel", {
                            timeLeft: this.gameTimer.getTimeLeft(),
                            stars: result.stars,
                            levelId: this.levelId,
                            playerName: this.playerName,
                            socket: this.socket,
                            lobbyId: this.lobbyId,
                            nextLevelId: result.nextLevelId,
                        });
                    });
                },
            });
        } else {
            console.log("Not all players have finished yet. Waiting...");
        }
    }

    update(time, delta) {
        if (!this.player) return;

        // Update main player
        this.player.update();

        // Apply player movement based on input
        const moved = this.player.applyMovement(this.cursors, this.wasd);

        // Check if player needs to respawn
        this.playerRespawn.checkPlayerRespawn(this.player, this.topCamera, this.autoScrollCamera);

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

        if (this.playerConnection) {
            this.playerConnection.update();
        }

        // Update debug text if enabled
        if (this.debugMode && this.debugText) {
            const otherPlayerInfo = Object.entries(this.otherPlayers)
                .map(([id, player]) => `${id.substring(0, 4)}: (${Math.round(player.x)}, ${Math.round(player.y)})`)
                .join("\n");

            const debugInfo =
                `Player: ${this.socket?.id?.substring(0, 6) || "No ID"} (${Math.round(this.player.x)}, ${Math.round(
                    this.player.y
                )})` +
                `\nCamera: ${Math.round(this.topCamera?.scrollX || 0)}, ${Math.round(this.topCamera?.scrollY || 0)}` +
                `\nAuto-scroll: ${this.autoScrollCamera ? "ON" : "OFF"}, Speed: ${this.scrollSpeed}` +
                `\nOther Players: ${Object.keys(this.otherPlayers).length}` +
                (otherPlayerInfo ? `\n${otherPlayerInfo}` : "") +
                `\nLobby: ${this.lobbyId || "None"}` +
                `\nLevel: ${this.levelId}` +
                `\nSync Attempts: ${this.syncAttempts}`;

            this.gameUI.updateDebugText(debugInfo);
        }

        if (this.levelManager?.updateMovingPlatforms) {
            this.levelManager.updateMovingPlatforms(time);
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

        // Clear waiting animation interval
        if (this.waitingInterval) {
            clearInterval(this.waitingInterval);
            this.waitingInterval = null;
        }

        // Clean up game timer
        if (this.gameTimer) {
            this.gameTimer.shutdown();
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

        if (this.playerConnection) {
            this.playerConnection.shutdown();
            this.playerConnection = null;
        }

        // Clean up finish marker if it exists
        if (this.finishMarker) {
            this.finishMarker.destroy();
            this.finishMarker = null;
        }
    }
}
