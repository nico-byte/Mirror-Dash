import { Scene } from "phaser";

export class MainMenu extends Scene {
    constructor() {
        super("MainMenu");
        this.playerName = "Player_" + Math.floor(Math.random() * 1000);
    }

    create() {
        // Background
        this.add.image(512, 384, "background");

        // Logo
        this.add.image(512, 230, "logo");

        // Main menu title
        this.add
            .text(512, 370, "Main Menu", {
                fontFamily: "Arial Black",
                fontSize: 38,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 8,
                align: "center",
            })
            .setOrigin(0.5);

        // Player name section
        this.add
            .text(512, 430, "Your Name:", {
                fontFamily: "Arial",
                fontSize: 18,
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);

        // Simple rectangular area for player name with proper interactivity
        const nameBox = this.add.rectangle(512, 460, 300, 40, 0x000000, 0.5);
        nameBox.setInteractive({ useHandCursor: true });
        nameBox.on("pointerdown", () => {
            const newName = prompt("Enter your name:", this.playerName);
            if (newName && newName.trim() !== "") {
                this.playerName = newName.trim();
                playerNameText.setText(this.playerName);
            }
        });

        const playerNameText = this.add
            .text(512, 460, this.playerName, {
                fontFamily: "Arial",
                fontSize: 20,
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);

        // Make the text interactive too to increase clickable area
        playerNameText.setInteractive({ useHandCursor: true });
        playerNameText.on("pointerdown", () => {
            const newName = prompt("Enter your name:", this.playerName);
            if (newName && newName.trim() !== "") {
                this.playerName = newName.trim();
                playerNameText.setText(this.playerName);
            }
        });

        // Multiplayer button to go to lobby with proper interactivity
        const multiplayerButton = this.add.rectangle(512, 540, 300, 60, 0x0044aa);
        multiplayerButton.setInteractive({ useHandCursor: true });
        multiplayerButton.on("pointerdown", () => {
            this.scene.start("Lobby", { playerName: this.playerName });
        });
        multiplayerButton.on("pointerover", () => {
            multiplayerButton.setFillStyle(0x0066cc);
        });
        multiplayerButton.on("pointerout", () => {
            multiplayerButton.setFillStyle(0x0044aa);
        });

        const multiplayerText = this.add
            .text(512, 540, "Multiplayer Lobbies", {
                fontFamily: "Arial Black",
                fontSize: 24,
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);

        // Make text interactive too
        multiplayerText.setInteractive({ useHandCursor: true });
        multiplayerText.on("pointerdown", () => {
            this.scene.start("Lobby", { playerName: this.playerName });
        });

        // Quick Play button - repositioned to be more prominent (where level selector was)
        const quickPlayButton = this.add.rectangle(512, 620, 300, 60, 0x885500);
        quickPlayButton.setInteractive({ useHandCursor: true });
        quickPlayButton.on("pointerdown", () => {
            this.scene.start("Game", { playerName: this.playerName });
        });
        quickPlayButton.on("pointerover", () => {
            quickPlayButton.setFillStyle(0xaa6600);
        });
        quickPlayButton.on("pointerout", () => {
            quickPlayButton.setFillStyle(0x885500);
        });

        const quickPlayText = this.add
            .text(512, 620, "Quick Play", {
                fontFamily: "Arial Black",
                fontSize: 24, // Increased font size to match other buttons
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);

        // Make text interactive too
        quickPlayText.setInteractive({ useHandCursor: true });
        quickPlayText.on("pointerdown", () => {
            this.scene.start("Game", { playerName: this.playerName });
        });
    }
}
