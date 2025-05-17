export class PlayerVisuals {
    constructor(scene, player) {
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

        // Create the player sprite with appropriate color based on player type
        this.sprite = this.scene.physics.add.sprite(x, y, "sprite");
        this.sprite.setScale(0.5);

        // Set different tint for main player vs other players
        if (isMainPlayer) {
            this.sprite.setTint(0x00ff00); // Main player is green
        } else {
            this.sprite.setTint(0x0000ff); // Other players are blue
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
            this.mirrorSprite = this.scene.add.sprite(x, mirrorY, "sprite");
            this.mirrorSprite.setScale(0.5);
            this.mirrorSprite.setTint(0xff7700); // Orange for mirrored view
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
            this.sprite.setFlipX(direction === "left");
        }

        if (this.mirrorSprite) {
            this.mirrorSprite.setFlipX(direction === "left");
        }
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.text) this.text.destroy();
        if (this.mirrorSprite) this.mirrorSprite.destroy();
        if (this.mirrorText) this.mirrorText.destroy();
    }
}
