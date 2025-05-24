import { Player } from '../../entities/Player';
import { Game } from '../../scenes/Game';
import { Socket } from 'socket.io-client';

type PhysicsCollisionObject =
    | Phaser.Types.Physics.Arcade.GameObjectWithBody
    | Phaser.Physics.Arcade.Body
    | Phaser.Physics.Arcade.StaticBody
    | Phaser.Tilemaps.Tile;

interface JumpPadSprite extends Phaser.Physics.Arcade.Sprite {
    cooldown?: boolean;
}

interface PlayerSprite extends Phaser.Physics.Arcade.Sprite {
    invulnerable?: boolean;
    playerRef: Player;
    // Moving platform properties
    platformRelativePosition?: number | null;
    previousX?: number | null;
    inputVelocityX?: number | null;
    isOnMovingPlatform?: boolean;
    wasOnMovingPlatform?: boolean;
}

export class GameCollisions {
    scene: Game;
    movingPlatforms: Phaser.GameObjects.Group | null = null;
    levelMusic: Phaser.Sound.BaseSound | null = null;
    socket: Socket | null = null;
    levelId: string | null = null;
    playerName: string | null = null;
    lobbyId: string | null = null;

    constructor(
        scene: Game,
        socket: Socket | null,
        levelId: string | null,
        playerName: string | null,
        lobbyId: string | null
    ) {
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
        finishObject: Phaser.GameObjects.Group,
        movingPlatforms: Phaser.GameObjects.Group,
        spikes: Phaser.Physics.Arcade.StaticGroup,
        portals: Phaser.Physics.Arcade.StaticGroup | null
    ): void {
        if (!this.scene.physics) return;

        // Add collision between player and platforms
        if (player?.sprite && platforms) {
            this.scene.physics.add.collider(player.sprite, platforms);
        }

        // Add collision with jump pads and special effect
        if (player?.sprite && jumpPads) {
            this.scene.physics.add.overlap(
                player.sprite,
                jumpPads,
                this.handleJumpPad,
                this.processJumpPadCollision,
                this
            );
        }

        // Set up physics overlap with finish line if it exists
        if (
            player?.sprite &&
            finishObject?.getChildren &&
            finishObject.getChildren().length > 0
        ) {
            this.scene.physics.add.overlap(
                player.sprite,
                finishObject,
                this.scene.handleFinish,
                undefined,
                this.scene
            );
        }

        // Add collision with moving platforms
        if (player?.sprite && movingPlatforms) {
            this.scene.physics.add.collider(
                player.sprite,
                movingPlatforms,
                this.handleMovingPlatformCollision,
                this.processMovingPlatformCollision,
                this
            );
        }

        // Add collision with spikes - with additional check
        if (player?.sprite && spikes?.getChildren && spikes.getChildren().length > 0) {
            this.scene.physics.add.overlap(
                player.sprite,
                spikes,
                this.handleSpikeCollision,
                this.processSpikeCollision,
                this
            );
        }

        // Add collision with portals
        if (player?.sprite && portals?.getChildren && portals.getChildren().length > 0) {
            this.scene.physics.add.overlap(
                player.sprite,
                portals,
                this.handlePortalCollision,
                this.processPortalCollision,
                this
            );
        }

        this.movingPlatforms = movingPlatforms;
    }

    setupOtherPlayerCollisions(
        otherPlayer: Player,
        platforms: Phaser.Physics.Arcade.StaticGroup,
        jumpPads: Phaser.Physics.Arcade.Group,
        movingPlatforms: Phaser.GameObjects.Group
    ): void {
        if (!this.scene.physics) return;

        // Add collision between other player and platforms
        if (otherPlayer?.sprite && platforms) {
            this.scene.physics.add.collider(otherPlayer.sprite, platforms);

            // Add overlap for jump pads
            if (jumpPads) {
                this.scene.physics.add.overlap(
                    otherPlayer.sprite,
                    jumpPads,
                    this.handleJumpPad,
                    undefined,
                    this.scene
                );
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

    // Shared validation helper
    private validateJumpPadCollision(
        object1: PhysicsCollisionObject,
        object2: PhysicsCollisionObject
    ) {
        if (!this.isGameObjectWithBody(object1) || !this.isGameObjectWithBody(object2)) {
            return null;
        }

        const playerSprite = object1 as PlayerSprite;
        const jumpPadSprite = object2 as JumpPadSprite;

        if (!playerSprite.body || !jumpPadSprite.body) {
            return null;
        }

        return {
            playerSprite,
            jumpPadSprite,
            playerBody: playerSprite.body as Phaser.Physics.Arcade.Body,
            jumpPadBody: jumpPadSprite.body as Phaser.Physics.Arcade.Body
        };
    }

    handleJumpPad = (object1: PhysicsCollisionObject, object2: PhysicsCollisionObject): void => {
        const validation = this.validateJumpPadCollision(object1, object2);
        if (!validation) return;

        const { playerBody, jumpPadSprite } = validation;

        // Apply jump effect (process callback already validated conditions)
        playerBody.setVelocityY(-5300);

        // Visual and audio feedback
        this.scene.tweens?.add({
            targets: jumpPadSprite,
            scaleY: 0.8,
            duration: 100,
            yoyo: true,
            ease: 'Power1'
        });

        // Set cooldown
        jumpPadSprite.cooldown = true;
        this.scene.time.delayedCall(250, () => {
            jumpPadSprite.cooldown = false;
        });

        // Play sound with safe error handling
        this.scene.audioManager?.playSfx?.('jumppad', 0.7);
        console.log('Jump pad activated!');
    };

    processJumpPadCollision = (
        object1: PhysicsCollisionObject,
        object2: PhysicsCollisionObject
    ): boolean => {
        const validation = this.validateJumpPadCollision(object1, object2);
        if (!validation) return false;

        const { playerSprite, jumpPadSprite, playerBody, jumpPadBody } = validation;

        // Quick checks first
        if (jumpPadSprite.cooldown || !this.scene.physics.overlap(playerSprite, jumpPadSprite)) {
            return false;
        }

        // Position calculations
        const playerBottom = playerSprite.y + playerBody.height / 2;
        const padTop = jumpPadSprite.y - jumpPadBody.height / 2;
        const padBottom = jumpPadSprite.y + jumpPadBody.height / 2;

        // Simplified conditions
        const isAbove = playerBottom <= padBottom + 10;
        const standingOnPad = playerBottom >= padTop;
        const isAligned =
            Math.abs(playerSprite.x - jumpPadSprite.x) < jumpPadBody.width / 2 + 15;

        return isAbove && !standingOnPad && isAligned;
    };

    // Shared validation helper for spike collisions
    private validateSpikeCollision(
        object1: PhysicsCollisionObject,
        object2: PhysicsCollisionObject
    ) {
        if (!this.isGameObjectWithBody(object1) || !this.isGameObjectWithBody(object2)) {
            return null;
        }

        const playerSprite = object1 as PlayerSprite;
        const spike = object2 as Phaser.Physics.Arcade.Sprite;

        if (!playerSprite.body || !spike.body || playerSprite.invulnerable) {
            return null;
        }

        return { playerSprite, spike };
    }

    // Helper method for safe delayed calls
    private safeDelayedCall(callback: () => void, delay: number) {
        if (this.scene?.time?.delayedCall) {
            this.scene.time.delayedCall(delay, callback);
        } else {
            setTimeout(callback, delay);
        }
    }

    // Helper method for safe object destruction
    private safeDestroy(obj: Phaser.GameObjects.Particles.ParticleEmitter | Phaser.GameObjects.Text, errorMessage: string) {
        try {
            if (obj && typeof obj.destroy === 'function') {
                obj.destroy();
            }
        } catch (error) {
            console.warn(errorMessage, error);
        }
    }

    handleSpikeCollision = (
        object1: PhysicsCollisionObject,
        object2: PhysicsCollisionObject
    ): void => {
        const validation = this.validateSpikeCollision(object1, object2);
        if (!validation) return;

        const { playerSprite } = validation;
        const penaltySeconds = this.scene.instantDeathMode ? 30 : 15;

        console.log('Player hit spike - applying time penalty!');

        // Make player invulnerable and apply visual feedback
        playerSprite.invulnerable = true;

        this.scene.tweens?.add({
            targets: playerSprite,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                this.safeDelayedCall(() => {
                    if (playerSprite) playerSprite.invulnerable = false;
                }, 1500);
            }
        });

        // Play sound effect
        if (!this.scene.audioManager?.playSfx?.('spike_hit', 0.5)) {
            this.scene.sound?.play?.('spike_hit', { volume: 0.5 });
        }

        // Create particles
        if (this.scene.add?.particles) {
            const particles = this.scene.add.particles(
                playerSprite.x,
                playerSprite.y,
                'particle',
                {
                    speed: { min: 50, max: 200 },
                    scale: { start: 0.5, end: 0 },
                    quantity: 20,
                    lifespan: 800,
                    blendMode: 'ADD',
                    tint: 0xff0000
                }
            );

            this.safeDelayedCall(
                () => this.safeDestroy(particles, 'Error destroying spike particles'),
                1000
            );
        }

        // Apply penalty and show text
        if (this.scene.gameTimer?.applyPenalty) {
            this.scene.gameTimer.applyPenalty(penaltySeconds);

            const penaltyText = this.scene.add?.text?.(
                playerSprite.x,
                playerSprite.y - 50,
                `-${penaltySeconds}s`,
                {
                    fontFamily: 'Arial',
                    fontSize: '24px',
                    color: '#ff0000',
                    stroke: '#000000',
                    strokeThickness: 4
                }
            );

            if (penaltyText) {
                penaltyText.setOrigin?.(0.5);

                this.scene.tweens?.add({
                    targets: penaltyText,
                    y: penaltyText.y - 80,
                    alpha: 0,
                    duration: 1500,
                    ease: 'Power2',
                    onComplete: () =>
                        this.safeDestroy(penaltyText, 'Error destroying penalty text')
                });
            }
        }
    };

    processSpikeCollision = (
        object1: PhysicsCollisionObject,
        object2: PhysicsCollisionObject
    ): boolean => {
        const validation = this.validateSpikeCollision(object1, object2);
        if (!validation) return false;

        const { playerSprite, spike } = validation;
        const playerBody = playerSprite.body as Phaser.Physics.Arcade.Body;
        const spikeBody = spike.body as Phaser.Physics.Arcade.Body;

        // Check minimum overlap threshold
        const overlapX = Math.min(
            playerBody.right - spikeBody.left,
            spikeBody.right - playerBody.left
        );
        const overlapY = Math.min(
            playerBody.bottom - spikeBody.top,
            spikeBody.bottom - playerBody.top
        );

        if (overlapX < 5 || overlapY < 5) return false;

        // Simple directional check
        const playerIsAbove = playerSprite.y < spike.y;
        const horizontalCollision =
            Math.abs(playerSprite.x - spike.x) > Math.abs(playerSprite.y - spike.y);

        return playerIsAbove || horizontalCollision;
    };

    // Shared validation helper for moving platform collisions
    private validateMovingPlatformCollision(
        object1: PhysicsCollisionObject,
        object2: PhysicsCollisionObject
    ) {
        if (!this.isGameObjectWithBody(object1) || !this.isGameObjectWithBody(object2)) {
            return null;
        }

        const playerSprite = object1 as PlayerSprite;
        const platform = object2 as Phaser.Physics.Arcade.Sprite;

        if (!playerSprite.body || !platform.body) {
            return null;
        }

        return {
            playerSprite,
            platform,
            playerBody: playerSprite.body as Phaser.Physics.Arcade.Body,
            platformBody: platform.body as Phaser.Physics.Arcade.Body
        };
    }

    handleMovingPlatformCollision = (
        object1: PhysicsCollisionObject,
        object2: PhysicsCollisionObject
    ): void => {
        const validation = this.validateMovingPlatformCollision(object1, object2);
        if (!validation) return;

        const { playerSprite, platform, playerBody, platformBody } = validation;

        // Calculate platform bounds
        const platformTop = platform.y - platform.height / 2;
        // const platformCenterX = platform.x;

        // Clear platform state if not on platform or jumping
        if (!playerBody.touching.down && playerBody.velocity.y < 0) {
            this.clearPlatformState(playerSprite);
            playerSprite.isOnMovingPlatform = false;
            return;
        }

        // Snap player to platform if very close
        const playerBottom = playerSprite.y + playerSprite.height / 2;
        const yDistance = Math.abs(playerBottom - platformTop);
        if (yDistance < 12 && !playerBody.touching.down) {
            this.snapToplatform(playerSprite, platform, platformTop);
        }

        // Handle horizontal movement
        if (platformBody.velocity.x !== 0) {
            this.handleHorizontalPlatformMovement(playerSprite, platform, platformBody);
        }

        // Handle vertical movement
        if (platformBody.velocity.y !== 0) {
            this.handleVerticalPlatformMovement(playerSprite, platform, platformBody);
        }

        playerSprite.isOnMovingPlatform = true;
    };

    // Helper methods for cleaner code
    private clearPlatformState(playerSprite: PlayerSprite): void {
        playerSprite.platformRelativePosition = null;
        playerSprite.previousX = null;
        playerSprite.inputVelocityX = null;
    }

    private snapToplatform(
        playerSprite: PlayerSprite,
        platform: Phaser.Physics.Arcade.Sprite,
        platformTop: number
    ): void {
        const playerBody = playerSprite.body as Phaser.Physics.Arcade.Body;
        const platformBody = platform.body as Phaser.Physics.Arcade.Body;

        playerSprite.y = platformTop - playerSprite.height / 2;
        playerBody.y = playerSprite.y - playerSprite.height / 2;
        playerBody.velocity.y = 0;
        playerBody.touching.down = true;
        platformBody.touching.up = true;
    }

    private handleHorizontalPlatformMovement(
        playerSprite: PlayerSprite,
        platform: Phaser.Physics.Arcade.Sprite,
        platformBody: Phaser.Physics.Arcade.Body
    ): void {
        const playerBody = playerSprite.body as Phaser.Physics.Arcade.Body;

        // Initialize input velocity
        playerSprite.inputVelocityX ??= 0;

        // Calculate player input velocity
        const velocityDifference = playerBody.velocity.x - platformBody.velocity.x;
        if (Math.abs(velocityDifference) > 10) {
            playerSprite.inputVelocityX = velocityDifference;
        }

        // Apply combined velocity
        playerBody.velocity.x = platformBody.velocity.x + playerSprite.inputVelocityX;

        // Maintain relative position
        playerSprite.platformRelativePosition ??= playerSprite.x - platform.x;

        const playerInputMovement = playerSprite.x - (playerSprite.previousX ?? playerSprite.x);
        if (Math.abs(playerInputMovement) > 0.1) {
            playerSprite.platformRelativePosition += playerInputMovement;
        }

        // Smooth position adjustment
        const targetPosition = platform.x + playerSprite.platformRelativePosition;
        playerSprite.x = Phaser.Math.Linear(playerSprite.x, targetPosition, 0.5);
        playerSprite.previousX = playerSprite.x;
    }

    private handleVerticalPlatformMovement(
        playerSprite: PlayerSprite,
        platform: Phaser.Physics.Arcade.Sprite,
        platformBody: Phaser.Physics.Arcade.Body
    ): void {
        const playerBody = playerSprite.body as Phaser.Physics.Arcade.Body;

        if (platformBody.velocity.y > 0) {
            // Platform moving down - stick player to it
            playerBody.velocity.y = platformBody.velocity.y;
        } else {
            // Platform moving up - only apply if player is firmly on platform
            const playerBottom = playerBody.y + playerBody.height;
            const platformTop = platformBody.y - platformBody.height / 2;
            const distanceToTop = Math.abs(playerBottom - platformTop);

            if (distanceToTop < 5) {
                playerBody.velocity.y = platformBody.velocity.y;
            }
        }
    }

    processMovingPlatformCollision = (
        object1: PhysicsCollisionObject,
        object2: PhysicsCollisionObject
    ): boolean => {
        const validation = this.validateMovingPlatformCollision(object1, object2);
        if (!validation) return false;

        const { playerSprite, platform, playerBody, platformBody } = validation;

        // Calculate positions
        const playerBottom = playerSprite.y + playerSprite.height / 2;
        const platformTop = platform.y - platform.height / 2;
        const platformLeft = platform.x - platform.width / 2;
        const platformRight = platform.x + platform.width / 2;
        const playerLeft = playerSprite.x - playerSprite.width / 2;
        const playerRight = playerSprite.x + playerSprite.width / 2;

        // Check if player is on platform
        const isPlayerAbove = playerBottom <= platformTop + 10;
        const isHorizontallyAligned =
            playerRight > platformLeft + 5 && playerLeft < platformRight - 5;
        const isOnPlatform =
            (playerBody.touching.down && platformBody.touching.up) ||
            (isPlayerAbove && isHorizontallyAligned && playerBody.velocity.y > 0);

        return isOnPlatform;
    };

    // Shared validation helper for portal collisions
    private validatePortalCollision(
        object1: PhysicsCollisionObject,
        object2: PhysicsCollisionObject
    ) {
        if (!this.isGameObjectWithBody(object1) || !this.isGameObjectWithBody(object2)) {
            return null;
        }

        const playerSprite = object1 as PlayerSprite;
        const portal = object2 as Phaser.Physics.Arcade.Sprite;

        if (!playerSprite.body || !portal.body || !playerSprite.playerRef) {
            return null;
        }

        return { playerSprite, portal };
    }

    handlePortalCollision = (
        object1: PhysicsCollisionObject,
        object2: PhysicsCollisionObject
    ): void => {
        const validation = this.validatePortalCollision(object1, object2);
        if (!validation) return;

        const { playerSprite, portal } = validation;
        const playerRef = playerSprite.playerRef!; // Safe to use ! since validation passed

        // Toggle UFO mode
        playerRef.toggleUfoMode();
        console.log('Player collided with portal. UFO mode toggled.');

        // Add portal effect
        this.scene.tweens?.add({
            targets: portal,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 100,
            yoyo: true,
            repeat: 1,
            ease: 'Power1'
        });

        // Disable portal temporarily to prevent immediate re-triggering
        if (portal.body) {
            portal.body.enable = false;
            this.safeDelayedCall(() => {
                if (portal?.body) portal.body.enable = true;
            }, 1500);
        }
    };

    processPortalCollision = (
        object1: PhysicsCollisionObject,
        object2: PhysicsCollisionObject
    ): boolean => {
        const validation = this.validatePortalCollision(object1, object2);
        if (!validation) return false;

        const { playerSprite } = validation;
        const playerRef = playerSprite.playerRef;

        // Only process if player has toggleUfoMode method
        return playerRef && typeof playerRef.toggleUfoMode === 'function';
    };

    // Helper method to check if an object is a GameObjectWithBody
    private isGameObjectWithBody(
        obj: PhysicsCollisionObject
    ): obj is Phaser.Types.Physics.Arcade.GameObjectWithBody {
        return (
            obj != null &&
            typeof obj === 'object' &&
            'x' in obj &&
            'y' in obj &&
            'body' in obj &&
            typeof obj.x === 'number' &&
            typeof obj.y === 'number'
        );
    }
}
