export class GameUI {
    constructor(scene) {
        this.scene = scene;
        this.debugText = null;
        this.timerText = null;
    }

    createUI(playerName, levelId, debugMode) {
        // Add back button to return to main menu - only in top section
        const backButton = this.scene.add
            .rectangle(100, 50, 150, 40, 0x222222, 0.7)
            .setInteractive()
            .setScrollFactor(0) // Fixed to camera
            .on("pointerdown", () => {
                if (this.scene.socket && this.scene.socket.connected && this.scene.lobbyId) {
                    this.scene.socket.emit("leaveLobby", { lobbyId: this.scene.lobbyId });
                }

                // Go back to lobby
                this.scene.scene.start("Lobby", {
                    socket: this.scene.socket,
                    playerName: playerName,
                });
            });

        const backText = this.scene.add
            .text(100, 50, "Back to Lobby", {
                fontFamily: "Arial",
                fontSize: 14,
                color: "#ffffff",
            })
            .setOrigin(0.5)
            .setScrollFactor(0); // Fixed to camera

        // Add level name display
        let levelName = "Unknown Level";
        if (levelId === "level1") levelName = "Level 1";
        else if (levelId === "level2") levelName = "Level 2";
        else levelName = levelId;

        const levelNameText = this.scene.add
            .text(this.scene.scale.width / 2, 50, levelName, {
                fontFamily: "Arial Black",
                fontSize: 18,
                color: "#ffffff",
                shadow: { offsetX: 2, offsetY: 2, color: "#000000", blur: 2, stroke: true, fill: true },
            })
            .setOrigin(0.5)
            .setScrollFactor(0);

        // Make back button only visible in top camera
        if (this.scene.bottomCamera) {
            this.scene.bottomCamera.ignore([backButton, backText, levelNameText]);
        }

        // Add debug text only if debug mode is enabled
        if (debugMode) {
            this.debugText = this.scene.add
                .text(10, 10, "Debug Mode: On", {
                    fontSize: "12px",
                    fill: "#ffffff",
                    backgroundColor: "#000000",
                })
                .setScrollFactor(0) // Fixed to camera
                .setDepth(100);
        }

        // Add timer display
        this.timerText = this.scene.add
            .text(this.scene.scale.width - 100, 20, "03:00", {
                fontSize: "24px",
                fill: "#ffffff",
                backgroundColor: "#000000",
                padding: { x: 10, y: 5 },
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(100);

        // Make the timer only visible in the top camera
        if (this.scene.bottomCamera) {
            this.scene.bottomCamera.ignore(this.timerText);
        }

        return {
            timerText: this.timerText,
            debugText: this.debugText,
        };
    }

    updateTimer(timeLeft) {
        if (typeof timeLeft !== "number" || !this.timerText) return;

        const clampedTime = Math.max(0, timeLeft);
        const minutes = Math.floor(clampedTime / 60);
        const seconds = clampedTime % 60;
        const formatted = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

        this.timerText.setText(formatted);
    }

    updateDebugText(debugInfo) {
        if (!this.debugText) return;
        this.debugText.setText(debugInfo);
    }
}
