export class CameraManager {
    constructor(scene, autoScrollCamera = false, scrollSpeed = 0) {
        this.scene = scene;
        // Camera scrolling properties
        this.autoScrollCamera = autoScrollCamera;
        this.scrollSpeed = scrollSpeed;
        // New property to track if player is controlling camera
        this.playerControllingCamera = false;
        // Keep track of the last auto-scroll position
        this.lastAutoScrollX = 0;
    }

    setupCameras() {
        const { cameras, scale, add } = this.scene;

        // Get camera settings from environment variables
        this.autoScrollCamera = import.meta.env.VITE_AUTO_SCROLL_CAMERA === "true";
        this.scrollSpeed = parseFloat(import.meta.env.VITE_CAMERA_SCROLL_SPEED || "50");

        // Modify the main camera for the top half
        cameras.main.setViewport(0, 0, scale.width, scale.height / 2);
        cameras.main.setBackgroundColor(0x87ceeb); // Light blue sky
        cameras.main.setName("topCamera");
        cameras.main.setBounds(0, 0, 3000, 1000);
        this.scene.topCamera = cameras.main;

        // Calculate the midpoint of the screen height
        const midPoint = scale.height / 2;

        // Create bottom camera
        this.scene.bottomCamera = cameras.add(0, midPoint, scale.width, midPoint);
        this.scene.bottomCamera.setBackgroundColor(0x87ceeb);
        this.scene.bottomCamera.setName("bottomCamera");
        this.scene.bottomCamera.setBounds(0, 0, 3000, 1000);

        // Add split line between views
        this.scene.splitLine = add.rectangle(scale.width / 2, midPoint, scale.width, 4, 0x000000);
        this.scene.splitLine.setDepth(100);
        this.scene.splitLine.setScrollFactor(0);

        // Initialize the last auto-scroll position
        this.lastAutoScrollX = 0;
    }

    updateCameras() {
        // Update the top camera based on player position and auto-scroll settings
        if (this.scene.topCamera && this.scene.player && this.scene.player.sprite) {
            const camera = this.scene.topCamera;
            const player = this.scene.player;

            // Ensure camera follows player on Y-axis
            if (!camera._follow) {
                camera.startFollow(player.sprite, false, 0, 1); // Only follow Y (0 for X, 1 for Y)
            }

            if (this.scene.autoScrollCamera) {
                // Calculate what the auto-scroll position would be
                this.lastAutoScrollX += this.scene.scrollSpeed * (this.scene.game.loop.delta / 1000);

                // Get player's position and velocity
                const playerX = player.sprite.x;
                const playerVelocityX = player.sprite.body ? player.sprite.body.velocity.x : 0;

                // Check if player is ahead of auto-scroll and moving faster (only when going right)
                if (playerX > this.lastAutoScrollX + camera.width * 0.3 && playerVelocityX > 0) {
                    // Player is controlling the camera - follow their X position
                    this.playerControllingCamera = true;
                    // Make the camera follow the player directly based on their position
                    camera.scrollX = playerX - camera.width * 0.3; // Keep player 30% from left edge
                }
                // If player was controlling but now slowed down, let auto-scroll catch up
                else if (
                    this.playerControllingCamera &&
                    (playerX <= this.lastAutoScrollX + camera.width * 0.3 || playerVelocityX <= 0)
                ) {
                    // Transition back to auto-scroll
                    this.playerControllingCamera = false;
                }

                // If not player-controlled, continue auto-scrolling
                if (!this.playerControllingCamera) {
                    camera.scrollX = this.lastAutoScrollX;
                }

                // Update auto-scroll position if player is controlling camera
                if (this.playerControllingCamera) {
                    this.lastAutoScrollX = camera.scrollX;
                }
            }
        }

        // Update the bottom camera to follow the other player's mirrored sprite (Y-axis only)
        if (this.scene.bottomCamera) {
            const otherPlayerIds = Object.keys(this.scene.otherPlayers || {});
            if (otherPlayerIds.length > 0 && this.scene.otherPlayers[otherPlayerIds[0]].mirrorSprite) {
                // Follow the other player's mirrored sprite in bottom camera
                if (
                    !this.scene.bottomCamera._follow ||
                    this.scene.bottomCamera._follow !== this.scene.otherPlayers[otherPlayerIds[0]].mirrorSprite
                ) {
                    this.scene.bottomCamera.startFollow(
                        this.scene.otherPlayers[otherPlayerIds[0]].mirrorSprite,
                        false,
                        0,
                        1
                    ); // Y-axis only
                }

                // Match X scrolling with top camera
                if (this.scene.topCamera) {
                    this.scene.bottomCamera.scrollX = this.scene.topCamera.scrollX;
                }
            } else if (this.scene.topCamera) {
                // If no other player, match top camera scroll position
                this.scene.bottomCamera.scrollX = this.scene.topCamera.scrollX;
            }
        }
    }
}
