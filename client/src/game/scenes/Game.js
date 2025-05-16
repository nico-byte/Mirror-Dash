import { Scene } from "phaser";
import { io } from "socket.io-client";
import { Player } from "../entities/Player";

export class Game extends Scene {
    constructor() {
        super("Game");
        this.socket = null;
        this.player = null;
        this.otherPlayers = {};
        this.cursors = null;
        this.wasd = null;
        this.playerName = "Player_" + Math.floor(Math.random() * 1000);
        this.connected = false;
        this.scrollSpeed = 0; // 1.0 for scrollling on, 0 for no scrolling
    }

    init() {
        // Connect to server
        this.socket = io("http://localhost:9000");
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        // When connected to server
        this.socket.on("connect", () => {
            console.log("Connected to server");
            this.connected = true;
            this.socket.emit("joinGame", { playerName: this.playerName });
        });

        // Receive game state updates
        this.socket.on("gameState", gameState => {
            this.updateGameState(gameState);
        });

        // Other player moved
        this.socket.on("playerMoved", playerInfo => {
            this.updateOtherPlayer(playerInfo);
        });

        // Handle lobby full event
        this.socket.on("lobbyFull", ({ message }) => {
            alert(message);
            this.scene.start("MainMenu");
        });
    }

    create() {
        // Basic setup
        this.cameras.main.setBackgroundColor(0x00ff00);
        this.cameras.main.setBounds(0, 0, 2000, 2000);

        this.add.image(512, 384, "background").setAlpha(0.5);

        // Create ground
        this.platforms = this.physics.add.staticGroup();

        // Add a ground platform
        const ground = this.add.rectangle(512, 730, 1024, 60, 0x333333);
        this.physics.add.existing(ground, true); // true means static

        // Create main player
        this.player = new Player(this, 230, 250, this.playerName, true);

        // Add collision between player and ground
        if (this.player && this.player.sprite) {
            this.physics.add.collider(this.player.sprite, ground);
        }

        // Setup input
        this.cursors = this.input.keyboard.createCursorKeys();

        // Setup WASD keys
        this.wasd = {
            W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            Space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        };
    }

    updateGameState(gameState) {
        // Remove players no longer in game
        Object.keys(this.otherPlayers).forEach(id => {
            if (!gameState.players[id] && id !== this.socket.id) {
                this.otherPlayers[id].destroy();
                delete this.otherPlayers[id];
            }
        });

        // Add new players and update existing ones
        Object.values(gameState.players).forEach(playerInfo => {
            if (playerInfo.id === this.socket.id) {
                // This is the current player, we update this separately
                return;
            }

            if (!this.otherPlayers[playerInfo.id]) {
                // New player joined
                this.otherPlayers[playerInfo.id] = new Player(this, playerInfo.x, playerInfo.y, playerInfo.name, false);
            } else {
                // Update existing player
                this.updateOtherPlayer(playerInfo);
            }
        });
    }

    updateOtherPlayer(playerInfo) {
        if (this.otherPlayers[playerInfo.id]) {
            const otherPlayer = this.otherPlayers[playerInfo.id];
            otherPlayer.moveTo(playerInfo.x, playerInfo.y, playerInfo.animation, playerInfo.direction);
        }
    }

    update() {
        if (!this.player || !this.connected) return;

        this.cameras.main.scrollX += this.scrollSpeed;

        // Update main player
        this.player.update();

        // Apply player movement based on input
        const moved = this.player.applyMovement(this.cursors, this.wasd);

        // Always send updates to server, even if player is not moving
        this.socket.emit("playerUpdate", {
            x: this.player.x,
            y: this.player.y,
            animation: this.player.animation,
            direction: this.player.direction,
        });

        // Update other players
        Object.values(this.otherPlayers).forEach(player => {
            player.update();
        });
    }
}
