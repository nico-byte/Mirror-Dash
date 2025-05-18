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

        // Create the main player sprite
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
        if (isMainPlayer) {
            // Main player can be kept as original colors
        } else {
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

        // For non-main players, create a mirrored sprite in the bottom half
        if (!isMainPlayer) {
            const mirrorY = screenHeight - y + midPoint;

            if (this.player.isInUfoMode) {
                this.mirrorSprite = this.scene.add.sprite(x, mirrorY, "ufo");
                this.mirrorSprite.setScale(1.5); // UFO scale set to 1.5
            } else {
                // Create mirrored sprite with error handling (existing logic)
                if (!this.scene.textures.exists("player_animations")) {
                    if (this.scene.textures.exists("sprite")) {
                        this.mirrorSprite = this.scene.add.sprite(x, mirrorY, "sprite");
                        this.mirrorSprite.setScale(1.5); // Player fallback scale
                    } else {
                        this.mirrorSprite = this.scene.add.sprite(x, mirrorY);
                        this.mirrorSprite.setSize(32, 32); // Placeholder
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
                    this.mirrorSprite.setScale(1.5); // Player animation scale
                }
            }

            // Apply tint only if not in UFO mode, or use a different UFO tint for mirror
            if (!this.player.isInUfoMode) {
                this.mirrorSprite.setTint(0xffaa77); // Orange for mirrored view
            } else {
                // Optional: different tint for mirrored UFO if needed
                // this.mirrorSprite.setTint(0xsomecolor);
            }
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

        // Set sprite direction
        this.sprite.setFlipX(direction === "left");
        if (this.mirrorSprite) {
            this.mirrorSprite.setFlipX(direction === "left");
        }

        // Safely check if scene and anims exist
        if (!this.scene || !this.scene.anims) return;

        if (this.player.isInUfoMode) {
            // Ensure main sprite is UFO texture and scale
            if (this.sprite.texture.key !== 'ufo') {
                this.sprite.setTexture('ufo');
            }
            // Explicitly set scale if it's not already 1.5
            if (this.sprite.scale !== 1.5) {
                this.sprite.setScale(1.5);
            }

            // Ensure mirror sprite is UFO texture and scale
            if (this.mirrorSprite) {
                if (this.mirrorSprite.texture.key !== 'ufo') {
                    this.mirrorSprite.setTexture('ufo');
                }
                // Explicitly set scale if it's not already 1.5
                if (this.mirrorSprite.scale !== 1.5) {
                    this.mirrorSprite.setScale(1.5);
                }
            }
            return; // Skip frame-based animations for UFO
        } else {
            // Not in UFO mode: Ensure sprites are reverted from UFO if they were
            let mainSpriteTextureKey = this.sprite.texture.key;
            let mainSpriteScale = this.sprite.scale;

            if (mainSpriteTextureKey === 'ufo') {
                if (this.scene.textures.exists("player_animations")) {
                    this.sprite.setTexture('player_animations');
                    mainSpriteTextureKey = 'player_animations'; // update key after setTexture
                    if (this.scene.anims.exists("idle")) {
                        this.sprite.anims.play("idle", true);
                    }
                } else if (this.scene.textures.exists("sprite")) {
                    this.sprite.setTexture('sprite');
                    mainSpriteTextureKey = 'sprite'; // update key after setTexture
                } // Else, it might be a placeholder, leave as is or handle
            }
            // After potentially changing texture, ensure scale is correct for player
            if ((mainSpriteTextureKey === 'player_animations' || mainSpriteTextureKey === 'sprite') && mainSpriteScale !== 1.5) {
                this.sprite.setScale(1.5);
            }

            if (this.mirrorSprite) {
                let mirrorSpriteTextureKey = this.mirrorSprite.texture.key;
                let mirrorSpriteScale = this.mirrorSprite.scale;

                if (mirrorSpriteTextureKey === 'ufo') {
                    if (this.scene.textures.exists("player_animations")) {
                        this.mirrorSprite.setTexture('player_animations');
                        mirrorSpriteTextureKey = 'player_animations';
                        if (this.scene.anims.exists("idle") && this.mirrorSprite.anims) {
                            this.mirrorSprite.anims.play("idle", true);
                        }
                    } else if (this.scene.textures.exists("sprite")) {
                        this.mirrorSprite.setTexture('sprite');
                        mirrorSpriteTextureKey = 'sprite';
                    }
                }
                if ((mirrorSpriteTextureKey === 'player_animations' || mirrorSpriteTextureKey === 'sprite') && mirrorSpriteScale !== 1.5) {
                    this.mirrorSprite.setScale(1.5);
                }
            }
        }

        // Existing animation logic (only runs if not in UFO mode)
    }
}
