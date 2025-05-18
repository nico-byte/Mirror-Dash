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
        if (!this.sprite || !this.scene || !this.scene.anims) {
            // console.warn("Sprite, scene, or anims not available for PlayerVisuals.updateAnimation");
            return;
        }

        // Set sprite direction (flip)
        this.sprite.setFlipX(direction === "left");
        if (this.mirrorSprite) {
            this.mirrorSprite.setFlipX(direction === "left");
        }

        if (this.player.isInUfoMode) {
            // --- UFO Mode Visuals ---
            const ufoTextureKey = 'ufo';
            // Consistent with createSprites and Player.js toggleUfoMode for texture,
            // but Player.js toggleUfoMode uses 0.5 scale, while createSprites uses 1.5.
            // We'll use 1.5 here as it seems to be the dominant visual scale for UFO in PlayerVisuals.
            const ufoScale = 1.5;

            // Main sprite
            if (this.sprite.texture.key !== ufoTextureKey) {
                this.sprite.setTexture(ufoTextureKey);
            }
            if (this.sprite.scaleX !== ufoScale) { // Check scaleX assuming uniform scaling
                this.sprite.setScale(ufoScale);
            }
            // Stop player animations if playing
            if (this.sprite.anims && this.sprite.anims.isPlaying) {
                const playerAnimKeys = ['idle', 'run', 'jump'];
                if (playerAnimKeys.includes(this.sprite.anims.currentAnim?.key)) {
                    this.sprite.anims.stop();
                }
            }

            // Mirror sprite
            if (this.mirrorSprite) {
                if (this.mirrorSprite.texture.key !== ufoTextureKey) {
                    this.mirrorSprite.setTexture(ufoTextureKey);
                }
                if (this.mirrorSprite.scaleX !== ufoScale) {
                    this.mirrorSprite.setScale(ufoScale);
                }
                if (this.mirrorSprite.anims && this.mirrorSprite.anims.isPlaying) {
                    const playerAnimKeys = ['idle', 'run', 'jump'];
                    if (playerAnimKeys.includes(this.mirrorSprite.anims.currentAnim?.key)) {
                        this.mirrorSprite.anims.stop();
                    }
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
            if (this.sprite.texture.key === 'ufo' ||
                (this.sprite.texture.key !== playerTextureKey && this.sprite.texture.key !== fallbackTextureKey)) {
                if (this.scene.textures.exists(playerTextureKey)) {
                    this.sprite.setTexture(playerTextureKey);
                } else if (this.scene.textures.exists(fallbackTextureKey)) {
                    this.sprite.setTexture(fallbackTextureKey);
                }
            }
            // Ensure correct scale for player texture
            if (this.sprite.scaleX !== playerScale &&
                (this.sprite.texture.key === playerTextureKey || this.sprite.texture.key === fallbackTextureKey)) {
                this.sprite.setScale(playerScale);
            }

            // Main sprite: animation
            if (this.sprite.texture.key === playerTextureKey && this.sprite.anims) {
                const currentAnimKey = this.player.animation;
                if (currentAnimKey && this.scene.anims.exists(currentAnimKey)) {
                    if (this.sprite.anims.currentAnim?.key !== currentAnimKey || !this.sprite.anims.isPlaying) {
                        this.sprite.anims.play(currentAnimKey, true);
                    }
                } else if (this.scene.anims.exists("idle")) { // Fallback to idle
                    if (this.sprite.anims.currentAnim?.key !== "idle" || !this.sprite.anims.isPlaying) {
                        this.sprite.anims.play("idle", true);
                    }
                }
            } else if (this.sprite.anims?.isPlaying) {
                // If texture is not player_animations (e.g. fallback 'sprite'), stop animations
                this.sprite.anims.stop();
            }

            // Mirror sprite: texture, scale, and animation
            if (this.mirrorSprite) {
                if (this.mirrorSprite.texture.key === 'ufo' ||
                    (this.mirrorSprite.texture.key !== playerTextureKey && this.mirrorSprite.texture.key !== fallbackTextureKey)) {
                    if (this.scene.textures.exists(playerTextureKey)) {
                        this.mirrorSprite.setTexture(playerTextureKey);
                    } else if (this.scene.textures.exists(fallbackTextureKey)) {
                        this.mirrorSprite.setTexture(fallbackTextureKey);
                    }
                }
                if (this.mirrorSprite.scaleX !== playerScale &&
                    (this.mirrorSprite.texture.key === playerTextureKey || this.mirrorSprite.texture.key === fallbackTextureKey)) {
                    this.mirrorSprite.setScale(playerScale);
                }

                if (this.mirrorSprite.texture.key === playerTextureKey && this.mirrorSprite.anims) {
                    const currentAnimKey = this.player.animation;
                    if (currentAnimKey && this.scene.anims.exists(currentAnimKey)) {
                        if (this.mirrorSprite.anims.currentAnim?.key !== currentAnimKey || !this.mirrorSprite.anims.isPlaying) {
                            this.mirrorSprite.anims.play(currentAnimKey, true);
                        }
                    } else if (this.scene.anims.exists("idle")) { // Fallback to idle
                        if (this.mirrorSprite.anims.currentAnim?.key !== "idle" || !this.mirrorSprite.anims.isPlaying) {
                            this.mirrorSprite.anims.play("idle", true);
                        }
                    }
                } else if (this.mirrorSprite.anims?.isPlaying) {
                    this.mirrorSprite.anims.stop();
                }
            }
        }
    }
}
