export class CameraManager {
    constructor(scene, autoScrollCamera = false, scrollSpeed = 0) {
        this.scene = scene;
        // Camera scrolling properties
        this.autoScrollCamera = autoScrollCamera;
        this.scrollSpeed = scrollSpeed;
        // Property to track if player is controlling camera
        this.playerControllingCamera = false;
        // Keep track of the last auto-scroll position
        this.lastAutoScrollX = 0;
    }

    init(scene, autoScrollCamera = false, scrollSpeed = 0) {
        this.scene = scene;
        // Camera scrolling properties
        this.autoScrollCamera = autoScrollCamera;
        this.scrollSpeed = scrollSpeed;
        // Property to track if player is controlling camera
        this.playerControllingCamera = false;
        // Keep track of the last auto-scroll position
        this.lastAutoScrollX = 0;
    }

    setupCameras() {
        const { cameras, scale } = this.scene;

        // Get camera settings from environment variables
        this.autoScrollCamera = import.meta.env.VITE_AUTO_SCROLL_CAMERA === "true";
        this.scrollSpeed = parseFloat(import.meta.env.VITE_CAMERA_SCROLL_SPEED || "50");

        // Configure the main camera for fullscreen
        cameras.main.setBackgroundColor(0x87ceeb); // Light blue sky
        cameras.main.setName("mainCamera");
        cameras.main.setBounds(0, 0, 3000, 1000);
        this.scene.mainCamera = cameras.main;

        // Add fullscreen toggle button
        this.addFullscreenButton();
    }

    addFullscreenButton() {
        // Add a fullscreen toggle button at the top right corner
        const button = this.scene.add
            .rectangle(this.scene.scale.width - 40, 40, 30, 30, 0x000000, 0.6)
            .setScrollFactor(0)
            .setDepth(100)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => {
                if (this.scene.scale.isFullscreen) {
                    this.scene.scale.stopFullscreen();
                } else {
                    this.scene.scale.startFullscreen();
                }
            });

        // Add icon
        const icon = this.scene.add
            .text(
                this.scene.scale.width - 40,
                40,
                "⛶", // Unicode fullscreen symbol
                {
                    fontFamily: "Arial",
                    fontSize: "20px",
                    color: "#ffffff",
                }
            )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(101)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => {
                if (this.scene.scale.isFullscreen) {
                    this.scene.scale.stopFullscreen();
                } else {
                    this.scene.scale.startFullscreen();
                }
            });
    }

    updateCameras() {
        // Update the camera based on player position and auto-scroll settings
        if (this.scene.mainCamera && this.scene.player && this.scene.player.sprite) {
            const camera = this.scene.mainCamera;
            const player = this.scene.player;

            // Ensure camera follows player on both X and Y axes
            if (!camera._follow) {
                camera.startFollow(player.sprite, true, 0.5, 0.5);
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
    }
}
