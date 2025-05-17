import { Scene } from "phaser";
import { ProgressManager } from "../components/ProgressManager";

export class FinishLevel extends Scene {
    constructor() {
        super("FinishLevel");
        this.progressManager = new ProgressManager();
    }

    init(data) {
        this.timeLeft = data?.timeLeft ?? 0;
        this.stars = data?.stars ?? 0;
        this.levelId = data?.levelId ?? "level1";
        this.playerName = data?.playerName;
        this.socket = data?.socket;
        this.nextLevelId = data?.nextLevelId;

        if (this.playerName) {
            this.progressManager.loadProgress(this.playerName);
        }
    }

    create() {
        // Force camera to a solid background color (red)
        this.cameras.main.setBackgroundColor(0xff0000);

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
            // Either filled or empty star based on performance
            const starSymbol = i < this.stars ? "★" : "☆";
            const starColor = i < this.stars ? "#ffd700" : "#888888";

            this.add
                .text(startX + i * starSpacing, 340, starSymbol, {
                    fontFamily: "Arial",
                    fontSize: 60,
                    color: starColor,
                })
                .setOrigin(0.5);
        }

        // Create buttons for next actions

        // Continue to next level (if available)
        const isNextLevelAvailable = !!this.nextLevelId && this.progressManager.isLevelUnlocked(this.nextLevelId);

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
    }

    startNextLevel() {
        if (this.nextLevelId) {
            // Notify the server that we're changing levels
            if (this.socket && this.socket.connected && this.lobbyId) {
                this.socket.emit("changeLevel", {
                    lobbyId: this.lobbyId,
                    levelId: this.nextLevelId,
                });
            }

            this.scene.start("Game", {
                socket: this.socket,
                playerName: this.playerName,
                levelId: this.nextLevelId,
                lobbyId: this.lobbyId,
            });
        }
    }

    replayLevel() {
        // Notify the server that we're replaying the current level
        if (this.socket && this.socket.connected && this.lobbyId) {
            this.socket.emit("changeLevel", {
                lobbyId: this.lobbyId,
                levelId: this.levelId,
            });
        }

        this.scene.start("Game", {
            socket: this.socket,
            playerName: this.playerName,
            levelId: this.levelId,
            lobbyId: this.lobbyId,
        });
    }

    goToLevelSelect() {
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
        // If in a lobby, leave it before going to main menu
        if (this.socket && this.socket.connected && this.lobbyId) {
            this.socket.emit("leaveLobby", { lobbyId: this.lobbyId });
        }

        this.scene.start("MainMenu");
    }
}
