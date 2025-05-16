export class Player {
    constructor(scene, x, y, name, isMainPlayer = false) {
        this.scene = scene;
        this.name = name;
        this.isMainPlayer = isMainPlayer;

        // Create a sprite to be used as the visual representation
        this.sprite = scene.add.circle(x, y, 20, isMainPlayer ? 0xff0000 : 0x0000ff);

        // Create Matter.js physics body if this is the main player
        if (isMainPlayer && scene.matter) {
            // Create circle body for the player with proper properties
            this.body = scene.matter.add.circle(x, y, 20, {
                label: "player",
                friction: 0.005,
                frictionAir: 0.01,
                restitution: 0.2,
                density: 0.005,
            });

            // Store reference to this player instance on the body
            this.body.gameObject = this;

            console.log("Created physics body for player");
        } else {
            this.body = null;
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
        this.canJump = false; // Track if player can jump
        this.jumpCooldown = 0; // Jump cooldown timer

        // Method to check if touching ground
        // This is provided explicitly since we're not using the GameObject emission system
        this.checkGroundContact = () => {
            if (!this.isMainPlayer || !this.body) return false;

            const yVelocity = this.body.velocity.y;
            // If y velocity is close to 0, we might be on ground
            return Math.abs(yVelocity) < 0.2;
        };
    }

    update() {
        // Decrease jump cooldown timer
        if (this.jumpCooldown > 0) {
            this.jumpCooldown--;
        }

        if (this.isMainPlayer && this.body) {
            try {
                // Get position from physics body
                const pos = this.body.position;
                this.x = pos.x;
                this.y = pos.y;

                // Check if player is on ground (for jumping) using velocity
                // This is a workaround if collision detection isn't working properly
                if (this.checkGroundContact()) {
                    this.canJump = true;
                }
            } catch (error) {
                console.error("Error updating player position from physics body:", error);
            }
        }

        // Update visual elements to match position
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        this.text.setPosition(this.x, this.y - 30);
    }

    applyMovement(cursors) {
        if (!this.isMainPlayer || !this.body) return false;

        try {
            const moveForce = 0.01; // Horizontal movement force
            const jumpForce = 0.15; // Vertical jump force

            let moved = false;
            let prevAnimation = this.animation;
            let prevDirection = this.direction;

            // Horizontal movement
            if (cursors.left.isDown) {
                // Apply force to the left
                this.scene.matter.body.applyForce(this.body, this.body.position, { x: -moveForce, y: 0 });
                this.animation = "run";
                this.direction = "left";
                moved = true;
            } else if (cursors.right.isDown) {
                // Apply force to the right
                this.scene.matter.body.applyForce(this.body, this.body.position, { x: moveForce, y: 0 });
                this.animation = "run";
                this.direction = "right";
                moved = true;
            } else {
                this.animation = "idle";
            }

            // Jump - also allow jumping if checkGroundContact returns true
            if (cursors.up.isDown && (this.canJump || this.checkGroundContact()) && this.jumpCooldown <= 0) {
                // Apply upward force (jump)
                this.scene.matter.body.applyForce(this.body, this.body.position, { x: 0, y: -jumpForce });
                this.animation = "jump";
                this.canJump = false;
                this.jumpCooldown = 10; // Set cooldown to prevent multiple jumps
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

        // Use tweens for smooth movement of other players
        this.scene.tweens.add({
            targets: this.sprite,
            x,
            y,
            duration: 100,
            ease: "Linear",
        });

        this.x = x;
        this.y = y;
        this.animation = animation;
        this.direction = direction;
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.text) this.text.destroy();
        if (this.body && this.isMainPlayer && this.scene.matter) {
            try {
                this.scene.matter.world.remove(this.body);
            } catch (error) {
                console.error("Error destroying player body:", error);
            }
        }
    }
}
