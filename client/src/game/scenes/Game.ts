import { Player } from "../entities/Player";
import { CameraManager } from "../components/CameraManager";
import { SocketManager } from "../components/SocketManager";
import { createLevelManager, LevelManager } from "../levels";
import { ProgressManager } from "../components/ProgressManager";
import { GameUI } from "../components/Game/GameUI";
import { GameInput } from "../components/Game/GameInput"; // Added import
import { GameCollisions } from "../components/Game/GameCollisions";
import { GameTimer } from "../components/Game/GameTimer";
import { PlayerRespawn } from "../entities/PlayerRespawn";
import { PlayerConnection } from "../entities/PlayerConnection";
import { AudioManager } from "../components/AudioManager";
import { Socket } from "socket.io-client";
import { GameInitData, WASDKeys, GameSizeInfo } from "../utils/interfaces";

interface LevelSettings {
    autoScroll?: boolean;
    cameraSpeed?: number;
    music?: string | null;
}

type SpawnPoint = { x: number; y: number };
type WorldBounds = { width: number; height: number };

export interface LevelInfo {
    spawnPoint: SpawnPoint;
    worldBounds: WorldBounds;
    settings?: LevelSettings;
}

export class Game extends Phaser.Scene {
    socket: Socket | null;
    player: Player | null;
    otherPlayers: Record<string, Player>;
    playersFinished: Record<string, boolean>;
    playerName: string;
    connected: boolean;
    lobbyId: string | null;
    debugMode: boolean;
    levelId: string;
    levelLoaded: boolean;
    isTransitioning: boolean;
    splitLine: Phaser.GameObjects.Line | null;
    topCamera: Phaser.Cameras.Scene2D.Camera | null;
    bottomCamera: Phaser.Cameras.Scene2D.Camera | null;
    autoScrollCamera: boolean;
    scrollSpeed: number;
    instantDeathMode: boolean;
    platforms: Phaser.Physics.Arcade.StaticGroup | null;
    jumpPads: Phaser.Physics.Arcade.StaticGroup | null;
    movingPlatforms: Phaser.Physics.Arcade.Group | null;
    spikeGroup: Phaser.Physics.Arcade.StaticGroup | null;
    finishObject: Phaser.Physics.Arcade.StaticGroup | null;
    portals: Phaser.Physics.Arcade.StaticGroup | null;
    progressManager: ProgressManager | null;
    socketManager: SocketManager | null;
    gameUI: GameUI | null;
    gameInput: GameInput | null;
    collisionManager: GameCollisions | null;
    gameTimer: GameTimer | null;
    playerRespawn: PlayerRespawn | null;
    playerConnection: PlayerConnection | null;
    levelManager: LevelManager | null;
    cameraManager: CameraManager | null;
    audioManager: AudioManager | null;
    levelMusic: Phaser.Sound.BaseSound | null;
    lastUpdateTime: number;
    updateInterval: number;
    syncAttempts: number;
    syncTimer: Phaser.Time.TimerEvent | null;
    waitingInterval: number | null;
    levelWidth: number;
    levelHeight: number;
    cursors: Phaser.Types.Input.Keyboard.CursorKeys | null;
    wasd: WASDKeys | null;
    uKey: Phaser.Input.Keyboard.Key | null;
    timerText: string;
    debugText: string;
    timerEvent: Phaser.Time.TimerEvent | null;
    finishMarker: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null;
    waitingContainer: Phaser.GameObjects.Container | null;
    lastPlatformSyncTime: number;

    constructor() {
        super("Game");
    }

    /**
     * Initialize/reset all properties to default values
     * This ensures a clean state for each new game instance
     */
    initializeProperties(): void {
        this.socket = null;
        this.player = null;
        this.otherPlayers = {};
        this.playersFinished = {};
        this.playerName = "Player_" + Math.floor(Math.random() * 1000);
        this.connected = false;
        this.lobbyId = null;
        this.debugMode = false;
        this.levelId = "level1"; // Default level
        this.levelLoaded = false;
        this.isTransitioning = false;

        // Split screen properties
        this.splitLine = null;
        this.topCamera = null;
        this.bottomCamera = null;

        // Camera scrolling properties
        this.autoScrollCamera = false;
        this.scrollSpeed = 50;
        this.instantDeathMode = false;

        // Level properties
        this.platforms = null;
        this.jumpPads = null;
        this.movingPlatforms = null;
        this.spikeGroup = null;
        this.finishObject = null;
        this.portals = null; // Add portals property

        // Component managers
        this.progressManager = null;
        this.socketManager = null;
        this.gameUI = null;
        this.gameInput = null;
        this.collisionManager = null;
        this.gameTimer = null;
        this.playerRespawn = null;
        this.playerConnection = null;
        this.levelManager = null;
        this.cameraManager = null;
        this.audioManager = null;

        // Music and sounds
        this.levelMusic = null;

        // For synchronization
        this.lastUpdateTime = 0;
        this.updateInterval = 50; // Send position updates every 50ms
        this.syncAttempts = 0;
        this.syncTimer = null;
        this.waitingInterval = null;
    }

    init(data?: GameInitData): void {
        // Reset all properties to ensure no state leakage between game instances
        this.initializeProperties();

        // Enable debug mode if set in environment variable
        this.debugMode = import.meta.env.VITE_DEBUG_MODE === "true";

        // Auto-scroll camera settings from environment
        this.autoScrollCamera = import.meta.env.VITE_AUTO_SCROLL_CAMERA === "true";
        this.scrollSpeed = parseFloat(import.meta.env.VITE_CAMERA_SCROLL_SPEED ?? "50");

        // Instant death mode from environment
        this.instantDeathMode = import.meta.env.VITE_INSTANT_DEATH_MODE === "true";

        // Set the level ID if provided
        if (data?.levelId) {
            this.levelId = data.levelId;
        }

        // Set player name if provided
        if (data?.playerName) {
            this.playerName = data.playerName;
        }

        // Track if this is a level transition
        this.isTransitioning = data?.isTransitioning === true;

        // Set lobby ID if provided
        if (data?.lobbyId) {
            this.lobbyId = data.lobbyId;
        }

        // Set socket if provided
        if (data?.socket) {
            this.socket = data.socket;
            this.connected = data.socket.connected;
        }

        // Initialize progress manager
        this.progressManager = new ProgressManager();
        this.progressManager.loadProgress(this.playerName);

        // Initialize socket manager
        this.socketManager = new SocketManager(this);
        this.socketManager.setupLobby(data);

        // Initialize game components
        this.gameUI = new GameUI(this);
        this.gameInput = new GameInput(this);
        this.collisionManager = new GameCollisions(this, this.socket, this.lobbyId, this.playerName, this.lobbyId);
        this.gameTimer = new GameTimer(this);
        this.playerRespawn = new PlayerRespawn(this);
        this.playerRespawn.setGameTimer(this.gameTimer);
        this.audioManager = new AudioManager(this);

        // Set up socket listeners after a slight delay to ensure proper initialization
        setTimeout(() => {
            this.socketManager?.setupSocketListeners();

            // Request the current lobby state to initialize player data
            if (this.socket?.connected && this.lobbyId) {
                this.socket.emit("requestLobbyState", { lobbyId: this.lobbyId });
            }
        }, 500);
    }

    preload(): void {
        // Let the audio manager handle audio preloading
        if (this.audioManager) {
            this.audioManager.preloadAudio();
        }
    }

    // Replace the createAnimations method in Game.js

    createAnimations(): void {
        // Skip if animations are already defined
        if (this.anims.exists("idle")) return;

        // Make sure the texture exists before creating animations
        if (!this.textures.exists("player_animations")) {
            console.warn("Cannot create animations: player_animations texture not found");
            return;
        }

        // Create the animations with proper error handling
        try {
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
                frameRate: 10,
                repeat: -1,
            });

            // Jump animation
            this.anims.create({
                key: "jump",
                frames: [{ key: "player_animations", frame: 2 }],
                frameRate: 10,
                repeat: 0,
            });

            console.log("Player animations created successfully");
        } catch (error) {
            console.error("Failed to create animations:", error);
        }
    }

    /**
     * Handle game resize events
     * @param {Object} gameSize - The new game size
     */
    handleResize(gameSize: GameSizeInfo): void {
        // Make sure we have the level dimensions
        const levelWidth = this.levelWidth || 6000;
        const levelHeight = this.levelHeight || 1000;

        // Update world bounds to ensure they're correct after resize
        if (this.physics?.world) {
            this.physics.world.setBounds(0, 0, levelWidth, levelHeight);
        }

        // Update camera bounds
        if (this.cameraManager) {
            this.cameraManager.handleResize();
        }

        // Update UI elements if needed
        // if (this.gameUI) {
        //     this.gameUI.updateUI(gameSize.width, gameSize.height);
        // }

        console.log(`Game resized: ${gameSize.width}x${gameSize.height}, level bounds: ${levelWidth}x${levelHeight}`);
    }

    create(): void {
        // Create player animations
        this.createAnimations();

        // Create a simple particle texture if it doesn't exist
        if (!this.textures.exists("particle")) {
            const graphics = this.add.graphics();
            graphics.fillStyle(0xffffff);
            graphics.fillCircle(8, 8, 8);
            graphics.generateTexture("particle", 16, 16);
            graphics.destroy();
        }

        // Initialize physics groups
        this.platforms = this.physics.add.staticGroup();
        this.jumpPads = this.physics.add.staticGroup();
        this.spikeGroup = this.physics.add.staticGroup();
        this.finishObject = this.physics.add.staticGroup();
        this.movingPlatforms = this.physics.add.group();
        this.portals = this.physics.add.staticGroup(); // Initialize portals group

        // Set up camera manager
        this.cameraManager = new CameraManager(this, this.autoScrollCamera, this.scrollSpeed);
        this.cameraManager.setupCameras();

        // Set up level manager
        this.levelManager = createLevelManager(this);
        this.levelManager.initialize();

        // Load the specified level and get the spawn position
        const levelInfo = this.levelManager.loadLevel(this.levelId);

        if (!levelInfo) {
            console.error(`Failed to load level: ${this.levelId}`);
            // Use fallback values
            this.levelLoaded = false;

            // Create default level info
            const defaultLevelInfo: LevelInfo = {
                spawnPoint: { x: 230, y: 500 },
                worldBounds: { width: 5000, height: 800 },
                settings: {
                    autoScroll: this.autoScrollCamera,
                    cameraSpeed: this.scrollSpeed,
                    music: null
                }
            };

            this.applyLevelSettings(defaultLevelInfo.settings);
            this.player = new Player(this, defaultLevelInfo.spawnPoint.x, defaultLevelInfo.spawnPoint.y, this.playerName, true);
            return; // Exit early
        }

        this.levelLoaded = true;

        this.applyLevelSettings(levelInfo.settings);

        this.scale.on("resize", this.handleResize, this);

        // Create main player at level spawn position
        this.player = new Player(this, levelInfo.spawnPoint.x, levelInfo.spawnPoint.y, this.playerName, true);

        // Initialize player connection visuals
        this.playerConnection = new PlayerConnection(this);
        this.playerConnection.initialize();

        // Setup collisions
        this.collisionManager?.setupCollisions(
            this.player,
            this.platforms,
            this.jumpPads,
            this.finishObject,
            this.movingPlatforms,
            this.spikeGroup,
            this.portals // Add portals to collision setup
        );

        // Setup input
        const inputs = this.gameInput?.setupInputs();
        this.cursors = inputs!.cursors;
        this.wasd = inputs!.wasd;

        // Pass input references to player for movement
        if (this.player) {
            this.player.keyInput = {
                left: this.cursors.left,
                right: this.cursors.right,
                up: this.cursors.up,
                ...this.wasd,
            };
        }

        // Add U key for toggling UFO mode - only available in physics debug mode
        this.uKey = this.input.keyboard!.addKey("U");
        this.uKey.on("down", () => {
            // Check if physics debug mode is enabled
            const isPhysicsDebugMode = this.physics.world.drawDebug;
            if (isPhysicsDebugMode && this.player && typeof this.player.toggleUfoMode === "function") {
                this.player.toggleUfoMode();
            }
        });

        // Setup UI elements
        const ui = this.gameUI!.createUI(this.playerName, this.levelId, this.debugMode);
        this.timerText = ui.timerText;
        this.debugText = ui.debugText;

        // Setup and start the timer
        this.gameTimer!.setGameUI(this.gameUI);
        this.timerEvent = this.gameTimer!.startTimer();

        // If we're in a lobby, make sure to update our initial position
        if (this.socket?.connected && this.lobbyId) {
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

    applyLevelSettings(settings: LevelSettings | null | undefined): void {
        // Provide default settings if none provided
        const defaultSettings: LevelSettings = {
            autoScroll: this.autoScrollCamera,
            cameraSpeed: this.scrollSpeed,
            music: null
        };

        const actualSettings = { ...defaultSettings, ...settings };

        // Apply camera settings
        if (this.cameraManager) {
            this.cameraManager.autoScrollCamera = actualSettings.autoScroll ?? this.autoScrollCamera;
            this.cameraManager.scrollSpeed = actualSettings.cameraSpeed ?? this.scrollSpeed;
        }

        // Play music through the audio manager
        if (this.audioManager && actualSettings.music) {
            // Don't force-play music if we're a joined player (to avoid duplication)
            const isJoinedPlayer =
                this.socket?.connected && this.lobbyId && Object.keys(this.otherPlayers || {}).length > 0;

            if (!isJoinedPlayer) {
                this.levelMusic = this.audioManager.playMusic(
                    actualSettings.music,
                    true,
                    this.audioManager.musicVolume,
                    true,
                    false
                );
                // Update references to music
                this.gameTimer?.setLevelMusic(this.levelMusic);
                this.gameUI?.setLevelMusic(this.levelMusic);
            }
        }
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
        if (this.socket?.connected && this.lobbyId) {
            // Request lobby state
            this.socket.emit("requestLobbyState", { lobbyId: this.lobbyId });

            // Also send our position to make sure others can see us
            this.socket.emit("playerUpdate", {
                lobbyId: this.lobbyId,
                x: this.player!.x,
                y: this.player!.y,
                animation: this.player!.animation,
                direction: this.player!.direction,
                levelId: this.levelId,
            });
        }

        // If we've tried 5 times and still don't have other players, give up
        if (this.syncAttempts >= 5 && this.syncTimer) {
            this.syncTimer.remove();
            this.syncTimer = null;
        }
    }

    handleFinish() {
        // Don't process if player is already marked as finished
        if (this.playersFinished[this.socket!.id]) {
            return;
        }

        // Mark this player as finished
        this.playersFinished[this.socket!.id] = true;

        // Emit to server that this player has finished
        if (this.socket?.connected && this.lobbyId) {
            this.socket.emit("playerFinished", {
                lobbyId: this.lobbyId,
            });
        }

        // Create a finish effect (particle burst)
        if (this.player?.sprite) {
            this.createFinishEffect(this.player.sprite.x, this.player.sprite.y);
        }

        // "Disable" the player visually (make them inactive)
        if (this.player?.sprite) {
            // First save the position for camera tracking
            const lastX = this.player.sprite.x;
            const lastY = this.player.sprite.y;

            // Disable physics and input
            this.player.sprite.body.enable = false;

            // Fade out the player sprite
            this.tweens.add({
                targets: this.player.sprite,
                alpha: 0.3,
                scale: 1.5,
                duration: 500,
                ease: "Power2",
                onComplete: () => {
                    // Make sprite semi-transparent but don't destroy it
                    this.player!.sprite.setVisible(true);
                    this.player!.sprite.setAlpha(0.3);

                    // Create a ghost marker at the finish point for camera to follow
                    this.finishMarker = this.physics.add.sprite(lastX, lastY, "sprite");
                    this.finishMarker.setAlpha(0);
                    this.finishMarker.body.allowGravity = false;

                    if (this.topCamera) {
                        this.topCamera.startFollow(this.finishMarker);
                    }
                },
            });

            // Also fade the player name text
            if (this.player.text) {
                this.tweens.add({
                    targets: this.player.text,
                    alpha: 0.3,
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
        // Prevent multiple game over calls
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Notify server that this player has game over
        if (this.socket?.connected && this.lobbyId) {
            this.socket.emit("playerGameOver", {
                lobbyId: this.lobbyId,
                reason: reason,
            });
        }

        // Stop music with fade out if using audio manager
        if (this.audioManager && this.levelMusic) {
            // Fade out and stop music
            this.audioManager.stopMusic(1000);

            // Switch to Game Over scene after a short delay
            this.time.delayedCall(1200, () => {
                // Clean up resources
                this.cleanup();

                // Navigate to Game Over scene
                this.scene.start("GameOver", {
                    levelId: this.levelId,
                    playerName: this.playerName,
                    socket: this.socket,
                    lobbyId: this.lobbyId,
                    reason: reason,
                });
            });
        } else {
            // No music to fade, switch immediately
            this.cleanup();
            this.scene.start("GameOver", {
                levelId: this.levelId,
                playerName: this.playerName,
                socket: this.socket,
                lobbyId: this.lobbyId,
                reason: reason,
            });
        }
    }

    createFinishEffect(x: number, y: number) {
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
    }

    displayWaitingMessage() {
        if (this.waitingContainer) {
            this.waitingContainer.destroy();
        }

        // Create waiting container for all elements
        this.waitingContainer = this.add.container(this.scale.width / 2, 100);
        this.waitingContainer.setDepth(100);
        this.waitingContainer.setScrollFactor(0);

        // Calculate how many players have finished
        const totalPlayers = Object.keys(this.otherPlayers || {}).length + 1; // +1 for main player
        const finishedPlayers = Object.keys(this.playersFinished || {}).length;
        const remainingPlayers = totalPlayers - finishedPlayers;

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
            .setOrigin(0.5)
            .setDepth(100);

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
        this.waitingContainer.add([subText]);

        // Make it visible only in top camera
        if (this.bottomCamera) {
            this.bottomCamera.ignore(this.waitingContainer);
        }
    }

    checkAllPlayersFinished() {
        // Calculate total players more explicitly
        const totalPlayers = Object.keys(this.otherPlayers || {}).length + 1; // +1 for the main player
        const finishedPlayers = Object.keys(this.playersFinished || {}).length;

        // Only complete the level if all players have finished
        if (finishedPlayers >= totalPlayers) {
            // Clear waiting animation interval
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

            // Fade in the overlay
            this.tweens.add({
                targets: [overlay],
                alpha: overlay.alpha < 0.1 ? 0.7 : 0, // Toggle alpha
                duration: 1000,
                onComplete: () => {
                    // Stop timer
                    if (this.timerEvent) {
                        this.timerEvent.remove(false);
                    }

                    // Record level completion in progress manager
                    const result = this.progressManager!.completeLevel(this.levelId, this.gameTimer!.getTimeLeft());

                    // Sync progress with server if connected
                    if (this.socket?.connected) {
                        this.socket.emit("levelCompleted", {
                            playerName: this.playerName,
                            levelId: this.levelId,
                            timeLeft: this.gameTimer!.getTimeLeft(),
                            stars: result.stars,
                        });
                    }
                    // Stop Music
                    if (this.audioManager) {
                        this.audioManager.stopMusic(1000);
                    }

                    // Play win sound
                    if (this.audioManager) {
                        this.audioManager.playSfx("win");
                    } else {
                        this.sound.play("win");
                    }

                    // Switch to FinishLevel scene after a delay
                    this.time.delayedCall(2000, () => {
                        // Clean up resources first
                        this.cleanup();

                        this.scene.start("FinishLevel", {
                            timeLeft: this.gameTimer!.getTimeLeft(),
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
        }
    }

    updateDebugText() {
        // Update debug text if enabled
        if (this.debugMode && this.debugText) {
            const otherPlayerInfo = Object.entries(this.otherPlayers)
                .map(([id, player]) => `${id.substring(0, 4)}: (${Math.round(player.x)}, ${Math.round(player.y)})`)
                .join("\n");

            const debugInfo =
                `Player: ${this.socket?.id?.substring(0, 6) ?? "No ID"} (${Math.round(this.player!.x)}, ${Math.round(
                    this.player!.y
                )})` +
                `\nCamera: ${Math.round(this.topCamera?.scrollX || 0)}, ${Math.round(this.topCamera?.scrollY ?? 0)}` +
                `\nLevel: ${this.levelId}` +
                `\nLobby: ${this.lobbyId ?? "None"}` +
                `\nPlayers: ${Object.keys(this.otherPlayers).length + 1}` +
                (otherPlayerInfo ? `\n${otherPlayerInfo}` : "");

            this.gameUI!.updateDebugText(debugInfo);
        }
    }

    syncMovingPlats(time: number) {
        // Synchronize moving platform positions every second
        if (this.socket?.connected && this.lobbyId && time - (this.lastPlatformSyncTime ?? 0) >= 3000) {
            this.lastPlatformSyncTime = time;

            // Get platform positions with phase information
            const movingPlatforms = this.levelManager?.getMovingPlatforms() || [];
            if (movingPlatforms.length > 0) {
                const platformPositions = movingPlatforms.map(({ platform }) => ({
                    x: platform.x,
                    y: platform.y,
                    velocityX: platform.body ? platform.body.velocity.x : 0,
                    velocityY: platform.body ? platform.body.velocity.y : 0,
                    phase: platform.platformData?.phase ?? 0,
                }));

                // Send platform positions to server
                this.socket.emit("platformSync", {
                    lobbyId: this.lobbyId,
                    platforms: platformPositions,
                    time: time,
                });
            }
        }
    }

    update(time: number) {
        if (!this.player) return;

        this.gameTimer!.applyDistancePenalty();

        // Update main player
        this.player.update();

        // Apply player movement based on input
        const moved = this.player.applyMovement(this.cursors!, this.wasd!);

        // Check if player needs to respawn
        this.playerRespawn!.checkPlayerRespawn(this.player, this.topCamera, this.autoScrollCamera);

        // Update cameras
        if (this.cameraManager) {
            this.cameraManager.updateCameras();
        }

        // Send player updates to server at controlled intervals to prevent flooding
        const now = time;
        if (this.socket?.connected && this.lobbyId) {
            if (moved || now - this.lastUpdateTime >= this.updateInterval) {
                // Send update to server
                this.socketManager!.sendPlayerUpdate();
                this.lastUpdateTime = now;
            }
        }

        // Update other players
        Object.values(this.otherPlayers).forEach(player => {
            if (player && typeof player.update === "function") {
                player.update();
            }
        });

        // Update player connection visuals
        if (this.playerConnection) {
            this.playerConnection.update();
        }

        this.updateDebugText();

        this.syncMovingPlats(time);

        // Update moving platforms
        if (this.levelManager?.updateMovingPlatforms) {
            this.levelManager.updateMovingPlatforms(time);
        }
    }

    /**
     * Comprehensive cleanup of all resources
     * Called before scene changes to prevent memory leaks
     */
    cleanup(): void {
        // Clear timers
        if (this.timerEvent) {
            this.timerEvent.remove(false);
            this.timerEvent = null;
        }

        // Clean up audio
        if (this.audioManager) {
            this.audioManager.shutdown();
        }
        this.levelMusic = null;

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

        // Clean up player connection visuals
        if (this.playerConnection) {
            this.playerConnection.shutdown();
            this.playerConnection = null;
        }

        // Clean up finish marker
        if (this.finishMarker) {
            this.finishMarker.destroy();
            this.finishMarker = null;
        }

        // Remove all tweens
        this.tweens.killAll();

        // Cancel all timers
        this.time.removeAllEvents();
    }

    // Alias for cleanup to maintain compatibility with existing code
    shutdown() {
        this.cleanup();
    }
}
