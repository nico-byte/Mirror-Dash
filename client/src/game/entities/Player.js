export class Player {
    constructor(scene, x, y, name, isMainPlayer = false) {
        this.scene = scene;
        this.name = name || "Player";
        this.isMainPlayer = isMainPlayer;

        // Calculate screen midpoint for mirroring
        const screenHeight = scene.scale.height;
        const midPoint = screenHeight / 2;

        // Create different sprites for top and bottom cameras
        // Top camera sprite (normal view)
        this.sprite = scene.add.circle(x, y, 20, isMainPlayer ? 0xff0000 : 0x0000ff);

        // Add player name text for top view
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

        // Create another sprite for the bottom camera (mirrored view)
        // Position it in the bottom half of the screen
        this.mirrorSprite = scene.add.circle(x, screenHeight - y + midPoint, 20, isMainPlayer ? 0xff7700 : 0x0000ff);

        // Add mirrored text for bottom view
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

        // Set camera-specific visibility
        if (scene.topCamera) {
            scene.topCamera.ignore([this.mirrorSprite, this.mirrorText]);
        }

        if (scene.bottomCamera) {
            scene.bottomCamera.ignore([this.sprite, this.text]);
        }

        // Apply physics to the main player's sprite
        if (isMainPlayer && scene.physics) {
            // Enable arcade physics on the sprite
            scene.physics.add.existing(this.sprite);

            // Configure physics properties
            this.sprite.body.setBounce(0.1);
            this.sprite.body.setCollideWorldBounds(true);
            this.sprite.body.setDrag(300, 0);

            console.log("Created physics body for player:", name);
        }

        // Additional properties
        this.x = x;
        this.y = y;
        this.animation = "idle";
        this.direction = "right";
        this.midPoint = midPoint; // Store for later use
        this.screenHeight = screenHeight; // Store for later use

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

        // Update mirror sprite and text with mirrored Y position
        this.mirrorSprite.setPosition(this.x, this.screenHeight - this.y + this.midPoint);
        this.mirrorText.setPosition(this.x, this.screenHeight - this.y + this.midPoint - 30);
    }

    applyMovement(cursors, wasd) {
        if (!this.isMainPlayer || !this.sprite.body) return false;

        try {
            const speed = 300;
            const jumpStrength = 400; // Increased for better jump experience

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

    applyMovement(cursors, wasd) {
        if (!this.isMainPlayer || !this.sprite.body) return false;

        try {
            const speed = 300;
            const jumpStrength = 400; // Increased for better jump experience

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
