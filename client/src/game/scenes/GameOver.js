import { Scene } from "phaser";

export class GameOver extends Scene {
    constructor() {
        super("GameOver");
    }

    init(data) {
        this.levelId = data?.levelId || "level1";
        this.playerName = data?.playerName;
        this.socket = data?.socket;
    }

    create() {
        this.cameras.main.setBackgroundColor(0x060322);

        // Set the background image
        this.add.image(512, 384, "Game_Over").setOrigin(0.5).setAlpha(1);

        // Level name
        const levelName = this.levelId === "level1" ? "Level 1" : this.levelId === "level2" ? "Level 2" : this.levelId;

        this.add
            .text(512, 460, levelName, {
                fontFamily: "Arial",
                fontSize: 32,
                color: "#ffff00",
                stroke: "#000000",
                strokeThickness: 4,
                align: "center",
            })
            .setOrigin(0.5);

        // Retry button
        const retryButton = this.add
            .rectangle(512, 540, 240, 60, 0x0066aa, 0.8)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => retryButton.setFillStyle(0x0088cc, 0.8))
            .on("pointerout", () => retryButton.setFillStyle(0x0066aa, 0.8))
            .on("pointerdown", () => this.retryLevel());

        this.add
            .text(512, 540, "Retry Level", {
                fontFamily: "Arial Black",
                fontSize: 22,
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Level selection button
        const levelSelectButton = this.add
            .rectangle(512, 620, 240, 60, 0xaa6600, 0.8)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => levelSelectButton.setFillStyle(0xcc8800, 0.8))
            .on("pointerout", () => levelSelectButton.setFillStyle(0xaa6600, 0.8))
            .on("pointerdown", () => this.goToLevelSelector());

        this.add
            .text(512, 620, "Level Selection", {
                fontFamily: "Arial Black",
                fontSize: 22,
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Main menu button
        const mainMenuButton = this.add
            .rectangle(512, 700, 240, 60, 0x666666, 0.8)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => mainMenuButton.setFillStyle(0x888888, 0.8))
            .on("pointerout", () => mainMenuButton.setFillStyle(0x666666, 0.8))
            .on("pointerdown", () => this.goToMainMenu());

        this.add
            .text(512, 700, "Main Menu", {
                fontFamily: "Arial Black",
                fontSize: 22,
                color: "#ffffff",
            })
            .setOrigin(0.5);
    }

    retryLevel() {
        // Notify the server that we're retrying the level
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

    goToLevelSelector() {
        this.scene.start("LevelSelector", {
            socket: this.socket,
            playerName: this.playerName,
        });
    }

    goToMainMenu() {
        this.scene.start("MainMenu");
    }
}
