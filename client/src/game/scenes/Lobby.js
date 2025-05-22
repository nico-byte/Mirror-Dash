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
        this.playerName = localStorage.getItem("playerName") || "Player_" + Math.floor(Math.random() * 1000);
        this.currentLobbyId = null;
        this.inLobby = false;
        this.defaultLobbyName = localStorage.getItem("lobbyName") || "Game Lobby " + Math.floor(Math.random() * 100);
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
            localStorage.setItem("playerName", this.playerName);
        }

        // Generate a new default lobby name for each session
        // this.defaultLobbyName = "Game Lobby " + Math.floor(Math.random() * 100);
        // loaded from localStorage above or randomly generated

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
        // Get screen dimensions for responsive positioning
        const width = this.scale.width;
        const height = this.scale.height;

        if (this.connectionError) {
            alert("Failed to connect to game server. Please try again later.");
            this.scene.start("MainMenu");
            return;
        }

        // Create containers with relative positioning
        this.lobbyListContainer = this.add.container(width * 0.5, height * 0.55).setDepth(1000);

        // Responsive background that scales with the screen size
        this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x060322);

        // Make background scale proportionally to screen size
        this.lobbyListBackground = this.add
            .rectangle(width * 0.5, height * 0.5, width * 0.85, height * 0.85, 0x222266)
            .setAlpha(0.8)
            .setStrokeStyle(2, 0x6666ff);

        // Title text with responsive font size
        this.lobbyListGameLobbyText = this.add
            .text(width * 0.5, height * 0.1, "Game Lobbies", {
                fontFamily: "Orbitron, Arial",
                fontSize: `${Math.max(24, height * 0.05)}px`, // Responsive font size with minimum
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 8,
            })
            .setOrigin(0.5);

        // Player name section - responsive positioning
        this.lobbyListNameLabel = this.add
            .text(width * 0.5, height * 0.18, "Your Name:", {
                fontFamily: "Orbitron, Arial",
                fontSize: `${Math.max(16, height * 0.026)}px`,
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // Responsive name input box
        const nameBoxWidth = Math.min(width * 0.4, 320); // Capped at 320px or 40% of width
        this.lobbyListNameBox = this.add
            .rectangle(width * 0.5, height * 0.22, nameBoxWidth, height * 0.06, 0xffffff, 0.1)
            .setStrokeStyle(2, 0xffffff)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        this.lobbyListNameBox.on("pointerdown", () => this.promptName());

        this.lobbyListPlayerNameText = this.add
            .text(width * 0.5, height * 0.22, this.playerName, {
                fontFamily: "Orbitron, Arial",
                fontSize: `${Math.max(16, height * 0.026)}px`,
                color: "#ffffff",
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        this.lobbyListPlayerNameText.on("pointerdown", () => this.promptName());

        // Responsive button generator
        const makeButton = (yPercent, label, baseColor, hoverColor, onClick) => {
            const buttonWidth = Math.min(width * 0.4, 320); // Responsive width capped at 320px
            const buttonHeight = height * 0.08;

            const rect = this.add
                .rectangle(0, 0, buttonWidth, buttonHeight, baseColor)
                .setOrigin(0.5)
                .setStrokeStyle(2, 0xffffff)
                .setInteractive({ useHandCursor: true });

            const text = this.add
                .text(0, 0, label, {
                    fontFamily: "Orbitron, Arial",
                    fontSize: `${Math.max(16, height * 0.03)}px`, // Responsive font size
                    color: "#ffffff",
                })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            // Combine into a container so it moves as one unit
            const button = this.add.container(width * 0.5, height * yPercent, [rect, text]);

            // Set interactivity for the button (delegate events)
            rect.on("pointerover", () => rect.setFillStyle(hoverColor));
            rect.on("pointerout", () => rect.setFillStyle(baseColor));
            rect.on("pointerdown", onClick);
            text.on("pointerdown", onClick);

            return button;
        };

        // Create lobby button - responsive positioning
        this.lobbyListCreateLobbyButton = makeButton(0.32, "Create Lobby", 0x00aa00, 0x00cc00, () =>
            this.createNewLobby()
        );

        // Available lobbies title with responsive positioning
        this.lobbyListAvailableLobbiesText = this.add
            .text(width * 0.5, height * 0.4, "Available Lobbies", {
                fontFamily: "Orbitron, Arial",
                fontSize: `${Math.max(18, height * 0.036)}px`,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 4,
            })
            .setOrigin(0.5);

        // Responsive buttons at the bottom
        this.lobbyListRefreshButton = makeButton(0.82, "Refresh Lobbies", 0x00aa00, 0x00cc00, () => {
            if (this.socket && this.socket.connected) {
                console.log("Requesting lobby list");
                this.socket.emit("getLobbyList");
            } else {
                alert("Not connected to server. Please try again.");
            }
        });

        this.lobbyListbackButton = makeButton(0.92, "Back to Main Menu", 0xaa0000, 0xcc0000, () =>
            this.scene.start("MainMenu")
        );

        // Lobby view (when inside a lobby)
        this.lobbyBackground = this.add
            .rectangle(width * 0.5, height * 0.5, width * 0.8, height * 0.7, 0x222266, 0.8)
            .setStrokeStyle(2, 0x6666ff)
            .setVisible(false);

        // Lobby info text with responsive positioning
        this.lobbyNameText = this.add
            .text(width * 0.5, height * 0.25, "Lobby: ", {
                fontFamily: "Orbitron, Arial",
                fontSize: `${Math.max(18, height * 0.036)}px`,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 4,
            })
            .setOrigin(0.5)
            .setVisible(false);

        this.lobbyIdText = this.add
            .text(width * 0.5, height * 0.3, "ID: ", {
                fontFamily: "Orbitron, Arial",
                fontSize: `${Math.max(12, height * 0.02)}px`,
                color: "#aaaaff",
            })
            .setOrigin(0.5)
            .setVisible(false);

        // Player list for lobby view
        this.lobbyPlayerListContainer = this.add.container(width * 0.5, height * 0.4).setVisible(false);

        this.lobbyPlayerText = this.add
            .text(width * 0.5, height * 0.35, "Players", {
                fontFamily: "Orbitron, Arial",
                fontSize: `${Math.max(16, height * 0.03)}px`,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 4,
            })
            .setOrigin(0.5)
            .setVisible(false);

        // Container for player list - this will be populated dynamically
        this.lobbyUI = this.add.container(width * 0.5, height * 0.45);
        this.lobbyPlayerListContainer = this.add.container(0, 0);
        this.lobbyUI.add(this.lobbyPlayerListContainer);

        // Lobby action buttons - responsive positioning
        this.lobbyStartGameButton = makeButton(0.65, "Start Game", 0x00aa00, 0x00cc00, () => {
            if (this.socket?.connected && this.currentLobbyId) {
                this.socket.emit("requestGameStart", { lobbyId: this.currentLobbyId });
            }
        }).setVisible(false);

        this.lobbyLeaveLobbyButton = makeButton(0.75, "Leave Lobby", 0xaa0000, 0xcc0000, () =>
            this.leaveLobby()
        ).setVisible(false);

        // Connection status text
        this.connectionStatusText = this.add
            .text(width * 0.5, height * 0.98, "Connecting to server...", {
                fontFamily: "Orbitron, Arial",
                fontSize: `${Math.max(12, height * 0.018)}px`,
                color: "#ffff00",
            })
            .setOrigin(0.5);

        if (this.socket?.connected) {
            this.socket.emit("getLobbyList");
            this.connectionStatusText.setText("Connected to server").setColor("#00ff00");
        } else {
            this.connectionStatusText.setText("Failed to connect to server").setColor("#ff0000");
        }

        // Handle debug mode
        const debugMode = import.meta.env.VITE_DEBUG_MODE === "true";
        if (debugMode) {
            this.debugText = this.add.text(10, 10, "Debug: Lobby Scene", {
                fontSize: "12px",
                fill: "#ffffff",
                backgroundColor: "#000000",
            });
        }

        // If we're already in a lobby (e.g., returning from a game), show lobby UI
        if (this.inLobby && this.currentLobbyId) {
            this.showLobbyUI();
        }

        // Add listener for window resize
        this.scale.on("resize", this.handleResize, this);
    }

    /**
     * Handle window resize event - repositions all UI elements
     * @param {object} gameSize - Contains the new width and height
     */
    handleResize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;

        // Berechne responsive Maße basierend auf der Bildschirmgröße
        const buttonWidth = Math.min(width * 0.4, 320);
        const buttonHeight = height * 0.08;
        const nameBoxWidth = Math.min(width * 0.4, 320);
        const lobbyListWidth = Math.min(600, width * 0.75);
        const lobbyListHeight = Math.min(56, height * 0.07);
        const lobbySpacing = Math.min(70, height * 0.09);

        // === LOBBY LISTE (Hauptmenü der Lobby) ===

        // Hintergrund-Rechteck aktualisieren
        if (this.lobbyListBackground) {
            this.lobbyListBackground.setPosition(width * 0.5, height * 0.5).setSize(width * 0.85, height * 0.85);
        }

        // Container für Lobby-Liste aktualisieren
        if (this.lobbyListContainer) {
            this.lobbyListContainer.setPosition(width * 0.5, height * 0.55);
        }

        // Titel aktualisieren
        if (this.lobbyListGameLobbyText) {
            this.lobbyListGameLobbyText
                .setPosition(width * 0.5, height * 0.1)
                .setFontSize(`${Math.max(24, height * 0.05)}px`);
        }

        // Spielername-Label & Eingabe
        if (this.lobbyListNameLabel) {
            this.lobbyListNameLabel
                .setPosition(width * 0.5, height * 0.18)
                .setFontSize(`${Math.max(16, height * 0.026)}px`);
        }

        if (this.lobbyListNameBox) {
            this.lobbyListNameBox.setPosition(width * 0.5, height * 0.22).setSize(nameBoxWidth, height * 0.06);
        }

        if (this.lobbyListPlayerNameText) {
            this.lobbyListPlayerNameText
                .setPosition(width * 0.5, height * 0.22)
                .setFontSize(`${Math.max(16, height * 0.026)}px`);
        }

        // Buttons aktualisieren
        if (this.lobbyListCreateLobbyButton) {
            // Extrahiere Komponenten
            const button = this.lobbyListCreateLobbyButton;
            const rect = button.list && button.list[0];
            const text = button.list && button.list[1];

            // Position aktualisieren
            button.setPosition(width * 0.5, height * 0.32);

            // Größe und Text aktualisieren falls verfügbar
            if (rect) {
                rect.setSize(buttonWidth, buttonHeight);
            }

            if (text) {
                text.setFontSize(`${Math.max(16, height * 0.03)}px`);
            }
        }

        // "Verfügbare Lobbies" Text
        if (this.lobbyListAvailableLobbiesText) {
            this.lobbyListAvailableLobbiesText
                .setPosition(width * 0.5, height * 0.4)
                .setFontSize(`${Math.max(18, height * 0.036)}px`);
        }

        // Refresh-Button
        if (this.lobbyListRefreshButton) {
            // Extrahiere Komponenten
            const button = this.lobbyListRefreshButton;
            const rect = button.list && button.list[0];
            const text = button.list && button.list[1];

            // Position aktualisieren
            button.setPosition(width * 0.5, height * 0.82);

            // Größe und Text aktualisieren falls verfügbar
            if (rect) {
                rect.setSize(buttonWidth, buttonHeight);
            }

            if (text) {
                text.setFontSize(`${Math.max(16, height * 0.03)}px`);
            }
        }

        // Back-Button
        if (this.lobbyListbackButton) {
            // Extrahiere Komponenten
            const button = this.lobbyListbackButton;
            const rect = button.list && button.list[0];
            const text = button.list && button.list[1];

            // Position aktualisieren
            button.setPosition(width * 0.5, height * 0.92);

            // Größe und Text aktualisieren falls verfügbar
            if (rect) {
                rect.setSize(buttonWidth, buttonHeight);
            }

            if (text) {
                text.setFontSize(`${Math.max(16, height * 0.03)}px`);
            }
        }

        // === LOBBY ANSICHT (wenn man in einer Lobby ist) ===

        // Lobby Hintergrund
        if (this.lobbyBackground) {
            this.lobbyBackground.setPosition(width * 0.5, height * 0.5).setSize(width * 0.8, height * 0.7);
        }

        // Lobby Name und ID
        if (this.lobbyNameText) {
            this.lobbyNameText.setPosition(width * 0.5, height * 0.25).setFontSize(`${Math.max(18, height * 0.036)}px`);
        }

        if (this.lobbyIdText) {
            this.lobbyIdText.setPosition(width * 0.5, height * 0.3).setFontSize(`${Math.max(12, height * 0.02)}px`);
        }

        // Player List Text
        if (this.lobbyPlayerText) {
            this.lobbyPlayerText
                .setPosition(width * 0.5, height * 0.35)
                .setFontSize(`${Math.max(16, height * 0.03)}px`);
        }

        // Player List Container
        if (this.lobbyUI) {
            this.lobbyUI.setPosition(width * 0.5, height * 0.45);
        }

        // Start Game Button
        if (this.lobbyStartGameButton) {
            // Extrahiere Komponenten
            const button = this.lobbyStartGameButton;
            const rect = button.list && button.list[0];
            const text = button.list && button.list[1];

            // Position aktualisieren
            button.setPosition(width * 0.5, height * 0.65);

            // Größe und Text aktualisieren falls verfügbar
            if (rect) {
                rect.setSize(buttonWidth, buttonHeight);
            }

            if (text) {
                text.setFontSize(`${Math.max(16, height * 0.03)}px`);
            }
        }

        // Leave Lobby Button
        if (this.lobbyLeaveLobbyButton) {
            // Extrahiere Komponenten
            const button = this.lobbyLeaveLobbyButton;
            const rect = button.list && button.list[0];
            const text = button.list && button.list[1];

            // Position aktualisieren
            button.setPosition(width * 0.5, height * 0.75);

            // Größe und Text aktualisieren falls verfügbar
            if (rect) {
                rect.setSize(buttonWidth, buttonHeight);
            }

            if (text) {
                text.setFontSize(`${Math.max(16, height * 0.03)}px`);
            }
        }

        // Connection Status Text
        if (this.connectionStatusText) {
            this.connectionStatusText
                .setPosition(width * 0.5, height * 0.98)
                .setFontSize(`${Math.max(12, height * 0.018)}px`);
        }

        // Debug Text
        if (this.debugText) {
            this.debugText.setPosition(10, 10);
        }

        // Aktualisiere die Lobbyliste oder den Lobbyzustand, je nachdem was gerade angezeigt wird
        if (this.inLobby) {
            // Wenn wir in einer Lobby sind, die Spielerliste aktualisieren
            const lobby = this.lobbies[this.currentLobbyId];
            if (lobby) {
                this.updateLobbyState(lobby);
            }
        } else {
            // Ansonsten die Lobbyliste aktualisieren
            this.updateLobbiesList();
        }
    }

    promptName() {
        const newName = prompt("Enter your name:", this.playerName);
        if (newName && newName.trim() !== "") {
            this.playerName = newName.trim();
            localStorage.setItem("playerName", this.playerName);
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
            localStorage.setItem("lobbyName", lobbyName.trim());
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
            console.warn("Lobby list container is undefined");
            return;
        }

        this.lobbyListContainer.removeAll();

        // Get screen dimensions
        const width = this.scale.width;
        const height = this.scale.height;

        // If in a lobby, don't show the list
        if (this.inLobby) return;

        // Check if there are lobbies
        const lobbyIds = Object.keys(this.lobbies || {});

        if (lobbyIds.length === 0) {
            // No lobbies available - show a nicer message
            const noLobbiesText = this.add
                .text(0, -height * 0.1, "No lobbies available.\nCreate a new one to get started!", {
                    fontFamily: "Arial",
                    fontSize: Math.max(16, height * 0.028),
                    color: "#ffffff",
                    stroke: "#000000",
                    strokeThickness: 3,
                    align: "center",
                })
                .setOrigin(0.5);

            // Add a hint icon
            const hintIcon = this.add
                .text(-20, -20, "👆", {
                    fontSize: Math.max(30, height * 0.04),
                })
                .setOrigin(0);

            this.lobbyListContainer.add([noLobbiesText, hintIcon]);
            return;
        }

        // Calculate entry sizes based on screen size
        const entryWidth = Math.min(600, width * 0.75);
        const entryHeight = Math.min(56, height * 0.07);
        const entrySpacing = Math.min(70, height * 0.09);

        // Display each lobby as a button with improved styling
        let yPos = -height * 0.15; // Start position scales with screen height
        lobbyIds.forEach((lobbyId, index) => {
            const lobby = this.lobbies[lobbyId];
            if (!lobby) return;

            // Background for this lobby entry with border
            const bgBorder = this.add.rectangle(0, yPos, entryWidth, entryHeight + 4, 0xffffff, 0.3);
            const bg = this.add
                .rectangle(0, yPos, entryWidth - 4, entryHeight, 0x444444, 0.8)
                .setInteractive()
                .on("pointerover", () => bg.setFillStyle(0x666666, 0.8))
                .on("pointerout", () => bg.setFillStyle(0x444444, 0.8))
                .on("pointerdown", () => {
                    this.joinLobby(lobbyId);
                });

            // Lobby name with better styling - positioned for responsive layout
            const text = this.add
                .text(-entryWidth * 0.4, yPos, `${lobby.name}`, {
                    fontFamily: "Arial",
                    fontSize: Math.max(16, height * 0.026),
                    color: "#ffffff",
                    stroke: "#000000",
                    strokeThickness: 2,
                })
                .setOrigin(0, 0.5);

            // Player count with visual indicator
            const playerCountBg = this.add
                .rectangle(-entryWidth * 0.18, yPos, entryWidth * 0.12, entryHeight * 0.6, 0x222222, 0.6)
                .setOrigin(0, 0.5);
            const playerCount = this.add
                .text(-entryWidth * 0.15, yPos, `${lobby.playerCount}/${lobby.maxPlayers}`, {
                    fontFamily: "Arial",
                    fontSize: Math.max(14, height * 0.022),
                    color: lobby.playerCount < lobby.maxPlayers ? "#00ff00" : "#ff0000",
                    stroke: "#000000",
                    strokeThickness: 2,
                })
                .setOrigin(0, 0.5);

            // Player icon
            const playerIcon = this.add
                .text(-entryWidth * 0.08, yPos, "👤", {
                    fontSize: Math.max(16, height * 0.024),
                })
                .setOrigin(0, 0.5);

            // Join button with better styling
            const joinBtnWidth = Math.min(100, width * 0.12);
            const joinBtnBorder = this.add.rectangle(
                entryWidth * 0.35,
                yPos,
                joinBtnWidth + 4,
                entryHeight * 0.7 + 4,
                0xffffff,
                0.5
            );
            const joinBtn = this.add
                .rectangle(entryWidth * 0.35, yPos, joinBtnWidth, entryHeight * 0.7, 0x008800, 1)
                .setInteractive()
                .on("pointerover", () => joinBtn.setFillStyle(0x00aa00))
                .on("pointerout", () => joinBtn.setFillStyle(0x008800))
                .on("pointerdown", () => {
                    this.joinLobby(lobbyId);
                });

            const joinText = this.add
                .text(entryWidth * 0.35, yPos, "Join", {
                    fontFamily: "Arial Black",
                    fontSize: Math.max(14, height * 0.022),
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

            yPos += entrySpacing; // More spacing between entries
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

        // Get screen dimensions for responsive positioning
        const width = this.scale.width;
        const height = this.scale.height;

        // 1. Update lobby name and ID display with responsive positioning
        if (this.lobbyNameText) {
            this.lobbyNameText.setText(`Lobby: ${lobby.name || "Unknown"}`);
            this.lobbyNameText.setPosition(width * 0.5, height * 0.25);
        }

        if (this.lobbyIdText) {
            this.lobbyIdText.setText(`ID: ${lobby.id || "Unknown"}`);
            this.lobbyIdText.setPosition(width * 0.5, height * 0.3);
        }

        // 2. Create a new container if it doesn't exist
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

        // 4. Make sure the player container is visible and properly positioned
        this.lobbyPlayerListContainer.setVisible(true);
        this.lobbyUI.setPosition(width * 0.5, height * 0.45);

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
                    fontSize: Math.max(16, height * 0.024),
                    color: "#ff0000",
                })
                .setOrigin(0.5);

            this.lobbyPlayerListContainer.add(noPlayersText);
        } else {
            // Calculate player entry sizes based on screen
            const entryHeight = Math.min(60, height * 0.08);
            const entryWidth = Math.min(400, width * 0.7);
            let yPos = -Math.min(60, height * 0.08); // Starting Y position for first player

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
                const playerBg = this.add.rectangle(
                    0,
                    yPos,
                    entryWidth,
                    entryHeight,
                    isCurrentPlayer ? 0x334433 : 0x333344,
                    0.7
                );

                // Add a border for current player
                let playerBorder = null;
                if (isCurrentPlayer) {
                    playerBorder = this.add.rectangle(0, yPos, entryWidth + 4, entryHeight + 4, 0x55ff55, 0.5);
                    this.lobbyPlayerListContainer.add(playerBorder);
                }

                // Create player name text with crown for host
                const prefix = isPlayerHost ? "👑 " : "";
                const playerName = player.name || `Player_${playerId.substring(0, 4)}`;

                const text = this.add
                    .text(0, yPos, `${prefix}${playerName}`, {
                        fontFamily: "Arial",
                        fontSize: Math.max(16, height * 0.028),
                        color: isCurrentPlayer ? "#88ff88" : "#ffffff",
                        stroke: "#000000",
                        strokeThickness: 2,
                    })
                    .setOrigin(0.5);

                // Add elements to container
                this.lobbyPlayerListContainer.add([playerBg, text]);

                // Increase position for next player
                yPos += entryHeight + 5; // 5px gap between entries
            });

            // 7. Add waiting message if needed
            if (playerIds.length < 2) {
                const waitingText = this.add
                    .text(0, yPos + entryHeight, "Waiting for more players...", {
                        fontFamily: "Arial",
                        fontSize: Math.max(14, height * 0.024),
                        color: "#ffff00",
                        stroke: "#000000",
                        strokeThickness: 2,
                        align: "center",
                    })
                    .setOrigin(0.5);

                this.lobbyPlayerListContainer.add(waitingText);
            }
        }

        // 8. Update Start Game button state and ensure correct positioning
        const canStart = playerIds.length >= 2 && isHost;
        if (this.lobbyStartGameButton) {
            try {
                // Update button container position for responsive layout
                this.lobbyStartGameButton.setPosition(width * 0.5, height * 0.65);

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

                    // Ensure button is sized correctly
                    buttonRect.setSize(Math.min(width * 0.4, 320), height * 0.08);
                }
            } catch (error) {
                console.warn("Error updating start button:", error);
            }
        }

        // Ensure leave button is positioned correctly
        if (this.lobbyLeaveLobbyButton) {
            this.lobbyLeaveLobbyButton.setPosition(width * 0.5, height * 0.75);
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
