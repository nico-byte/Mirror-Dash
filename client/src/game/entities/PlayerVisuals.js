export class PlayerVisuals {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.sprite = null;
        this.text = null;
    }

    init(scene, player) {
        this.scene = scene;
        this.player = player;
        this.sprite = null;
        this.text = null;
    }

    createSprites(x, y, name, isMainPlayer) {
        // Create the player sprite
        if (this.player.isInUfoMode) {
            this.sprite = this.scene.physics.add.sprite(x, y, "ufo");
            this.sprite.setScale(1.5); // UFO scale set to 1.5
        } else {
            // Check if the required texture exists
            if (!this.scene.textures.exists("player_animations")) {
                console.warn("Player animations texture not found, using fallback sprite");
                // Use the fallback sprite texture if available
                if (this.scene.textures.exists("sprite")) {
                    this.sprite = this.scene.physics.add.sprite(x, y, "sprite");
                    this.sprite.setScale(1.5); // Player fallback scale
                } else {
                    console.error("No valid player texture found, creating placeholder");
                    this.sprite = this.scene.physics.add.sprite(x, y);
                    this.sprite.setSize(32, 32); // Placeholder, no specific scale needed
                }
            } else {
                this.sprite = this.scene.physics.add.sprite(x, y, "player_animations");
                try {
                    if (this.scene.anims.exists("idle")) {
                        this.sprite.anims.play("idle");
                    }
                } catch (error) {
                    console.warn("Failed to play animation:", error);
                }
                this.sprite.setScale(1.5); // Player animation scale
            }
        }

        // Set different tint for main player vs other players
        if (!isMainPlayer) {
            // Apply tint only if not in UFO mode, or use a different UFO tint
            if (!this.player.isInUfoMode) {
                this.sprite.setTint(0x99bbff); // Light blue tint for other players
            }
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

        // Return the created objects (with null for mirror objects)
        return {
            sprite: this.sprite,
            text: this.text,
            mirrorSprite: null,
            mirrorText: null,
        };
    }

    setupCameraVisibility(isMainPlayer) {
        // No camera visibility setup needed with single camera
    }

    updatePositions(x, y) {
        // Update text position to follow sprite
        if (this.text) {
            this.text.setPosition(x, y - 30);
        }
    }

    updateAnimation(direction) {
        if (!this.sprite || !this.scene || !this.scene.anims) {
            return;
        }

        // Set sprite direction (flip)
        this.sprite.setFlipX(direction === "left");

        if (this.player.isInUfoMode) {
            // --- UFO Mode Visuals ---
            const ufoTextureKey = "ufo";
            const ufoScale = 1.5;

            // Main sprite
            if (this.sprite.texture.key !== ufoTextureKey) {
                this.sprite.setTexture(ufoTextureKey);
            }
            if (this.sprite.scaleX !== ufoScale) {
                this.sprite.setScale(ufoScale);
            }
            // Stop player animations if playing
            if (this.sprite.anims && this.sprite.anims.isPlaying) {
                const playerAnimKeys = ["idle", "run", "jump"];
                if (playerAnimKeys.includes(this.sprite.anims.currentAnim?.key)) {
                    this.sprite.anims.stop();
                }
            }
            return; // End of UFO mode logic
        } else {
            // --- Regular Player Mode Visuals ---
            const playerTextureKey = "player_animations";
            const fallbackTextureKey = "sprite";
            const playerScale = 1.5; // Consistent with createSprites for player

            // Main sprite: texture and scale
            // Ensure correct texture if switching from UFO or if texture is wrong
            if (
                this.sprite.texture.key === "ufo" ||
                (this.sprite.texture.key !== playerTextureKey && this.sprite.texture.key !== fallbackTextureKey)
            ) {
                if (this.scene.textures.exists(playerTextureKey)) {
                    this.sprite.setTexture(playerTextureKey);
                } else if (this.scene.textures.exists(fallbackTextureKey)) {
                    this.sprite.setTexture(fallbackTextureKey);
                }
            }
            // Ensure correct scale for player texture
            if (
                this.sprite.scaleX !== playerScale &&
                (this.sprite.texture.key === playerTextureKey || this.sprite.texture.key === fallbackTextureKey)
            ) {
                this.sprite.setScale(playerScale);
            }

            // Main sprite: animation
            if (this.sprite.texture.key === playerTextureKey && this.sprite.anims) {
                const currentAnimKey = this.player.animation;
                if (currentAnimKey && this.scene.anims.exists(currentAnimKey)) {
                    if (this.sprite.anims.currentAnim?.key !== currentAnimKey || !this.sprite.anims.isPlaying) {
                        this.sprite.anims.play(currentAnimKey, true);
                    }
                } else if (this.scene.anims.exists("idle")) {
                    // Fallback to idle
                    if (this.sprite.anims.currentAnim?.key !== "idle" || !this.sprite.anims.isPlaying) {
                        this.sprite.anims.play("idle", true);
                    }
                }
            } else if (this.sprite.anims?.isPlaying) {
                // If texture is not player_animations (e.g. fallback 'sprite'), stop animations
                this.sprite.anims.stop();
            }
        }
    }

    destroy() {
        // Destroy the main sprite and text
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }
        if (this.text) {
            this.text.destroy();
            this.text = null;
        }
    }
}
