import { Scene } from "phaser";
import { ProgressManager } from "../components/ProgressManager";

export class FinishLevel extends Scene {
    constructor() {
        super("FinishLevel");
        this.progressManager = new ProgressManager();
        this.timeLeft = 0;
        this.stars = 0;
        this.levelId = "level1";
        this.playerName = null;
        this.socket = null;
        this.lobbyId = null;
        this.nextLevelId = null;
        this.isTransitioning = false;
    }

    init(data) {
        this.progressManager = new ProgressManager();
        this.timeLeft = data?.timeLeft ?? 0;
        this.stars = data?.stars ?? 0;
        this.levelId = data?.levelId ?? "level1";
        this.playerName = data?.playerName;
        this.socket = data?.socket;
        this.lobbyId = data?.lobbyId;
        this.nextLevelId = data?.nextLevelId;
        this.isTransitioning = false;

        if (this.playerName) {
            this.progressManager.loadProgress(this.playerName);
        }
    }

    create() {
        // Force camera to a solid background color
        this.cameras.main.setBackgroundColor(0x00aa33);

        const { width, height } = this.scale;

        // Add a full-screen semi-transparent overlay
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);

        // Level complete title
        this.add
            .text(width / 2, 120, "Level Complete!", {
                fontFamily: "Arial Black",
                fontSize: 64,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 8,
                align: "center",
            })
            .setOrigin(0.5);

        // Level name
        const levelName = this.levelId === "level1" ? "Level 1" : this.levelId === "level2" ? "Level 2" : this.levelId;

        this.add
            .text(width / 2, 180, levelName, {
                fontFamily: "Arial",
                fontSize: 32,
                color: "#ffff00",
                stroke: "#000000",
                strokeThickness: 4,
                align: "center",
            })
            .setOrigin(0.5);

        // Remaining time
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

        this.add
            .text(width / 2, 260, `Time Left: ${formattedTime}`, {
                fontFamily: "Arial",
                fontSize: 40,
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Display Stars
        const starSpacing = 60;
        const startX = width / 2 - ((3 - 1) * starSpacing) / 2;

        for (let i = 0; i < 3; i++) {
            let starSymbol;
            let starColor;
            if (i < Math.floor(this.stars)) {
                // Full star
                starSymbol = "★";
                starColor = "#ffd700";
            } else if (this.stars - i >= 0.5) {
                // Half star (using a Unicode half star or a different symbol)
                starSymbol = "⯨"; // Unicode for left half black star (U+2BE8), fallback if not supported
                starColor = "#ffd700";
            } else {
                // Empty star
                starSymbol = "☆";
                starColor = "#888888";
            }

            this.add
                .text(startX + i * starSpacing, 340, starSymbol, {
                    fontFamily: "Arial",
                    fontSize: 60,
                    color: starColor,
                })
                .setOrigin(0.5);
        }

        // Determine if next level is available
        const isNextLevelAvailable = !!this.nextLevelId && this.progressManager.isLevelUnlocked(this.nextLevelId);

        // Create buttons for next actions
        // Continue to next level (if available)
        if (isNextLevelAvailable) {
            const nextLevelButton = this.add
                .rectangle(width / 2, 450, 280, 60, 0x00aa00, 0.8)
                .setStrokeStyle(3, 0xffffff)
                .setInteractive({ useHandCursor: true })
                .on("pointerover", () => nextLevelButton.setFillStyle(0x00cc00, 0.8))
                .on("pointerout", () => nextLevelButton.setFillStyle(0x00aa00, 0.8))
                .on("pointerdown", () => this.startNextLevel());

            this.add
                .text(width / 2, 450, "Continue to Next Level", {
                    fontFamily: "Arial Black",
                    fontSize: 22,
                    color: "#ffffff",
                })
                .setOrigin(0.5);
        }

        // Replay this level
        const replayButton = this.add
            .rectangle(width / 2, isNextLevelAvailable ? 530 : 450, 280, 60, 0x0066aa, 0.8)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => replayButton.setFillStyle(0x0088cc, 0.8))
            .on("pointerout", () => replayButton.setFillStyle(0x0066aa, 0.8))
            .on("pointerdown", () => this.replayLevel());

        this.add
            .text(width / 2, isNextLevelAvailable ? 530 : 450, "Replay This Level", {
                fontFamily: "Arial Black",
                fontSize: 22,
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Level selection button
        const levelSelectButton = this.add
            .rectangle(width / 2, isNextLevelAvailable ? 610 : 530, 280, 60, 0xaa6600, 0.8)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => levelSelectButton.setFillStyle(0xcc8800, 0.8))
            .on("pointerout", () => levelSelectButton.setFillStyle(0xaa6600, 0.8))
            .on("pointerdown", () => this.goToLevelSelect());

        this.add
            .text(width / 2, isNextLevelAvailable ? 610 : 530, "Level Selection", {
                fontFamily: "Arial Black",
                fontSize: 22,
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Main menu button
        const mainMenuButton = this.add
            .rectangle(width / 2, isNextLevelAvailable ? 690 : 610, 280, 60, 0x666666, 0.8)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => mainMenuButton.setFillStyle(0x888888, 0.8))
            .on("pointerout", () => mainMenuButton.setFillStyle(0x666666, 0.8))
            .on("pointerdown", () => this.goToMainMenu());

        this.add
            .text(width / 2, isNextLevelAvailable ? 690 : 610, "Main Menu", {
                fontFamily: "Arial Black",
                fontSize: 22,
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Leaderboard button
        const leaderboardButton = this.add
            .rectangle(width / 2, isNextLevelAvailable ? 770 : 690, 280, 60, 0x8844aa, 0.8)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => leaderboardButton.setFillStyle(0xaa66cc, 0.8))
            .on("pointerout", () => leaderboardButton.setFillStyle(0x8844aa, 0.8))
            .on("pointerdown", () => this.goToLeaderboard());

        this.add
            .text(width / 2, isNextLevelAvailable ? 770 : 690, "Leaderboard", {
                fontFamily: "Orbitron, Arial",
                fontSize: 22,
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Set up listeners for level transition synchronization
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        if (this.socket && this.lobbyId) {
            // Listen for forced level change events from other players
            this.socket.on("forceLevelChanged", data => {
                if (data && data.lobbyId === this.lobbyId && !this.isTransitioning) {
                    // Another player has started a level change
                    this.isTransitioning = true;

                    // Show a notification
                    const notification = this.add
                        .text(
                            this.scale.width / 2,
                            this.scale.height / 3,
                            `${data.initiatorName} is changing level to ${data.levelId}...`,
                            {
                                fontFamily: "Arial",
                                fontSize: 28,
                                color: "#ffffff",
                                backgroundColor: "#000000",
                                padding: { x: 20, y: 10 },
                            }
                        )
                        .setOrigin(0.5)
                        .setDepth(999);

                    // Follow the other player's level change
                    this.time.delayedCall(1500, () => {
                        this.proceedToLevel(data.levelId);
                    });
                }
            });
        }
    }

    startNextLevel() {
        if (this.nextLevelId) {
            // Prevent multiple clicks
            if (this.isTransitioning) return;
            this.isTransitioning = true;

            // Show loading message
            const loadingText = this.add
                .text(this.scale.width / 2, this.scale.height / 2, "Loading next level...", {
                    fontFamily: "Arial Black",
                    fontSize: 24,
                    color: "#ffffff",
                    stroke: "#000000",
                    strokeThickness: 4,
                    backgroundColor: "#000000",
                    padding: { x: 20, y: 10 },
                })
                .setOrigin(0.5)
                .setDepth(1000);

            // Clean up resources
            this.cleanupCurrentScene();

            // Notify other players about the level change
            if (this.socket && this.socket.connected && this.lobbyId) {
                this.socket.emit("forceLevelChange", {
                    lobbyId: this.lobbyId,
                    levelId: this.nextLevelId,
                    initiatorId: this.socket.id,
                    initiatorName: this.playerName,
                });

                // Small delay before proceeding
                this.time.delayedCall(1000, () => {
                    this.proceedToLevel(this.nextLevelId);
                });
            } else {
                // If no socket connection, just proceed
                this.proceedToLevel(this.nextLevelId);
            }
        }
    }

    cleanupCurrentScene() {
        // Unregister event listeners
        if (this.socket) {
            this.socket.off("forceLevelChanged");
        }

        // Stop any active sounds
        this.sound.stopAll();

        // Stop all tweens
        this.tweens.killAll();

        // Cancel any pending delayed calls
        this.time.removeAllEvents();
    }

    proceedToLevel(levelId) {
        // Start new level with transition flag to prevent errors
        this.scene.start("Game", {
            socket: this.socket,
            playerName: this.playerName,
            levelId: levelId,
            lobbyId: this.lobbyId,
            isLevelTransition: true,
        });
    }

    replayLevel() {
        // Prevent multiple clicks
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Clean up resources
        this.cleanupCurrentScene();

        // Notify other players about replaying the current level
        if (this.socket && this.socket.connected && this.lobbyId) {
            this.socket.emit("forceLevelChange", {
                lobbyId: this.lobbyId,
                levelId: this.levelId,
                initiatorId: this.socket.id,
                initiatorName: this.playerName,
            });
        }

        // Proceed to the level
        this.proceedToLevel(this.levelId);
    }

    goToLevelSelect() {
        // Prevent multiple clicks
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Clean up resources
        this.cleanupCurrentScene();

        // If in a lobby, leave it before going to level select
        if (this.socket && this.socket.connected && this.lobbyId) {
            this.socket.emit("leaveLobby", { lobbyId: this.lobbyId });
        }

        this.scene.start("LevelSelector", {
            socket: this.socket,
            playerName: this.playerName,
        });
    }

    goToMainMenu() {
        // Prevent multiple clicks
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Clean up resources
        this.cleanupCurrentScene();

        // If in a lobby, leave it before going to main menu
        if (this.socket && this.socket.connected && this.lobbyId) {
            this.socket.emit("leaveLobby", { lobbyId: this.lobbyId });
        }

        this.scene.start("MainMenu");
    }

    goToLeaderboard() {
        // Prevent multiple clicks
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Clean up resources
        this.cleanupCurrentScene();

        this.scene.start("Leaderboard", {
            socket: this.socket,
            playerName: this.playerName,
        });
    }

    shutdown() {
        this.cleanupCurrentScene();
    }
}
