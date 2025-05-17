export class Player {
    constructor(scene, x, y, name, isMainPlayer = false) {
        this.scene = scene;
        this.name = name || "Player";
        this.isMainPlayer = isMainPlayer;

        // Calculate screen midpoint for mirroring
        const screenHeight = scene.scale.height;
        const midPoint = screenHeight / 2;

        // Create the player sprite
        // Main player is red, other players are blue
        this.sprite = scene.physics.add.sprite(x, y, "sprite");
        this.sprite.setScale(0.5); // Adjust scale as needed

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
            // Other players appear as orange in the mirrored view
            this.mirrorSprite = scene.add.circle(x, screenHeight - y + midPoint, 20, 0xff7700);
            this.mirrorText = scene.add
                .text(x, screenHeight - y + midPoint - 30, name, {
                    fontFamily: "Arial",
                    fontSize: "14px",
                    color: "#ffffff",
                    stroke: "#000000",
                    strokeThickness: 2,
                    align: "center",
                })
                .setOrigin(0.5);
        } else {
            // For main player, we don't need a mirror sprite
            this.mirrorSprite = null;
            this.mirrorText = null;
        }

        // Camera visibility setup
        if (scene.topCamera) {
            // For main player: visible in top half
            // For other players: not visible in top half
            if (!isMainPlayer) {
                scene.topCamera.ignore([this.sprite, this.text]);
            }
        }

        if (scene.bottomCamera) {
            // For main player: not visible in bottom half at all
            if (isMainPlayer) {
                scene.bottomCamera.ignore([this.sprite, this.text]);
            } else {
                // For other players: only the mirrored version is visible in bottom half
                scene.bottomCamera.ignore([this.sprite, this.text]);
            }
        }

        // Apply physics to the main player's sprite
        if (isMainPlayer && scene.physics) {
            scene.physics.add.existing(this.sprite);
            // this.sprite.body.setCircle(null); // Ensure it's not circular
            this.sprite.body.setCircle(20); // Slightly smaller than full sprite
            this.sprite.body.setOffset(0, 0);

            // Configure physics properties
            this.sprite.body.setBounce(0);
            this.sprite.body.setCollideWorldBounds(true);
            this.sprite.body.setDrag(500, 0);
            this.sprite.body.setFriction(1, 0);
            this.sprite.body.setMaxVelocity(600, 1000);
            this.sprite.body.setGravityY(1000);
        }

        this.sprite.body.setSize(32, 32).setOffset(-12, -12); // Adjust for circle hitbox

        // Additional properties
        this.x = x;
        this.y = y;
        this.animation = "idle";
        this.direction = "right";
        this.midPoint = midPoint;
        this.screenHeight = screenHeight;

        console.log("Player created:", name, x, y, isMainPlayer);
    }

    update() {
        if (this.isMainPlayer && this.sprite.body) {
            try {
                // Get position from physics body
                this.x = this.sprite.x;
                this.y = this.sprite.y;
            } catch (error) {
                console.error("Error updating player position from physics body:", error);
            }
        } else {
            // For non-main players, update sprite position from player position
            this.sprite.x = this.x;
            this.sprite.y = this.y;
        }

        // Update text position to follow sprite
        this.text.setPosition(this.x, this.y - 30);

        // Update mirror sprite and text if they exist (only for non-main players)
        if (this.mirrorSprite && this.mirrorText) {
            this.mirrorSprite.setPosition(this.x, this.screenHeight - this.y + this.midPoint);
            this.mirrorText.setPosition(this.x, this.screenHeight - this.y + this.midPoint - 30);
        }
    }

    applyMovement(cursors, wasd) {
        if (!this.isMainPlayer || !this.sprite.body) return false;

        try {
            const speed = 500;
            const jumpStrength = 800; // Increased for better jump experience

            this.sprite.body.setAccelerationX(0); // Reset acceleration
            this.sprite.body.setVelocityX(0); // Reset horizontal speed
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
                moved = true;
            } else if (cursors.right.isDown || wasd.D.isDown) {
                this.sprite.body.setVelocityX(speed);
                this.animation = "run";
                this.direction = "right";
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

            // Return true if anything changed
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

        // Use tweens for smooth movement of other players
        this.scene.tweens.add({
            targets: this.sprite,
            x,
            y,
            duration: 100,
            ease: "Linear",
        });
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.text) this.text.destroy();
        if (this.mirrorSprite) this.mirrorSprite.destroy();
        if (this.mirrorText) this.mirrorText.destroy();
    }
}
