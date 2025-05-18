import { Scene } from "phaser";

export class Leaderboard extends Scene {
    constructor() {
        super("Leaderboard");
        this.leaderboard = [];
    }

    init(data) {
        this.socket = data?.socket;
        this.playerName = data?.playerName;
        
        // Ensure we don't have stale data from previous views
        this.entryTexts = [];
        this.isCleanedUp = false;
        
        // Clean up any existing listeners when initializing the scene
        if (this.socket) {
            console.log("Removing previous leaderboard listeners");
            this.socket.off("leaderboardUpdate");
        }
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

        // Display a "no data" message if we don't have a socket connection
        if (!this.socket) {
            this.add
                .text(width / 2, height / 2, "No connection to server.\nComplete a level to see the leaderboard.", {
                    fontFamily: "Arial",
                    fontSize: 24,
                    color: "#ffffff",
                    align: "center",
                })
                .setOrigin(0.5);
            return;
        }

        // Add loading message
        this.loadingText = this.add
            .text(width / 2, height / 2, "Loading leaderboard data...", {
                fontFamily: "Arial",
                fontSize: 24,
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);
        
        console.log("Setting up leaderboard listener");
        
        // Listen to leaderboard updates from server - using a named function for easier cleanup
        this.handleLeaderboardUpdate = (data) => {
            if (this.loadingText && this.loadingText.destroy) {
                this.loadingText.destroy();
                this.loadingText = null;
            }
            this.updateLeaderboard(data);
        };
        
        // Make sure we're not adding multiple listeners
        this.socket.off("leaderboardUpdate");
        this.socket.on("leaderboardUpdate", this.handleLeaderboardUpdate);

        // Request leaderboard data from server
        this.socket.emit("requestLeaderboard");
        
        // If no data after 5 seconds, show an error
        this.loadingTimer = this.time.delayedCall(5000, () => {
            if (!this.entryTexts || this.entryTexts.length === 0) {
                if (this.loadingText && this.loadingText.destroy) {
                    this.loadingText.destroy();
                    this.loadingText = null;
                }
                this.add
                    .text(width / 2, height / 2, "No leaderboard data available.\nComplete a level to see the leaderboard.", {
                        fontFamily: "Arial",
                        fontSize: 24,
                        color: "#ffffff",
                        align: "center",
                    })
                    .setOrigin(0.5);
            }
        });
    }

    // Removed setupSocketListeners method since we handle all socket setup in create()

    updateLeaderboard(data) {
        const { width } = this.scale;

        // Clear previous texts with thorough cleanup
        this.clearLeaderboardEntries();

        if (!data || data.length === 0) {
            this.displayNoDataMessage(width);
            return;
        }

        // Add column headers
        this.createColumnHeaders(width);
        
        // Data rows
        const startY = 190;
        const rowHeight = 40;
        
        data.forEach((entry, index) => {
            this.createPlayerRow(entry, index, startY, rowHeight, width);
        });
    }
    
    clearLeaderboardEntries() {
        console.log(`Clearing ${this.entryTexts.length} leaderboard entries`);
        
        if (this.entryTexts && this.entryTexts.length > 0) {
            this.entryTexts.forEach(obj => {
                if (obj && obj.destroy) {
                    obj.destroy();
                }
            });
        }
        
        // Reinitialize the array
        this.entryTexts = [];
    }
    
    displayNoDataMessage(width) {
        const noDataText = this.add
            .text(width / 2, 250, "No leaderboard data available yet.", {
                fontFamily: "Arial",
                fontSize: 22,
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);
        
        this.entryTexts.push(noDataText);
    }
    
    createColumnHeaders(width) {
        const headerY = 140;
        this.headers = [
            { text: "Rank", x: width * 0.08, align: 0.5 },
            { text: "Player", x: width * 0.23, align: 0 },
            { text: "Wins", x: width * 0.40, align: 0.5 },
            { text: "Stars", x: width * 0.52, align: 0.5 },
            { text: "Max Level", x: width * 0.67, align: 0.5 },
            { text: "Completion", x: width * 0.85, align: 0.5 }
        ];
        
        this.headers.forEach(header => {
            const headerText = this.add
                .text(header.x, headerY, header.text, {
                    fontFamily: "Arial",
                    fontSize: 18,
                    color: "#aaaaaa",
                    fontStyle: "bold"
                })
                .setOrigin(header.align, 0.5);
            this.entryTexts.push(headerText);
        });
        
        // Add completion time explanation
        if (this.headers.length > 5) {
            const tooltip = this.add
                .text(this.headers[5].x, headerY + 15, "(faster is better)", {
                    fontFamily: "Arial",
                    fontSize: 12,
                    color: "#888888",
                    fontStyle: "italic"
                })
                .setOrigin(0.5, 0.5);
            this.entryTexts.push(tooltip);
        }
        
        // Add divider line
        const divider = this.add.line(
            width / 2, headerY + 30, 
            0, 0, width * 0.9, 0, 
            0xaaaaaa, 0.5
        );
        this.entryTexts.push(divider);
    }
    
    createPlayerRow(entry, index, startY, rowHeight, width) {
        const isYou = entry.name === this.playerName;
        const rank = index + 1;
        const y = startY + index * rowHeight;
        
        // Row background for current player
        if (isYou) {
            const highlight = this.add.rectangle(
                width / 2, y, 
                width * 0.9, rowHeight - 5, 
                0xffff00, 0.2
            ).setOrigin(0.5, 0.5);
            this.entryTexts.push(highlight);
        }
        
        // Get rank text/icon
        const rankPrefix = this.getRankPrefix(rank);
        
        // Create each cell in the row
        this.createTextCell(this.headers[0].x, y, rankPrefix, isYou, 0.5, 22);
        this.createTextCell(this.headers[1].x, y, entry.name, isYou, 0, 22);
        this.createTextCell(this.headers[2].x, y, entry.wins.toString(), isYou, 0.5, 22);
        this.createTextCell(this.headers[3].x, y, `${entry.totalStars || 0} ★`, isYou, 0.5, 22);
        this.createTextCell(this.headers[4].x, y, entry.maxLevelName || "None", isYou, 0.5, 20);
        this.createTextCell(this.headers[5].x, y, entry.levelTimeFormatted || "--:--", isYou, 0.5, 20);
    }
    
    getRankPrefix(rank) {
        switch(rank) {
            case 1: return "🥇";
            case 2: return "🥈";
            case 3: return "🥉";
            default: return `${rank}.`;
        }
    }
    
    createTextCell(x, y, content, isHighlighted, originX, fontSize) {
        const textObj = this.add
            .text(x, y, content, {
                fontFamily: "Arial",
                fontSize: fontSize,
                color: isHighlighted ? "#ffff00" : "#ffffff",
                fontStyle: isHighlighted ? "bold" : "normal"
            })
            .setOrigin(originX, 0.5);
        
        this.entryTexts.push(textObj);
        return textObj;
    }

    goBack() {
        this.cleanupScene();
        this.scene.start("MainMenu", {
            socket: this.socket,
            playerName: this.playerName,
        });
    }

    cleanupScene() {
        console.log("Cleaning up Leaderboard scene");
        
        // Clean up socket listeners
        if (this.socket) {
            console.log("Removing leaderboard socket listeners");
            this.socket.off("leaderboardUpdate", this.handleLeaderboardUpdate);
        }
        
        // Cancel any pending timers
        if (this.loadingTimer) {
            this.loadingTimer.remove();
            this.loadingTimer = null;
        }
        this.time.removeAllEvents();
        
        // Clean up loading text if still present
        if (this.loadingText && this.loadingText.destroy) {
            this.loadingText.destroy();
            this.loadingText = null;
        }
        
        // Clear all display objects
        this.clearLeaderboardEntries();
    }
    
    shutdown() {
        this.cleanupScene();
    }

    destroy() {
        this.cleanupScene();
    }
}