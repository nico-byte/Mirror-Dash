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
        // Use class properties as fallback if parameters are undefined
        const currentAnimation = animation || this.currentAnimation || "idle";
        const currentDirection = direction || this.currentDirection || "right";
        
        console.log("Applying movement to player:", {
            cursors,
            wasd,
            animation: currentAnimation,
            direction: currentDirection,
            isInUfoMode,
            sprite: this.sprite ? this.sprite.texture.key : "no sprite",
            body: this.sprite?.body ? "exists" : "no body",
        });
        
        if (!this.sprite?.body) return { moved: false, animation: currentAnimation, direction: currentDirection };

        try {
            const speed = 500;
            const jumpStrength = 500;
            let moved = false;
            let newAnimation = currentAnimation;
            let newDirection = currentDirection;

            if (isInUfoMode) {
                console.log("Applying UFO movement mechanics");
                // UFO Mechanics
                this.sprite.body.setVelocityX(this.ufoConstantXSpeed);
                newDirection = "right";
                this.sprite.setFlipX(false);

                if (cursors.up.isDown || wasd.W.isDown || wasd.Space.isDown) {
                    this.sprite.body.setVelocityY(-this.ufoBoostSpeed);
                    moved = true;
                }
            } else {
                // Normal Player Mechanics
                this.sprite.body.setAccelerationX(0);
                this.sprite.body.setVelocityX(0);

                // Horizontal movement
                if (cursors.left.isDown || wasd.A.isDown) {
                    this.sprite.body.setVelocityX(-speed);
                    newAnimation = "run";
                    newDirection = "left";
                    this.sprite.setFlipX(true);
                    moved = true;
                } else if (cursors.right.isDown || wasd.D.isDown) {
                    this.sprite.body.setVelocityX(speed);
                    newAnimation = "run";
                    newDirection = "right";
                    this.sprite.setFlipX(false);
                    moved = true;
                } else {
                    newAnimation = "idle";
                }

                // Jump logic
                const gracePeriod = 100;
                if (this.sprite.body.touching.down) {
                    this.sprite.body.lastTouchedDown = Date.now();
                }

                const canJump =
                    this.sprite.body.touching.down ||
                    (this.sprite.body.lastTouchedDown && Date.now() - this.sprite.body.lastTouchedDown <= gracePeriod);

                if ((cursors.up.isDown || wasd.W.isDown || wasd.Space.isDown) && canJump) {
                    this.sprite.body.setVelocityY(-jumpStrength);
                    newAnimation = "jump";
                    moved = true;

                    // Clear platform-related properties
                    this.sprite.platformRelativePosition = null;
                    this.sprite.previousX = null;
                    this.sprite.inputVelocityX = null;
                    this.sprite.isOnMovingPlatform = false;
                }
            }

            // Store current state for next call
            this.currentAnimation = newAnimation;
            this.currentDirection = newDirection;

            return {
                moved,
                animation: newAnimation,
                direction: newDirection,
            };
        } catch (error) {
            console.error("Error applying movement to player:", error);
            return { 
                moved: false, 
                animation: currentAnimation, 
                direction: currentDirection 
            };
        }
    }
}
