export class Player {
    constructor(scene, x, y, name, isMainPlayer = false) {
        this.scene = scene;
        this.name = name || "Player";
        this.isMainPlayer = isMainPlayer;

        // Calculate screen midpoint for mirroring
        const screenHeight = scene.scale.height;
        const midPoint = screenHeight / 2;

        // Create the player sprite with appropriate color based on player type
        this.sprite = scene.physics.add.sprite(x, y, "sprite");
        this.sprite.setScale(0.5);

        // Set different tint for main player vs other players
        if (isMainPlayer) {
            this.sprite.setTint(0x00ff00); // Main player is green
        } else {
            this.sprite.setTint(0x0000ff); // Other players are blue
        }

        // Add player name text
        this.text = scene.add
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
        // Main player doesn't need a mirrored version of themselves
        if (!isMainPlayer) {
            // Calculate mirrored Y position
            const mirrorY = screenHeight - y + midPoint;

            // Create a more visible mirrored sprite for other players
            this.mirrorSprite = scene.add.sprite(x, mirrorY, "sprite");
            this.mirrorSprite.setScale(0.5);
            this.mirrorSprite.setTint(0xff7700); // Orange for mirrored view
            this.mirrorSprite.setFlipY(true);

            // Add mirrored name text
            this.mirrorText = scene.add
                .text(x, mirrorY - 30, name, {
                    fontFamily: "Arial",
                    fontSize: "14px",
                    color: "#ffffff",
                    stroke: "#000000",
                    strokeThickness: 2,
                    align: "center",
                })
                .setOrigin(0.5);
        } else {
            // For main player, no mirror sprite needed
            this.mirrorSprite = null;
            this.mirrorText = null;
        }

        // Camera visibility setup - critical for split-screen functionality
        if (scene.topCamera) {
            // Main player is visible in top half only
            if (!isMainPlayer) {
                scene.topCamera.ignore([this.sprite, this.text]);
            }
        }

        if (scene.bottomCamera) {
            // Everything in bottom half for main player should be ignored
            if (isMainPlayer) {
                scene.bottomCamera.ignore([this.sprite, this.text]);
            } else {
                // For other players: only the mirrored version is visible in bottom half
                scene.bottomCamera.ignore([this.sprite, this.text]);

                // Make sure the mirror sprite is ONLY visible in bottom camera
                if (this.mirrorSprite && this.mirrorText && scene.topCamera) {
                    scene.topCamera.ignore([this.mirrorSprite, this.mirrorText]);
                }
            }
        }

        // Apply physics to player's sprite
        if (scene.physics) {
            scene.physics.add.existing(this.sprite);
            this.sprite.body.setCircle(20); // Slightly smaller than full sprite

            // Configure physics properties
            this.sprite.body.setBounce(0);
            this.sprite.body.setCollideWorldBounds(true);
            this.sprite.body.setDrag(500, 0);
            this.sprite.body.setFriction(1, 0);
            this.sprite.body.setMaxVelocity(600, 1000);
            this.sprite.body.setGravityY(1000);
            this.sprite.body.setSize(32, 32).setOffset(-12, -12); // Adjust for circle hitbox
        }

        // Additional properties for tracking
        this.x = x;
        this.y = y;
        this.animation = "idle";
        this.direction = "right";
        this.midPoint = midPoint;
        this.screenHeight = screenHeight;
        this.lastUpdate = Date.now();

        console.log("Player created:", name, x, y, isMainPlayer);
    }

    update() {
        // Update position properties
        if (this.isMainPlayer && this.sprite && this.sprite.body) {
            try {
                // Get position from physics body for main player
                this.x = this.sprite.x;
                this.y = this.sprite.y;
            } catch (error) {
                console.error("Error updating player position from physics body:", error);
            }
        } else if (this.sprite) {
            // For non-main players, update sprite position from player position
            this.sprite.x = this.x;
            this.sprite.y = this.y;
        }

        // Update text position to follow sprite
        if (this.text) {
            this.text.setPosition(this.x, this.y - 30);
        }

        // Update mirror sprite and text if they exist (only for non-main players)
        if (this.mirrorSprite && this.mirrorText) {
            // Calculate mirrored Y position
            const mirrorY = this.screenHeight - this.y + this.midPoint;

            // Update positions
            this.mirrorSprite.setPosition(this.x, mirrorY);
            this.mirrorText.setPosition(this.x, mirrorY - 30);

            // Update animation/direction
            if (this.direction === "left") {
                this.mirrorSprite.setFlipX(true);
            } else {
                this.mirrorSprite.setFlipX(false);
            }
        }
    }

    applyMovement(cursors, wasd) {
        if (!this.isMainPlayer || !this.sprite.body) return false;

        try {
            const speed = 500;
            const jumpStrength = 800; // Increased for better jump experience

            this.sprite.body.setAccelerationX(0); // Reset acceleration
            let moved = false;
            let prevAnimation = this.animation;
            let prevDirection = this.direction;

            // Reset horizontal velocity
            this.sprite.body.setVelocityX(0);

            // Horizontal movement
            if (cursors.left.isDown || wasd.A.isDown) {
                this.sprite.body.setVelocityX(-speed);
                this.animation = "run";
                this.direction = "left";
                this.sprite.setFlipX(true); // Flip sprite when moving left
                moved = true;
            } else if (cursors.right.isDown || wasd.D.isDown) {
                this.sprite.body.setVelocityX(speed);
                this.animation = "run";
                this.direction = "right";
                this.sprite.setFlipX(false); // Reset flip when moving right
                moved = true;
            } else {
                this.animation = "idle";
            }

            // Jump - Only if touching the ground
            if ((cursors.up.isDown || wasd.W.isDown || wasd.Space.isDown) && this.sprite.body.touching.down) {
                this.sprite.body.setVelocityY(-jumpStrength);
                this.animation = "jump";
                moved = true;
            }

            // Return true if anything changed - important for network updates
            return moved || prevAnimation !== this.animation || prevDirection !== this.direction;
        } catch (error) {
            console.error("Error applying movement to player:", error);
            return false;
        }
    }

    moveTo(x, y, animation = "idle", direction = "right") {
        if (this.isMainPlayer) return; // Don't tween the main player

        if (typeof x !== "number" || typeof y !== "number") {
            console.error("Invalid position for player move:", x, y);
            return;
        }

        // Store the target position
        this.x = x;
        this.y = y;
        this.animation = animation;
        this.direction = direction;
        this.lastUpdate = Date.now();

        // Update sprite flip based on direction
        if (this.sprite) {
            this.sprite.setFlipX(direction === "left");
        }

        // Use tweens for smooth movement of other players
        if (this.sprite && this.scene && this.scene.tweens) {
            this.scene.tweens.add({
                targets: this.sprite,
                x,
                y,
                duration: 100,
                ease: "Linear",
            });
        }
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.text) this.text.destroy();
        if (this.mirrorSprite) this.mirrorSprite.destroy();
        if (this.mirrorText) this.mirrorText.destroy();
    }
}
