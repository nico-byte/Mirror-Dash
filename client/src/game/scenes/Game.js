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
        this.playerName = "Player_" + Math.floor(Math.random() * 1000);
        this.connected = false;
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
    }

    create() {
        // Basic setup
        this.cameras.main.setBackgroundColor(0x00ff00);
        this.add.image(512, 384, "background").setAlpha(0.5);

        // Check if matter physics is available
        if (!this.matter || !this.matter.world) {
            console.error("Matter physics is not available");
            this.add
                .text(512, 384, "Physics not available.\nCheck console for details.", {
                    fontFamily: "Arial",
                    fontSize: 20,
                    color: "#ffffff",
                    stroke: "#ff0000",
                    strokeThickness: 2,
                    align: "center",
                })
                .setOrigin(0.5);
            return;
        }

        console.log("Matter physics initialized");

        // Disable default collision events to prevent the error
        this.matter.world.on(
            "beforeupdate",
            function () {
                this.matter.world.off("collisionstart");
                this.matter.world.off("collisionactive");
                this.matter.world.off("collisionend");
                this.matter.world.off("beforeupdate");
            },
            this
        );

        // Configure world bounds and gravity
        this.matter.world.setBounds(0, 0, 1024, 768);
        this.matter.world.setGravity(0, 1);

        // Create ground with proper collision properties
        this.ground = this.matter.add.rectangle(512, 730, 1024, 60, {
            isStatic: true,
            friction: 0.5,
            restitution: 0.2,
            label: "ground",
        });

        // Create main player
        this.player = new Player(this, 230, 250, this.playerName, true);

        // Set up custom collision detection
        this.matter.world.on(
            "collisionstart",
            function (event) {
                const pairs = event.pairs;

                for (let i = 0; i < pairs.length; i++) {
                    const bodyA = pairs[i].bodyA;
                    const bodyB = pairs[i].bodyB;

                    // Handle collisions manually without trying to emit to gameObjects
                    if (
                        (bodyA.label === "player" && bodyB.label === "ground") ||
                        (bodyA.label === "ground" && bodyB.label === "player")
                    ) {
                        // Player is touching the ground, enable jumping
                        if (bodyA.label === "player" && bodyA.gameObject) {
                            bodyA.gameObject.canJump = true;
                        } else if (bodyB.label === "player" && bodyB.gameObject) {
                            bodyB.gameObject.canJump = true;
                        }
                    }
                }
            },
            this
        );

        // Setup input
        this.cursors = this.input.keyboard.createCursorKeys();

        // Setup camera to follow player
        if (this.player && this.player.sprite) {
            this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
        }
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

        // Update main player
        this.player.update();

        // Apply player movement based on input
        const moved = this.player.applyMovement(this.cursors);

        // Send updates to server if player moved
        if (moved) {
            this.socket.emit("playerUpdate", {
                x: this.player.x,
                y: this.player.y,
                animation: this.player.animation,
                direction: this.player.direction,
            });
        }

        // Update other players
        Object.values(this.otherPlayers).forEach(player => {
            player.update();
        });
    }
}
