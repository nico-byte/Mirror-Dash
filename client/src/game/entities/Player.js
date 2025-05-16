export class Player {
    constructor(scene, x, y, name, isMainPlayer = false) {
        this.scene = scene;
        this.name = name || "Player";
        this.isMainPlayer = isMainPlayer;

        // Create a sprite for the player with different colors based on player type
        this.sprite = scene.add.circle(x, y, 20, isMainPlayer ? 0xff0000 : 0x0000ff);

        // Apply physics to the main player
        if (isMainPlayer && scene.physics) {
            // Enable arcade physics on the sprite
            scene.physics.add.existing(this.sprite);

            // Configure physics properties
            this.sprite.body.setBounce(0); // Disable bounce
            this.sprite.body.setCollideWorldBounds(true); // Don't fall out of the world
            this.sprite.body.setDrag(300, 0); // Horizontal drag for smooth stopping

            console.log("Created physics body for player:", name);
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

        // Additional properties
        this.x = x;
        this.y = y;
        this.animation = "idle";
        this.direction = "right";

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
    }

    applyMovement(cursors, wasd) {
        if (!this.isMainPlayer || !this.sprite.body) return false;

        try {
            const speed = 300;
            const jumpStrength = 300; // Jump strength for a lower jump

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
    }
}
