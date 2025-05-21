import { Scene } from "phaser";
import { io } from "socket.io-client";

export class MainMenu extends Scene {
    constructor() {
        super("MainMenu");
        this.playerName = "Player_" + Math.floor(Math.random() * 1000);
        this.socket = null;
    }

    init() {
        // If socket doesn't exist, create it
        if (!this.socket) {
            // Get server URL from environment variable or use default - match socketManager approach
            const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:9000";

            // Create socket connection
            this.socket = io(serverUrl);
            console.log("Socket connection initialized from MainMenu:", serverUrl);
        }
    }

    create() {
        this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x060322);
        this.logo = this.add.image(this.scale.width / 2, this.scale.height * 0.2, "logo");
        this.logo.setScale(0.5);

        // Shared button creator
        const makeButton = (y, label, baseColor, hoverColor, onClick) => {
            const rect = this.add
                .rectangle(this.scale.width / 2, y, this.scale.width * 0.3, this.scale.height * 0.08, baseColor)
                .setOrigin(0.5)
                .setStrokeStyle(2, 0xffffff)
                .setInteractive({ useHandCursor: true });

            const text = this.add
                .text(this.scale.width / 2, y, label, {
                    fontFamily: "Orbitron, Arial",
                    fontSize: `${this.scale.height * 0.03}px`,
                    color: "#ffffff",
                })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            // Hover Effects
            rect.on("pointerover", () => rect.setFillStyle(hoverColor));
            rect.on("pointerout", () => rect.setFillStyle(baseColor));
            rect.on("pointerdown", onClick);
            text.on("pointerdown", onClick);
        };

        this.add
            .text(this.scale.width / 2, this.scale.height * 0.3, "Main Menu", {
                fontFamily: "Orbitron",
                fontSize: `${this.scale.height * 0.06}px`,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 8,
            })
            .setOrigin(0.5);

        makeButton(this.scale.height * 0.4, `Your Name: ${this.playerName}`, 0x000000, 0xffffff, () =>
            this.promptName()
        );

        makeButton(this.scale.height * 0.5, "Multiplayer Lobbies", 0x3366cc, 0x5588ee, () => {
            this.scene.start("Lobby", { playerName: this.playerName, socket: this.socket });
        });

        makeButton(this.scale.height * 0.6, "Quick Play", 0xcc9933, 0xffbb55, () => {
            this.scene.start("Game", { playerName: this.playerName, socket: this.socket });
        });

        makeButton(this.scale.height * 0.7, "Leaderboard", 0x8844aa, 0xaa66cc, () => {
            this.scene.start("Leaderboard", { playerName: this.playerName, socket: this.socket });
        });
    }

    promptName() {
        const newName = prompt("Enter your name:", this.playerName);
        if (newName && newName.trim() !== "") {
            this.playerName = newName.trim();
            this.scene.restart(); // Refresh with new name
        }
    }
}
