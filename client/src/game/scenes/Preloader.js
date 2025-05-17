import { Scene } from "phaser";

export class Preloader extends Scene {
    constructor() {
        super("Preloader");
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

        // Load player sprite
        this.load.image("sprite", "/assets/Player_Platforms/sprite.png");
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

        // Determine which scene to start based on development options
        if (startDirectly || skipMenu) {
            if (skipLobby || directConnect) {
                // Skip directly to game
                console.log("Skipping to Game scene");
                this.scene.start("Game", {
                    playerName: defaultPlayerName,
                    lobbyId: directConnect,
                });
            } else {
                // Skip to lobby
                console.log("Skipping to Lobby scene");
                this.scene.start("Lobby", {
                    playerName: defaultPlayerName,
                });
            }
        } else {
            // Normal flow - go to main menu
            console.log("Starting normal flow with MainMenu");
            this.scene.start("MainMenu");
        }
    }
}
