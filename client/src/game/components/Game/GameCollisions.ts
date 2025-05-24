import { Player } from "@/entities/Player";
import { Game } from "@/scenes/Game"
import { Socket } from "socket.io-client";

type PhysicsCollisionObject = Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile;

interface JumpPadSprite extends Phaser.Physics.Arcade.Sprite {
    cooldown?: boolean;
}

interface PlayerSprite extends Phaser.Physics.Arcade.Sprite {
    invulnerable?: boolean;
    playerRef?: Player;
    // Moving platform properties
    platformRelativePosition?: number | null;
    previousX?: number | null;
    inputVelocityX?: number | null;
    isOnMovingPlatform?: boolean;
    wasOnMovingPlatform?: boolean;
}

interface SpikeSprite extends Phaser.Physics.Arcade.Sprite {
}


export class GameCollisions {
    scene: Game;
    movingPlatforms: Phaser.GameObjects.Group | null = null;
    levelMusic: Phaser.Sound.BaseSound | null = null;
    socket: Socket | null = null;
    levelId: string | null = null;
    playerName: string | null = null;
    lobbyId: string | null = null;
    
    constructor(scene: Game, socket: Socket | null, levelId: string | null, playerName: string | null, lobbyId: string | null) {
        this.scene = scene;
        this.socket = socket;
        this.levelId = levelId;
        this.playerName = playerName;
        this.lobbyId = lobbyId;
    }

    setupCollisions(
        player: Player,
        platforms: Phaser.Physics.Arcade.StaticGroup,
        jumpPads: Phaser.Physics.Arcade.StaticGroup,
        finishObject: Phaser.GameObjects.Group | null,
        movingPlatforms: Phaser.GameObjects.Group | null,
        spikes: Phaser.Physics.Arcade.StaticGroup | null,
        portals: Phaser.Physics.Arcade.Group | null
    ) {
        if (!this.scene.physics) return;

        // Add collision between player and platforms
        if (player?.sprite && platforms) {
            this.scene.physics.add.collider(player.sprite, platforms);
        }

        // Add collision with jump pads and special effect
        if (player?.sprite && jumpPads) {
            this.scene.physics.add.overlap(player.sprite, jumpPads, this.handleJumpPad, this.processJumpPadCollision, this);
        }

        // Set up physics overlap with finish line if it exists
        if (
            player?.sprite &&
            finishObject?.getChildren &&
            finishObject.getChildren().length > 0
        ) {
            this.scene.physics.add.overlap(player.sprite, finishObject, this.scene.handleFinish, undefined, this.scene);
        }

        // Add collision with moving platforms
        if (player?.sprite && movingPlatforms) {
            this.scene.physics.add.collider(
                player.sprite,
                movingPlatforms,
                this.handleMovingPlatformCollision,
                undefined,
                this
            );
        }

        // Add collision with spikes - with additional check
        if (player?.sprite && spikes?.getChildren && spikes.getChildren().length > 0) {
            this.scene.physics.add.overlap(player.sprite, spikes, this.handleSpikeCollision, this.processSpikeCollision, this);
        }

        // Add collision with portals
        if (player?.sprite && portals?.getChildren && portals.getChildren().length > 0) {
            this.scene.physics.add.overlap(player.sprite, portals, this.handlePortalCollision, undefined, this);
        }

        this.movingPlatforms = movingPlatforms;
    }

    setupOtherPlayerCollisions(otherPlayer: Player,
        platforms: Phaser.Physics.Arcade.StaticGroup,
        jumpPads: Phaser.Physics.Arcade.Group,
        movingPlatforms: Phaser.GameObjects.Group
    ) {
        if (!this.scene.physics) return;

        // Add collision between other player and platforms
        if (otherPlayer?.sprite && platforms) {
            this.scene.physics.add.collider(otherPlayer.sprite, platforms);

            // Add overlap for jump pads
            if (jumpPads) {
                this.scene.physics.add.overlap(otherPlayer.sprite, jumpPads, this.handleJumpPad, undefined, this.scene);
            }

            if (this.movingPlatforms) {
                this.scene.physics.add.collider(
                    otherPlayer.sprite,
                    movingPlatforms,
                    this.handleMovingPlatformCollision,
                    undefined,
                    this
                );
            }
        }
    }

    handleJumpPad = (
        object1: PhysicsCollisionObject,
        object2: PhysicsCollisionObject
    ): void => {
        try {
            // Type guard to ensure we have game objects with bodies
            if (!this.isGameObjectWithBody(object1) || !this.isGameObjectWithBody(object2)) {
                console.warn("Jump pad collision: Invalid object types");
                return;
            }

            // Type guard and extract sprites
            const playerSprite = object1 as PlayerSprite;
            const jumpPadSprite = object2 as JumpPadSprite;

            // Check if sprites have physics bodies
            if (!playerSprite.body || !jumpPadSprite.body) {
                console.warn("Missing physics bodies in jump pad collision");
                return;
            }

            // Cast bodies to arcade bodies for proper typing
            const playerBody = playerSprite.body as Phaser.Physics.Arcade.Body;

            // Since processJumpPadCollision already validated all conditions,
            // we can directly apply the jump effect here

            // Apply jump force
            playerBody.setVelocityY(-5300);

            // Visual feedback for the jump pad
            this.scene.tweens?.add({
                targets: jumpPadSprite,
                scaleY: 0.8,
                duration: 100,
                yoyo: true,
                ease: "Power1",
            });

            // Set cooldown
            jumpPadSprite.cooldown = true;
            this.scene.time.delayedCall(500, () => {
                jumpPadSprite.cooldown = false;
            });

            // Play jump pad sound effect if available
            try {
                if (this.scene.audioManager && typeof this.scene.audioManager.playSfx === 'function') {
                    this.scene.audioManager.playSfx("jump_pad", 0.7);
                }
            } catch (error) {
                console.warn("Could not play jump pad sound:", error);
            }

            console.log("Jump pad activated!");

        } catch (error) {
            console.error("Error in handleJumpPad:", error);
        }
    };

    processJumpPadCollision = (
        object1: PhysicsCollisionObject,
        object2: PhysicsCollisionObject
    ): boolean => {
        // Type guard to ensure we have game objects with bodies
        if (!this.isGameObjectWithBody(object1) || !this.isGameObjectWithBody(object2)) {
            return false;
        }

        const playerSprite = object1 as PlayerSprite;
        const jumpPadSprite = object2 as JumpPadSprite;

        // Don't process if either object doesn't have a body
        if (!playerSprite.body || !jumpPadSprite.body) {
            return false;
        }

        // Don't process if jump pad is on cooldown
        if (jumpPadSprite.cooldown) {
            return false;
        }

        const playerBody = playerSprite.body as Phaser.Physics.Arcade.Body;
        const jumpPadBody = jumpPadSprite.body as Phaser.Physics.Arcade.Body;

        // Use Phaser's built-in overlap checking for more reliable collision detection
        const isActuallyTouching = this.scene.physics.overlap(playerSprite, jumpPadSprite);

        if (!isActuallyTouching) {
            return false;
        }

        // Calculate collision positions and direction
        const playerBottom = playerSprite.y + playerBody.height / 2;
        const padTop = jumpPadSprite.y - jumpPadBody.height / 2;

        // Check if player is approaching from above
        const isAbove = playerBottom <= padTop + 15; // Slightly more lenient
        const isFalling = playerBody.velocity.y > 25; // Increased minimum falling speed for more intentional activation

        // Check if player is horizontally aligned with the jump pad
        const playerCenterX = playerSprite.x;
        const padCenterX = jumpPadSprite.x;
        const horizontalDistance = Math.abs(playerCenterX - padCenterX);
        const isHorizontallyAligned = horizontalDistance < (jumpPadBody.width / 2) + 10;

        // Additional check: don't activate if player is moving upward too fast (prevents double jumps)
        const isNotMovingUpTooFast = playerBody.velocity.y > -50; // Made less restrictive

        // Log for debugging (you can remove this in production)
        console.log("Jump pad process check:", {
            isAbove,
            isFalling,
            isHorizontallyAligned,
            isNotMovingUpTooFast,
            playerVelY: playerBody.velocity.y,
            horizontalDistance,
            cooldown: jumpPadSprite.cooldown,
            touching: isActuallyTouching
        });

        // Only process collision if all conditions are met
        return isAbove && isFalling && isHorizontallyAligned && isNotMovingUpTooFast;
    };

    handleSpikeCollision = (
        object1: PhysicsCollisionObject,
        object2: PhysicsCollisionObject
    ): void => {
        try {
            // Type guard to ensure we have game objects with bodies
            if (!this.isGameObjectWithBody(object1) || !this.isGameObjectWithBody(object2)) {
                console.warn("Spike collision: Invalid object types");
                return;
            }

            // Type guard and extract sprites
            const playerSprite = object1 as PlayerSprite;
            const spike = object2 as SpikeSprite;

            // Comprehensive null/undefined checks
            if (!playerSprite || !spike || !this.scene) {
                console.warn("handleSpikeCollision: Missing required parameters", {
                    playerSprite: !!playerSprite,
                    spike: !!spike,
                    scene: !!this.scene
                });
                return;
            }
        
            // Prevent multiple collisions in quick succession
            if (playerSprite.invulnerable) return;
        
            console.log("Player hit spike - applying time penalty!");
        
            // Default penalty (increased in instant death mode)
            const penaltySeconds = this.scene.instantDeathMode ? 30 : 15;
        
            // Make player briefly invulnerable to prevent multiple hits
            playerSprite.invulnerable = true;
        
            // Visual feedback for spike hit - with null checks
            if (this.scene.tweens?.add) {
                this.scene.tweens.add({
                    targets: playerSprite,
                    alpha: 0.5,
                    duration: 100,
                    yoyo: true,
                    repeat: 2,
                    onComplete: () => {
                        try {
                            // Remove invulnerability after the visual effect
                            if (this.scene?.time?.delayedCall) {
                                this.scene.time.delayedCall(1500, () => {
                                    if (playerSprite) {
                                        playerSprite.invulnerable = false;
                                    }
                                });
                            } else {
                                // Fallback using setTimeout if scene.time is not available
                                setTimeout(() => {
                                    if (playerSprite) {
                                        playerSprite.invulnerable = false;
                                    }
                                }, 1500);
                            }
                        } catch (error) {
                            console.error("Error in spike collision onComplete callback:", error);
                            // Ensure invulnerability is removed even if there's an error
                            if (playerSprite) {
                                playerSprite.invulnerable = false;
                            }
                        }
                    },
                });
            } else {
                console.warn("Scene tweens not available for spike collision feedback");
                // Fallback: just remove invulnerability after delay
                setTimeout(() => {
                    if (playerSprite) {
                        playerSprite.invulnerable = false;
                    }
                }, 1500);
            }
        
            // Play a spike hit sound if available - with enhanced error handling
            try {
                if (this.scene.audioManager && typeof this.scene.audioManager.playSfx === 'function') {
                    this.scene.audioManager.playSfx("spike_hit", 0.5);
                } else if (this.scene.sound?.add) {
                    const hitSound = this.scene.sound.add("spike_hit", { volume: 0.5 });
                    if (hitSound && typeof hitSound.play === 'function') {
                        hitSound.play();
                    }
                }
            } catch (error: any) {
                console.warn("Could not play spike hit sound:", error.message);
            }
        
            // Create hit particles for better visual feedback - with enhanced safety
            try {
                if (this.scene.add?.particles && playerSprite.x !== undefined && playerSprite.y !== undefined) {
                    const particles = this.scene.add.particles(playerSprite.x, playerSprite.y, "particle", {
                        speed: { min: 50, max: 200 },
                        scale: { start: 0.5, end: 0 },
                        quantity: 20,
                        lifespan: 800,
                        blendMode: "ADD",
                        tint: 0xff0000, // Red particles
                    });
                
                    // Auto-destroy the particles with safety checks
                    if (particles && this.scene.time?.delayedCall) {
                        this.scene.time.delayedCall(1000, () => {
                            try {
                                if (typeof particles.destroy === 'function') {
                                    particles.destroy();
                                }
                            } catch (destroyError: any) {
                                console.warn("Error destroying spike particles:", destroyError.message);
                            }
                        });
                    } else if (particles) {
                        // Fallback using setTimeout
                        setTimeout(() => {
                            try {
                                if (typeof particles.destroy === 'function') {
                                    particles.destroy();
                                }
                            } catch (destroyError: any) {
                                console.warn("Error destroying spike particles (fallback):", destroyError.message);
                            }
                        }, 1000);
                    }
                }
            } catch (error: any) {
                console.warn("Could not create spike hit particles:", error.message);
            }
        
            // Apply time penalty through gameTimer - with enhanced safety
            try {
                if (this.scene.gameTimer && typeof this.scene.gameTimer.applyPenalty === 'function') {
                    this.scene.gameTimer.applyPenalty(penaltySeconds);
                
                    // Display penalty text with comprehensive safety checks
                    if (this.scene.add?.text && 
                        playerSprite.x !== undefined && playerSprite.y !== undefined) {
                        
                        const penaltyText = this.scene.add.text(
                            playerSprite.x, 
                            playerSprite.y - 50, 
                            `-${penaltySeconds}s`, 
                            {
                                fontFamily: "Arial",
                                fontSize: "24px",
                                color: "#ff0000",
                                stroke: "#000000",
                                strokeThickness: 4,
                            }
                        );
                    
                        if (penaltyText && typeof penaltyText.setOrigin === 'function') {
                            penaltyText.setOrigin(0.5);
                        }
                    
                        // Animate and destroy the penalty text with safety checks
                        if (penaltyText && this.scene.tweens?.add) {
                            this.scene.tweens.add({
                                targets: penaltyText,
                                y: (penaltyText.y || playerSprite.y - 50) - 80,
                                alpha: 0,
                                duration: 1500,
                                ease: "Power2",
                                onComplete: () => {
                                    try {
                                        if (typeof penaltyText.destroy === 'function') {
                                            penaltyText.destroy();
                                        }
                                    } catch (destroyError: any) {
                                        console.warn("Error destroying penalty text:", destroyError.message);
                                    }
                                },
                            });
                        } else if (penaltyText) {
                            // Fallback: destroy text after delay using setTimeout
                            setTimeout(() => {
                                try {
                                    if (typeof penaltyText.destroy === 'function') {
                                        penaltyText.destroy();
                                    }
                                } catch (destroyError: any) {
                                    console.warn("Error destroying penalty text (fallback):", destroyError.message);
                                }
                            }, 1500);
                        }
                    }
                } else {
                    console.warn("GameTimer not available for applying spike penalty");
                }
            } catch (error: any) {
                console.error("Error applying time penalty:", error.message);
            }
        
        } catch (error) {
            console.error("Critical error in handleSpikeCollision:", error);
            
            // Emergency cleanup: ensure player isn't stuck invulnerable
            try {
                if (this.isGameObjectWithBody(object1)) {
                    setTimeout(() => {
                        (object1 as PlayerSprite).invulnerable = false;
                    }, 2000);
                }
            } catch (cleanupError) {
                console.error("Error in emergency cleanup:", cleanupError);
            }
        }
    };

    processSpikeCollision = (
        object1: PhysicsCollisionObject,
        object2: PhysicsCollisionObject
    ): boolean => {
        // Type guard to ensure we have game objects with bodies
        if (!this.isGameObjectWithBody(object1) || !this.isGameObjectWithBody(object2)) {
            return false;
        }

        const playerSprite = object1 as PlayerSprite;
        const spike = object2 as SpikeSprite;

        // Don't process if player is invulnerable
        if (playerSprite.invulnerable) {
            return false;
        }

        // Don't process if either object doesn't have a body
        if (!playerSprite.body || !spike.body) {
            return false;
        }

        const playerBody = playerSprite.body as Phaser.Physics.Arcade.Body;
        const spikeBody = spike.body as Phaser.Physics.Arcade.Body;

        // Calculate collision direction and overlap
        const playerCenterX = playerSprite.x;
        const playerCenterY = playerSprite.y;
        const spikeCenterX = spike.x;
        const spikeCenterY = spike.y;

        // Check minimum overlap threshold to avoid processing micro-collisions
        const overlapX = Math.min(
            playerBody.right - spikeBody.left,
            spikeBody.right - playerBody.left
        );
        const overlapY = Math.min(
            playerBody.bottom - spikeBody.top,
            spikeBody.bottom - playerBody.top
        );

        // Only process if there's significant overlap (prevents edge cases)
        const minOverlap = 5; // pixels
        if (overlapX < minOverlap || overlapY < minOverlap) {
            return false;
        }

        // Optional: Only damage player if touching spikes from certain directions
        // For example, only from above or sides:
        const playerIsAbove = playerCenterY < spikeCenterY;
        const playerIsFalling = playerBody.velocity.y > 50; // Minimum falling speed

        // Process collision if player is falling onto spikes or touching from sides
        return playerIsAbove || Math.abs(playerCenterX - spikeCenterX) > Math.abs(playerCenterY - spikeCenterY);
    };

    handleMovingPlatformCollision = (
        object1: PhysicsCollisionObject,
        object2: PhysicsCollisionObject
    ): void => {
        // Type guard to ensure we have game objects with bodies
        if (!this.isGameObjectWithBody(object1) || !this.isGameObjectWithBody(object2)) {
            console.warn("Moving platform collision: Invalid object types");
            return;
        }

        // Type guard and extract sprites
        const playerSprite = object1 as PlayerSprite;
        const platform = object2 as Phaser.Physics.Arcade.Sprite;

        // Check if body exists and cast it, then access velocity
        if (!playerSprite.body) {
            console.warn("Player sprite missing physics body in moving platform collision");
            return;
        }

        // Check if body exists and cast it, then access velocity
        if (!platform.body) {
            console.warn("Player sprite missing physics body in moving platform collision");
            return;
        }

        // Extract platform dimensions and positions
        const platformWidth = platform.width;
        const platformHeight = platform.height;
        const platformTop = platform.y - platformHeight / 2;
        const platformLeft = platform.x - platformWidth / 2;
        const platformRight = platform.x + platformWidth / 2;

        // Extract player information
        const playerBottom = playerSprite.y + playerSprite.height / 2;
        const playerIsFalling = playerSprite.body.velocity.y > 0;
        const playerLeft = playerSprite.x - playerSprite.width / 2;
        const playerRight = playerSprite.x + playerSprite.width / 2;

        // Calculate vertical and horizontal distance
        const yDistance = Math.abs(playerBottom - platformTop);
        const isPlayerAbove = playerBottom <= platformTop + 10;

        // Determine if player is horizontally within platform boundaries (with some margin)
        const isHorizontallyAligned = playerRight > platformLeft + 5 && playerLeft < platformRight - 5;

        // Check if player is on the platform
        const isOnPlatform =
            (playerSprite.body.touching.down && platform.body.touching.up) ||
            (isPlayerAbove && isHorizontallyAligned && yDistance < 12 && playerIsFalling);

        // Clear relative position if player is not on any platform
        if ((!isOnPlatform && playerSprite.body.touching.down === false) || playerSprite.body.velocity.y < 0) {
            playerSprite.platformRelativePosition = null;
            playerSprite.previousX = null;
            playerSprite.inputVelocityX = null;
        }

        // Main collision handling logic with improved conditions
        if (isOnPlatform) {
            // If very close to platform but not technically touching, snap player to platform
            if (isPlayerAbove && yDistance < 12 && !playerSprite.body.touching.down) {
                playerSprite.y = platformTop - playerSprite.height / 2;
                playerSprite.body.y = playerSprite.y - playerSprite.height / 2;
                playerSprite.body.velocity.y = 0;
                // Force touching state update
                playerSprite.body.touching.down = true;
                platform.body.touching.up = true;
            }

            // Set horizontal velocity to match platform's motion while preserving player input
            if (platform.body.velocity.x !== 0) {
                // Store player's input-based velocity before applying platform movement
                playerSprite.inputVelocityX ??= 0;

                // Calculate player's input velocity by subtracting platform velocity from total
                // Only update if there's a significant difference to avoid jitter
                const velocityDifference = playerSprite.body.velocity.x - platform.body.velocity.x;
                if (Math.abs(velocityDifference) > 10) {
                    playerSprite.inputVelocityX = velocityDifference;
                }

                // Apply combined velocity (platform + player input)
                playerSprite.body.velocity.x = platform.body.velocity.x + playerSprite.inputVelocityX;

                // Only make small corrective position adjustments if player is drifting off the platform
                // This prevents teleporting while still keeping player on platform
                const playerCenterX = playerSprite.x;
                const platformCenterX = platform.x;

                // Instead of correcting towards center, maintain relative position
                // Store initial relative position when player lands on platform
                playerSprite.platformRelativePosition ??= playerCenterX - platformCenterX;

                // Get player's input-based movement (the difference from the last frame)
                const playerInputMovement = playerSprite.x - (playerSprite.previousX ?? playerSprite.x);

                // Update the relative position based on player input
                if (Math.abs(playerInputMovement) > 0.1) {
                    playerSprite.platformRelativePosition += playerInputMovement;
                }

                // Adjust player position to maintain the relative position plus any input movement
                const targetPosition = platformCenterX + playerSprite.platformRelativePosition;

                // Use lerp for smoothing to reduce flickering
                const lerpFactor = 0.5; // Higher value = less smoothing but more responsive
                playerSprite.x = Phaser.Math.Linear(playerSprite.x, targetPosition, lerpFactor);

                // Store the current position for the next frame
                playerSprite.previousX = playerSprite.x;
            }

            // Handle vertical velocity differently based on platform direction
            if (platform.body.velocity.y !== 0) {
                // When the platform moves down, make the player stick to it
                // When the platform moves up, allow the player to jump off naturally
                if (platform.body.velocity.y > 0) {
                    playerSprite.body.velocity.y = platform.body.velocity.y;
                } else {
                    // If platform is moving up, only apply upward velocity if player is firmly on the platform
                    const playerBottom = playerSprite.body.y + playerSprite.body.height;
                    const platformTop = platform.body.y - platform.body.height / 2;
                    const distanceToTop = Math.abs(playerBottom - platformTop);

                    if (distanceToTop < 5) {
                        playerSprite.body.velocity.y = platform.body.velocity.y;
                    }
                }
            }

            // Mark the player as standing on a moving platform for the next frame
            playerSprite.isOnMovingPlatform = true;
        } else {
            // Player is not touching the platform (or not from above)
            playerSprite.isOnMovingPlatform = false;
        }
    }

    handlePortalCollision = (
        object1: PhysicsCollisionObject,
        object2: PhysicsCollisionObject
    ): void => {
        // Type guard to ensure we have game objects with bodies
        if (!this.isGameObjectWithBody(object1) || !this.isGameObjectWithBody(object2)) {
            console.warn("Portal collision: Invalid object types");
            return;
        }

        // Type guard and extract sprites
        const playerSprite = object1 as PlayerSprite;
        const portal = object2 as Phaser.Physics.Arcade.Sprite;

        // Check if there's a reference to the player on the sprite itself
        const playerRef = playerSprite.playerRef;

        // Log for debugging
        console.log("Portal collision detected", {
            playerSpriteExists: !!playerSprite,
            portalExists: !!portal,
            playerRefExists: !!playerRef,
            hasToggleUfoMode: playerRef && typeof playerRef.toggleUfoMode === "function",
        });

        // Check if we found the player reference
        if (playerRef && typeof playerRef.toggleUfoMode === "function") {
            // Toggle UFO mode using the player reference
            playerRef.toggleUfoMode();
            console.log("Player collided with portal. UFO mode toggled.");

            // Add portal effect
            if (this.scene.tweens) {
                this.scene.tweens.add({
                    targets: portal,
                    scaleX: 1.2,
                    scaleY: 1.2,
                    duration: 100,
                    yoyo: true,
                    repeat: 1,
                    ease: "Power1",
                });
            }

            // Disable portal temporarily to prevent immediate re-triggering
            if (portal.body) {
                portal.body.enable = false;
                this.scene.time.delayedCall(1500, () => {
                    if (portal?.body) portal.body.enable = true;
                });
            }
        } else {
            console.warn("Portal collision failed: Could not find player reference or toggleUfoMode method.");
        }
    };

    // Helper method to check if an object is a GameObjectWithBody
    private isGameObjectWithBody(
        obj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile
    ): obj is Phaser.Types.Physics.Arcade.GameObjectWithBody {
        return obj && typeof (obj as any).x === 'number' && typeof (obj as any).y === 'number' && 'body' in obj;
    }

    handleGameOver(reason = "default") {
        console.log("Game over triggered:", reason);

        // Notify server that this player has game over
        if (this.socket?.connected && this.lobbyId) {
            this.socket.emit("playerGameOver", {
                lobbyId: this.lobbyId,
                reason: reason,
            });
        }

        // Stop music with fade out if it exists
        if (this.levelMusic) {
            this.scene.tweens.add({
                targets: this.levelMusic,
                volume: 0,
                duration: 1000,
                onComplete: () => {
                    this.levelMusic?.stop();

                    // Navigate to Game Over scene
                    this.scene.scene.start("GameOver", {
                        levelId: this.levelId,
                        playerName: this.playerName,
                        socket: this.socket,
                        lobbyId: this.lobbyId,
                        reason: reason,
                    });
                },
            });
        } else {
            // No music to fade, switch immediately
            this.scene.scene.start("GameOver", {
                levelId: this.levelId,
                playerName: this.playerName,
                socket: this.socket,
                lobbyId: this.lobbyId,
                reason: reason,
            });
        }
    }
}
