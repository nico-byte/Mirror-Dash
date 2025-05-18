export class GameUI {
    constructor(scene) {
        this.scene = scene;
        this.debugText = null;
        this.timerText = null;
    }

    init(scene) {
        this.scene = scene;
        this.debugText = null;
        this.timerText = null;
    }

    createUI(playerName, levelId, debugMode) {
        // Create a thinner semi-transparent header panel for UI elements
        const headerPanel = this.scene.add
            .rectangle(this.scene.scale.width / 2, 30, this.scene.scale.width, 60, 0x000000, 0.6)
            .setScrollFactor(0)
            .setDepth(99);

        // Add subtle border to the panel
        const headerBorder = this.scene.add
            .rectangle(this.scene.scale.width / 2, 30, this.scene.scale.width, 60)
            .setStrokeStyle(1, 0x4488ff)
            .setScrollFactor(0)
            .setDepth(99);

        // Replace Back button with Home icon
        const homeButton = this.scene.add
            .rectangle(100, 30, 40, 40, 0x3366cc, 0.8)
            .setStrokeStyle(1, 0xffffff)
            .setScrollFactor(0)
            .setDepth(100)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => homeButton.setFillStyle(0x4477dd, 0.9))
            .on("pointerout", () => homeButton.setFillStyle(0x3366cc, 0.8))
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

        const homeIcon = this.scene.add
            .text(100, 30, "🏠", {
                fontFamily: "Arial",
                fontSize: 18,
                color: "#ffffff",
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(100);

        // Add level name display
        let levelName = "Unknown Level";
        if (levelId === "level1") levelName = "Level 1";
        else if (levelId === "level2") levelName = "Level 2";
        else levelName = levelId;

        const levelNameText = this.scene.add
            .text(this.scene.scale.width / 2, 30, levelName, {
                fontFamily: "Orbitron",
                fontSize: 20,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 2,
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(100);

        // Add debug text only if debug mode is enabled
        if (debugMode) {
            this.debugText = this.scene.add
                .text(10, 10, "Debug Mode: On", {
                    fontSize: "12px",
                    fill: "#ffffff",
                    backgroundColor: "#000000",
                })
                .setScrollFactor(0)
                .setDepth(100);
        }

        // Remove Timer label and center the time in the box
        const timerPanel = this.scene.add
            .rectangle(this.scene.scale.width - 90, 30, 120, 40, 0x222244, 0.8)
            .setStrokeStyle(1, 0xffffff)
            .setScrollFactor(0)
            .setDepth(100);

        this.timerText = this.scene.add
            .text(this.scene.scale.width - 90, 30, "03:00", {
                fontFamily: "Orbitron",
                fontSize: 18,
                color: "#ffffff",
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(100);

        // Update top camera elements
        const topCameraElements = [
            headerPanel,
            headerBorder,
            homeButton,
            homeIcon,
            levelNameText,
            timerPanel,
            this.timerText,
        ];

        // Make elements only visible in top camera
        if (this.scene.bottomCamera) {
            topCameraElements.forEach(element => {
                this.scene.bottomCamera.ignore(element);
            });
        }

        return {
            timerText: this.timerText,
            debugText: this.debugText,
        };
    }

    // Replace the updateTimer method for better visual feedback
    updateTimer(timeLeft) {
        if (typeof timeLeft !== "number" || !this.timerText) return;

        const clampedTime = Math.max(0, timeLeft);
        const minutes = Math.floor(clampedTime / 60);
        const seconds = clampedTime % 60;
        const formatted = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

        // Update the text
        this.timerText.setText(formatted);

        // Visual feedback based on time left
        if (clampedTime < 30) {
            // Less than 30 seconds - red, pulsing
            this.timerText.setColor("#ff3333");

            // Create a pulsing effect for urgency
            if (!this.timerPulseTween) {
                this.timerPulseTween = this.scene.tweens.add({
                    targets: this.timerText,
                    scale: { from: 1, to: 1.2 },
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut",
                });
            }
        } else if (clampedTime < 60) {
            // Less than 1 minute - yellow
            this.timerText.setColor("#ffcc00");

            // Stop pulsing if previously active
            if (this.timerPulseTween) {
                this.timerPulseTween.stop();
                this.timerPulseTween = null;
                this.timerText.setScale(1);
            }
        } else {
            // More than 1 minute - white
            this.timerText.setColor("#ffffff");

            // Stop pulsing if previously active
            if (this.timerPulseTween) {
                this.timerPulseTween.stop();
                this.timerPulseTween = null;
                this.timerText.setScale(1);
            }
        }
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
