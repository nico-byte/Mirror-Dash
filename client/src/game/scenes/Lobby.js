import { Scene } from "phaser";
import { io } from "socket.io-client";

export class Lobby extends Scene {
    constructor() {
        super("Lobby");
        this.socket = null;
        this.lobbies = {};
        this.selectedLobbyId = null;
        this.playerName = "Player_" + Math.floor(Math.random() * 1000);
        this.currentLobbyId = null;
        this.inLobby = false;
        this.defaultLobbyName = "Game Lobby " + Math.floor(Math.random() * 100);
        this.connectionError = false;
    }

    init(data) {
        console.log("Lobby scene initialized with data:", data);

        // Get socket from data if it exists
        if (data && data.socket) {
            this.socket = data.socket;
            console.log("Using existing socket connection");
        } else {
            // Connect to socket.io server using the environment variable or fallback to localhost
            const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:9000";
            console.log("Connecting to socket server:", serverUrl);

            try {
                this.socket = io(serverUrl);
                console.log("Socket created:", this.socket.id);
            } catch (e) {
                console.error("Error connecting to socket server:", e);
                this.connectionError = true;
            }
        }

        // Player name can be passed from the main menu
        if (data && data.playerName) {
            this.playerName = data.playerName;
        }

        // Generate a new default lobby name for each session
        this.defaultLobbyName = "Game Lobby " + Math.floor(Math.random() * 100);

        // Reset state for new lobby scene
        this.inLobby = false;
        this.currentLobbyId = null;

        this.setupSocketListeners();
    }

    setupSocketListeners() {
        if (!this.socket) {
            console.error("Cannot setup listeners - socket is null");
            return;
        }

        // Remove any existing listeners to prevent duplicates
        this.socket.off("lobbiesList");
        this.socket.off("lobbyState");
        this.socket.off("gameStart");
        this.socket.off("lobbyError");
        this.socket.off("connect");

        // Listen for socket connection event
        this.socket.on("connect", () => {
            console.log("Socket connected with ID:", this.socket.id);

            // Request lobbies list on connection
            this.socket.emit("getLobbyList");
        });

        // Listen for available lobbies list
        this.socket.on("lobbiesList", lobbies => {
            console.log("Received lobbies list:", lobbies);
            this.lobbies = lobbies;
            this.updateLobbiesList();
        });

        // Listen for lobby state updates (when in a lobby)
        this.socket.on("lobbyState", lobby => {
            console.log("Received lobby state:", lobby);
            if (lobby && lobby.id === this.currentLobbyId) {
                this.inLobby = true;
                this.updateLobbyState(lobby);
            }
        });

        // Listen for game start event
        this.socket.on("gameStart", lobby => {
            console.log("Game is starting in lobby:", lobby.id);
            if (this.inLobby && lobby.id === this.currentLobbyId) {
                // Start the game
                this.scene.start("Game", {
                    socket: this.socket,
                    playerName: this.playerName,
                    lobbyId: this.currentLobbyId,
                });
            }
        });

        // Listen for lobby errors
        this.socket.on("lobbyError", ({ message }) => {
            console.error("Lobby error:", message);
            alert(message);
        });
    }

    create() {
        // Check for connection error first
        if (this.connectionError) {
            alert("Failed to connect to game server. Please try again later.");
            this.scene.start("MainMenu");
            return;
        }

        // Set a darker background for better visibility
        this.add.rectangle(512, 384, 1024, 768, 0x222222).setAlpha(0.5);

        // Background image with lower opacity
        this.add.image(512, 384, "background").setAlpha(0.2);

        // Title with shadow for better visibility
        this.add
            .text(512, 80, "Game Lobbies", {
                fontFamily: "Arial Black",
                fontSize: 42,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 8,
                align: "center",
            })
            .setOrigin(0.5);

        // Create a panel for player name
        this.add.rectangle(512, 170, 400, 100, 0x333333).setAlpha(0.8);

        // Player name header
        this.add
            .text(512, 140, "Your Name:", {
                fontFamily: "Arial Black",
                fontSize: 22,
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);

        // Player name input box with better styling
        const nameBox = this.add
            .rectangle(512, 170, 300, 40, 0x555555, 1)
            .setInteractive()
            .on("pointerdown", () => {
                const newName = prompt("Enter your name:", this.playerName);
                if (newName && newName.trim() !== "") {
                    this.playerName = newName.trim();
                    playerNameText.setText(this.playerName);
                }
            });

        // Add a border to the name box
        this.add.rectangle(512, 170, 304, 44, 0xffffff, 0.5).setOrigin(0.5);

        const playerNameText = this.add
            .text(512, 170, this.playerName, {
                fontFamily: "Arial",
                fontSize: 22,
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);

        // Create Lobby button with better styling
        const createButton = this.add
            .rectangle(512, 240, 240, 60, 0x00aa00, 1)
            .setInteractive()
            .on("pointerdown", () => this.createNewLobby())
            .on("pointerover", () => createButton.setFillStyle(0x00cc00))
            .on("pointerout", () => createButton.setFillStyle(0x00aa00));

        // Add a border to the button
        this.add.rectangle(512, 240, 244, 64, 0xffffff, 0.5).setOrigin(0.5);

        this.add
            .text(512, 240, "Create Lobby", {
                fontFamily: "Arial Black",
                fontSize: 22,
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);

        // Divider
        this.add.rectangle(512, 300, 800, 2, 0xffffff, 0.5);

        // Lobbies list container with better styling
        this.add.rectangle(512, 450, 800, 300, 0x000000, 0.7);

        // Title for lobbies list with shadow
        this.add
            .text(512, 330, "Available Lobbies", {
                fontFamily: "Arial Black",
                fontSize: 28,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 4,
                align: "center",
            })
            .setOrigin(0.5);

        // Container for lobby list items
        this.lobbyListContainer = this.add.container(512, 450);

        // Bottom panel for buttons
        this.add.rectangle(512, 680, 1024, 100, 0x222222, 0.8);

        // Create back button to main menu with better styling
        const backButton = this.add
            .rectangle(200, 680, 200, 50, 0x444444, 1)
            .setInteractive()
            .on("pointerdown", () => {
                if (this.inLobby) {
                    this.socket.emit("leaveLobby", { lobbyId: this.currentLobbyId });
                }
                this.scene.start("MainMenu");
            })
            .on("pointerover", () => backButton.setFillStyle(0x666666))
            .on("pointerout", () => backButton.setFillStyle(0x444444));

        // Add a border to the button
        this.add.rectangle(200, 680, 204, 54, 0xffffff, 0.5).setOrigin(0.5);

        this.add
            .text(200, 680, "Back to Menu", {
                fontFamily: "Arial Black",
                fontSize: 18,
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);

        // Create refresh button for lobby list with better styling
        const refreshButton = this.add
            .rectangle(512, 680, 200, 50, 0x0066cc, 1)
            .setInteractive()
            .on("pointerdown", () => {
                if (this.socket && this.socket.connected) {
                    console.log("Requesting lobby list");
                    this.socket.emit("getLobbyList");
                } else {
                    console.error("Socket not connected, cannot request lobby list");
                    alert("Not connected to server. Please try again.");
                }
            })
            .on("pointerover", () => refreshButton.setFillStyle(0x0088ee))
            .on("pointerout", () => refreshButton.setFillStyle(0x0066cc));

        // Add a border to the button
        this.add.rectangle(512, 680, 204, 54, 0xffffff, 0.5).setOrigin(0.5);

        this.add
            .text(512, 680, "Refresh Lobbies", {
                fontFamily: "Arial Black",
                fontSize: 18,
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);

        // Creating UI elements for when in a lobby
        this.lobbyUI = this.add.container(512, 450);
        this.lobbyUI.setVisible(false);

        // Create separate background and foreground elements for proper layering
        // This prevents text from appearing behind other UI elements

        // Main lobby panel
        const lobbyInfoBg = this.add.rectangle(0, 0, 700, 320, 0x222266, 0.8);
        this.lobbyUI.add(lobbyInfoBg);

        // Add a border
        const lobbyBorder = this.add.rectangle(0, 0, 704, 324, 0x6666ff, 0.5);
        this.lobbyUI.add(lobbyBorder);

        // Lobby name with shadow
        this.lobbyNameText = this.add
            .text(0, -130, "Lobby: ", {
                fontFamily: "Arial Black",
                fontSize: 28,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 4,
                align: "center",
            })
            .setOrigin(0.5);
        this.lobbyUI.add(this.lobbyNameText);

        // Add lobby ID display to help with debugging
        this.lobbyIdText = this.add
            .text(0, -100, "ID: ", {
                fontFamily: "Arial",
                fontSize: 16,
                color: "#aaaaff",
                align: "center",
            })
            .setOrigin(0.5);
        this.lobbyUI.add(this.lobbyIdText);

        // Players list title with shadow
        const playersTitle = this.add
            .text(0, -60, "Players", {
                fontFamily: "Arial Black",
                fontSize: 24,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 4,
                align: "center",
            })
            .setOrigin(0.5);
        this.lobbyUI.add(playersTitle);

        // Add a line under the title
        const titleUnderline = this.add.rectangle(0, -40, 200, 2, 0xffffff, 0.7);
        this.lobbyUI.add(titleUnderline);

        // Container for player list - this will be populated dynamically
        this.playerListContainer = this.add.container(0, 0);
        this.lobbyUI.add(this.playerListContainer);

        // Start game button with better styling
        this.startGameButton = this.add
            .rectangle(0, 100, 240, 60, 0x00aa00, 1)
            .setInteractive()
            .on("pointerdown", () => {
                if (this.socket && this.socket.connected && this.currentLobbyId) {
                    console.log("Requesting game start for lobby:", this.currentLobbyId);
                    this.socket.emit("requestGameStart", { lobbyId: this.currentLobbyId });
                } else {
                    console.error("Cannot start game - socket or lobby ID is missing");
                }
            })
            .on("pointerover", () => this.startGameButton.setFillStyle(0x00cc00))
            .on("pointerout", () => this.startGameButton.setFillStyle(0x00aa00));
        this.lobbyUI.add(this.startGameButton);

        // Add a border to the button
        const startBtnBorder = this.add.rectangle(0, 100, 244, 64, 0xffffff, 0.5);
        this.lobbyUI.add(startBtnBorder);

        this.startGameText = this.add
            .text(0, 100, "Start Game", {
                fontFamily: "Arial Black",
                fontSize: 22,
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);
        this.lobbyUI.add(this.startGameText);

        // Leave lobby button with better styling
        const leaveLobbyButton = this.add
            .rectangle(0, 180, 240, 50, 0xaa0000, 1)
            .setInteractive()
            .on("pointerdown", () => {
                this.leaveLobby();
            })
            .on("pointerover", () => leaveLobbyButton.setFillStyle(0xcc0000))
            .on("pointerout", () => leaveLobbyButton.setFillStyle(0xaa0000));
        this.lobbyUI.add(leaveLobbyButton);

        // Add a border to the button
        const leaveBtnBorder = this.add.rectangle(0, 180, 244, 54, 0xffffff, 0.5);
        this.lobbyUI.add(leaveBtnBorder);

        const leaveText = this.add
            .text(0, 180, "Leave Lobby", {
                fontFamily: "Arial Black",
                fontSize: 18,
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);
        this.lobbyUI.add(leaveText);

        // Socket connection status text
        this.connectionStatusText = this.add
            .text(512, 770, "Connecting to server...", {
                fontFamily: "Arial",
                fontSize: 14,
                color: "#ffff00",
                align: "center",
            })
            .setOrigin(0.5);

        // Request initial lobby list
        if (this.socket && this.socket.connected) {
            console.log("Socket already connected, requesting lobby list");
            this.socket.emit("getLobbyList");
            this.connectionStatusText.setText("Connected to server").setColor("#00ff00");
        } else if (this.socket) {
            console.log("Waiting for socket connection...");
        } else {
            console.error("Socket is null, cannot request lobby list");
            this.connectionStatusText.setText("Failed to connect to server").setColor("#ff0000");
        }

        // Debug setting - only show if debug mode is enabled
        const debugMode = import.meta.env.VITE_DEBUG_MODE === "true";
        if (debugMode) {
            this.debugText = this.add.text(10, 10, "Debug: Lobby Scene", {
                fontSize: "12px",
                fill: "#ffffff",
                backgroundColor: "#000000",
            });
        }
    }

    createNewLobby() {
        if (!this.socket || !this.socket.connected) {
            console.error("Cannot create lobby - socket not connected");
            alert("Not connected to server. Please try again.");
            return;
        }

        const lobbyName = prompt("Enter lobby name:", this.defaultLobbyName);
        if (lobbyName && lobbyName.trim() !== "") {
            console.log("Creating lobby with name:", lobbyName.trim());
            this.socket.emit(
                "createLobby",
                {
                    lobbyName: lobbyName.trim(),
                    playerName: this.playerName,
                },
                response => {
                    if (response && response.success) {
                        console.log("Lobby created successfully:", response.lobbyId);
                        this.currentLobbyId = response.lobbyId;
                        this.inLobby = true;
                        this.showLobbyUI();

                        // Request lobby state to ensure UI is updated
                        this.socket.emit("requestLobbyState", { lobbyId: this.currentLobbyId });
                    } else {
                        console.error("Failed to create lobby:", response);
                        alert("Failed to create lobby. Please try again.");
                    }
                }
            );
        }
    }

    joinLobby(lobbyId) {
        if (!this.socket || !this.socket.connected) {
            console.error("Cannot join lobby - socket not connected");
            alert("Not connected to server. Please try again.");
            return;
        }

        console.log("Joining lobby:", lobbyId);
        this.socket.emit(
            "joinLobby",
            {
                lobbyId,
                playerName: this.playerName,
            },
            response => {
                if (response && response.success) {
                    console.log("Successfully joined lobby:", response.lobbyId);
                    this.currentLobbyId = response.lobbyId;
                    this.inLobby = true;
                    this.showLobbyUI();

                    // Request lobby state to ensure UI is updated
                    this.socket.emit("requestLobbyState", { lobbyId: this.currentLobbyId });
                } else {
                    console.error("Failed to join lobby:", response);
                    alert("Failed to join lobby. It may no longer exist.");
                    // Refresh lobbies list
                    this.socket.emit("getLobbyList");
                }
            }
        );
    }

    leaveLobby() {
        if (!this.socket || !this.socket.connected) {
            console.error("Cannot leave lobby - socket not connected");
            this.inLobby = false;
            this.currentLobbyId = null;
            this.hideLobbyUI();
            return;
        }

        if (this.inLobby && this.currentLobbyId) {
            console.log("Leaving lobby:", this.currentLobbyId);
            this.socket.emit("leaveLobby", { lobbyId: this.currentLobbyId });
            this.inLobby = false;
            this.currentLobbyId = null;
            this.hideLobbyUI();

            // Request updated lobbies list
            this.socket.emit("getLobbyList");
        }
    }

    showLobbyUI() {
        if (this.lobbyListContainer) {
            this.lobbyListContainer.setVisible(false);
        }
        if (this.lobbyUI) {
            this.lobbyUI.setVisible(true);
        }
    }

    hideLobbyUI() {
        if (this.lobbyUI) {
            this.lobbyUI.setVisible(false);
        }
        if (this.lobbyListContainer) {
            this.lobbyListContainer.setVisible(true);
        }
    }

    updateLobbiesList() {
        // Clear existing list
        if (!this.lobbyListContainer) {
            console.error("Lobby list container is undefined");
            return;
        }

        this.lobbyListContainer.removeAll();

        // If in a lobby, don't show the list
        if (this.inLobby) return;

        // Check if there are lobbies
        const lobbyIds = Object.keys(this.lobbies || {});

        if (lobbyIds.length === 0) {
            // No lobbies available - show a nicer message
            const noLobbiesText = this.add
                .text(0, 0, "No lobbies available.\nCreate a new one to get started!", {
                    fontFamily: "Arial",
                    fontSize: 22,
                    color: "#ffffff",
                    stroke: "#000000",
                    strokeThickness: 3,
                    align: "center",
                })
                .setOrigin(0.5);

            // Add a hint icon
            const hintIcon = this.add
                .text(0, 70, "👆", {
                    fontSize: 40,
                })
                .setOrigin(0.5);

            this.lobbyListContainer.add([noLobbiesText, hintIcon]);
            return;
        }

        // Display each lobby as a button with improved styling
        let yPos = -120;
        lobbyIds.forEach((lobbyId, index) => {
            const lobby = this.lobbies[lobbyId];
            if (!lobby) return;

            // Background for this lobby entry with border
            const bgBorder = this.add.rectangle(0, yPos, 600, 56, 0xffffff, 0.3);
            const bg = this.add
                .rectangle(0, yPos, 596, 52, 0x444444, 0.8)
                .setInteractive()
                .on("pointerover", () => bg.setFillStyle(0x666666, 0.8))
                .on("pointerout", () => bg.setFillStyle(0x444444, 0.8))
                .on("pointerdown", () => {
                    this.joinLobby(lobbyId);
                });

            // Lobby name with better styling
            const text = this.add
                .text(-270, yPos, `${lobby.name}`, {
                    fontFamily: "Arial",
                    fontSize: 22,
                    color: "#ffffff",
                    stroke: "#000000",
                    strokeThickness: 2,
                })
                .setOrigin(0, 0.5);

            // Player count with visual indicator
            const playerCountBg = this.add.rectangle(-100, yPos, 80, 36, 0x222222, 0.6).setOrigin(0, 0.5);
            const playerCount = this.add
                .text(-90, yPos, `${lobby.playerCount}/${lobby.maxPlayers}`, {
                    fontFamily: "Arial",
                    fontSize: 18,
                    color: lobby.playerCount < lobby.maxPlayers ? "#00ff00" : "#ff0000",
                    stroke: "#000000",
                    strokeThickness: 2,
                })
                .setOrigin(0, 0.5);

            // Player icon
            const playerIcon = this.add
                .text(-65, yPos, "👤", {
                    fontSize: 20,
                })
                .setOrigin(0, 0.5);

            // Join button with better styling
            const joinBtnBorder = this.add.rectangle(250, yPos, 104, 44, 0xffffff, 0.5);
            const joinBtn = this.add
                .rectangle(250, yPos, 100, 40, 0x008800, 1)
                .setInteractive()
                .on("pointerover", () => joinBtn.setFillStyle(0x00aa00))
                .on("pointerout", () => joinBtn.setFillStyle(0x008800))
                .on("pointerdown", () => {
                    this.joinLobby(lobbyId);
                });

            const joinText = this.add
                .text(250, yPos, "Join", {
                    fontFamily: "Arial Black",
                    fontSize: 18,
                    color: "#ffffff",
                })
                .setOrigin(0.5);

            // Add everything to the container
            this.lobbyListContainer.add([
                bgBorder,
                bg,
                text,
                playerCountBg,
                playerCount,
                playerIcon,
                joinBtnBorder,
                joinBtn,
                joinText,
            ]);

            yPos += 70; // More spacing between entries
        });
    }

    updateLobbyState(lobby) {
        if (!lobby) {
            console.error("Invalid lobby state received:", lobby);
            return;
        }

        console.log("Updating lobby state, players:", Object.keys(lobby.players || {}));

        // Update lobby name and ID display
        if (this.lobbyNameText) {
            this.lobbyNameText.setText(`Lobby: ${lobby.name}`);
        }

        if (this.lobbyIdText) {
            this.lobbyIdText.setText(`ID: ${lobby.id}`);
        }

        // Clear player list
        if (this.playerListContainer) {
            this.playerListContainer.removeAll();
        } else {
            console.error("Player list container is undefined");
            return;
        }

        // Determine if current player is host
        const isHost = lobby.host === this.socket?.id;

        // Safely update the start button visibility
        if (this.startGameButton) {
            this.startGameButton.setVisible(isHost);
        }

        if (this.startGameText) {
            this.startGameText.setVisible(isHost);
        }

        // Draw each player with better styling
        const playerIds = Object.keys(lobby.players || {});
        let yPos = -20;

        playerIds.forEach((playerId, index) => {
            const player = lobby.players[playerId];
            if (!player) {
                console.error("Invalid player data:", playerId, player);
                return;
            }

            const isPlayerHost = playerId === lobby.host;
            const isCurrentPlayer = playerId === this.socket?.id;

            // Background for player entry
            const playerBg = this.add.rectangle(0, yPos, 400, 50, isCurrentPlayer ? 0x334433 : 0x333344, 0.7);

            // Add a border for current player
            if (isCurrentPlayer) {
                const playerBorder = this.add.rectangle(0, yPos, 404, 54, 0x55ff55, 0.5);
                this.playerListContainer.add(playerBorder);
            }

            const prefix = isPlayerHost ? "👑 " : "";
            const playerName = player.name || `Player_${playerId.substring(0, 4)}`;

            const text = this.add
                .text(0, yPos, `${prefix}${playerName}`, {
                    fontFamily: "Arial",
                    fontSize: 22,
                    color: isCurrentPlayer ? "#88ff88" : "#ffffff",
                    stroke: "#000000",
                    strokeThickness: 2,
                })
                .setOrigin(0.5);

            this.playerListContainer.add([playerBg, text]);
            yPos += 60; // More spacing between players
        });

        // Update start button state based on player count
        const canStart = playerIds.length >= 2 && isHost;

        // Completely recreate the start button to avoid issues with interactivity
        if (this.startGameButton) {
            // Remove old button
            this.startGameButton.destroy();

            // Create new button with proper interactivity
            this.startGameButton = this.add
                .rectangle(0, 100, 240, 60, canStart ? 0x00aa00 : 0x555555, canStart ? 1 : 0.5)
                .setVisible(isHost);

            // Only make it interactive if canStart is true
            if (canStart) {
                this.startGameButton
                    .setInteractive()
                    .on("pointerdown", () => {
                        if (this.socket && this.socket.connected && this.currentLobbyId) {
                            console.log("Requesting game start for lobby:", this.currentLobbyId);
                            this.socket.emit("requestGameStart", { lobbyId: this.currentLobbyId });
                        }
                    })
                    .on("pointerover", () => this.startGameButton.setFillStyle(0x00cc00))
                    .on("pointerout", () => this.startGameButton.setFillStyle(0x00aa00));
            }

            // Add the button to the container
            this.lobbyUI.add(this.startGameButton);

            // Update the text
            if (this.startGameText) {
                this.startGameText.destroy();
            }

            this.startGameText = this.add
                .text(0, 100, "Start Game", {
                    fontFamily: "Arial Black",
                    fontSize: 22,
                    color: "#ffffff",
                    align: "center",
                })
                .setOrigin(0.5)
                .setVisible(isHost);

            this.lobbyUI.add(this.startGameText);
        }

        // Add status message if waiting for more players
        if (playerIds.length < 2) {
            const waitingText = this.add
                .text(0, 30, "Waiting for more players...", {
                    fontFamily: "Arial",
                    fontSize: 18,
                    color: "#ffff00",
                    stroke: "#000000",
                    strokeThickness: 2,
                    align: "center",
                })
                .setOrigin(0.5);

            this.playerListContainer.add(waitingText);
        }
    }

    update() {
        // Update socket connection status
        if (this.connectionStatusText) {
            if (this.socket && this.socket.connected) {
                this.connectionStatusText.setText("Connected to server").setColor("#00ff00");
            } else if (this.socket) {
                this.connectionStatusText.setText("Connecting to server...").setColor("#ffff00");
            } else {
                this.connectionStatusText.setText("Not connected to server").setColor("#ff0000");
            }
        }

        // If in debug mode, update debug text
        if (this.debugText) {
            this.debugText.setText(
                `Socket ID: ${this.socket?.id || "None"}\n` +
                    `Connected: ${this.socket?.connected || false}\n` +
                    `In Lobby: ${this.inLobby}\n` +
                    `Lobby ID: ${this.currentLobbyId || "None"}\n` +
                    `Available Lobbies: ${Object.keys(this.lobbies || {}).length}`
            );
        }
    }

    shutdown() {
        // Clean up event listeners to prevent memory leaks
        if (this.socket) {
            this.socket.off("lobbiesList");
            this.socket.off("lobbyState");
            this.socket.off("gameStart");
            this.socket.off("lobbyError");
            this.socket.off("connect");
        }
    }
}
