import { Scene } from "phaser";
import { io } from "socket.io-client";

export class MainMenu extends Scene {
    constructor() {
        super("MainMenu");
        this.playerName = localStorage.getItem("playerName") || "Player_" + Math.floor(Math.random() * 1000);
        this.socket = null;
    }

    init() {
        // If socket doesn't exist, create it
        if (!this.socket) {
            // Get server URL from environment variable or use default - match socketManager approach
            const serverUrl = import.meta.env.VITE_SERVER_URL || "/";

            // Create socket connection
            this.socket = io(serverUrl, {
                path: "/socket.io",
                transports: ["websocket"],
            });
            console.log("Socket connection initialized from MainMenu:", serverUrl);
        }
    }

    create() {
        // Background
        this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x060322);
        // Logo
        this.logo = this.add.image(this.scale.width / 2, this.scale.height * 0.2, "logo").setScale(0.5);

        // Title
        this.add
            .text(this.scale.width / 2, this.scale.height * 0.3, "Main Menu", {
                fontFamily: "Orbitron",
                fontSize: `${this.scale.height * 0.06}px`,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 8,
            })
            .setOrigin(0.5);

        // Shared button factory
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
            rect.on("pointerover", () => rect.setFillStyle(hoverColor));
            rect.on("pointerout", () => rect.setFillStyle(baseColor));
            rect.on("pointerdown", onClick);
            text.on("pointerdown", onClick);
            return { rect, text };
        };

        // Button definitions
        const buttons = [
            {
                label: `Your Name: ${this.playerName}`,
                base: 0x000000,
                hover: 0xffffff,
                onClick: () => this.promptName(),
            },
            {
                label: "Multiplayer Lobbies",
                base: 0x3366cc,
                hover: 0x5588ee,
                onClick: () => this.scene.start("Lobby", { playerName: this.playerName, socket: this.socket }),
            },
            {
                label: "Quick Play",
                base: 0xcc9933,
                hover: 0xffbb55,
                onClick: () => this.scene.start("Game", { playerName: this.playerName, socket: this.socket }),
            },
            {
                label: "Level Select",
                base: 0x33aa33,
                hover: 0x55cc55,
                onClick: () => this.scene.start("LevelSelector", { playerName: this.playerName, socket: this.socket }),
            },
            {
                label: "Leaderboard",
                base: 0x8844aa,
                hover: 0xaa66cc,
                onClick: () => this.scene.start("Leaderboard", { playerName: this.playerName, socket: this.socket }),
            },
        ];

        const startY = this.scale.height * 0.4;
        const spacing = this.scale.height * 0.12;

        // Create and animate buttons
        buttons.forEach((btn, i) => {
            const y = startY + i * spacing;
            const { rect, text } = makeButton(y, btn.label, btn.base, btn.hover, btn.onClick);
            // start off-screen and transparent
            rect.setAlpha(0).y -= 20;
            text.setAlpha(0).y -= 20;
            // animate into view
            this.tweens.add({
                targets: [rect, text],
                y: `+=20`,
                alpha: 1,
                ease: "Power2",
                delay: 100 * i,
                duration: 400,
            });
        });
    }

    promptName() {
        const newName = prompt("Enter your name:", this.playerName);
        if (newName && newName.trim() !== "") {
            this.playerName = newName.trim();
            localStorage.setItem("playerName", this.playerName);
            this.scene.restart(); // Refresh with new name
        }
    }
}
