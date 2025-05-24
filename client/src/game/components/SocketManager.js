import { io } from "socket.io-client";
import { Player } from "../entities/Player";

export class SocketManager {
    constructor(scene) {
        this.scene = scene;
        this.synchronizationInterval = null;
        this.lastReceivedUpdate = {};
    }

    init(scene) {
        this.scene = scene;
        this.synchronizationInterval = null;
        this.lastReceivedUpdate = {};
    }

    setupLobby(data) {
        // Get server URL from environment variable or use default
        const serverUrl = import.meta.env.VITE_SERVER_URL || "/";

        // Get socket if passed from Lobby scene
        if (data && data.socket) {
            this.scene.socket = data.socket;
            this.scene.connected = true;
            console.log("Using existing socket connection");
        } else {
            // Connect to server if not already connected
            this.scene.socket = io(serverUrl, {
                path: "/socket.io",
                transports: ["websocket"],
            });
            console.log("Connected to game server:", serverUrl);
        }

        // Get player name if provided
        if (data && data.playerName) {
            this.scene.playerName = data.playerName;
        }

        // Get lobby ID if provided
        if (data && data.lobbyId) {
            this.scene.lobbyId = data.lobbyId;
            this.scene.connected = true;
            console.log("Joining existing lobby:", this.scene.lobbyId);
        } else if (import.meta.env.VITE_DIRECT_CONNECT) {
            // If direct connect is enabled, use the lobby ID from environment
            this.scene.lobbyId = import.meta.env.VITE_DIRECT_CONNECT;
            this.scene.connected = true;
            console.log("Direct connect to lobby:", this.scene.lobbyId);
        }
    }

    setupSocketListeners() {
        if (!this.scene || !this.scene.socket) {
            // console.error("Cannot setup socket listeners - scene or socket is undefined");
            return;
        }

        // Socket connection event
        this.scene.socket.on("connect", () => {
            console.log("Connected to server with ID:", this.scene.socket.id);
            this.scene.connected = true;

            // If we don't have a lobby ID and we're in the Game scene (not Lobby scene),
            // we need to create a lobby on the fly for quick play
            if (!this.scene.lobbyId && this.scene.scene.key === "Game") {
                // Create a quick play lobby
                this.scene.socket.emit(
                    "createLobby",
                    {
                        lobbyName: "Quick Play",
                        playerName: this.scene.playerName,
                    },
                    response => {
                        if (response && response.success) {
                            this.scene.lobbyId = response.lobbyId;
                            console.log("Created quick play lobby:", this.scene.lobbyId);
                            // Important: Request the lobby state after creating it
                            this.scene.socket.emit("requestLobbyState", { lobbyId: this.scene.lobbyId });
                        } else {
                            // console.error("Failed to create a quick play session:", response);
                            alert("Failed to create a quick play session. Please try again.");
                            this.scene.scene.start("MainMenu");
                        }
                    }
                );
            } else if (this.scene.lobbyId) {
                // If we already have a lobby ID, request its state
                console.log("Requesting state for existing lobby:", this.scene.lobbyId);
                this.scene.socket.emit("requestLobbyState", { lobbyId: this.scene.lobbyId });
            }
        });

        this.scene.socket.on("levelChanged", data => {
            if (data && data.levelId && data.playerId !== this.scene.socket.id) {
                console.log(`Level changed by other player to: ${data.levelId}`);

                // Only change level if we're not already in the Game scene with this level
                if (this.scene.scene.key !== "Game" || this.scene.levelId !== data.levelId) {
                    console.log(`Changing to level: ${data.levelId}`);

                    // If we're in game now, make sure to clean up
                    if (this.scene.scene.key === "Game") {
                        this.scene.shutdown();
                    }

                    // Start the new level
                    this.scene.scene.start("Game", {
                        socket: this.scene.socket,
                        playerName: this.scene.playerName,
                        levelId: data.levelId,
                        lobbyId: this.scene.lobbyId,
                    });
                }
            }
        });

        // Receive lobby state updates (contains player information)
        this.scene.socket.on("lobbyState", lobby => {
            if (lobby && lobby.id) {
                console.log("Received lobby state:", lobby.id);
                if (this.scene.lobbyId && lobby.id === this.scene.lobbyId) {
                    this.updateGameState(lobby);
                }
            } else {
                console.warn("Received invalid lobby state:", lobby);
            }
        });

        // Other player moved
        this.scene.socket.on("playerMoved", playerInfo => {
            // Record the time we received this update
            const now = Date.now();

            if (playerInfo && playerInfo.id) {
                // Skip updates for our own player
                if (playerInfo.id !== this.scene.socket.id) {
                    // Store the last update time for this player
                    this.lastReceivedUpdate[playerInfo.id] = {
                        data: playerInfo,
                        timestamp: now,
                    };

                    // Update the player immediately
                    this.updateOtherPlayer(playerInfo);
                }
            }
        });

        // Add platform sync listener
        this.scene.socket.on("platformSync", data => {
            if (data && data.lobbyId === this.lobbyId && data.platforms && data.platforms.length > 0) {
                // Only sync platforms if we're not the sender
                if (data.sourcePlayer !== this.socket.id) {
                    this.syncPlatforms(data.platforms);
                }
            }
        });

        this.scene.socket.on("gameOverBroadcast", data => {
            if (data && data.reason && data.playerId !== this.scene.socket.id) {
                console.log(`Game over triggered by other player: ${data.playerId}, reason: ${data.reason}`);

                // Display a short notification before transitioning
                const gameOverText = this.scene.add
                    .text(this.scene.scale.width / 2, this.scene.scale.height / 4, `Other player lost! Game Over`, {
                        fontFamily: "Arial Black",
                        fontSize: 32,
                        color: "#ff0000",
                        stroke: "#000000",
                        strokeThickness: 6,
                        align: "center",
                    })
                    .setOrigin(0.5)
                    .setScrollFactor(0)
                    .setDepth(1000);

                // After a short delay, transition to game over scene
                this.scene.time.delayedCall(1500, () => {
                    // Stop music with fade out if it exists
                    if (this.scene.levelMusic) {
                        this.scene.tweens.add({
                            targets: this.scene.levelMusic,
                            volume: 0,
                            duration: 1000,
                            onComplete: () => {
                                this.scene.levelMusic.stop();
                                this.scene.scene.start("GameOver", {
                                    levelId: this.scene.levelId,
                                    playerName: this.scene.playerName,
                                    socket: this.scene.socket,
                                    lobbyId: this.scene.lobbyId,
                                    reason: "other_player",
                                });
                            },
                        });
                    } else {
                        this.scene.scene.start("GameOver", {
                            levelId: this.scene.levelId,
                            playerName: this.scene.playerName,
                            socket: this.scene.socket,
                            lobbyId: this.scene.lobbyId,
                            reason: "other_player",
                        });
                    }
                });
            }
        });

        this.scene.socket.on("playerLeftLobby", data => {
            if (data && data.playerId) {
                console.log(`Player ${data.playerName} (${data.playerId}) has left the lobby`);

                // If we're in a game scene, just notify but don't exit
                if (this.scene.scene.key === "Game") {
                    // Create a notification for the player
                    const notification = this.scene.add
                        .text(this.scene.scale.width / 2, 100, `${data.playerName} has left the game.`, {
                            fontFamily: "Arial",
                            fontSize: 20,
                            color: "#ffffff",
                            backgroundColor: "#000000",
                            padding: { x: 15, y: 10 },
                        })
                        .setOrigin(0.5)
                        .setScrollFactor(0)
                        .setDepth(1000);

                    // Fade out after a few seconds
                    this.scene.tweens.add({
                        targets: notification,
                        alpha: 0,
                        delay: 3000,
                        duration: 1000,
                        onComplete: () => notification.destroy(),
                    });
                }
            }
        });

        this.scene.socket.on("playerFinished", data => {
            if (data && data.playerId && data.playerId !== this.scene.socket.id) {
                console.log(`Other player ${data.playerId} has finished the level`);

                // Add this player to the finished players list
                if (!this.scene.playersFinished) {
                    this.scene.playersFinished = {};
                }
                this.scene.playersFinished[data.playerId] = true;

                // Show a visual indication that the other player has finished
                if (this.scene.otherPlayers && this.scene.otherPlayers[data.playerId]) {
                    const otherPlayer = this.scene.otherPlayers[data.playerId];
                    if (otherPlayer.sprite) {
                        // Create a finish effect at other player's position
                        if (typeof this.scene.createFinishEffect === "function") {
                            this.scene.createFinishEffect(otherPlayer.x, otherPlayer.y);
                        }

                        // Fade out the other player
                        this.scene.tweens.add({
                            targets: otherPlayer.sprite,
                            alpha: 0.3,
                            scale: 1.2,
                            duration: 500,
                            ease: "Power2",
                        });

                        // Fade out their name
                        if (otherPlayer.text) {
                            this.scene.tweens.add({
                                targets: otherPlayer.text,
                                alpha: 0.3,
                                duration: 500,
                            });
                        }
                    }
                }

                // Update the UI to show waiting message if we've already finished
                if (this.scene.playersFinished[this.scene.socket.id]) {
                    // If we're already at the finish, update the waiting message
                    if (this.scene.waitingText) {
                        this.scene.waitingText.setText("The other player has also finished!");
                    }
                }

                // Check if all players have now finished
                this.scene.checkAllPlayersFinished();
            }
        });

        this.scene.socket.on("forceLevelChanged", data => {
            if (data && data.lobbyId === this.scene.lobbyId && !this.scene.isTransitioning) {
                // Another player has started a level change
                this.scene.isTransitioning = true;

                // Create notification text
                const notification = this.scene.add
                    .text(
                        this.scene.scale.width / 2,
                        this.scene.scale.height / 3,
                        `${data.initiatorName} is changing level to ${data.levelId}...`,
                        {
                            fontFamily: "Arial",
                            fontSize: 28,
                            color: "#ffffff",
                            backgroundColor: "#000000",
                            padding: { x: 20, y: 10 },
                        }
                    )
                    .setOrigin(0.5)
                    .setDepth(999);

                // Follow the other player's level change after a short delay
                this.scene.time.delayedCall(1500, () => {
                    // Destroy the notification before transition
                    if (notification) notification.destroy();

                    if (this.scene && this.scene.scene) {
                        this.scene.scene.start("Game", {
                            socket: this.scene.socket,
                            playerName: this.scene.playerName,
                            levelId: data.levelId,
                            lobbyId: this.scene.lobbyId,
                        });
                    }
                });
            }
        });
        // Handle lobby error event
        this.scene.socket.on("lobbyError", ({ message }) => {
            console.error("Lobby error:", message);
            alert("Lobby error: " + message);

            // Only go to main menu if we're in the game scene
            if (this.scene.scene.key === "Game") {
                this.scene.scene.start("MainMenu");
            }
        });

        // Setup synchronization interval
        if (this.synchronizationInterval) {
            clearInterval(this.synchronizationInterval);
        }

        // Regularly request lobby state to ensure we're in sync
        this.synchronizationInterval = setInterval(() => {
            if (this.scene && this.scene.socket && this.scene.socket.connected && this.scene.lobbyId) {
                console.log("Requesting lobby state sync for:", this.scene.lobbyId);
                this.scene.socket.emit("requestLobbyState", { lobbyId: this.scene.lobbyId });
            }
        }, 5000); // Request sync every 5 seconds
    }

    updateGameState(lobby) {
        if (!lobby || !lobby.players) {
            return;
        }

        // Only proceed if we're in the Game scene
        if (this.scene.scene.key !== "Game") {
            return;
        }

        // Make sure we have the otherPlayers object
        if (!this.scene.otherPlayers) {
            this.scene.otherPlayers = {};
        }

        // Check if this is a first join for this client (new players added)
        const hadNoPlayersBeforeUpdate = Object.keys(this.scene.otherPlayers).length === 0;
        let newPlayerJoined = false;

        // Remove players no longer in game
        Object.keys(this.scene.otherPlayers).forEach(id => {
            if (!lobby.players[id] || id === this.scene.socket.id) {
                if (this.scene.otherPlayers[id]) {
                    this.scene.otherPlayers[id].destroy();
                    delete this.scene.otherPlayers[id];
                    delete this.lastReceivedUpdate[id];
                }
            }
        });

        // Add new players and update existing ones
        Object.keys(lobby.players).forEach(playerId => {
            // Skip our own player
            if (playerId === this.scene.socket.id) {
                return;
            }

            const playerInfo = lobby.players[playerId];

            if (!this.scene.otherPlayers[playerId]) {
                // New player joined - create them at their reported position
                console.log("Creating new player:", playerInfo.name);
                newPlayerJoined = true;

                try {
                    const posX = playerInfo.x || 230;
                    const posY = playerInfo.y || 550;

                    // Create player with error handling
                    this.scene.otherPlayers[playerId] = new Player(
                        this.scene,
                        posX,
                        posY,
                        playerInfo.name || `Player_${playerId.substring(0, 4)}`,
                        false // Not the main player
                    );

                    // Add collision between other player and platforms
                    if (this.scene.otherPlayers[playerId].sprite && this.scene.platforms) {
                        this.scene.physics.add.collider(this.scene.otherPlayers[playerId].sprite, this.scene.platforms);

                        // Add overlap for jump pads
                        if (this.scene.jumpPads) {
                            this.scene.physics.add.overlap(
                                this.scene.otherPlayers[playerId].sprite,
                                this.scene.jumpPads,
                                this.scene.handleJumpPad,
                                null,
                                this.scene
                            );
                        }
                    }

                    // Set initial animation state
                    if (playerInfo.animation) {
                        this.scene.otherPlayers[playerId].animation = playerInfo.animation;
                    }
                    if (playerInfo.direction) {
                        this.scene.otherPlayers[playerId].direction = playerInfo.direction;
                    }
                } catch (error) {
                    console.warn("Failed to create other player:", error);
                    // Make sure we don't keep a partially created player
                    if (this.scene.otherPlayers[playerId]) {
                        try {
                            this.scene.otherPlayers[playerId].destroy();
                        } catch (e) {
                            // Silent cleanup error
                        }
                        delete this.scene.otherPlayers[playerId];
                    }
                }
            } else {
                // Update existing player with lobby data
                this.updateOtherPlayer({
                    id: playerId,
                    name: playerInfo.name,
                    x: playerInfo.x,
                    y: playerInfo.y,
                    animation: playerInfo.animation || "idle",
                    direction: playerInfo.direction || "right",
                });
            }
        });

        // If we've just transitioned from having no players to having players
        // (new player joined) or we had no players and we're first joining others,
        // ensure we don't duplicate the music
        if (newPlayerJoined && hadNoPlayersBeforeUpdate && this.scene.levelManager) {
            // Get current level settings
            const levelSettings = this.scene.levelManager.getLevelSettings(this.scene.levelId);
            if (levelSettings && this.scene.audioManager && this.scene.levelMusic) {
                console.log("Re-syncing audio for player join event");

                // Make sure we don't restart music that's already playing
                // We set forcePlay to false to avoid duplicating music
                this.scene.levelMusic = this.scene.audioManager.playMusic(
                    levelSettings.music,
                    true,
                    this.scene.audioManager.musicVolume,
                    false, // Don't stop current
                    false // Don't force play
                );
            }
        }
    }

    syncPlatforms(platformData) {
        if (!this.scene || !this.scene.levelManager) return;

        const movingPlatforms = this.scene.levelManager.getMovingPlatforms() || [];

        // Only sync if we have platforms to sync
        if (movingPlatforms.length > 0 && platformData && platformData.length === movingPlatforms.length) {
            movingPlatforms.forEach((platformObj, index) => {
                if (index >= platformData.length) return;

                const syncData = platformData[index];
                const platform = platformObj.platform;

                if (platform && platform.body) {
                    // Only apply sync if position difference is significant (avoid minor corrections)
                    const positionDifference = Math.abs(platform.x - syncData.x) + Math.abs(platform.y - syncData.y);

                    if (positionDifference > 15) {
                        // Use tweens for smooth visual transition to synced position
                        this.scene.tweens.add({
                            targets: platform,
                            x: syncData.x,
                            y: syncData.y,
                            duration: 300, // Smooth over 300ms
                            ease: "Power1",
                        });

                        // Update velocity to match the synced platform
                        platform.body.velocity.x = syncData.velocityX;
                        platform.body.velocity.y = syncData.velocityY;

                        // Set platform's motion phase to match remote state
                        if (platformObj.motion === "horizontal") {
                            platform.platformData.phase = syncData.phase || 0;
                        } else if (platformObj.motion === "vertical") {
                            platform.platformData.phase = syncData.phase || 0;
                        }
                    }
                }
            });

            // Schedule next sync check
            if (!this.platformSyncTimer) {
                this.platformSyncTimer = this.scene.time.addEvent({
                    delay: 2000, // Check sync every 2 seconds
                    callback: this.requestPlatformSync,
                    callbackScope: this,
                });
            }
        }
    }

    requestPlatformSync() {
        if (this.scene && this.scene.socket && this.scene.socket.connected && this.scene.lobbyId) {
            this.scene.socket.emit("requestPlatformSync", {
                lobbyId: this.scene.lobbyId,
            });
        }
    }

    updateMovingPlatforms(time) {
        if (!this.movingPlatforms) return;

        this.movingPlatforms.forEach(({ platform, motion, range, speed, baseX, baseY }) => {
            if (!platform || !platform.body) return;

            // Calculate normalized phase value (0-1) for sync purposes
            const normalizedTime = (time % speed) / speed;
            platform.platformData = platform.platformData || {};
            platform.platformData.phase = normalizedTime;

            // Use sine wave based on normalized time for smoother and more predictable movement
            if (motion === "vertical") {
                const newY = baseY + Math.sin(normalizedTime * Math.PI * 2) * range;
                platform.setY(newY);
                platform.body.velocity.y =
                    Math.cos(normalizedTime * Math.PI * 2) * range * ((Math.PI * 2) / speed) * 1000;
                platform.body.velocity.x = 0;
            } else if (motion === "horizontal") {
                const newX = baseX + Math.sin(normalizedTime * Math.PI * 2) * range;
                platform.setX(newX);
                platform.body.velocity.x =
                    Math.cos(normalizedTime * Math.PI * 2) * range * ((Math.PI * 2) / speed) * 1000;
                platform.body.velocity.y = 0;
            }

            // Make sure the physics body is updated
            platform.body.updateFromGameObject();
        });
    }

    updateOtherPlayer(playerInfo) {
        if (!playerInfo || !playerInfo.id) {
            console.error("Invalid player info:", playerInfo);
            return;
        }

        if (playerInfo.id === this.scene.socket.id) {
            // Don't update ourselves
            return;
        }

        // If we have this player in our list
        if (this.scene.otherPlayers && this.scene.otherPlayers[playerInfo.id]) {
            const otherPlayer = this.scene.otherPlayers[playerInfo.id];

            // Update the player's position and state
            if (typeof otherPlayer.moveTo === "function") {
                otherPlayer.moveTo(
                    playerInfo.x,
                    playerInfo.y,
                    playerInfo.animation || otherPlayer.animation || "idle",
                    playerInfo.direction || otherPlayer.direction || "right"
                );
            } else {
                console.error("Player object is missing moveTo method:", otherPlayer);
            }
        } else if (this.scene.scene.key === "Game" && playerInfo.x !== undefined && playerInfo.y !== undefined) {
            // We don't have this player yet but we have position data, so create them
            console.log("Creating missing player from update:", playerInfo.id);

            if (!this.scene.otherPlayers) {
                this.scene.otherPlayers = {};
            }

            this.scene.otherPlayers[playerInfo.id] = new Player(
                this.scene,
                playerInfo.x,
                playerInfo.y,
                playerInfo.name || `Player_${playerInfo.id.substring(0, 4)}`,
                false
            );

            // Add collision between the new player and platforms
            if (this.scene.otherPlayers[playerInfo.id].sprite && this.scene.platforms) {
                this.scene.physics.add.collider(this.scene.otherPlayers[playerInfo.id].sprite, this.scene.platforms);

                // Add overlap for jump pads
                if (this.scene.jumpPads) {
                    this.scene.physics.add.overlap(
                        this.scene.otherPlayers[playerInfo.id].sprite,
                        this.scene.jumpPads,
                        this.scene.handleJumpPad,
                        null,
                        this.scene
                    );
                }
            }
        } else {
            console.warn("Cannot update non-existent player:", playerInfo.id);
            // Request lobby state to try to get complete player info
            if (this.scene.socket && this.scene.socket.connected && this.scene.lobbyId) {
                this.scene.socket.emit("requestLobbyState", { lobbyId: this.scene.lobbyId });
            }
        }
    }

    // Method to clean up resources when leaving the scene
    shutdown() {
        if (this.synchronizationInterval) {
            clearInterval(this.synchronizationInterval);
            this.synchronizationInterval = null;
        }

        // Remove socket listeners to prevent memory leaks
        if (this.scene.socket) {
            this.scene.socket.off("timerSync");
            this.scene.socket.off("playerFinished"); // Make sure to remove this listener
            this.scene.socket.off("lobbyState");
            this.scene.socket.off("playerMoved");
            this.scene.socket.off("gameStart");
            this.scene.socket.off("lobbyError");
        }

        this.lastReceivedUpdate = {};
    }

    // Method to send player position updates to the server
    sendPlayerUpdate() {
        if (!this.scene || !this.scene.socket || !this.scene.connected || !this.scene.lobbyId) {
            return;
        }

        // Only send updates if we have a valid player
        if (this.scene.player) {
            this.scene.socket.emit("playerUpdate", {
                lobbyId: this.scene.lobbyId,
                x: this.scene.player.x,
                y: this.scene.player.y,
                animation: this.scene.player.animation,
                direction: this.scene.player.direction,
                levelId: this.scene.levelId,
                timestamp: Date.now(),
            });
        }
    }
}
