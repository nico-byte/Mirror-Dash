import { Scene } from "phaser";
import { io } from "socket.io-client";

export class Preloader extends Scene {
    constructor() {
        super("Preloader");
        this.socket = null;
    }

    init() {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 384, "background");

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on("progress", progress => {
            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + 460 * progress;
        });
    }

    preload() {
        // Load background images
        this.load.image("bg1", "/assets/background/bg1.png");
        this.load.image("bg2", "/assets/background/bg2.png");
        this.load.image("bg3", "/assets/background/bg3.png");
        this.load.image("bg4", "/assets/background/bg4.png");
        this.load.image("bg5", "/assets/background/bg5.png");

        // Load platform textures
        this.load.image("platform_3x1", "/assets/Player_Platforms/platform_3x1.png");
        this.load.image("platform_4x1", "/assets/Player_Platforms/platform_4x1.png");

        // Load jump pad textures
        this.load.image("jumpPad", "/assets/Player_Platforms/jump_pad.png");

        // Load finish line textures
        this.load.image("pokal", "/assets/Player_Platforms/pokal.png");

        // wall textures
        this.load.image("wall", "/assets/Player_Platforms/wall.png");

        // Load spike textures
        this.load.image("spike", "/assets/Player_Platforms/spikes.png");

        // powerup ufo textures
        this.load.image("ufo", "/assets/Player_Platforms/ufo.png");
        this.load.image("portal", "/assets/Player_Platforms/portal.png");

        // Load player sprite
        this.load.image("sprite", "/assets/Player_Platforms/sprite.png");

        // Load logo for main menu
        this.load.image("logo", "/assets/logo_4.png");

        this.load.image("particle", "/assets/particle.png");

        this.load.audio("finish", "/assets/sounds/finish.mp3");
    }

    create() {
        // Get development options from environment variables
        const startDirectly = import.meta.env.VITE_START_DIRECTLY === "true";
        const skipMenu = import.meta.env.VITE_SKIP_MENU === "true";
        const skipLobby = import.meta.env.VITE_SKIP_LOBBY === "true";
        const directConnect = import.meta.env.VITE_DIRECT_CONNECT;
        const defaultPlayerName =
            import.meta.env.VITE_DEFAULT_PLAYER_NAME || "Player_" + Math.floor(Math.random() * 1000);

        console.log("Development options:", {
            startDirectly,
            skipMenu,
            skipLobby,
            directConnect,
            defaultPlayerName,
        });

        // If we're skipping directly to game with environment variables,
        // pre-establish the socket connection
        if ((startDirectly || skipMenu) && (skipLobby || directConnect)) {
            const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:9000";
            this.socket = io(serverUrl);

            // Wait for socket to connect before proceeding
            this.socket.on("connect", () => {
                this.navigateBasedOnEnvVars(startDirectly, skipMenu, skipLobby, directConnect, defaultPlayerName);
            });

            // Set a timeout in case connection takes too long
            setTimeout(() => {
                if (!this.socket.connected) {
                    console.error("Socket connection timed out, proceeding anyway");
                    this.navigateBasedOnEnvVars(startDirectly, skipMenu, skipLobby, directConnect, defaultPlayerName);
                }
            }, 3000);
        } else {
            // No socket pre-connection needed, proceed normally
            this.navigateBasedOnEnvVars(startDirectly, skipMenu, skipLobby, directConnect, defaultPlayerName);
        }
    }

    navigateBasedOnEnvVars(startDirectly, skipMenu, skipLobby, directConnect, defaultPlayerName) {
        // Determine which scene to start based on development options
        if (startDirectly || skipMenu) {
            if (skipLobby || directConnect) {
                // Create lobby first if we're skipping directly to game and have direct connect
                if (directConnect) {
                    console.log("Direct connecting to lobby:", directConnect);

                    // Start the game directly with the lobby ID
                    this.scene.start("Game", {
                        playerName: defaultPlayerName,
                        lobbyId: directConnect,
                        socket: this.socket,
                    });
                } else {
                    // Create a new quick play lobby first
                    if (this.socket && this.socket.connected) {
                        console.log("Creating quick play lobby for direct game start");
                        this.socket.emit(
                            "createLobby",
                            {
                                lobbyName: "Quick Play",
                                playerName: defaultPlayerName,
                            },
                            response => {
                                if (response && response.success) {
                                    console.log("Created lobby:", response.lobbyId);
                                    // Start the game with the new lobby ID
                                    this.scene.start("Game", {
                                        playerName: defaultPlayerName,
                                        lobbyId: response.lobbyId,
                                        socket: this.socket,
                                    });
                                } else {
                                    console.error("Failed to create lobby, starting game without one");
                                    this.scene.start("Game", {
                                        playerName: defaultPlayerName,
                                        socket: this.socket,
                                    });
                                }
                            }
                        );
                    } else {
                        // Start without socket connected
                        console.log("Starting game without connected socket");
                        this.scene.start("Game", {
                            playerName: defaultPlayerName,
                        });
                    }
                }
            } else {
                // Skip to lobby
                console.log("Skipping to Lobby scene");
                this.scene.start("Lobby", {
                    playerName: defaultPlayerName,
                    socket: this.socket,
                });
            }
        } else {
            // Normal flow - go to main menu
            console.log("Starting normal flow with MainMenu");
            this.scene.start("MainMenu");
        }
    }
}
