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

    /**
     * Improved init method for the Lobby scene
     * This ensures proper initialization of all UI components
     */
    init(data) {
        // Reset all state variables
        this.socket = null;
        this.lobbies = {};
        this.selectedLobbyId = null;
        this.playerName = "Player_" + Math.floor(Math.random() * 1000);
        this.currentLobbyId = null;
        this.inLobby = false;
        this.defaultLobbyName = "Game Lobby " + Math.floor(Math.random() * 100);
        this.connectionError = false;

        // Clear any previous UI references to prevent stale objects
        this.lobbyListContainer = null;
        this.lobbyPlayerListContainer = null;
        this.lobbyUI = null;

        console.log("Lobby scene initialized with data:", data);

        // Get socket from data if it exists
        if (data && data.socket) {
            this.socket = data.socket;
            console.log("Using existing socket connection:", this.socket.id);
        } else {
            // Connect to socket.io server using the environment variable or fallback
            const serverUrl = import.meta.env.VITE_SERVER_URL || "/";
            console.log("Connecting to socket server:", serverUrl);

            try {
                this.socket = io(serverUrl, {
                    path: "/socket.io",
                    transports: ["websocket"],
                });
                console.log("Socket created");
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

        // Get lobby ID if passed from another scene
        if (data && data.lobbyId) {
            this.currentLobbyId = data.lobbyId;
            this.inLobby = true;
        }

        this.setupSocketListeners();
    }

    setupSocketListeners() {
        if (!this.socket) {
            // console.error("Cannot setup listeners - socket is null");
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
            // console.error("Lobby error:", message);
            alert(message);
        });
    }

    create() {
        if (this.connectionError) {
            alert("Failed to connect to game server. Please try again later.");
            this.scene.start("MainMenu");
            return;
        }

        this.lobbyListContainer = this.add.container(512, 520).setDepth(1000);
        this.add.rectangle(512, 384, 1024, 786, 0x060322);

        // Set a darker background for better visibility
        this.lobbyListBackground = this.add
            .rectangle(512, 384, 512 * 1.9, 384 * 1.9, 0x222266)
            .setAlpha(0.8)
            .setStrokeStyle(2, 0x6666ff);

        // this.add.image(512, 384, "background").setAlpha(0.2);

        this.lobbyListGameLobbyText = this.add
            .text(512, 80, "Game Lobbies", {
                fontFamily: "Orbitron, Arial",
                fontSize: "48px",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 8,
            })
            .setOrigin(0.5);

        this.lobbyListNameLabel = this.add
            .text(512, 140, "Your Name:", {
                fontFamily: "Orbitron, Arial",
                fontSize: "20px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        this.lobbyListNameBox = this.add
            .rectangle(512, 180, 320, 45, 0xffffff, 0.1)
            .setStrokeStyle(2, 0xffffff)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        this.lobbyListNameBox.on("pointerdown", () => this.promptName());

        this.lobbyListPlayerNameText = this.add
            .text(512, 180, this.playerName, {
                fontFamily: "Orbitron, Arial",
                fontSize: "20px",
                color: "#ffffff",
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        this.lobbyListPlayerNameText.on("pointerdown", () => this.promptName());

        const makeButton = (y, label, baseColor, hoverColor, onClick) => {
            const rect = this.add
                .rectangle(0, 0, 320, 60, baseColor)
                .setOrigin(0.5)
                .setStrokeStyle(2, 0xffffff)
                .setInteractive({ useHandCursor: true });

            const text = this.add
                .text(0, 0, label, {
                    fontFamily: "Orbitron, Arial",
                    fontSize: "24px",
                    color: "#ffffff",
                })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            // Combine into a container so it moves as one unit
            const button = this.add.container(512, y, [rect, text]);

            // Set interactivity for the button (delegate events)
            rect.on("pointerover", () => rect.setFillStyle(hoverColor));
            rect.on("pointerout", () => rect.setFillStyle(baseColor));
            rect.on("pointerdown", onClick);
            text.on("pointerdown", onClick);

            return button;
        };

        this.lobbyListCreateLobbyButton = makeButton(260, "Create Lobby", 0x00aa00, 0x00cc00, () =>
            this.createNewLobby()
        );

        this.lobbyListAvailableLobbiesText = this.add
            .text(512, 330, "Available Lobbies", {
                fontFamily: "Orbitron, Arial",
                fontSize: "28px",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 4,
            })
            .setOrigin(0.5);

        this.lobbyListRefreshButton = makeButton(640, "Refresh Lobbies", 0x00aa00, 0x00cc00, () => {
            if (this.socket && this.socket.connected) {
                console.log("Requesting lobby list");
                this.socket.emit("getLobbyList");
            } else {
                // console.error("Socket not connected, cannot request lobby list");
                alert("Not connected to server. Please try again.");
            }
        });
        this.lobbyListbackButton = makeButton(710, "Back to Main Menu", 0xaa0000, 0xcc0000, () =>
            this.scene.start("MainMenu")
        );

        this.lobbyBackground = this.add
            .rectangle(512, 384, 700, 480, 0x222266, 0.8)
            .setStrokeStyle(2, 0x6666ff)
            .setVisible(false);

        this.lobbyNameText = this.add
            .text(512, 200, "Lobby: ", {
                fontFamily: "Orbitron, Arial",
                fontSize: 28,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 4,
            })
            .setOrigin(0.5)
            .setVisible(false);

        this.lobbyIdText = this.add
            .text(512, 240, "ID: ", {
                fontFamily: "Orbitron, Arial",
                fontSize: 16,
                color: "#aaaaff",
            })
            .setOrigin(0.5)
            .setVisible(false);

        this.lobbyPlayerListContainer = this.add.container(512, 300).setVisible(false);

        this.lobbyPlayerText = this.add
            .text(512, 280, "Players", {
                fontFamily: "Orbitron, Arial",
                fontSize: 24,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 4,
            })
            .setOrigin(0.5)
            .setVisible(false);

        // Container for player list - this will be populated dynamically
        this.lobbyUI = this.add.container(512, 350);
        this.lobbyPlayerListContainer = this.add.container(0, 0);
        this.lobbyUI.add(this.lobbyPlayerListContainer);

        this.lobbyStartGameButton = makeButton(490, "Start Game", 0x00aa00, 0x00cc00, () => {
            if (this.socket?.connected && this.currentLobbyId) {
                this.socket.emit("requestGameStart", { lobbyId: this.currentLobbyId });
            }
        }).setVisible(false);

        this.lobbyLeaveLobbyButton = makeButton(560, "Leave Lobby", 0xaa0000, 0xcc0000, () =>
            this.leaveLobby()
        ).setVisible(false);

        this.connectionStatusText = this.add
            .text(512, 600, "Connecting to server...", {
                fontFamily: "Orbitron, Arial",
                fontSize: 14,
                color: "#ffff00",
            })
            .setOrigin(0.5);

        if (this.socket?.connected) {
            this.socket.emit("getLobbyList");
            this.connectionStatusText.setText("Connected to server").setColor("#00ff00");
        } else {
            this.connectionStatusText.setText("Failed to connect to server").setColor("#ff0000");
        }

        const debugMode = import.meta.env.VITE_DEBUG_MODE === "true";
        if (debugMode) {
            this.debugText = this.add.text(10, 10, "Debug: Lobby Scene", {
                fontSize: "12px",
                fill: "#ffffff",
                backgroundColor: "#000000",
            });
        }
    }

    promptName() {
        const newName = prompt("Enter your name:", this.playerName);
        if (newName && newName.trim() !== "") {
            this.playerName = newName.trim();
            this.lobbyListPlayerNameText.setText(this.playerName);
        }
    }

    createNewLobby() {
        if (!this.socket || !this.socket.connected) {
            // console.error("Cannot create lobby - socket not connected");
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
                        // console.error("Failed to create lobby:", response);
                        alert("Failed to create lobby. Please try again.");
                    }
                }
            );
        }
    }

    joinLobby(lobbyId) {
        if (!this.socket || !this.socket.connected) {
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

                    // Update Start Game button visibility based on host status
                    const isHost = response.lobbyHost === this.socket.id;
                    this.lobbyStartGameButton.setVisible(isHost);
                } else {
                    alert("Failed to join lobby. It may no longer exist.");
                    this.socket.emit("getLobbyList");
                }
            }
        );
    }

    leaveLobby() {
        if (!this.socket || !this.socket.connected) {
            // console.error("Cannot leave lobby - socket not connected");
            this.inLobby = false;
            this.currentLobbyId = null;
            this.hideLobbyUI();
            return;
        }

        if (this.inLobby && this.currentLobbyId) {
            console.log("Leaving lobby:", this.currentLobbyId);

            // Send an individual leave event rather than a broadcast
            this.socket.emit("playerLeaveLobby", {
                lobbyId: this.currentLobbyId,
                playerId: this.socket.id,
            });

            this.inLobby = false;
            this.currentLobbyId = null;
            this.hideLobbyUI();

            // Request updated lobbies list
            this.socket.emit("getLobbyList");
        }
    }

    showLobbyUI() {
        console.log("Showing lobby UI for lobby:", this.currentLobbyId);

        // Hide lobbies list elements
        if (this.lobbyListContainer) {
            this.lobbyListContainer.setVisible(false);
        }

        this.lobbyListBackground.setVisible(false);
        this.lobbyListGameLobbyText.setVisible(false);
        this.lobbyListNameLabel.setVisible(false);
        this.lobbyListNameBox.setVisible(false);
        this.lobbyListPlayerNameText.setVisible(false);
        this.lobbyListCreateLobbyButton.setVisible(false);
        this.lobbyListAvailableLobbiesText.setVisible(false);
        this.lobbyListRefreshButton.setVisible(false);
        this.lobbyListbackButton.setVisible(false);

        // Ensure lobby background is visible
        this.lobbyBackground.setVisible(true);

        // Ensure that lobby texts are visible and have content
        if (this.currentLobbyId) {
            // Get current lobby data
            const lobby = this.lobbies[this.currentLobbyId] || { name: "Loading...", id: this.currentLobbyId };

            // Update and show lobby name and ID
            this.lobbyNameText.setText(`Lobby: ${lobby.name || "Loading..."}`).setVisible(true);
            this.lobbyIdText.setText(`ID: ${this.currentLobbyId}`).setVisible(true);
        } else {
            this.lobbyNameText.setText("Lobby: Loading...").setVisible(true);
            this.lobbyIdText.setText("ID: Loading...").setVisible(true);
        }

        // Ensure player text header is visible
        this.lobbyPlayerText.setVisible(true);

        // Show lobby UI container
        if (this.lobbyUI) {
            this.lobbyUI.setVisible(true);
        }

        // Make sure player list container is visible
        if (this.lobbyPlayerListContainer) {
            this.lobbyPlayerListContainer.setVisible(true);
        }

        // Show the action buttons
        this.lobbyStartGameButton.setVisible(true);
        this.lobbyLeaveLobbyButton.setVisible(true);

        // Request lobby state to ensure UI is updated with latest data
        if (this.socket && this.socket.connected && this.currentLobbyId) {
            this.socket.emit("requestLobbyState", { lobbyId: this.currentLobbyId });
        }
    }

    hideLobbyUI() {
        this.lobbyBackground.setVisible(false);
        this.lobbyNameText.setVisible(false);
        this.lobbyIdText.setVisible(false);
        this.lobbyPlayerText.setVisible(false);
        this.lobbyStartGameButton.setVisible(false);
        this.lobbyLeaveLobbyButton.setVisible(false);

        if (this.lobbyUI) {
            this.lobbyUI.setVisible(false);
        }

        this.lobbyListBackground.setVisible(true);
        this.lobbyListGameLobbyText.setVisible(true);
        this.lobbyListNameLabel.setVisible(true);
        this.lobbyListNameBox.setVisible(true);
        this.lobbyListPlayerNameText.setVisible(true);
        this.lobbyListCreateLobbyButton.setVisible(true);
        this.lobbyListAvailableLobbiesText.setVisible(true);
        this.lobbyListRefreshButton.setVisible(true);
        this.lobbyListbackButton.setVisible(true);

        if (this.lobbyListContainer) {
            this.lobbyListContainer.setVisible(true);
        }
    }

    updateLobbiesList() {
        // Clear existing list
        if (!this.lobbyListContainer) {
            // console.error("Lobby list container is undefined");
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
                .text(0, -70, "No lobbies available.\nCreate a new one to get started!", {
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
                .text(-20, -20, "👆", {
                    fontSize: 40,
                })
                .setOrigin(0);

            this.lobbyListContainer.add([noLobbiesText, hintIcon]);
            return;
        }

        // Display each lobby as a button with improved styling
        let yPos = -120;
        lobbyIds.forEach((lobbyId, index) => {
            const lobby = this.lobbies[lobbyId];
            if (!lobby) return;

            // Background for this lobby entry with border
            const bgBorder = this.add.rectangle(10, yPos, 600, 56, 0xffffff, 0.3);
            const bg = this.add
                .rectangle(10, yPos, 596, 52, 0x444444, 0.8)
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

    /**
     * updateLobbyState method - completely revised with focus on player display
     * This method makes sure player names appear in the lobby
     */
    updateLobbyState(lobby) {
        if (!lobby) {
            console.warn("No lobby data provided to updateLobbyState");
            return;
        }

        console.log("Updating lobby state:", lobby);
        console.log("Players in lobby:", Object.keys(lobby.players || {}));

        // 1. Update lobby name and ID display
        if (this.lobbyNameText) {
            this.lobbyNameText.setText(`Lobby: ${lobby.name || "Unknown"}`);
        }

        if (this.lobbyIdText) {
            this.lobbyIdText.setText(`ID: ${lobby.id || "Unknown"}`);
        }

        // 2. IMPORTANT: Create a new container if it doesn't exist
        if (!this.lobbyPlayerListContainer) {
            console.log("Creating new player list container");
            this.lobbyPlayerListContainer = this.add.container(0, 0);
            // Add it to the lobby UI
            if (this.lobbyUI) {
                this.lobbyUI.add(this.lobbyPlayerListContainer);
            }
        }

        // 3. Clear existing player entries
        try {
            console.log("Clearing player list container");
            this.lobbyPlayerListContainer.removeAll(true);
        } catch (error) {
            console.warn("Error clearing player list:", error);
            // Recreate container if there was an error
            this.lobbyPlayerListContainer = this.add.container(0, 0);
            if (this.lobbyUI) {
                this.lobbyUI.add(this.lobbyPlayerListContainer);
            }
        }

        // 4. Make sure the player container is visible
        this.lobbyPlayerListContainer.setVisible(true);

        // 5. Determine if current player is host
        const isHost = lobby.host === this.socket?.id;
        console.log("Is current player host?", isHost);

        // 6. Draw each player with explicit step-by-step positioning
        const playerIds = Object.keys(lobby.players || {});
        console.log("Player IDs to render:", playerIds);

        if (playerIds.length === 0) {
            console.log("No players in lobby!");

            // Add a placeholder text when no players are found
            const noPlayersText = this.add
                .text(0, 0, "No players in lobby", {
                    fontFamily: "Arial",
                    fontSize: 18,
                    color: "#ff0000",
                })
                .setOrigin(0.5);

            this.lobbyPlayerListContainer.add(noPlayersText);
        } else {
            let yPos = -20; // Starting Y position for first player

            playerIds.forEach((playerId, index) => {
                const player = lobby.players[playerId];
                if (!player) {
                    console.warn("Invalid player data for ID:", playerId);
                    return;
                }

                console.log("Rendering player:", player.name, "at position", yPos);

                const isPlayerHost = playerId === lobby.host;
                const isCurrentPlayer = playerId === this.socket?.id;

                // Player background
                const playerBg = this.add.rectangle(0, yPos, 400, 50, isCurrentPlayer ? 0x334433 : 0x333344, 0.7);

                // Add a border for current player
                let playerBorder = null;
                if (isCurrentPlayer) {
                    playerBorder = this.add.rectangle(0, yPos, 404, 54, 0x55ff55, 0.5);
                    this.lobbyPlayerListContainer.add(playerBorder);
                }

                // Create player name text with crown for host
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

                // Add elements to container
                this.lobbyPlayerListContainer.add([playerBg, text]);

                // Increase position for next player
                yPos += 60;
            });

            // 7. Add waiting message if needed
            if (playerIds.length < 2) {
                const waitingText = this.add
                    .text(0, yPos + 40, "Waiting for more players...", {
                        fontFamily: "Arial",
                        fontSize: 18,
                        color: "#ffff00",
                        stroke: "#000000",
                        strokeThickness: 2,
                        align: "center",
                    })
                    .setOrigin(0.5);

                this.lobbyPlayerListContainer.add(waitingText);
            }
        }

        // 8. Update Start Game button state
        const canStart = playerIds.length >= 2 && isHost;
        if (this.lobbyStartGameButton) {
            try {
                // Update button container
                const buttonContainer = this.lobbyStartGameButton;
                const buttonRect = buttonContainer.list && buttonContainer.list[0];

                if (buttonRect) {
                    // Visual feedback for button state
                    if (canStart) {
                        buttonRect.setFillStyle(0x00aa00, 0.8);
                        buttonContainer.setInteractive();
                    } else {
                        buttonRect.setFillStyle(0x555555, 0.6);
                        buttonContainer.disableInteractive();
                    }
                }
            } catch (error) {
                console.warn("Error updating start button:", error);
            }
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
