import { Scene } from "phaser";
import { ProgressManager } from "../components/ProgressManager";

export class LevelSelector extends Scene {
    constructor() {
        super("LevelSelector");
        this.levelData = [];
        this.progressManager = new ProgressManager();
        this.socket = null;
        this.currentPage = 0;
        this.levelsPerPage = 5;
    }

    init(data) {
        // Initialize with socket if passed from previous scene
        if (data && data.socket) {
            this.socket = data.socket;
        }

        // Initialize player name if passed
        if (data && data.playerName) {
            this.playerName = data.playerName;
        }
    }

    create() {
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.7).setOrigin(0);

        this.add.image(this.scale.width / 2, this.scale.height / 2, "background").setAlpha(0.3);

        // Title
        this.add
            .text(this.scale.width / 2, 80, "Level Select", {
                fontFamily: "Arial Black",
                fontSize: 48,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 8,
                align: "center",
            })
            .setOrigin(0.5);

        // Load player progress
        this.progressManager.loadProgress(this.playerName);

        // Define all levels (this would be expanded as more levels are added)
        this.levelData = [
            { id: "level1", name: "Level 1", description: "The first challenge", unlocked: true },
            {
                id: "level2",
                name: "Level 2",
                description: "Advanced platforming",
                unlocked: this.progressManager.isLevelCompleted("level1"),
            },
            {
                id: "level3",
                name: "Level 3",
                description: "Coming soon...",
                unlocked: this.progressManager.isLevelCompleted("level2"),
            },
            {
                id: "level4",
                name: "Level 4",
                description: "Coming soon...",
                unlocked: this.progressManager.isLevelCompleted("level3"),
            },
            {
                id: "level5",
                name: "Level 5",
                description: "Coming soon...",
                unlocked: this.progressManager.isLevelCompleted("level4"),
            },
        ];

        // Create level selection panel
        this.createLevelSelectionPanel();

        // Create navigation buttons
        this.createNavigationButtons();
    }

    createLevelSelectionPanel() {
        if (this.levelPanel) {
            this.levelPanel.destroy();
        }

        this.levelPanel = this.add.container(this.scale.width / 2, this.scale.height / 2);

        // Calculate start and end indices for current page
        const start = this.currentPage * this.levelsPerPage;
        const end = Math.min(start + this.levelsPerPage, this.levelData.length);

        // Position variables
        let yPosition = -150;
        const spacing = 120;

        // Create level buttons for current page
        for (let i = start; i < end; i++) {
            const level = this.levelData[i];
            this.createLevelButton(level, 0, yPosition);
            yPosition += spacing;
        }
    }

    createLevelButton(level, x, y) {
        // Background panel for the level
        const panel = this.add
            .rectangle(x, y, 600, 100, level.unlocked ? 0x4477aa : 0x666666, 0.8)
            .setStrokeStyle(3, 0xffffff, 0.8);

        // Level name
        const nameText = this.add
            .text(x - 240, y - 25, level.name, {
                fontFamily: "Arial Black",
                fontSize: 24,
                color: level.unlocked ? "#ffffff" : "#aaaaaa",
                align: "left",
            })
            .setOrigin(0, 0.5);

        // Level description
        const descText = this.add
            .text(x - 240, y + 15, level.description, {
                fontFamily: "Arial",
                fontSize: 16,
                color: level.unlocked ? "#dddddd" : "#888888",
                align: "left",
            })
            .setOrigin(0, 0.5);

        // Lock icon for locked levels
        const lockIcon = level.unlocked ? null : this.add.text(x + 240, y, "🔒", { fontSize: 30 }).setOrigin(0.5);

        // Progress stars if completed
        let stars = null;
        let timeText = null;

        if (level.unlocked) {
            const progress = this.progressManager.getLevelProgress(level.id);
            if (progress && progress.completed) {
                // Show stars based on completion time
                const starsCount = progress.stars || 0;
                const starsText = "★".repeat(starsCount) + "☆".repeat(3 - starsCount);
                stars = this.add
                    .text(x + 190, y - 15, starsText, {
                        fontSize: 24,
                        color: "#FFD700",
                    })
                    .setOrigin(0.5);

                // Show best time
                const minutes = Math.floor(progress.bestTime / 60);
                const seconds = progress.bestTime % 60;
                const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`;
                timeText = this.add
                    .text(x + 190, y + 15, `Best: ${timeString}`, {
                        fontSize: 16,
                        color: "#ffffff",
                    })
                    .setOrigin(0.5);
            }
        }

        // Make the panel interactive if unlocked
        if (level.unlocked) {
            panel
                .setInteractive({ useHandCursor: true })
                .on("pointerover", () => panel.setFillStyle(0x5599cc))
                .on("pointerout", () => panel.setFillStyle(0x4477aa))
                .on("pointerdown", () => this.startLevel(level.id));

            nameText.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.startLevel(level.id));
        }

        // Add all elements to the container
        this.levelPanel.add([panel, nameText, descText]);
        if (lockIcon) this.levelPanel.add(lockIcon);
        if (stars) this.levelPanel.add(stars);
        if (timeText) this.levelPanel.add(timeText);
    }

    createNavigationButtons() {
        // Back to main menu button
        const backButton = this.add
            .rectangle(150, 700, 200, 50, 0x333333, 0.8)
            .setStrokeStyle(2, 0xffffff, 0.8)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => backButton.setFillStyle(0x555555, 0.8))
            .on("pointerout", () => backButton.setFillStyle(0x333333, 0.8))
            .on("pointerdown", () => this.backToMainMenu());

        this.add
            .text(150, 700, "Back to Menu", {
                fontFamily: "Arial",
                fontSize: 18,
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Pagination buttons if needed
        if (this.levelData.length > this.levelsPerPage) {
            // Previous page button
            this.prevButton = this.add
                .rectangle(400, 700, 100, 50, 0x333333, 0.8)
                .setStrokeStyle(2, 0xffffff, 0.8)
                .setInteractive({ useHandCursor: true })
                .on("pointerover", () => this.prevButton.setFillStyle(0x555555, 0.8))
                .on("pointerout", () => this.prevButton.setFillStyle(0x333333, 0.8))
                .on("pointerdown", () => this.previousPage());

            this.add
                .text(400, 700, "Previous", {
                    fontFamily: "Arial",
                    fontSize: 16,
                    color: "#ffffff",
                })
                .setOrigin(0.5);

            // Next page button
            this.nextButton = this.add
                .rectangle(550, 700, 100, 50, 0x333333, 0.8)
                .setStrokeStyle(2, 0xffffff, 0.8)
                .setInteractive({ useHandCursor: true })
                .on("pointerover", () => this.nextButton.setFillStyle(0x555555, 0.8))
                .on("pointerout", () => this.nextButton.setFillStyle(0x333333, 0.8))
                .on("pointerdown", () => this.nextPage());

            this.add
                .text(550, 700, "Next", {
                    fontFamily: "Arial",
                    fontSize: 16,
                    color: "#ffffff",
                })
                .setOrigin(0.5);

            // Update button visibility
            this.updateNavigationButtons();
        }
    }

    updateNavigationButtons() {
        if (!this.prevButton || !this.nextButton) return;

        // Enable/disable previous button
        if (this.currentPage === 0) {
            this.prevButton.setFillStyle(0x222222, 0.5).disableInteractive();
        } else {
            this.prevButton.setFillStyle(0x333333, 0.8).setInteractive();
        }

        // Enable/disable next button
        const maxPage = Math.ceil(this.levelData.length / this.levelsPerPage) - 1;
        if (this.currentPage >= maxPage) {
            this.nextButton.setFillStyle(0x222222, 0.5).disableInteractive();
        } else {
            this.nextButton.setFillStyle(0x333333, 0.8).setInteractive();
        }
    }

    previousPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.createLevelSelectionPanel();
            this.updateNavigationButtons();
        }
    }

    nextPage() {
        const maxPage = Math.ceil(this.levelData.length / this.levelsPerPage) - 1;
        if (this.currentPage < maxPage) {
            this.currentPage++;
            this.createLevelSelectionPanel();
            this.updateNavigationButtons();
        }
    }

    startLevel(levelId) {
        console.log(`Starting level: ${levelId}`);

        // Pass data including socket, player name, and level ID
        this.scene.start("Game", {
            socket: this.socket,
            playerName: this.playerName,
            levelId: levelId,
        });
    }

    backToMainMenu() {
        this.scene.start("MainMenu");
    }
}
