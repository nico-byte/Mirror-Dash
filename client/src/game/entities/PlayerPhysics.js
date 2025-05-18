export class PlayerPhysics {
    constructor(scene, sprite) {
        this.scene = scene;
        this.sprite = sprite;
        this.setupPhysics();
    }

    init(scene, sprite) {
        this.scene = scene;
        this.sprite = sprite;
        this.setupPhysics();
    }

    setupPhysics() {
        if (!this.scene.physics || !this.sprite) return;

        this.scene.physics.add.existing(this.sprite);

        // Adjust collision box to better match the character sprite
        // Making a slightly narrower hitbox for better platform interactions
        this.sprite.body.setSize(20, 28, true);
        this.sprite.body.setOffset(6, 4);

        // Configure physics properties
        this.sprite.body.setBounce(0);
        this.sprite.body.setCollideWorldBounds(true);
        this.sprite.body.setDrag(500, 0);
        this.sprite.body.setFriction(1, 0);
        this.sprite.body.setMaxVelocity(600, 1000);
        this.sprite.body.setGravityY(1000);
        this.originalGravityY = 1000; // Store original gravity
        this.ufoBoostSpeed = 300; // Speed for UFO upward boost
        this.ufoConstantXSpeed = 300; // Constant positive X velocity for UFO
    }

    setUfoPhysics(isUfo) {
        if (!this.sprite || !this.sprite.body) return;
        if (isUfo) {
            this.sprite.body.setGravityY(this.originalGravityY / 4); // Greatly reduce gravity for UFO
            this.sprite.body.setAllowDrag(false); // Optional: UFO might not need drag
            this.sprite.body.setVelocityX(this.ufoConstantXSpeed); // Set constant X velocity
            this.sprite.setFlipX(false); // Ensure UFO faces right
        } else {
            this.sprite.body.setGravityY(this.originalGravityY); // Restore original gravity
            this.sprite.body.setAllowDrag(true); // Restore drag
            // X velocity will be reset by normal player mechanics in applyMovement
        }
    }

    applyMovement(cursors, wasd, animation, direction, isInUfoMode = false) {
        if (!this.sprite || !this.sprite.body) return { moved: false, animation, direction };

        try {
            const speed = 500;
            const jumpStrength = 500;
            let moved = false;
            let newAnimation = animation;
            let newDirection = direction;

            if (isInUfoMode) {
                // UFO Mechanics
                // Maintain constant positive X velocity
                this.sprite.body.setVelocityX(this.ufoConstantXSpeed);
                newDirection = "right"; // UFO always moves right
                this.sprite.setFlipX(false); // Ensure UFO faces right

                if (cursors.up.isDown || wasd.W.isDown || wasd.Space.isDown) {
                    this.sprite.body.setVelocityY(-this.ufoBoostSpeed);
                    moved = true;
                } else {
                    // Downward input (S key or down arrow) is now ignored for UFO.
                    // UFO will gently fall due to its reduced gravity if no upward input is given.
                    // If you wanted it to hover, you might set velocityY to 0 here or apply a small upward thrust.
                }

                // Horizontal input (A/D, Left/Right) is ignored for UFO to maintain constant X speed.
                // If you want to allow temporary speed boosts or slight direction changes, that logic would go here.
                
            } else {
                // Normal Player Mechanics
                this.sprite.body.setAccelerationX(0); // Reset acceleration
                this.sprite.body.setVelocityX(0); // Reset horizontal velocity for normal players

                // Horizontal movement
                if (cursors.left.isDown || wasd.A.isDown) {
                    this.sprite.body.setVelocityX(-speed);
                    newAnimation = "run";
                    newDirection = "left";
                    this.sprite.setFlipX(true); // Flip sprite when moving left
                    moved = true;
                } else if (cursors.right.isDown || wasd.D.isDown) {
                    this.sprite.body.setVelocityX(speed);
                    newAnimation = "run";
                    newDirection = "right";
                    this.sprite.setFlipX(false); // Reset flip when moving right
                    moved = true;
                } else {
                    newAnimation = "idle";
                }

                // Jump - Allow jumping slightly after leaving the ground
                const gracePeriod = 100; // 0.4 seconds in milliseconds
                if (this.sprite.body.touching.down) {
                    this.sprite.body.lastTouchedDown = Date.now(); // Update the last time the player was on the ground
                }

                const canJump =
                    this.sprite.body.touching.down ||
                    (this.sprite.body.lastTouchedDown && Date.now() - this.sprite.body.lastTouchedDown <= gracePeriod);

                if ((cursors.up.isDown || wasd.W.isDown || wasd.Space.isDown) && canJump) {
                    this.sprite.body.setVelocityY(-jumpStrength);
                    newAnimation = "jump";
                    moved = true;

                    // Clear any platform-related properties to prevent snapping back when jumping
                    this.sprite.platformRelativePosition = null;
                    this.sprite.previousX = null;
                    this.sprite.inputVelocityX = null;
                    this.sprite.isOnMovingPlatform = false;
                }
            }

            return {
                moved,
                animation: newAnimation,
                direction: newDirection,
            };
        } catch (error) {
            console.error("Error applying movement to player:", error);
            return { moved: false, animation, direction };
        }
    }
}
