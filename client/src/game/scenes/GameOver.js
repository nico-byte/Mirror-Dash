import { Scene } from "phaser";

export class GameOver extends Scene {
    constructor() {
        super("GameOver");
        this.isTransitioning = false;
    }

    init(data) {
        this.levelId = data?.levelId || "level1";
        this.playerName = data?.playerName;
        this.socket = data?.socket;
        this.lobbyId = data?.lobbyId;
        this.reason = data?.reason;
        this.isTransitioning = false;
    }

    create() {
        this.cameras.main.setBackgroundColor(0x060322);

        // Set the background image
        this.add.image(512, 384, "Game_Over").setOrigin(0.5).setAlpha(1);

        // Level name
        const levelName = this.levelId === "level1" ? "Level 1" : this.levelId === "level2" ? "Level 2" : this.levelId;

        this.add
            .text(512, 400, levelName, {
                fontFamily: "Orbitron",
                fontSize: 32,
                color: "#ffff00",
                stroke: "#000000",
                strokeThickness: 4,
                align: "center",
            })
            .setOrigin(0.5);

        // Retry button
        const retryButton = this.add
            .rectangle(512, 500, 240, 60, 0x0066aa, 0.8)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => retryButton.setFillStyle(0x0088cc, 0.8))
            .on("pointerout", () => retryButton.setFillStyle(0x0066aa, 0.8))
            .on("pointerdown", () => this.retryLevel());

        this.add
            .text(512, 500, "Retry Level", {
                fontFamily: "Orbitron",
                fontSize: 22,
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Level selection button
        const levelSelectButton = this.add
            .rectangle(512, 580, 240, 60, 0xaa6600, 0.8)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => levelSelectButton.setFillStyle(0xcc8800, 0.8))
            .on("pointerout", () => levelSelectButton.setFillStyle(0xaa6600, 0.8))
            .on("pointerdown", () => this.goToLevelSelector());

        this.add
            .text(512, 580, "Level Selection", {
                fontFamily: "Orbitron",
                fontSize: 22,
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Main menu button
        const mainMenuButton = this.add
            .rectangle(512, 660, 240, 60, 0x666666, 0.8)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => mainMenuButton.setFillStyle(0x888888, 0.8))
            .on("pointerout", () => mainMenuButton.setFillStyle(0x666666, 0.8))
            .on("pointerdown", () => this.goToMainMenu());

        this.add
            .text(512, 660, "Main Menu", {
                fontFamily: "Orbitron",
                fontSize: 22,
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Add credits panel
        const creditsPanel = this.add.rectangle(512, 730, 800, 60, 0x000000, 0.6).setStrokeStyle(1, 0x444444);

        // Add credits text
        this.add
            .text(
                512,
                730,
                "Credits: Sound: Josef | Pixelart/Map: Matthias | Coders: Nico, Mika, Robin (Josef, Matthias)",
                {
                    fontFamily: "Arial",
                    fontSize: 16,
                    color: "#aaaaaa",
                    align: "center",
                }
            )
            .setOrigin(0.5);

        // Set up socket listeners
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        if (this.socket) {
            // Listen for forced level change events
            this.socket.on("forceLevelChanged", data => {
                if (data && data.lobbyId === this.lobbyId && !this.isTransitioning) {
                    this.isTransitioning = true;

                    // Create notification text
                    const notification = this.add
                        .text(
                            this.scale.width / 2,
                            this.scale.height / 3,
                            `${data.initiatorName} is changing level to ${this.getLevelName(data.levelId)}...`,
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

                    // Follow the other player after a short delay
                    this.time.delayedCall(1500, () => {
                        this.scene.start("Game", {
                            socket: this.socket,
                            playerName: this.playerName,
                            levelId: data.levelId,
                            lobbyId: this.lobbyId,
                        });
                    });
                }
            });
        }
    }

    getLevelName(levelId) {
        switch (levelId) {
            case "level1":
                return "Level 1";
            case "level2":
                return "Level 2";
            default:
                return levelId;
        }
    }

    retryLevel() {
        // Prevent multiple clicks
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Show loading message
        const loadingText = this.add
            .text(this.scale.width / 2, this.scale.height / 2, "Restarting level...", {
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

        // Notify the server that we're retrying the level
        if (this.socket && this.socket.connected && this.lobbyId) {
            this.socket.emit("forceLevelChange", {
                lobbyId: this.lobbyId,
                levelId: this.levelId,
                initiatorId: this.socket.id,
                initiatorName: this.playerName || "Player",
            });

            // Short delay before starting the level
            this.time.delayedCall(1000, () => {
                // Destroy loading text before transition
                if (loadingText) loadingText.destroy();
                this.scene.start("Game", {
                    socket: this.socket,
                    playerName: this.playerName,
                    levelId: this.levelId,
                    lobbyId: this.lobbyId,
                });
            });
        } else {
            // If not in a lobby, just start the game
            this.time.delayedCall(500, () => {
                // Destroy loading text before transition
                if (loadingText) loadingText.destroy();
                this.scene.start("Game", {
                    playerName: this.playerName,
                    levelId: this.levelId,
                });
            });
        }
    }

    goToLevelSelector() {
        // Prevent multiple clicks
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Clean up socket listener
        if (this.socket) {
            this.socket.off("forceLevelChanged");
        }

        this.scene.start("LevelSelector", {
            socket: this.socket,
            playerName: this.playerName,
            lobbyId: this.lobbyId,
        });
    }

    goToMainMenu() {
        // Prevent multiple clicks
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Clean up socket listener
        if (this.socket) {
            this.socket.off("forceLevelChanged");
        }

        // If in a lobby, leave it before going to main menu
        if (this.socket && this.socket.connected && this.lobbyId) {
            this.socket.emit("leaveLobby", { lobbyId: this.lobbyId });
        }

        this.scene.start("MainMenu");
    }

    shutdown() {
        // Clean up event listeners to prevent memory leaks
        if (this.socket) {
            this.socket.off("forceLevelChanged");
        }
    }
}
