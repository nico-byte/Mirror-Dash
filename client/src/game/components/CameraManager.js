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
        this.scene.bottomCamera.setBounds(0, 0, 5000, 3000);

        // Correctly set the bottom camera's viewport to align with the bottom half of the screen
        this.scene.bottomCamera.setViewport(0, midPoint, scale.width, midPoint);

        // Add split line between views
        this.scene.splitLine = add.rectangle(scale.width / 2, midPoint, scale.width, 4, 0x000000);
        this.scene.splitLine.setDepth(100);
        this.scene.splitLine.setScrollFactor(0);

        // Initialize the last auto-scroll position
        this.lastAutoScrollX = 0;
    }

    updateCameras() {
        // Calculate offset to center player vertically in each half
        const verticalOffset = this.scene.scale.height / 4;

        // Update the top camera to follow the main player (Y-axis only)
        if (this.scene.topCamera && this.scene.player && this.scene.player.sprite) {
            this.scene.topCamera.scrollY = this.scene.player.sprite.y - verticalOffset;

            if (this.scene.autoScrollCamera) {
                this.scene.topCamera.scrollX += this.scene.scrollSpeed * (this.scene.game.loop.delta / 1000);
            }
        }

        // Update the bottom camera to follow the other player's mirrored sprite (Y-axis only)
        if (this.scene.bottomCamera) {
            const otherPlayerIds = Object.keys(this.scene.otherPlayers || {});

            if (otherPlayerIds.length > 0) {
                const otherPlayer = this.scene.otherPlayers[otherPlayerIds[0]];

                if (otherPlayer && otherPlayer.mirrorSprite) {
                    // Adjust Y position calculation to account for mirroring
                    const otherY = this.scene.scale.height + otherPlayer.mirrorSprite.y - verticalOffset;

                    // Set the camera's Y position to follow the mirrored position
                    this.scene.bottomCamera.scrollY = otherY;

                    // Add an offset to the Y position to make the bottom camera start higher
                    const yOffset = 400; // Increased the offset value to make the bottom camera start even higher
                    this.scene.bottomCamera.scrollY += yOffset;

                    if (this.scene.autoScrollCamera && this.scene.topCamera) {
                        this.scene.bottomCamera.scrollX = this.scene.topCamera.scrollX;
                    }

                    if (this.scene.debugMode) {
                        console.log(`Bottom camera Y: ${this.scene.bottomCamera.scrollY}, Mirror Y: ${otherY}`);
                    }
                }
            } else {
                this.scene.bottomCamera.scrollY = 0;

                // Add an offset to the Y position to make the bottom camera start higher
                const yOffset = 200; // Increased the offset value to make the bottom camera start even higher
                this.scene.bottomCamera.scrollY += yOffset;

                if (this.scene.topCamera) {
                    this.scene.bottomCamera.scrollX = this.scene.topCamera.scrollX;
                }
            }
        }
    }
}
