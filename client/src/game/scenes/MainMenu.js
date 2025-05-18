import { Scene } from "phaser";

export class MainMenu extends Scene {
    constructor() {
        super("MainMenu");
        this.playerName = "Player_" + Math.floor(Math.random() * 1000);
    }

    init() {
    }

    create() {
        this.add.rectangle(512, 384, 1024, 786, 0x060322)
        this.logo = this.add.image(512, 125, "logo");
        this.logo.setScale(0.5);

        // Shared button creator
        const makeButton = (y, label, baseColor, hoverColor, onClick) => {
            const rect = this.add.rectangle(512, y, 320, 60, baseColor)
                .setOrigin(0.5)
                .setStrokeStyle(2, 0xffffff)
                .setInteractive({ useHandCursor: true });

            const text = this.add.text(512, y, label, {
                fontFamily: "Orbitron, Arial",
                fontSize: "24px",
                color: "#ffffff",
            }).setOrigin(0.5)
              .setInteractive({ useHandCursor: true });

            // Hover Effects
            rect.on("pointerover", () => rect.setFillStyle(hoverColor));
            rect.on("pointerout", () => rect.setFillStyle(baseColor));
            rect.on("pointerdown", onClick);
            text.on("pointerdown", onClick);
        };

        this.add.text(512, 260, "Main Menu", {
            fontFamily: "Orbitron",
            fontSize: "48px",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 8,
        }).setOrigin(0.5);

        makeButton(330, "Your Name: " + this.playerName, 0x000000, 0xffffff, () => this.promptName());

        makeButton(460, "Multiplayer Lobbies", 0x3366cc, 0x5588ee, () => {
            this.scene.start("Lobby", { playerName: this.playerName });
        });

        makeButton(540, "Quick Play", 0xcc9933, 0xffbb55, () => {
            this.scene.start("Game", { playerName: this.playerName });
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