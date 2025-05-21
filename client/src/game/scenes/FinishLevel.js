import { Scene } from "phaser";
import { ProgressManager } from "../components/ProgressManager";
import { AudioManager } from "../components/AudioManager";

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
        this.audioManager = null;
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

        // Initialize audio manager
        this.audioManager = new AudioManager(this);

        if (this.playerName) {
            this.progressManager.loadProgress(this.playerName);
            // Record win in leaderboard when level is completed
            this.updateLeaderboard();
        }
    }

    // Update leaderboard with a win for the current player
    updateLeaderboard() {
        if (this.socket && this.socket.connected && this.playerName) {
            // Send level completion data to server
            // This includes:
            // - playerName: Who completed the level
            // - stars: How many stars earned (used for totalStars calculation)
            // - levelId: Which level was completed (used to track max level)
            // - timeLeft: Remaining time (used for best time calculations)
            this.socket.emit("updateLeaderboard", {
                playerName: this.playerName,
                stars: this.stars,
                levelId: this.levelId,
                timeLeft: Math.round(this.timeLeft),
            });

            // Log completion
            const levelNum = this.levelId.replace("level", "");
            console.log(
                `Recorded Level ${levelNum} completion for ${this.playerName} with ${this.stars} stars and ${Math.round(
                    this.timeLeft
                )}s remaining`
            );
        }
    }

    preload() {
        // Make sure audio manager preloads its audio resources
        if (this.audioManager) {
            this.audioManager.preloadAudio();
        }
    }

    create() {
        // Dynamically scale the UI elements based on the window size
        const { width, height } = this.scale;

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000);

        // Stars earned
        const starText = this.add
            .text(width * 0.5, height * 0.3, `Stars: ${this.stars}`, {
                fontSize: `${height * 0.05}px`,
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Time left
        const timeText = this.add
            .text(width * 0.5, height * 0.4, `Time Left: ${this.timeLeft}s`, {
                fontSize: `${height * 0.05}px`,
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Buttons
        const retryButton = this.add
            .text(width * 0.5, height * 0.6, "Retry", {
                fontSize: `${height * 0.05}px`,
                color: "#ffffff",
                backgroundColor: "#ff0000",
                padding: { x: 10, y: 5 },
            })
            .setOrigin(0.5)
            .setInteractive();

        const nextButton = this.add
            .text(width * 0.5, height * 0.7, "Next Level", {
                fontSize: `${height * 0.05}px`,
                color: "#ffffff",
                backgroundColor: "#00ff00",
                padding: { x: 10, y: 5 },
            })
            .setOrigin(0.5)
            .setInteractive();

        // Button interactions
        retryButton.on("pointerdown", () => {
            this.scene.restart();
        });

        nextButton.on("pointerdown", () => {
            if (this.nextLevelId) {
                this.scene.start(this.nextLevelId);
            }
        });
    }
}
