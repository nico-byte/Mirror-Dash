export class PlayerPhysics {
    constructor(scene, sprite) {
        this.scene = scene;
        this.sprite = sprite;
        this.setupPhysics();
    }

    setupPhysics() {
        if (!this.scene.physics || !this.sprite) return;

        this.scene.physics.add.existing(this.sprite);
        this.sprite.body.setCircle(20); // Slightly smaller than full sprite

        // Configure physics properties
        this.sprite.body.setBounce(0);
        this.sprite.body.setCollideWorldBounds(true);
        this.sprite.body.setDrag(500, 0);
        this.sprite.body.setFriction(1, 0);
        this.sprite.body.setMaxVelocity(600, 1000);
        this.sprite.body.setGravityY(1000);
        this.sprite.body.setSize(32, 64, true); // Adjust for circle hitbox
    }

    applyMovement(cursors, wasd, animation, direction) {
        if (!this.sprite || !this.sprite.body) return { moved: false, animation, direction };

        try {
            const speed = 500;
            const jumpStrength = 800;

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

            // Jump - Only if touching the ground
            if ((cursors.up.isDown || wasd.W.isDown || wasd.Space.isDown) && this.sprite.body.touching.down) {
                this.sprite.body.setVelocityY(-jumpStrength);
                newAnimation = "jump";
                moved = true;
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
