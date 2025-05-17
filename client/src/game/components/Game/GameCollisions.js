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
            this.scene.physics.add.collider(player.sprite, movingPlatforms);
        }

    }

    setupOtherPlayerCollisions(otherPlayer, platforms, jumpPads) {
        if (!this.scene.physics) return;

        // Add collision between other player and platforms
        if (otherPlayer && otherPlayer.sprite && platforms) {
            this.scene.physics.add.collider(otherPlayer.sprite, platforms);

            // Add overlap for jump pads
            if (jumpPads) {
                this.scene.physics.add.overlap(otherPlayer.sprite, jumpPads, this.handleJumpPad, null, this.scene);
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
}
