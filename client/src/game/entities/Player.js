import { PlayerVisuals } from "./PlayerVisuals.js";
import { PlayerPhysics } from "./PlayerPhysics.js";

export class Player {
    constructor(scene, x, y, name, isMainPlayer = false) {
        this.scene = scene;
        this.name = name || "Player";
        this.isMainPlayer = isMainPlayer;
        this.x = x;
        this.y = y;
        this.animation = "idle";
        this.direction = "right";
        this.midPoint = scene.scale.height / 2;
        this.screenHeight = scene.scale.height;
        this.lastUpdate = Date.now();

        // Initialize components
        this.visuals = new PlayerVisuals(scene, this);
        const sprites = this.visuals.createSprites(x, y, name, isMainPlayer);
        this.sprite = sprites.sprite;
        this.text = sprites.text;
        this.mirrorSprite = sprites.mirrorSprite;
        this.mirrorText = sprites.mirrorText;

        // Setup camera visibility
        this.visuals.setupCameraVisibility(isMainPlayer);

        // Setup physics if this is a playable character
        if (isMainPlayer && scene.physics) {
            this.physics = new PlayerPhysics(scene, this.sprite);
            
            // Store reference to the player in the sprite for collision handling
            this.sprite.playerRef = this;
        }

        console.log("Player created:", name, x, y, isMainPlayer);
    }

    init(scene, x, y, name, isMainPlayer = false) {
        this.scene = scene;
        this.name = name || "Player";
        this.isMainPlayer = isMainPlayer;
        this.x = x;
        this.y = y;
        this.animation = "idle";
        this.direction = "right";
        this.midPoint = scene.scale.height / 2;
        this.screenHeight = scene.scale.height;
        this.lastUpdate = Date.now();

        // Initialize components
        this.visuals = new PlayerVisuals(scene, this);
        const sprites = this.visuals.createSprites(x, y, name, isMainPlayer);
        this.sprite = sprites.sprite;
        this.text = sprites.text;
        this.mirrorSprite = sprites.mirrorSprite;
        this.mirrorText = sprites.mirrorText;

        // Setup camera visibility
        this.visuals.setupCameraVisibility(isMainPlayer);

        // Setup physics if this is a playable character
        if (isMainPlayer && scene.physics) {
            this.physics = new PlayerPhysics(scene, this.sprite);
            
            // Store reference to the player in the sprite for collision handling
            this.sprite.playerRef = this;
        }

        console.log("Player created:", name, x, y, isMainPlayer);
    }

    update() {
        // Update position properties
        if (this.isMainPlayer && this.sprite && this.sprite.body) {
            try {
                // Get position from physics body for main player
                this.x = this.sprite.x;
                this.y = this.sprite.y;

                // If the player was on a moving platform last frame but isn't anymore,
                // and isn't pressing any movement keys, reset horizontal velocity
                if (
                    this.sprite.wasOnMovingPlatform &&
                    !this.sprite.isOnMovingPlatform &&
                    !this.keyInput.left.isDown &&
                    !this.keyInput.right.isDown
                ) {
                    this.sprite.body.velocity.x = 0;
                }

                // Remember if player was on a moving platform for the next frame
                this.sprite.wasOnMovingPlatform = this.sprite.isOnMovingPlatform;
            } catch (error) {
                // console.error("Error updating player position from physics body:", error);
            }
        } else if (this.sprite) {
            // For non-main players, update sprite position from player position
            this.sprite.x = this.x;
            this.sprite.y = this.y;
        }

        // Update visual elements
        this.visuals.updatePositions(this.x, this.y, this.midPoint, this.screenHeight);
        this.visuals.updateAnimation(this.direction);
    }

    applyMovement(cursors, wasd) {
        if (!this.isMainPlayer || !this.physics) return false;

        const result = this.physics.applyMovement(cursors, wasd, this.animation, this.direction);
        const moved = result.moved;

        // Update animation and direction
        const prevAnimation = this.animation;
        const prevDirection = this.direction;
        this.animation = result.animation;
        this.direction = result.direction;
        
        // Immediately update the animation visually
        this.visuals.updateAnimation(this.direction);

        // Return true if anything changed - important for network updates
        return moved || prevAnimation !== this.animation || prevDirection !== this.direction;
    }

    moveTo(x, y, animation = "idle", direction = "right") {
        if (this.isMainPlayer) return; // Don't tween the main player

        if (typeof x !== "number" || typeof y !== "number") {
            // console.error("Invalid position for player move:", x, y);
            return;
        }

        // Store the target position
        this.x = x;
        this.y = y;
        this.animation = animation;
        this.direction = direction;
        this.lastUpdate = Date.now();
        
        // Update animations based on the network-received animation state
        if (this.sprite && this.sprite.anims) {
            this.sprite.anims.play(animation, true);
        }
        
        // Update direction
        this.visuals.updateAnimation(direction);

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
        this.visuals.destroy();
    }
}
