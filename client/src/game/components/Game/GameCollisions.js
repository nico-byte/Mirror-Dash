export class GameCollisions {
    constructor(scene) {
        this.scene = scene;
    }

    setupCollisions(player, platforms, jumpPads, finishObject, movingPlatforms) {
        if (!this.scene.physics) return;

        // Add collision between player and platforms
        if (player && player.sprite && platforms) {
            this.scene.physics.add.collider(player.sprite, platforms);
        }

        // Add collision with jump pads and special effect
        if (player && player.sprite && jumpPads) {
            this.scene.physics.add.overlap(player.sprite, jumpPads, this.handleJumpPad, null, this.scene);
        }

        // Set up physics overlap with finish line if it exists
        if (player && player.sprite && finishObject) {
            this.scene.physics.add.overlap(player.sprite, finishObject, this.scene.handleFinish, null, this.scene);
        }

        // Add collision with moving platforms
        if (player && player.sprite && movingPlatforms) {
            const movingPlatformCollision = this.scene.physics.add.collider(
                player.sprite, 
                movingPlatforms,
                this.handleMovingPlatformCollision,
                null,
                this
            );
        }
        this.movingPlatforms = movingPlatforms;

    }

    setupOtherPlayerCollisions(otherPlayer, platforms, jumpPads, movingPlatforms) {
        if (!this.scene.physics) return;

        // Add collision between other player and platforms
        if (otherPlayer && otherPlayer.sprite && platforms) {
            this.scene.physics.add.collider(otherPlayer.sprite, platforms);

            // Add overlap for jump pads
            if (jumpPads) {
                this.scene.physics.add.overlap(otherPlayer.sprite, jumpPads, this.handleJumpPad, null, this.scene);
            }

            if (this.movingPlatforms) {
                this.scene.physics.add.collider(
                    otherPlayer.sprite,
                    movingPlatforms,
                    this.handleMovingPlatformCollision,
                    null,
                    this
                );
            }
        }
    }

    handleJumpPad(playerSprite, jumpPad) {
        // Apply strong upward velocity when player touches a jump pad
        playerSprite.body.setVelocityY(-600);

        // Visual feedback
        this.scene.tweens.add({
            targets: jumpPad,
            scaleY: 0.3,
            duration: 100,
            yoyo: true,
            ease: "Power1",
        });
    }

    handleMovingPlatformCollision(playerSprite, platform) {
        // Check if the player is on top of the moving platform
        if (playerSprite.body.touching.down && platform.body.touching.up) {
            // Set the player's velocity to match the moving platform's velocity
            if (platform.body.velocity.x !== 0) {
                playerSprite.body.velocity.x = platform.body.velocity.x;
            }

            if (platform.body.velocity.y !== 0) {
                playerSprite.body.velocity.y = platform.body.velocity.y;
            }
        }
    }
}
