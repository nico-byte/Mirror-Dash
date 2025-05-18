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

        // Check if the required texture exists
        if (!this.scene.textures.exists("player_animations")) {
            console.warn("Player animations texture not found, using fallback sprite");
            // Use the fallback sprite texture if available
            if (this.scene.textures.exists("sprite")) {
                // Create the player sprite using the fallback texture
                this.sprite = this.scene.physics.add.sprite(x, y, "sprite");

                // Set scale for the fallback sprite
                this.sprite.setScale(1);
            } else {
                // If neither texture is available, create an empty sprite
                console.error("No valid player texture found, creating placeholder");
                this.sprite = this.scene.physics.add.sprite(x, y);
                this.sprite.setSize(32, 32);
            }
        } else {
            // Create the player sprite using the animation spritesheet
            this.sprite = this.scene.physics.add.sprite(x, y, "player_animations");

            // Try to set an animation, with error handling
            try {
                if (this.scene.anims.exists("idle")) {
                    this.sprite.anims.play("idle");
                }
            } catch (error) {
                console.warn("Failed to play animation:", error);
            }

            // Set scale
            this.sprite.setScale(1.5);
        }

        // Set different tint for main player vs other players
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

            // Create mirrored sprite with error handling
            if (!this.scene.textures.exists("player_animations")) {
                if (this.scene.textures.exists("sprite")) {
                    this.mirrorSprite = this.scene.add.sprite(x, mirrorY, "sprite");
                    this.mirrorSprite.setScale(1);
                } else {
                    this.mirrorSprite = this.scene.add.sprite(x, mirrorY);
                    this.mirrorSprite.setSize(32, 32);
                }
            } else {
                this.mirrorSprite = this.scene.add.sprite(x, mirrorY, "player_animations");
                try {
                    if (this.scene.anims.exists("idle")) {
                        this.mirrorSprite.anims.play("idle");
                    }
                } catch (error) {
                    console.warn("Failed to play mirror animation:", error);
                }
                this.mirrorSprite.setScale(1.5);
            }

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
        // Make sure the sprite exists before trying to update animation
        if (!this.sprite) return;

        // Set sprite direction if sprite exists
        this.sprite.setFlipX(direction === "left");

        // Safely check if animations exist before trying to play them
        if (!this.scene || !this.scene.anims) return;

        try {
            const player = this.player;

            // First check if the sprite has an anims property
            if (!this.sprite.anims) {
                console.warn("Sprite missing anims property");
                return;
            }

            // Find available animations in the scene
            const hasIdleAnim = this.scene.anims.exists("idle");
            const hasRunAnim = this.scene.anims.exists("run");
            const hasJumpAnim = this.scene.anims.exists("jump");

            // If none of the animations exist, exit early
            if (!hasIdleAnim && !hasRunAnim && !hasJumpAnim) {
                console.warn("No animations available in the scene");
                return;
            }

            if (player.isMainPlayer && player.sprite && player.sprite.body) {
                // For main player, handle animations based on physics state
                const isTouchingGround = player.sprite.body.touching.down;
                const isMovingHorizontally = Math.abs(player.sprite.body.velocity.x) > 10;

                try {
                    if (!isTouchingGround && hasJumpAnim) {
                        // Player is in the air - play jump animation
                        this.sprite.anims.play("jump", true);
                        player.animation = "jump"; // Update the player's animation state
                    } else if (isMovingHorizontally && hasRunAnim) {
                        // Player is moving horizontally - play run animation
                        this.sprite.anims.play("run", true);
                        player.animation = "run"; // Update the player's animation state
                    } else if (hasIdleAnim) {
                        // Player is idle
                        this.sprite.anims.play("idle", true);
                        player.animation = "idle"; // Update the player's animation state
                    }
                } catch (error) {
                    console.warn("Animation error (main player):", error.message);
                }
            } else {
                // For network players, use animation state received from the network
                try {
                    const animName = player.animation || "idle";
                    if (this.scene.anims.exists(animName)) {
                        this.sprite.anims.play(animName, true);
                    } else if (hasIdleAnim) {
                        // Fallback to idle if the specified animation doesn't exist
                        this.sprite.anims.play("idle", true);
                    }
                } catch (error) {
                    console.warn("Animation error (network player):", error.message);
                }
            }
        } catch (error) {
            console.warn("General animation error:", error.message);
        }

        // Update mirrored sprite if it exists
        if (this.mirrorSprite) {
            // Set mirror sprite direction
            this.mirrorSprite.setFlipX(direction === "left");

            // Match mirror sprite animation to main sprite with error handling
            try {
                if (this.sprite?.anims?.currentAnim?.key && this.mirrorSprite.anims) {
                    const animKey = this.sprite.anims.currentAnim.key;
                    if (this.scene.anims.exists(animKey)) {
                        this.mirrorSprite.anims.play(animKey, true);
                    } else if (this.scene.anims.exists("idle")) {
                        this.mirrorSprite.anims.play("idle", true);
                    }
                }
            } catch (error) {
                // Silent error handling
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
