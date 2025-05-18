export class PlayerVisuals {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.sprite = null;
        this.text = null;
        this.mirrorSprite = null;
        this.mirrorText = null;
    }

    init(scene, player) {
        this.scene = scene;
        this.player = player;
        this.sprite = null;
        this.text = null;
        this.mirrorSprite = null;
        this.mirrorText = null;
    }

    createSprites(x, y, name, isMainPlayer) {
        // Calculate screen midpoint for mirroring
        const screenHeight = this.scene.scale.height;
        const midPoint = screenHeight / 2;

        // Create the player sprite using the animation spritesheet
        this.sprite = this.scene.physics.add.sprite(x, y, "player_animations");
        
        // Set a default animation
        this.sprite.anims.play('idle');
        
        // Set scale (may need adjustment for the new sprite)
        this.sprite.setScale(1.5);

        // Set different tint for main player vs other players (optional with new sprites)
        if (isMainPlayer) {
            // Main player can be kept as original colors
        } else {
            this.sprite.setTint(0x99bbff); // Light blue tint for other players
        }

        // Add player name text
        this.text = this.scene.add
            .text(x, y - 30, name, {
                fontFamily: "Arial",
                fontSize: "14px",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 2,
                align: "center",
            })
            .setOrigin(0.5);

        // For non-main players, create a mirrored sprite in the bottom half
        if (!isMainPlayer) {
            // Calculate mirrored Y position
            const mirrorY = screenHeight - y + midPoint;

            // Create a more visible mirrored sprite for other players
            this.mirrorSprite = this.scene.add.sprite(x, mirrorY, "player_animations");
            this.mirrorSprite.anims.play('idle');
            this.mirrorSprite.setScale(1.5);
            this.mirrorSprite.setTint(0xffaa77); // Orange for mirrored view
            this.mirrorSprite.setFlipY(true);

            // Add mirrored name text
            this.mirrorText = this.scene.add
                .text(x, mirrorY - 30, name, {
                    fontFamily: "Arial",
                    fontSize: "14px",
                    color: "#ffffff",
                    stroke: "#000000",
                    strokeThickness: 2,
                    align: "center",
                })
                .setOrigin(0.5);
        }

        return {
            sprite: this.sprite,
            text: this.text,
            mirrorSprite: this.mirrorSprite,
            mirrorText: this.mirrorText,
        };
    }

    setupCameraVisibility(isMainPlayer) {
        // Camera visibility setup - critical for split-screen functionality
        if (this.scene.topCamera) {
            // Main player is visible in top half only
            if (!isMainPlayer) {
                this.scene.topCamera.ignore([this.sprite, this.text]);
            }
        }

        if (this.scene.bottomCamera) {
            // Everything in bottom half for main player should be ignored
            if (isMainPlayer) {
                this.scene.bottomCamera.ignore([this.sprite, this.text]);
            } else {
                // For other players: only the mirrored version is visible in bottom half
                this.scene.bottomCamera.ignore([this.sprite, this.text]);

                // Make sure the mirror sprite is ONLY visible in bottom camera
                if (this.mirrorSprite && this.mirrorText && this.scene.topCamera) {
                    this.scene.topCamera.ignore([this.mirrorSprite, this.mirrorText]);
                }
            }
        }
    }

    updatePositions(x, y, midPoint, screenHeight) {
        // Update text position to follow sprite
        if (this.text) {
            this.text.setPosition(x, y - 30);
        }

        // Update mirror sprite and text if they exist
        if (this.mirrorSprite && this.mirrorText) {
            // Calculate mirrored Y position
            const mirrorY = screenHeight - y + midPoint;

            // Update positions
            this.mirrorSprite.setPosition(x, mirrorY);
            this.mirrorText.setPosition(x, mirrorY - 30);
        }
    }

    updateAnimation(direction) {
        if (this.sprite) {
            // Set sprite direction
            this.sprite.setFlipX(direction === "left");
            
            // Play the appropriate animation based on player state
            const player = this.player;
            
            if (player.isMainPlayer && player.sprite && player.sprite.body) {
                // For main player, handle animations based on physics state
                if (!player.sprite.body.touching.down) {
                    // Player is in the air - play jump animation
                    this.sprite.anims.play('jump', true);
                    player.animation = 'jump'; // Update the player's animation state
                } else if (Math.abs(player.sprite.body.velocity.x) > 10) {
                    // Player is moving horizontally - play run animation
                    this.sprite.anims.play('run', true);
                    player.animation = 'run'; // Update the player's animation state
                } else {
                    // Player is idle
                    this.sprite.anims.play('idle', true);
                    player.animation = 'idle'; // Update the player's animation state
                }
            } else {
                // For network players, use animation state received from the network
                // or fall back to idle if no animation is specified
                try {
                    this.sprite.anims.play(player.animation || 'idle', true);
                } catch (error) {
                    // Fallback in case animation system is not ready yet
                    console.warn("Animation error:", error);
                    this.sprite.anims.play('idle', true);
                }
            }
        }

        if (this.mirrorSprite) {
            // Set mirror sprite direction
            this.mirrorSprite.setFlipX(direction === "left");
            
            // Match mirror sprite animation to main sprite
            if (this.sprite && this.sprite.anims.currentAnim) {
                try {
                    this.mirrorSprite.anims.play(this.sprite.anims.currentAnim.key, true);
                } catch (error) {
                    // Fallback in case animation system is not ready yet
                    console.warn("Mirror animation error:", error);
                    this.mirrorSprite.anims.play('idle', true);
                }
            }
        }
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.text) this.text.destroy();
        if (this.mirrorSprite) this.mirrorSprite.destroy();
        if (this.mirrorText) this.mirrorText.destroy();
    }
}
