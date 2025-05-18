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
    }

    applyMovement(cursors, wasd, animation, direction) {
        if (!this.sprite || !this.sprite.body) return { moved: false, animation, direction };

        try {
            const speed = 500;
            const jumpStrength = 500;

            this.sprite.body.setAccelerationX(0); // Reset acceleration
            let moved = false;
            let newAnimation = animation;
            let newDirection = direction;

            // Reset horizontal velocity
            this.sprite.body.setVelocityX(0);

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
