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

        // Dynamically set camera bounds based on level dimensions
        const levelWidth = this.scene.levelWidth || 6000; // Increased default to 6000
        const levelHeight = this.scene.levelHeight || 1000;
        cameras.main.setBounds(0, 0, levelWidth, levelHeight);

        // Ensure the camera can scroll to the very end of the level
        cameras.main.setScroll(0, 0);

        this.scene.mainCamera = cameras.main;

        // Add fullscreen toggle button
        this.addFullscreenButton();

        // Listen for resize events
        this.scene.scale.on("resize", this.handleResize, this);
    }

    // New method to handle resize events
    handleResize() {
        if (!this.scene || !this.scene.mainCamera) return;

        // Get current level dimensions
        const levelWidth = this.scene.levelWidth || 6000;
        const levelHeight = this.scene.levelHeight || 1000;

        // Re-set camera bounds to ensure they're correct after resize
        this.scene.mainCamera.setBounds(0, 0, levelWidth, levelHeight);
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

            // Get level dimensions for camera bounds checking
            const levelWidth = this.scene.levelWidth || 6000;
            const levelHeight = this.scene.levelHeight || 1000;
            const maxScrollX = Math.max(0, levelWidth - camera.width);
            const maxScrollY = Math.max(0, levelHeight - camera.height);

            if (this.autoScrollCamera) {
                // Calculate what the auto-scroll position would be with smoother interpolation
                const deltaTime = this.scene.game.loop.delta / 1000;
                this.lastAutoScrollX += this.scrollSpeed * deltaTime;

                // Clamp auto-scroll position to level bounds
                this.lastAutoScrollX = Math.min(Math.max(0, this.lastAutoScrollX), maxScrollX);

                // Get player's position and velocity
                const playerX = player.sprite.x;
                const playerY = player.sprite.y;
                const playerVelocityX = player.sprite.body ? player.sprite.body.velocity.x : 0;

                // Check if player is ahead of auto-scroll and moving faster (only when going right)
                if (playerX > this.lastAutoScrollX + camera.width * 0.3 && playerVelocityX > 0) {
                    this.playerControllingCamera = true;
                } else if (
                    this.playerControllingCamera &&
                    (playerX <= this.lastAutoScrollX + camera.width * 0.3 || playerVelocityX <= 0)
                ) {
                    this.playerControllingCamera = false;
                }

                // Handle camera movement
                if (this.playerControllingCamera) {
                    // Player controls X-axis, smooth follow on both axes
                    const desiredScrollX = Math.min(Math.max(0, playerX - camera.width * 0.3), maxScrollX);
                    const desiredScrollY = Math.min(Math.max(0, playerY - camera.height * 0.5), maxScrollY);

                    // Smooth interpolation for both X and Y
                    const lerpFactorX = 0.08; // Smooth horizontal follow
                    const lerpFactorY = 0.12; // Slightly faster vertical follow

                    camera.scrollX += (desiredScrollX - camera.scrollX) * lerpFactorX;
                    camera.scrollY += (desiredScrollY - camera.scrollY) * lerpFactorY;

                    // Update auto-scroll position to match camera
                    this.lastAutoScrollX = camera.scrollX;
                } else {
                    // Auto-scroll controls X-axis, smooth follow on Y-axis
                    const desiredScrollY = Math.min(Math.max(0, playerY - camera.height * 0.5), maxScrollY);

                    // Smooth X movement to auto-scroll position
                    const lerpFactorX = 0.06; // Smoother auto-scroll
                    const lerpFactorY = 0.12; // Responsive vertical follow

                    camera.scrollX += (this.lastAutoScrollX - camera.scrollX) * lerpFactorX;
                    camera.scrollY += (desiredScrollY - camera.scrollY) * lerpFactorY;
                }
            } else {
                // No auto-scroll, just follow player smoothly on both axes
                const desiredScrollX = Math.min(Math.max(0, playerX - camera.width * 0.5), maxScrollX);
                const desiredScrollY = Math.min(Math.max(0, playerY - camera.height * 0.5), maxScrollY);

                const lerpFactorX = 0.1;
                const lerpFactorY = 0.15;

                camera.scrollX += (desiredScrollX - camera.scrollX) * lerpFactorX;
                camera.scrollY += (desiredScrollY - camera.scrollY) * lerpFactorY;
            }

            // Final clamp to ensure camera never goes out of bounds
            camera.scrollX = Math.min(Math.max(0, camera.scrollX), maxScrollX);
            camera.scrollY = Math.min(Math.max(0, camera.scrollY), maxScrollY);
        }
    }
}
