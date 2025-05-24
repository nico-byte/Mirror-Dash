import { PlayerVisuals } from "./PlayerVisuals.js";
import { PlayerPhysics } from "./PlayerPhysics.js";
import { Game } from "@/game/scenes/Game.js";
import { WASDKeys } from "@/game/utils/interfaces.js";

interface ExtendedSprite extends Phaser.GameObjects.Sprite {
    body: Phaser.Physics.Arcade.Body;
    wasOnMovingPlatform?: boolean;
    isOnMovingPlatform?: boolean;
    playerRef?: Player;
}

interface PlayerInputKeys extends WASDKeys {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
}

export class Player {
    scene: Game;
    name: string;
    isMainPlayer: boolean;
    x: number;
    y: number;
    animation: string;
    direction: string;
    lastUpdate: number;
    isInUfoMode: boolean; // Added for simple UFO mechanic
    visuals: PlayerVisuals;
    sprite: ExtendedSprite;
    text: Phaser.GameObjects.Text;
    physics: PlayerPhysics;
    keyInput: PlayerInputKeys;

    constructor(scene: Game,
        x: number,
        y: number,
        name: string,
        isMainPlayer: boolean = false
    ) {
        this.scene = scene;
        this.name = name ?? "Player";
        this.isMainPlayer = isMainPlayer;
        this.x = x;
        this.y = y;
        this.animation = "idle";
        this.direction = "right";
        this.lastUpdate = Date.now();
        this.isInUfoMode = false; // Added for simple UFO mechanic

        // Initialize components
        this.visuals = new PlayerVisuals(scene, this);
        const sprites = this.visuals.createSprites(x, y, name, isMainPlayer);
        this.sprite = sprites.sprite;
        this.text = sprites.text;
    
        // Add reference to player object on the sprite
        (this.sprite as ExtendedSprite).playerRef = this;

        // Setup physics if this is a playable character
        if (isMainPlayer && scene.physics) {
            this.physics = new PlayerPhysics(scene, this.sprite);

            // Store reference to the player in the sprite for collision handling
            // this.sprite.playerRef = this;
        }

        console.log("Player created:", name, x, y, isMainPlayer);
    }

    update(): void {
        // Update position properties
        if (this.isMainPlayer && this.sprite?.body) {
            try {
                // Get position from physics body for main player
                this.x = this.sprite.x;
                this.y = this.sprite.y;

                // If the player was on a moving platform last frame but isn't anymore,
                // and isn't pressing any movement keys, reset horizontal velocity
                if (
                    this.sprite.wasOnMovingPlatform &&
                    !this.sprite.isOnMovingPlatform &&
                    this.keyInput !== undefined &&
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
        this.visuals.updatePositions(this.x, this.y);
        this.visuals.updateAnimation(this.direction);
    }

    applyMovement(cursors: Phaser.Types.Input.Keyboard.CursorKeys, wasd: WASDKeys) {
        console.log("Applying movement for player:", this.name);
        console.log("Is main player:", this.isMainPlayer);
        console.log("Physics exists:", !!this.physics);
        console.log("Cursors:", cursors);
        console.log("WASD keys:", wasd);
        if (!this.isMainPlayer || !this.physics) return false;

        const result = this.physics.applyMovement(cursors, wasd, this.animation, this.direction, this.isInUfoMode); // Pass UFO mode status
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

    moveTo(x: number, y: number, animation = "idle", direction = "right") {
        if (this.isMainPlayer) return; // Don't tween the main player

        if (typeof x !== "number" || typeof y !== "number") {
            console.warn("Invalid position for player move:", x, y);
            return;
        }

        // Store the target position
        this.x = x;
        this.y = y;
        this.animation = animation;
        this.direction = direction;
        this.lastUpdate = Date.now();

        // Safe update of sprite position
        if (this.sprite) {
            this.sprite.x = x;
            this.sprite.y = y;
        }

        // Update animations based on the network-received animation state
        this.visuals.updateAnimation(direction);

        // Use tweens for smooth movement of other players if available
        if (this.sprite && this.scene && this.scene.tweens) {
            try {
                this.scene.tweens.add({
                    targets: this.sprite,
                    x,
                    y,
                    duration: 100,
                    ease: "Linear",
                });
            } catch (error) {
                // Fall back to direct position update if tween fails
                if (this.sprite) {
                    this.sprite.x = x;
                    this.sprite.y = y;
                }
            }
        }
    }

    destroy() {
        if (this.visuals) {
            this.visuals.destroy();
        } else {
            console.warn("PlayerVisuals instance is not initialized or already destroyed.");
        }
    }

    toggleUfoMode() {
        console.log("Toggling UFO mode for player:", this.name);
        console.log("Current UFO mode status:", this.isInUfoMode);
        console.log("Is main player:", this.isMainPlayer);
        console.log("Sprite exists:", !!this.sprite);
        console.log("Physics exists:", !!this.physics);
        if (!this.isMainPlayer || !this.sprite || !this.physics) return;

        this.isInUfoMode = !this.isInUfoMode;

        if (this.isInUfoMode) {
            this.sprite.setTexture("ufo");
            this.sprite.setScale(0.5); // Adjust scale for UFO sprite
            this.physics.setUfoPhysics(true);
            console.log("Player entered simple UFO mode.");
        } else {
            this.sprite.setTexture("player_animations"); // Revert to player sprite
            this.sprite.setScale(1); // Revert scale
            this.physics.setUfoPhysics(false);
            console.log("Player exited simple UFO mode.");
        }
        // Ensure physics body is updated if it exists
        if (this.sprite.body) {
            this.sprite.body.setSize(this.sprite.width, this.sprite.height);
        }
    }
}
