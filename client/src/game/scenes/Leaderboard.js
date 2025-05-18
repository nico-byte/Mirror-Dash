import { Scene } from "phaser";

export class Leaderboard extends Scene {
    constructor() {
        super("Leaderboard");
        this.leaderboard = [];
    }

    init(data) {
        this.socket = data?.socket;
        this.playerName = data?.playerName;
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor(0x060322);

        this.title = this.add
            .text(width / 2, 80, "🏆 Leaderboard", {
                fontFamily: "Arial Black",
                fontSize: 48,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 6,
            })
            .setOrigin(0.5);

        // Container for dynamic entries
        this.entryTexts = [];

        // Back button
        const backButton = this.add
            .rectangle(width / 2, height - 80, 240, 60, 0x666666, 0.8)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => backButton.setFillStyle(0x888888, 0.8))
            .on("pointerout", () => backButton.setFillStyle(0x666666, 0.8))
            .on("pointerdown", () => this.goBack());

        this.add
            .text(width / 2, height - 80, "Back to Menu", {
                fontFamily: "Arial Black",
                fontSize: 22,
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Listen to leaderboard updates from server
        this.socket.on("leaderboardUpdate", (data) => {
            this.updateLeaderboard(data);
        });

        // Optional: request leaderboard immediately on enter
        this.socket.emit("requestLeaderboard");
    }

    updateLeaderboard(data) {
        const { width } = this.scale;

        // Clear previous texts
        this.entryTexts.forEach(txt => txt.destroy());
        this.entryTexts = [];

        // Data is an array of { name, wins, lastWin }
        const top = 140;
        const spacing = 40;

        data.forEach((entry, index) => {
            const isYou = entry.name === this.playerName;

            const text = this.add
                .text(width / 2, top + index * spacing, `${index + 1}. ${entry.name} - ${entry.wins} wins`, {
                    fontFamily: "Arial",
                    fontSize: 26,
                    color: isYou ? "#ffff00" : "#ffffff",
                })
                .setOrigin(0.5);

            this.entryTexts.push(text);
        });
    }

    goBack() {
        this.scene.start("MainMenu", {
            socket: this.socket,
            playerName: this.playerName,
        });
    }

    shutdown() {
        this.socket.off("leaderboardUpdate");
    }

    destroy() {
        this.shutdown();
    }
}